// ============================================
// ВАЛИДАТОРЫ ДЛЯ EXPRESS-VALIDATOR
// ============================================
import { body, param, validationResult } from 'express-validator';
import { ApiError } from './errorHandler.js';

// Middleware для проверки результатов валидации
export const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const details = errors.array().map(e => ({
            field: e.path,
            message: e.msg,
            value: e.value
        }));
        throw new ApiError(400, 'Ошибка валидации данных', details);
    }
    next();
};

// Валидаторы для клиентов
export const customerValidators = {
    create: [
        body('full_name')
            .trim()
            .notEmpty().withMessage('ФИО обязательно')
            .isLength({ max: 255 }).withMessage('ФИО не должно превышать 255 символов'),
        body('phone')
            .trim()
            .notEmpty().withMessage('Телефон обязателен')
            .matches(/^\+?[\d\s\-\(\)]+$/).withMessage('Неверный формат телефона'),
        body('email')
            .optional()
            .isEmail().withMessage('Неверный формат email'),
        validate
    ],
    update: [
        param('id').isInt().withMessage('ID должен быть числом'),
        body('full_name')
            .optional()
            .trim()
            .isLength({ max: 255 }),
        body('phone')
            .optional()
            .trim()
            .matches(/^\+?[\d\s\-\(\)]+$/),
        validate
    ]
};

// Валидаторы для заказов
export const orderValidators = {
    create: [
        body('customer_id')
            .notEmpty().withMessage('ID клиента обязателен')
            .isInt().withMessage('ID клиента должен быть числом'),
        body('installation_address')
            .optional()
            .trim()
            .isLength({ max: 500 }),
        body('measurement_date')
            .optional()
            .isISO8601().withMessage('Неверный формат даты замера'),
        validate
    ],
    updateStatus: [
        param('id').isInt().withMessage('ID должен быть числом'),
        body('status')
            .notEmpty().withMessage('Статус обязателен')
            .isIn(['new', 'measurement', 'design', 'fabric_selected', 'sewing', 
                   'ready', 'installation', 'completed', 'cancelled']),
        validate
    ]
};

// Валидаторы для тканей
export const fabricValidators = {
    create: [
        body('hanger_number')
            .trim()
            .notEmpty().withMessage('Номер вешалки обязателен'),
        body('name')
            .trim()
            .notEmpty().withMessage('Название обязательно'),
        body('stock_meters')
            .isFloat({ min: 0 }).withMessage('Остаток должен быть положительным числом'),
        body('price_per_meter')
            .isFloat({ min: 0 }).withMessage('Цена должна быть положительным числом'),
        validate
    ]
};
