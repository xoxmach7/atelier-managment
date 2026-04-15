// ============================================
// ACCOUNT LOCKOUT MIDDLEWARE
// Защита от брутфорс-атак на вход
// ============================================
import { pool } from '../config/db.js';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

// Получить или создать запись о попытках входа
const getLoginAttempts = async (email) => {
    const result = await pool.query(
        `SELECT * FROM login_attempts 
         WHERE email = $1 AND created_at > NOW() - INTERVAL '${LOCKOUT_DURATION_MINUTES} minutes'`,
        [email.toLowerCase()]
    );
    return result.rows[0];
};

// Записать неудачную попытку входа
const recordFailedAttempt = async (email, ip) => {
    const existing = await getLoginAttempts(email);
    
    if (existing) {
        await pool.query(
            `UPDATE login_attempts 
             SET attempts = attempts + 1, 
                 last_attempt_at = NOW(),
                 ip_address = $2,
                 locked = CASE WHEN attempts + 1 >= $3 THEN TRUE ELSE locked END
             WHERE id = $4`,
            [ip, MAX_FAILED_ATTEMPTS, existing.id]
        );
        return existing.attempts + 1;
    } else {
        await pool.query(
            `INSERT INTO login_attempts (email, attempts, ip_address, locked)
             VALUES ($1, 1, $2, FALSE)`,
            [email.toLowerCase(), ip]
        );
        return 1;
    }
};

// Сбросить попытки (успешный вход)
const resetAttempts = async (email) => {
    await pool.query(
        'DELETE FROM login_attempts WHERE email = $1',
        [email.toLowerCase()]
    );
};

// Проверить, заблокирован ли аккаунт
const isAccountLocked = async (email) => {
    const attempts = await getLoginAttempts(email);
    
    if (!attempts) return { locked: false, attemptsLeft: MAX_FAILED_ATTEMPTS };
    
    if (attempts.locked) {
        // Проверяем, прошло ли время блокировки
        const lockoutEnd = new Date(attempts.last_attempt_at);
        lockoutEnd.setMinutes(lockoutEnd.getMinutes() + LOCKOUT_DURATION_MINUTES);
        
        if (new Date() > lockoutEnd) {
            // Блокировка истекла, сбрасываем
            await resetAttempts(email);
            return { locked: false, attemptsLeft: MAX_FAILED_ATTEMPTS };
        }
        
        const minutesLeft = Math.ceil((lockoutEnd - new Date()) / 60000);
        return { 
            locked: true, 
            minutesLeft,
            message: `Аккаунт заблокирован. Попробуйте через ${minutesLeft} мин.`
        };
    }
    
    return { 
        locked: false, 
        attemptsLeft: Math.max(0, MAX_FAILED_ATTEMPTS - attempts.attempts)
    };
};

// Middleware для проверки блокировки перед входом
export const checkAccountLockout = async (req, res, next) => {
    const { email } = req.body;
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    
    if (!email) {
        return next();
    }
    
    const lockStatus = await isAccountLocked(email);
    
    if (lockStatus.locked) {
        return res.status(423).json({
            success: false,
            error: {
                code: 'ACCOUNT_LOCKED',
                message: lockStatus.message,
                minutesLeft: lockStatus.minutesLeft,
                lockedUntil: new Date(Date.now() + lockStatus.minutesLeft * 60000).toISOString()
            }
        });
    }
    
    // Сохраняем данные для использования в контроллере
    req.lockoutInfo = {
        attemptsLeft: lockStatus.attemptsLeft,
        clientIp
    };
    
    next();
};

// Middleware для обработки неудачного входа
export const handleFailedLogin = async (email, ip) => {
    const attempts = await recordFailedAttempt(email, ip);
    const remaining = Math.max(0, MAX_FAILED_ATTEMPTS - attempts);
    
    return {
        attempts,
        remaining,
        locked: attempts >= MAX_FAILED_ATTEMPTS
    };
};

// Middleware для обработки успешного входа
export const handleSuccessfulLogin = async (email) => {
    await resetAttempts(email);
};

// Получить статус блокировки (для админки)
export const getLockoutStatus = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT email, attempts, locked, last_attempt_at, ip_address,
                    CASE 
                        WHEN locked THEN 
                            EXTRACT(EPOCH FROM (last_attempt_at + INTERVAL '${LOCKOUT_DURATION_MINUTES} minutes' - NOW()))/60
                        ELSE NULL 
                    END as minutes_remaining
             FROM login_attempts 
             WHERE created_at > NOW() - INTERVAL '24 hours'
             ORDER BY last_attempt_at DESC`
        );
        
        res.json({
            success: true,
            data: result.rows,
            config: {
                maxAttempts: MAX_FAILED_ATTEMPTS,
                lockoutDuration: LOCKOUT_DURATION_MINUTES
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Разблокировать аккаунт вручную (admin only)
export const unlockAccount = async (req, res) => {
    const { email } = req.params;
    
    try {
        await resetAttempts(email);
        
        res.json({
            success: true,
            message: `Аккаунт ${email} разблокирован`
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

export default {
    checkAccountLockout,
    handleFailedLogin,
    handleSuccessfulLogin,
    getLockoutStatus,
    unlockAccount
};
