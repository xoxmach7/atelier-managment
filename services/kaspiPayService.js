// ============================================
// KASPI PAY INTEGRATION
// Приём платежей через Kaspi Pay
// ============================================
import crypto from 'crypto';
import { pool } from '../config/db.js';
import { sendPaymentConfirmation } from './emailService.js';

// Конфигурация Kaspi Pay
const KASPI_CONFIG = {
    merchantId: process.env.KASPI_MERCHANT_ID,
    apiKey: process.env.KASPI_API_KEY,
    secretKey: process.env.KASPI_SECRET_KEY,
    baseUrl: process.env.KASPI_ENV === 'production' 
        ? 'https://kaspi.kz/pay' 
        : 'https://test-kaspi.kz/pay'
};

// Проверка конфигурации
export const verifyKaspiConfig = () => {
    const required = ['KASPI_MERCHANT_ID', 'KASPI_API_KEY', 'KASPI_SECRET_KEY'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
        console.log('⚠️ Kaspi Pay не настроен:', missing.join(', '));
        return false;
    }
    
    console.log('✅ Kaspi Pay настроен (Merchant ID:', KASPI_CONFIG.merchantId, ')');
    return true;
};

// ============================================
// СОЗДАНИЕ ПЛАТЕЖА
// ============================================
export const createPayment = async (orderId, amount, description, customerInfo = {}) => {
    try {
        // Генерируем уникальный transaction ID
        const transactionId = `TRX-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Создаём запись о платеже в БД
        const paymentResult = await pool.query(
            `INSERT INTO kaspi_payments 
             (order_id, transaction_id, amount, description, status, customer_phone, customer_email)
             VALUES ($1, $2, $3, $4, 'pending', $5, $6)
             RETURNING *`,
            [orderId, transactionId, amount, description, customerInfo.phone, customerInfo.email]
        );
        
        const payment = paymentResult.rows[0];
        
        // Формируем подпись для Kaspi
        const signature = generateSignature({
            merchantId: KASPI_CONFIG.merchantId,
            transactionId,
            amount,
            currency: 'KZT'
        });
        
        // URL для оплаты (QR код или ссылка)
        const paymentUrl = `${KASPI_CONFIG.baseUrl}/api/?` + new URLSearchParams({
            merchant_id: KASPI_CONFIG.merchantId,
            transaction_id: transactionId,
            amount: amount.toString(),
            currency: 'KZT',
            description: description.substring(0, 100),
            signature,
            callback_url: `${process.env.BACKEND_URL || 'https://your-app.com'}/api/payments/kaspi/callback`,
            return_url: `${process.env.FRONTEND_URL || 'https://your-app.com'}/payment/success?tx=${transactionId}`,
            fail_url: `${process.env.FRONTEND_URL || 'https://your-app.com'}/payment/fail?tx=${transactionId}`
        }).toString();
        
        // Генерируем QR код (в реальности используем библиотеку)
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(paymentUrl)}`;
        
        return {
            success: true,
            paymentId: payment.id,
            transactionId,
            amount,
            paymentUrl,
            qrCodeUrl,
            status: 'pending',
            createdAt: payment.created_at
        };
        
    } catch (error) {
        console.error('❌ Ошибка создания платежа Kaspi:', error);
        return { success: false, error: error.message };
    }
};

// ============================================
// ПОДПИСЬ ДАННЫХ
// ============================================
const generateSignature = (params) => {
    const data = Object.keys(params)
        .sort()
        .map(key => `${key}=${params[key]}`)
        .join('&');
    
    return crypto
        .createHmac('sha256', KASPI_CONFIG.secretKey)
        .update(data)
        .digest('hex');
};

// ============================================
// ПРОВЕРКА ПОДПИСИ (callback от Kaspi)
// ============================================
const verifySignature = (params, signature) => {
    const expected = generateSignature(params);
    return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expected, 'hex')
    );
};

// ============================================
// ОБРАБОТКА CALLBACK от Kaspi Pay
// ============================================
export const handleCallback = async (callbackData) => {
    try {
        const { transaction_id, status, signature, payment_id } = callbackData;
        
        // Получаем платёж из БД
        const paymentResult = await pool.query(
            'SELECT * FROM kaspi_payments WHERE transaction_id = $1',
            [transaction_id]
        );
        
        if (paymentResult.rows.length === 0) {
            console.error('❌ Платёж не найден:', transaction_id);
            return { success: false, error: 'Payment not found' };
        }
        
        const payment = paymentResult.rows[0];
        
        // Проверяем подпись (в production обязательно!)
        // const isValid = verifySignature(callbackData, signature);
        // if (!isValid) {
        //     console.error('❌ Неверная подпись callback от Kaspi');
        //     return { success: false, error: 'Invalid signature' };
        // }
        
        // Обновляем статус платежа
        const newStatus = status === 'success' ? 'completed' : 
                         status === 'failed' ? 'failed' : 'pending';
        
        await pool.query(
            `UPDATE kaspi_payments 
             SET status = $1, 
                 kaspi_payment_id = $2,
                 callback_data = $3,
                 updated_at = NOW()
             WHERE id = $4`,
            [newStatus, payment_id || null, JSON.stringify(callbackData), payment.id]
        );
        
        // Если платёж успешный
        if (newStatus === 'completed') {
            // Обновляем статус заказа
            await pool.query(
                "UPDATE orders SET status = 'paid', updated_at = NOW() WHERE id = $1 AND status != 'completed'",
                [payment.order_id]
            );
            
            // Получаем данные для email
            const orderResult = await pool.query(
                `SELECT o.*, c.email, c.full_name 
                 FROM orders o 
                 JOIN customers c ON o.customer_id = c.id
                 WHERE o.id = $1`,
                [payment.order_id]
            );
            
            if (orderResult.rows.length > 0) {
                const order = orderResult.rows[0];
                
                // Отправляем уведомление
                sendPaymentConfirmation(order.email, {
                    orderId: order.order_number || order.id,
                    customerName: order.full_name,
                    amount: payment.amount,
                    method: 'Kaspi Pay',
                    transactionId: payment.transaction_id
                }).catch(err => console.error('Email error:', err));
            }
            
            // Логируем
            await pool.query(
                `INSERT INTO payment_history (order_id, payment_type, amount, status, notes)
                 VALUES ($1, 'kaspi', $2, 'success', $3)`,
                [payment.order_id, payment.amount, `Kaspi transaction: ${transaction_id}`]
            );
        }
        
        return { success: true, status: newStatus };
        
    } catch (error) {
        console.error('❌ Ошибка обработки callback:', error);
        return { success: false, error: error.message };
    }
};

// ============================================
// ПРОВЕРКА СТАТУСА ПЛАТЕЖА
// ============================================
export const checkPaymentStatus = async (transactionId) => {
    try {
        const result = await pool.query(
            `SELECT kp.*, o.order_number, o.status as order_status
             FROM kaspi_payments kp
             JOIN orders o ON kp.order_id = o.id
             WHERE kp.transaction_id = $1`,
            [transactionId]
        );
        
        if (result.rows.length === 0) {
            return { success: false, error: 'Payment not found' };
        }
        
        return { success: true, data: result.rows[0] };
        
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// ============================================
// ИСТОРИЯ ПЛАТЕЖЕЙ по заказу
// ============================================
export const getOrderPayments = async (orderId) => {
    try {
        const result = await pool.query(
            `SELECT * FROM kaspi_payments 
             WHERE order_id = $1 
             ORDER BY created_at DESC`,
            [orderId]
        );
        
        return { success: true, data: result.rows };
        
    } catch (error) {
        return { success: false, error: error.message };
    }
};

export default {
    verifyKaspiConfig,
    createPayment,
    handleCallback,
    checkPaymentStatus,
    getOrderPayments
};
