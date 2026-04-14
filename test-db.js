// Тест подключения к БД
import pool from './config/db.js';

console.log('Проверка подключения...');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD установлен:', process.env.DB_PASSWORD ? 'Да' : 'НЕТ');

try {
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Подключение успешно!');
    console.log('Время БД:', result.rows[0].now);
    process.exit(0);
} catch (error) {
    console.error('❌ Ошибка подключения:', error.message);
    process.exit(1);
}
