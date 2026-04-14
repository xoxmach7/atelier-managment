// ============================================
// СКРИПТ ИНИЦИАЛИЗАЦИИ БАЗЫ ДАННЫХ
// Выполняет schema.sql для создания таблиц
// ============================================
import pool from '../config/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const initDatabase = async () => {
    try {
        console.log('🔧 Инициализация базы данных...\n');
        
        // Читаем SQL файл
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf-8');
        
        // Выполняем SQL
        await pool.query(schema);
        
        console.log('✅ Таблицы успешно созданы!');
        console.log('\nСозданные таблицы:');
        console.log('  • customers — клиенты');
        console.log('  • fabrics — ткани на складе');
        console.log('  • cornices — карнизы на складе');
        console.log('  • services — услуги (пошив, установка)');
        console.log('  • orders — заказы');
        console.log('  • order_items — позиции заказа');
        console.log('  • measurements — замеры');
        console.log('  • order_status_history — история статусов');
        console.log('  • activity_log — лог действий');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Ошибка инициализации:', error.message);
        process.exit(1);
    }
};

initDatabase();
