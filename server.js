// ============================================
// ГЛАВНЫЙ ФАЙЛ СЕРВЕРА АТЕЛЬЕ "БРИГАДА"
// ============================================
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import morgan from 'morgan';

// Sentry (должен быть первым!)
import { initSentry, sentryRequestHandler, sentryErrorHandler } from './config/sentry.js';

// Конфигурация
import { testConnection } from './config/db.js';

// Middleware
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { authRateLimiter, apiRateLimiter } from './middleware/rateLimiter.js';

// Роуты
import authRoutes from './routes/authRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import fabricRoutes from './routes/fabricRoutes.js';
import corniceRoutes from './routes/corniceRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import reservationRoutes from './routes/reservationRoutes.js';
import quoteRoutes from './routes/quoteRoutes.js';
import productionRoutes from './routes/productionRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import legalRoutes from './routes/legalRoutes.js';
import onecRoutes from './routes/onecRoutes.js';

// Загружаем переменные окружения
dotenv.config();

const app = express();
// Railway предоставляет PORT, для локальной разработки используем 5001
const PORT = process.env.PORT || 5001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ============================================
// MIDDLEWARE
// ============================================
// ============================================
// CORS - поддержка нескольких фронтендов
// ============================================
// Парсим CLIENT_URLS (через запятую) или используем CLIENT_URL
const parseAllowedOrigins = () => {
    const origins = new Set([
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:8081',
        'https://mobile-dzz0qk5ld-madiabulkanovs-projects.vercel.app',
    ]);
    
    // Основной клиент
    if (process.env.CLIENT_URL) {
        origins.add(process.env.CLIENT_URL);
    }
    
    // Дополнительные клиенты (через запятую)
    if (process.env.CLIENT_URLS) {
        process.env.CLIENT_URLS.split(',').forEach(url => {
            origins.add(url.trim());
        });
    }
    
    return Array.from(origins).filter(Boolean);
};

const allowedOrigins = parseAllowedOrigins();

console.log('🌐 Разрешённые CORS origins:', allowedOrigins);

app.use(cors({
    origin: (origin, callback) => {
        // Разрешаем запросы без origin (curl, Postman, мобильные)
        if (!origin) return callback(null, true);
        
        // В development разрешаем localhost
        if (process.env.NODE_ENV === 'development' && origin.includes('localhost')) {
            return callback(null, true);
        }
        
        // Проверяем whitelist
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        
        // Логируем отклонённые запросы для отладки
        console.warn(`⚠️ CORS отклонён для origin: ${origin}`);
        callback(new Error(`CORS запрещён для origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Парсинг JSON
app.use(express.json());

// Sentry request handler (должен быть первым middleware)
initSentry();
app.use(sentryRequestHandler);

// Логирование запросов
app.use(morgan(NODE_ENV === 'development' ? 'dev' : 'combined'));

// ============================================
// API РОУТЫ
// ============================================
// Строгий лимит для авторизации (защита от брутфорса)
app.use('/api/auth', authRateLimiter, authRoutes);

// Лимит для остальных API
app.use(apiRateLimiter);
app.use('/api/customers', customerRoutes);      // Клиенты
app.use('/api/fabrics', fabricRoutes);          // Склад: ткани
app.use('/api/cornices', corniceRoutes);        // Склад: карнизы
app.use('/api/orders', orderRoutes);            // Заказы
app.use('/api/tasks', taskRoutes);              // Лиды и задачи
app.use('/api/reservations', reservationRoutes); // Бронирование ткани
app.use('/api/quotes', quoteRoutes);            // Сметы и КП
app.use('/api/production', productionRoutes);   // Производство
app.use('/api/payments', paymentRoutes);        // Предоплаты и выплаты
app.use('/api/dashboard', dashboardRoutes);     // Аналитика (только admin)
app.use('/api/legal', legalRoutes);             // Terms, Privacy, Cookies
app.use('/api/onec', onecRoutes);               // 1С интеграция

// ============================================
// БАЗОВЫЕ ЭНДПОИНТЫ
// ============================================
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: '🚀 API Ателье "Бригада" активно!',
        version: '2.1.0',
        workflow: 'Лид → Замер → Смета → Оплата → Производство → Монтаж',
        endpoints: {
            auth: '/api/auth',
            customers: '/api/customers',
            fabrics: '/api/fabrics',
            cornices: '/api/cornices',
            orders: '/api/orders',
            tasks: '/api/tasks (лиды и задачи)',
            reservations: '/api/reservations (бронирование ткани)',
            quotes: '/api/quotes (сметы и калькулятор)'
        }
    });
});

// Health check (для мониторинга Railway)
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});

// Detailed health check (с проверкой БД)
app.get('/health/detailed', async (req, res) => {
    const dbStatus = await testConnection();
    res.json({
        success: true,
        timestamp: new Date().toISOString(),
        database: dbStatus.connected ? 'connected' : 'error',
        ...(dbStatus.error && { db_error: dbStatus.error })
    });
});

// ============================================
// ОБРАБОТКА ОШИБОК
// ============================================
// Sentry error handler (перед основным error handler)
app.use(sentryErrorHandler);

// Обработка ошибок (всегда последние)
app.use(notFoundHandler);
app.use(errorHandler);

// ============================================
// ЗАПУСК СЕРВЕРА
// ============================================
import { runMigrations, cleanupExpiredTokens } from './db/migrations.js';

const startServer = async () => {
    try {
        // Проверяем подключение к БД
        const dbStatus = await testConnection();
        
        if (!dbStatus.connected) {
            console.error('❌ Не удалось подключиться к PostgreSQL:', dbStatus.error);
            process.exit(1);
        }
        
        console.log('🐘 PostgreSQL подключен успешно');
        console.log(`   Время БД: ${dbStatus.time}`);
        
        // Авто-миграции базы данных
        await runMigrations();
        
        // Очистка истёкших токенов
        await cleanupExpiredTokens();
        
        // Запускаем сервер (0.0.0.0 для Railway/Docker)
        app.listen(PORT, '0.0.0.0', () => {
            console.log('\n╔════════════════════════════════════════════════╗');
            console.log('║     🚀 СЕРВЕР АТЕЛЬЕ "БРИГАДА" ЗАПУЩЕН         ║');
            console.log('╠════════════════════════════════════════════════╣');
            console.log(`║  Порт: ${PORT.toString().padEnd(40)} ║`);
            console.log(`║  Режим: ${NODE_ENV.padEnd(39)} ║`);
            console.log(`║  API: http://0.0.0.0:${PORT}/api`.padEnd(52) + ' ║');
            console.log('╚════════════════════════════════════════════════╝\n');
        });
        
    } catch (error) {
        console.error('❌ Ошибка запуска:', error.message);
        process.exit(1);
    }
};

startServer();
