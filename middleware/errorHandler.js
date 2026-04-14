// ============================================
// ГЛОБАЛЬНЫЙ ОБРАБОТЧИК ОШИБОК
// ============================================

// Кастомный класс ошибки для API
export class ApiError extends Error {
    constructor(statusCode, message, details = null) {
        super(message);
        this.statusCode = statusCode;
        this.details = details;
        this.isOperational = true; // Различаем операционные и программные ошибки
    }
}

// Обработчик ошибок для Express
export const errorHandler = (err, req, res, next) => {
    // Определяем статус и сообщение
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Внутренняя ошибка сервера';
    
    // Логирование
    console.error('💥 Ошибка:', {
        path: req.path,
        method: req.method,
        status: statusCode,
        message: message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
    
    // Формируем ответ
    const response = {
        success: false,
        error: {
            message,
            ...(err.details && { details: err.details }),
            // В dev-режиме показываем стек
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        }
    };
    
    res.status(statusCode).json(response);
};

// Обработчик для 404 (не найдено)
export const notFoundHandler = (req, res, next) => {
    const error = new ApiError(404, `Маршрут ${req.originalUrl} не найден`);
    next(error);
};

// Асинхронный обработчик (чтобы не писать try-catch в каждом контроллере)
export const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
