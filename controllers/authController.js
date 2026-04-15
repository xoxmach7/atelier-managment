// ============================================
// КОНТРОЛЛЕР АУТЕНТИФИКАЦИИ
// ============================================
import bcrypt from 'bcryptjs';
import pool from '../config/db.js';
import { generateToken } from '../middleware/auth.js';
import { ApiError } from '../middleware/errorHandler.js';
import { handleFailedLogin, handleSuccessfulLogin } from '../middleware/accountLockout.js';

// Регистрация (только admin может создавать пользователей)
export const register = async (req, res) => {
    const { email, password, full_name, role, phone } = req.body;
    
    // Проверяем уникальность email
    const existingUser = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
    );
    
    if (existingUser.rows.length > 0) {
        throw new ApiError(400, 'Пользователь с таким email уже существует');
    }
    
    // Хешируем пароль
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Создаём пользователя
    const result = await pool.query(
        `INSERT INTO users (email, password_hash, full_name, role, phone, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id, email, full_name, role, phone, is_active`,
        [email, passwordHash, full_name, role || 'designer', phone]
    );
    
    const user = result.rows[0];
    
    res.status(201).json({
        success: true,
        message: 'Пользователь создан',
        data: user
    });
};

// Вход
export const login = async (req, res) => {
    const { email, password } = req.body;
    
    // Ищем пользователя
    const result = await pool.query(
        'SELECT id, email, full_name, role, password_hash, is_active, last_login FROM users WHERE email = $1',
        [email]
    );
    
    if (result.rows.length === 0) {
        throw new ApiError(401, 'Неверный email или пароль');
    }
    
    const user = result.rows[0];
    
    if (!user.is_active) {
        throw new ApiError(403, 'Аккаунт деактивирован');
    }
    
    // Проверяем пароль
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    
    if (!isValidPassword) {
        // Записываем неудачную попытку
        const lockoutInfo = await handleFailedLogin(email, clientIp);
        
        if (lockoutInfo.locked) {
            throw new ApiError(423, `Аккаунт заблокирован после ${lockoutInfo.attempts} неудачных попыток. Попробуйте через 15 минут.`);
        }
        
        throw new ApiError(401, `Неверный email или пароль. Осталось попыток: ${lockoutInfo.remaining}`);
    }
    
    // Успешный вход - сбрасываем попытки
    await handleSuccessfulLogin(email);
    
    // Обновляем last_login
    await pool.query(
        'UPDATE users SET last_login = NOW() WHERE id = $1',
        [user.id]
    );
    
    // Генерируем токен
    const token = generateToken(user.id);
    
    res.json({
        success: true,
        message: 'Вход выполнен успешно',
        data: {
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                role: user.role
            },
            token,
            security: {
                attemptsRemaining: req.lockoutInfo?.attemptsLeft || 5
            }
        }
    });
};

// Получить текущего пользователя
export const getCurrentUser = async (req, res) => {
    const result = await pool.query(
        'SELECT id, email, full_name, role, phone, is_active, last_login, created_at FROM users WHERE id = $1',
        [req.userId]
    );
    
    if (result.rows.length === 0) {
        throw new ApiError(404, 'Пользователь не найден');
    }
    
    res.json({
        success: true,
        data: result.rows[0]
    });
};

// Получить всех пользователей (только admin)
export const getUsers = async (req, res) => {
    const { role, is_active, limit = 50 } = req.query;
    
    let query = `
        SELECT id, email, full_name, role, phone, is_active, last_login, created_at 
        FROM users WHERE 1=1
    `;
    const params = [];
    
    if (role) {
        query += ` AND role = $${params.length + 1}`;
        params.push(role);
    }
    
    if (is_active !== undefined) {
        query += ` AND is_active = $${params.length + 1}`;
        params.push(is_active === 'true');
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);
    
    const result = await pool.query(query, params);
    
    res.json({
        success: true,
        count: result.rows.length,
        data: result.rows
    });
};

// Обновить пользователя
export const updateUser = async (req, res) => {
    const { id } = req.params;
    const { full_name, phone, role, is_active } = req.body;
    
    const result = await pool.query(
        `UPDATE users SET 
         full_name = COALESCE($1, full_name),
         phone = COALESCE($2, phone),
         role = COALESCE($3, role),
         is_active = COALESCE($4, is_active)
         WHERE id = $5
         RETURNING id, email, full_name, role, phone, is_active`,
        [full_name, phone, role, is_active, id]
    );
    
    if (result.rows.length === 0) {
        throw new ApiError(404, 'Пользователь не найден');
    }
    
    res.json({
        success: true,
        data: result.rows[0]
    });
};

// Сменить пароль
export const changePassword = async (req, res) => {
    const { current_password, new_password } = req.body;
    
    // Получаем текущий хеш
    const result = await pool.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [req.userId]
    );
    
    if (result.rows.length === 0) {
        throw new ApiError(404, 'Пользователь не найден');
    }
    
    // Проверяем старый пароль
    const isValid = await bcrypt.compare(current_password, result.rows[0].password_hash);
    
    if (!isValid) {
        throw new ApiError(400, 'Неверный текущий пароль');
    }
    
    // Хешируем новый пароль
    const newHash = await bcrypt.hash(new_password, 10);
    
    await pool.query(
        'UPDATE users SET password_hash = $1 WHERE id = $2',
        [newHash, req.userId]
    );
    
    res.json({
        success: true,
        message: 'Пароль изменён'
    });
};
