// ============================================
// EMAIL SERVICE - Отправка писем через Resend
// ============================================
import { Resend } from 'resend';
import { pool } from '../config/db.js';

// Инициализация Resend
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';

// Проверка конфигурации
export const verifyEmailConfig = async () => {
    try {
        if (!process.env.RESEND_API_KEY) {
            console.log('⚠️ Resend API Key не настроен (email не будут отправляться)');
            return false;
        }
        // Тестовая отправка
        await resend.emails.send({
            from: FROM_EMAIL,
            to: 'test@example.com',
            subject: 'Test',
            html: '<p>Test</p>'
        });
        console.log('✅ Resend email сервис настроен');
        return true;
    } catch (error) {
        console.log('⚠️ Resend проверка:', error.message);
        return process.env.RESEND_API_KEY ? true : false;
    }
};

// Логирование отправки
const logEmail = async (recipient, subject, template, status, error = null) => {
    try {
        await pool.query(
            `INSERT INTO email_logs (recipient, subject, template, status, error, sent_at)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [recipient, subject, template, status, error, status === 'sent' ? new Date() : null]
        );
    } catch (err) {
        console.error('❌ Ошибка логирования email:', err);
    }
};

// ============================================
// ШАБЛОНЫ EMAIL
// ============================================

const getBaseTemplate = (content) => `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; line-height: 1.6; color: #333; }
        .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 25px; margin: 20px 0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎨 Ателье "Бригада"</h1>
        </div>
        <div class="content">
            ${content}
        </div>
        <div class="footer">
            <p>© 2024 Ателье "Бригада". Все права защищены.</p>
            <p>📍 Алматы, Казахстан</p>
        </div>
    </div>
</body>
</html>
`;

// Шаблон: Сброс пароля
const getPasswordResetTemplate = (resetUrl, userName) => getBaseTemplate(`
    <h2>Сброс пароля</h2>
    <p>Здравствуйте, ${userName || 'пользователь'}!</p>
    <p>Вы запросили сброс пароля для вашего аккаунта в Ателье "Бригада".</p>
    <p>Нажмите кнопку ниже, чтобы установить новый пароль:</p>
    <center>
        <a href="${resetUrl}" class="button">Сбросить пароль</a>
    </center>
    <p>Или скопируйте эту ссылку в браузер:</p>
    <p style="word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 5px;">${resetUrl}</p>
    <p><strong>Ссылка действительна 1 час.</strong></p>
    <p>Если вы не запрашивали сброс пароля, проигнорируйте это письмо.</p>
`);

// Шаблон: Новый заказ
const getNewOrderTemplate = (orderDetails) => getBaseTemplate(`
    <h2>🎉 Новый заказ создан!</h2>
    <p>Здравствуйте, ${orderDetails.customerName}!</p>
    <p>Ваш заказ в Ателье "Бригада" успешно создан.</p>
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Детали заказа:</h3>
        <p><strong>Номер заказа:</strong> #${orderDetails.orderId}</p>
        <p><strong>Сумма:</strong> ${orderDetails.amount} ₸</p>
        <p><strong>Статус:</strong> ${orderDetails.status}</p>
        <p><strong>Дата создания:</strong> ${orderDetails.createdAt}</p>
    </div>
    <p>Мы свяжемся с вами для подтверждения заказа.</p>
`);

// Шаблон: Изменение статуса заказа
const getOrderStatusTemplate = (orderDetails) => getBaseTemplate(`
    <h2>📋 Статус заказа изменён</h2>
    <p>Здравствуйте, ${orderDetails.customerName}!</p>
    <p>Статус вашего заказа #${orderDetails.orderId} был обновлён:</p>
    <div style="background: ${orderDetails.statusColor || '#f8f9fa'}; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
        <h2 style="margin: 0; color: ${orderDetails.statusTextColor || '#333'}">${orderDetails.newStatus}</h2>
    </div>
    <p>${orderDetails.message || 'Спасибо за ваш заказ!'}</p>
`);

// Шаблон: Оплата получена
const getPaymentReceivedTemplate = (paymentDetails) => getBaseTemplate(`
    <h2>💰 Оплата получена</h2>
    <p>Здравствуйте, ${paymentDetails.customerName}!</p>
    <p>Мы получили оплату по заказу #${paymentDetails.orderId}.</p>
    <div style="background: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #155724; margin: 0;">✅ Оплата подтверждена</h3>
        <p style="color: #155724; margin: 10px 0 0 0;"><strong>Сумма:</strong> ${paymentDetails.amount} ₸</p>
        <p style="color: #155724; margin: 5px 0 0 0;"><strong>Способ:</strong> ${paymentDetails.method}</p>
    </div>
    <p>Ваш заказ передан в производство!</p>
`);

// ============================================
// ОТПРАВКА EMAIL
// ============================================

export const sendPasswordReset = async (email, token, userName = '') => {
    const resetUrl = `${process.env.FRONTEND_URL || 'https://atelier-managment-production.up.railway.app'}/reset-password?token=${token}`;
    
    try {
        const { data, error } = await resend.emails.send({
            from: `Ателье Бригада <${FROM_EMAIL}>`,
            to: email,
            subject: '🔐 Сброс пароля - Ателье "Бригада"',
            html: getPasswordResetTemplate(resetUrl, userName)
        });
        
        if (error) throw error;
        
        await logEmail(email, 'Сброс пароля - Ателье "Бригада"', 'password_reset', 'sent');
        console.log('✅ Письмо для сброса пароля отправлено:', email, 'ID:', data?.id);
        return { success: true, id: data?.id };
    } catch (error) {
        await logEmail(email, 'Сброс пароля', 'password_reset', 'failed', error.message);
        console.error('❌ Ошибка отправки письма:', error);
        return { success: false, error: error.message };
    }
};

export const sendNewOrderNotification = async (email, orderDetails) => {
    try {
        const { data, error } = await resend.emails.send({
            from: `Ателье Бригада <${FROM_EMAIL}>`,
            to: email,
            subject: `🎉 Заказ #${orderDetails.orderId} создан - Ателье "Бригада"`,
            html: getNewOrderTemplate(orderDetails)
        });
        
        if (error) throw error;
        
        await logEmail(email, `Заказ #${orderDetails.orderId} создан`, 'new_order', 'sent');
        return { success: true, id: data?.id };
    } catch (error) {
        await logEmail(email, 'Новый заказ', 'new_order', 'failed', error.message);
        return { success: false, error: error.message };
    }
};

export const sendOrderStatusUpdate = async (email, orderDetails) => {
    try {
        const { data, error } = await resend.emails.send({
            from: `Ателье Бригада <${FROM_EMAIL}>`,
            to: email,
            subject: `📋 Статус заказа #${orderDetails.orderId} изменён - Ателье "Бригада"`,
            html: getOrderStatusTemplate(orderDetails)
        });
        
        if (error) throw error;
        
        await logEmail(email, `Статус заказа #${orderDetails.orderId} изменён`, 'status_update', 'sent');
        return { success: true, id: data?.id };
    } catch (error) {
        await logEmail(email, 'Изменение статуса', 'status_update', 'failed', error.message);
        return { success: false, error: error.message };
    }
};

export const sendPaymentConfirmation = async (email, paymentDetails) => {
    try {
        const { data, error } = await resend.emails.send({
            from: `Ателье Бригада <${FROM_EMAIL}>`,
            to: email,
            subject: `💰 Оплата получена - Заказ #${paymentDetails.orderId}`,
            html: getPaymentReceivedTemplate(paymentDetails)
        });
        
        if (error) throw error;
        
        await logEmail(email, `Оплата получена - Заказ #${paymentDetails.orderId}`, 'payment_confirmation', 'sent');
        return { success: true, id: data?.id };
    } catch (error) {
        await logEmail(email, 'Подтверждение оплаты', 'payment_confirmation', 'failed', error.message);
        return { success: false, error: error.message };
    }
};

export default {
    sendPasswordReset,
    sendNewOrderNotification,
    sendOrderStatusUpdate,
    sendPaymentConfirmation,
    verifyEmailConfig
};
