// ============================================
// ВАЛИДАЦИЯ ВХОДНЫХ ДАННЫХ
// ============================================
import { body, param, query, validationResult } from 'express-validator';
import { ApiError } from './errorHandler.js';

// Middleware: проверка результатов валидации
export const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(err => err.msg).join(', ');
        throw new ApiError(400, `Ошибка валидации: ${errorMessages}`);
    }
    next();
};

// ============================================
// ПРАВИЛА ВАЛИДАЦИИ
// ============================================

// Авторизация
export const validateLogin = [
    body('email')
        .isEmail().withMessage('Неверный формат email')
        .normalizeEmail()
        .trim(),
    body('password')
        .isLength({ min: 6 }).withMessage('Пароль минимум 6 символов')
        .trim(),
    validate
];

export const validateRegister = [
    body('email')
        .isEmail().withMessage('Неверный формат email')
        .normalizeEmail()
        .trim(),
    body('password')
        .isLength({ min: 8 }).withMessage('Пароль минимум 8 символов')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Пароль должен содержать заглавную, строчную букву и цифру')
        .trim(),
    body('full_name')
        .isLength({ min: 2, max: 100 }).withMessage('Имя от 2 до 100 символов')
        .trim()
        .escape(),
    body('role')
        .optional()
        .isIn(['admin', 'manager', 'designer', 'seamstress', 'installer', 'warehouse', 'purchaser'])
        .withMessage('Неверная роль'),
    body('phone')
        .optional()
        .matches(/^\+?[\d\s-()]+$/).withMessage('Неверный формат телефона')
        .trim(),
    validate
];

// Сметы и расчёты
export const validateCalculate = [
    body('window_width_cm')
        .isInt({ min: 50, max: 1000 }).withMessage('Ширина окна от 50 до 1000 см')
        .toInt(),
    body('window_height_cm')
        .isInt({ min: 50, max: 500 }).withMessage('Высота окна от 50 до 500 см')
        .toInt(),
    body('fabric_id')
        .optional()
        .isInt({ min: 1 }).withMessage('ID ткани должен быть числом')
        .toInt(),
    body('sewing_type')
        .optional()
        .isIn(['шторы', 'тюль', 'портьеры']).withMessage('Тип пошива: шторы, тюль или портьеры'),
    body('complexity')
        .optional()
        .isIn(['simple', 'medium', 'complex', 'premium']).withMessage('Сложность: simple, medium, complex, premium'),
    body('city')
        .optional()
        .isIn(['Алматы', 'Астана', 'Шымкент', 'Другой']).withMessage('Город: Алматы, Астана, Шымкент или Другой'),
    body('installation')
        .optional()
        .isBoolean().withMessage('Монтаж должен быть true/false')
        .toBoolean(),
    body('delivery')
        .optional()
        .isBoolean().withMessage('Доставка должна быть true/false')
        .toBoolean(),
    validate
];

// Задачи (лиды)
export const validateTask = [
    body('client_name')
        .isLength({ min: 2, max: 100 }).withMessage('Имя клиента от 2 до 100 символов')
        .trim()
        .escape(),
    body('client_phone')
        .matches(/^\+?[\d\s-()]+$/).withMessage('Неверный формат телефона')
        .trim(),
    body('client_address')
        .optional()
        .isLength({ max: 300 }).withMessage('Адрес максимум 300 символов')
        .trim()
        .escape(),
    body('description')
        .optional()
        .isLength({ max: 1000 }).withMessage('Описание максимум 1000 символов')
        .trim()
        .escape(),
    body('priority')
        .optional()
        .isInt({ min: 1, max: 5 }).withMessage('Приоритет от 1 до 5')
        .toInt(),
    validate
];

// Заказы
export const validateOrder = [
    body('customer_name')
        .isLength({ min: 2, max: 100 }).withMessage('Имя клиента от 2 до 100 символов')
        .trim()
        .escape(),
    body('customer_phone')
        .matches(/^\+?[\d\s-()]+$/).withMessage('Неверный формат телефона')
        .trim(),
    body('total_amount')
        .isDecimal({ decimal_digits: '0,2' }).withMessage('Сумма должна быть числом')
        .toFloat(),
    validate
];

// Платежи
export const validatePrepayment = [
    body('order_id')
        .isInt({ min: 1 }).withMessage('ID заказа должен быть числом')
        .toInt(),
    body('amount')
        .isDecimal({ decimal_digits: '0,2' }).withMessage('Сумма должна быть числом')
        .isFloat({ min: 0.01 }).withMessage('Сумма больше 0')
        .toFloat(),
    body('payment_method')
        .isIn(['cash', 'card', 'transfer', 'kaspi']).withMessage('Способ оплаты: cash, card, transfer, kaspi'),
    validate
];

// Параметры URL
export const validateId = [
    param('id')
        .isInt({ min: 1 }).withMessage('ID должен быть положительным числом')
        .toInt(),
    validate
];

// Пагинация
export const validatePagination = [
    query('page')
        .optional()
        .isInt({ min: 1 }).withMessage('Страница от 1')
        .toInt(),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 }).withMessage('Лимит от 1 до 100')
        .toInt(),
    validate
];
