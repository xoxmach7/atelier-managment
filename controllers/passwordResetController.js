// ============================================
// PASSWORD RESET CONTROLLER
// ============================================
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import pool from '../config/db.js';
import { sendPasswordReset } from '../services/emailService.js';
import { ApiError } from '../middleware/errorHandler.js';

// ============================================
// ЗАПРОС СБРОСА ПАРОЛЯ
// ============================================
export const forgotPassword = async (req, res) => {
    const { email } = req.body;
    
    if (!email) {
        throw new ApiError(400, 'Email обязателен');
    }
    
    // Нормализуем email
    const normalizedEmail = email.toLowerCase().trim();
    
    // Ищем пользователя
    const userResult = await pool.query(
        'SELECT id, email, full_name FROM users WHERE email = $1 AND is_active = TRUE',
        [normalizedEmail]
    );
    
    // Не сообщаем, существует ли email (безопасность)
    if (userResult.rows.length === 0) {
        return res.json({
            success: true,
            message: 'Если указанный email зарегистрирован, инструкции по сбросу пароля отправлены'
        });
    }
    
    const user = userResult.rows[0];
    
    // Генерируем токен
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 час
    
    // Удаляем старые токены для этого email
    await pool.query('DELETE FROM password_resets WHERE email = $1', [normalizedEmail]);
    
    // Сохраняем новый токен
    await pool.query(
        `INSERT INTO password_resets (email, token, expires_at) VALUES ($1, $2, $3)`,
        [normalizedEmail, token, expiresAt]
    );
    
    // Отправляем email
    const emailResult = await sendPasswordReset(normalizedEmail, token, user.full_name);
    
    if (!emailResult.success) {
        console.error('❌ Ошибка отправки email для сброса пароля:', emailResult.error);
        // Не показываем ошибку пользователю для безопасности
    }
    
    res.json({
        success: true,
        message: 'Если указанный email зарегистрирован, инструкции по сбросу пароля отправлены'
    });
};

// ============================================
// ПРОВЕРКА ТОКЕНА
// ============================================
export const verifyResetToken = async (req, res) => {
    const { token } = req.query;
    
    if (!token) {
        throw new ApiError(400, 'Токен обязателен');
    }
    
    const result = await pool.query(
        `SELECT * FROM password_resets 
         WHERE token = $1 
           AND used = FALSE 
           AND expires_at > CURRENT_TIMESTAMP`,
        [token]
    );
    
    if (result.rows.length === 0) {
        throw new ApiError(400, 'Недействительный или истёкший токен');
    }
    
    res.json({
        success: true,
        valid: true,
        email: result.rows[0].email
    });
};

// ============================================
// УСТАНОВКА НОВОГО ПАРОЛЯ
// ============================================
export const resetPassword = async (req, res) => {
    const { token, password } = req.body;
    
    if (!token || !password) {
        throw new ApiError(400, 'Токен и пароль обязательны');
    }
    
    // Валидация пароля
    if (password.length < 8) {
        throw new ApiError(400, 'Пароль должен быть минимум 8 символов');
    }
    
    // Ищем токен
    const tokenResult = await pool.query(
        `SELECT * FROM password_resets 
         WHERE token = $1 
           AND used = FALSE 
           AND expires_at > CURRENT_TIMESTAMP`,
        [token]
    );
    
    if (tokenResult.rows.length === 0) {
        throw new ApiError(400, 'Недействительный или истёкший токен');
    }
    
    const resetData = tokenResult.rows[0];
    const email = resetData.email;
    
    // Хешируем новый пароль
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Обновляем пароль пользователя
    const updateResult = await pool.query(
        `UPDATE users 
         SET password_hash = $1, 
             updated_at = CURRENT_TIMESTAMP
         WHERE email = $2
         RETURNING id`,
        [hashedPassword, email]
    );
    
    if (updateResult.rows.length === 0) {
        throw new ApiError(404, 'Пользователь не найден');
    }
    
    // Помечаем токен как использованный
    await pool.query(
        'UPDATE password_resets SET used = TRUE WHERE token = $1',
        [token]
    );
    
    // Удаляем все токены для этого email
    await pool.query('DELETE FROM password_resets WHERE email = $1', [email]);
    
    res.json({
        success: true,
        message: 'Пароль успешно изменён. Войдите с новым паролем.'
    });
};
