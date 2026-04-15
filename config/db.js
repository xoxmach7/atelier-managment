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
    // Railway предоставляет DATABASE_URL
    if (process.env.DATABASE_URL) {
        return {
            connectionString: process.env.DATABASE_URL,
            ssl: false,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        };
    }
    
    // Fallback: отдельные переменные (PGHOST, PGUSER и т.д.)
    if (process.env.PGHOST || process.env.DB_HOST) {
        return {
            host: process.env.PGHOST || process.env.DB_HOST,
            port: process.env.PGPORT || process.env.DB_PORT || 5432,
            database: process.env.PGDATABASE || process.env.DB_NAME,
            user: process.env.PGUSER || process.env.DB_USER,
            password: process.env.PGPASSWORD || process.env.DB_PASSWORD,
            ssl: false,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        };
    }
    
    // Локальная разработка
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
