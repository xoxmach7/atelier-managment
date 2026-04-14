// ============================================
// КОНФИГУРАЦИЯ ПОДКЛЮЧЕНИЯ К POSTGRESQL
// ============================================
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Создаём пул соединений
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
    // Опции для производительности
    max: 20,                    // Максимум соединений
    idleTimeoutMillis: 30000,   // Закрыть неактивное через 30 сек
    connectionTimeoutMillis: 2000, // Таймаут подключения 2 сек
});

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
