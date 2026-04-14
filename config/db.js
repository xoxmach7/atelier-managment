// ============================================
// КОНФИГУРАЦИЯ ПОДКЛЮЧЕНИЯ К POSTGRESQL
// ============================================
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Конфигурация подключения
// Railway предоставляет DATABASE_URL, локально - отдельные переменные
const getPoolConfig = () => {
    // Если есть DATABASE_URL (Railway, Render, Heroku) - используем его
    if (process.env.DATABASE_URL) {
        // Railway использует внутреннюю сеть - SSL не нужен
        // Но для внешних подключений (Render, Heroku) SSL может быть нужен
        const isRailway = process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_SERVICE_NAME;
        
        return {
            connectionString: process.env.DATABASE_URL,
            ssl: isRailway ? false : (process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false),
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        };
    }
    
    // Локальная разработка - отдельные параметры
    return {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT || 5432,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    };
};

// Создаём пул соединений
const pool = new Pool(getPoolConfig());

// Логирование событий пула
pool.on('connect', () => {
    console.log('🐘 Новое соединение с PostgreSQL');
});

pool.on('error', (err) => {
    console.error('💥 Неожиданная ошибка пула PostgreSQL:', err);
});

// Хелпер для транзакций
export const withTransaction = async (callback) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

// Проверка подключения
export const testConnection = async () => {
    try {
        const result = await pool.query('SELECT NOW() as time, version() as version');
        return {
            connected: true,
            time: result.rows[0].time,
            version: result.rows[0].version
        };
    } catch (error) {
        return {
            connected: false,
            error: error.message
        };
    }
};

export default pool;
