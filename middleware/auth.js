// ============================================
// JWT АУТЕНТИФИКАЦИЯ И АВТОРИЗАЦИЯ
// ============================================
import jwt from 'jsonwebtoken';
import { ApiError } from './errorHandler.js';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

if (!JWT_SECRET) {
    throw new Error('❌ JWT_SECRET не задан в .env! Добавьте: JWT_SECRET=your-secret-key-here');
}

// Генерация токена
export const generateToken = (userId) => {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// Проверка токена
export const verifyToken = (token) => {
    return jwt.verify(token, JWT_SECRET);
};

// Middleware: проверка авторизации
export const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new ApiError(401, 'Требуется авторизация. Отсутствует токен.');
        }
        
        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);
        
        req.userId = decoded.userId;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            throw new ApiError(401, 'Неверный токен');
        }
        if (error.name === 'TokenExpiredError') {
            throw new ApiError(401, 'Токен истёк');
        }
        throw error;
    }
};

// Middleware: проверка ролей
export const authorize = (...allowedRoles) => {
    return async (req, res, next) => {
        try {
            // Получаем пользователя из БД
            const pool = (await import('../config/db.js')).default;
            const result = await pool.query(
                'SELECT id, role, is_active FROM users WHERE id = $1',
                [req.userId]
            );
            
            if (result.rows.length === 0) {
                throw new ApiError(401, 'Пользователь не найден');
            }
            
            const user = result.rows[0];
            
            if (!user.is_active) {
                throw new ApiError(403, 'Аккаунт деактивирован');
            }
            
            if (!allowedRoles.includes(user.role)) {
                throw new ApiError(403, 
                    `Доступ запрещён. Требуется роль: ${allowedRoles.join(', ')}`);
            }
            
            req.user = user;
            next();
        } catch (error) {
            next(error);
        }
    };
};

// Роли для удобного использования
export const ROLES = {
    ADMIN: 'admin',
    DESIGNER: 'designer',
    MANAGER: 'manager',
    SEAMSTRESS: 'seamstress',
    INSTALLER: 'installer',
    WAREHOUSE: 'warehouse',
    PURCHASER: 'purchaser'
};
