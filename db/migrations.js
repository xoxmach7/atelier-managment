// ============================================
// АВТО-МИГРАЦИИ БАЗЫ ДАННЫХ
// ============================================
import pool from '../config/db.js';

const migrations = [
    {
        name: 'create_base_tables',
        sql: `
            -- ============================================
            -- БАЗОВЫЕ ТАБЛИЦЫ (core schema)
            -- ============================================
            
            -- 1. USERS (сотрудники)
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                full_name VARCHAR(255) NOT NULL,
                role VARCHAR(50) NOT NULL DEFAULT 'manager',
                phone VARCHAR(50),
                is_active BOOLEAN DEFAULT TRUE,
                last_login TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
            CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
            
            -- 2. CUSTOMERS (клиенты)
            CREATE TABLE IF NOT EXISTS customers (
                id SERIAL PRIMARY KEY,
                full_name VARCHAR(255) NOT NULL,
                phone VARCHAR(50) NOT NULL UNIQUE,
                email VARCHAR(255),
                address TEXT,
                notes TEXT,
                source VARCHAR(50) DEFAULT 'walk_in',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
            
            -- 3. FABRICS (ткани)
            CREATE TABLE IF NOT EXISTS fabrics (
                id SERIAL PRIMARY KEY,
                hanger_number VARCHAR(50) UNIQUE NOT NULL,
                name VARCHAR(255) NOT NULL,
                composition VARCHAR(255),
                width_cm INTEGER,
                stock_meters DECIMAL(10,2) NOT NULL DEFAULT 0,
                price_per_meter DECIMAL(10,2) NOT NULL,
                color VARCHAR(100),
                pattern VARCHAR(100),
                supplier VARCHAR(255),
                location VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            -- 4. CORNICES (карнизы)
            CREATE TABLE IF NOT EXISTS cornices (
                id SERIAL PRIMARY KEY,
                sku VARCHAR(50) UNIQUE NOT NULL,
                name VARCHAR(255) NOT NULL,
                type VARCHAR(100) NOT NULL,
                material VARCHAR(100),
                color VARCHAR(100),
                length_cm INTEGER,
                max_load_kg DECIMAL(5,2),
                stock_count INTEGER NOT NULL DEFAULT 0,
                price DECIMAL(10,2) NOT NULL,
                supplier VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            -- 5. SERVICES (услуги)
            CREATE TABLE IF NOT EXISTS services (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                unit VARCHAR(50) NOT NULL,
                price_per_unit DECIMAL(10,2) NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            -- 6. ORDERS (заказы)
            CREATE TABLE IF NOT EXISTS orders (
                id SERIAL PRIMARY KEY,
                order_number VARCHAR(50) UNIQUE NOT NULL,
                customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
                installation_address TEXT,
                installation_date DATE,
                status VARCHAR(50) DEFAULT 'new',
                total_amount DECIMAL(12,2) DEFAULT 0,
                prepaid_amount DECIMAL(12,2) DEFAULT 0,
                created_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
            CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
            CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
            
            -- 7. ORDER_ITEMS (позиции заказа)
            CREATE TABLE IF NOT EXISTS order_items (
                id SERIAL PRIMARY KEY,
                order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
                fabric_id INTEGER REFERENCES fabrics(id),
                cornice_id INTEGER REFERENCES cornices(id),
                service_id INTEGER REFERENCES services(id),
                description TEXT,
                quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
                unit_price DECIMAL(10,2) NOT NULL,
                total_price DECIMAL(10,2) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            -- 8. TASKS (задачи/лиды)
            CREATE TABLE IF NOT EXISTS tasks (
                id SERIAL PRIMARY KEY,
                task_number VARCHAR(50) UNIQUE NOT NULL,
                client_name VARCHAR(255),
                client_phone VARCHAR(50),
                client_address TEXT,
                customer_id INTEGER REFERENCES customers(id),
                source VARCHAR(50) DEFAULT 'walk_in',
                description TEXT,
                status VARCHAR(50) DEFAULT 'lead',
                priority VARCHAR(20) DEFAULT 'normal',
                assigned_designer_id INTEGER REFERENCES users(id),
                created_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            -- 9. MEASUREMENTS (замеры)
            CREATE TABLE IF NOT EXISTS measurements (
                id SERIAL PRIMARY KEY,
                task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
                room_name VARCHAR(100),
                window_name VARCHAR(100),
                width_cm DECIMAL(10,2),
                height_cm DECIMAL(10,2),
                notes TEXT,
                measured_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            -- 10. QUOTES (сметы)
            CREATE TABLE IF NOT EXISTS quotes (
                id SERIAL PRIMARY KEY,
                quote_number VARCHAR(50) UNIQUE NOT NULL,
                task_id INTEGER REFERENCES tasks(id),
                customer_id INTEGER REFERENCES customers(id),
                total_amount DECIMAL(12,2) DEFAULT 0,
                status VARCHAR(50) DEFAULT 'draft',
                valid_until DATE,
                notes TEXT,
                created_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            -- 11. PAYMENTS (платежи)
            CREATE TABLE IF NOT EXISTS payments (
                id SERIAL PRIMARY KEY,
                order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
                amount DECIMAL(12,2) NOT NULL,
                type VARCHAR(50) NOT NULL,
                method VARCHAR(50) NOT NULL,
                notes TEXT,
                received_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            -- 12. PRODUCTION_QUEUE (очередь производства)
            CREATE TABLE IF NOT EXISTS production_queue (
                id SERIAL PRIMARY KEY,
                order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
                order_item_id INTEGER REFERENCES order_items(id),
                status VARCHAR(50) DEFAULT 'pending',
                assigned_seamstress_id INTEGER REFERENCES users(id),
                started_at TIMESTAMP,
                completed_at TIMESTAMP,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `
    },
    {
        name: 'create_password_resets',
        sql: `
            CREATE TABLE IF NOT EXISTS password_resets (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) NOT NULL,
                token VARCHAR(255) NOT NULL UNIQUE,
                expires_at TIMESTAMP NOT NULL,
                used BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
            CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets(email);
        `
    },
    {
        name: 'create_email_logs',
        sql: `
            CREATE TABLE IF NOT EXISTS email_logs (
                id SERIAL PRIMARY KEY,
                recipient VARCHAR(255) NOT NULL,
                subject VARCHAR(255) NOT NULL,
                template VARCHAR(100) NOT NULL,
                status VARCHAR(50) DEFAULT 'pending',
                error TEXT,
                sent_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `
    },
    {
        name: 'create_user_notification_settings',
        sql: `
            CREATE TABLE IF NOT EXISTS user_notification_settings (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                email_order_created BOOLEAN DEFAULT TRUE,
                email_order_status_changed BOOLEAN DEFAULT TRUE,
                email_payment_received BOOLEAN DEFAULT TRUE,
                email_task_assigned BOOLEAN DEFAULT TRUE,
                push_enabled BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id)
            );
            
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql';
            
            DROP TRIGGER IF EXISTS update_user_notification_settings_updated_at ON user_notification_settings;
            CREATE TRIGGER update_user_notification_settings_updated_at
                BEFORE UPDATE ON user_notification_settings
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        `
    },
    {
        name: 'create_order_notifications_log',
        sql: `
            CREATE TABLE IF NOT EXISTS order_notifications (
                id SERIAL PRIMARY KEY,
                order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
                type VARCHAR(50) NOT NULL,
                recipient_email VARCHAR(255),
                status VARCHAR(50) DEFAULT 'pending',
                error TEXT,
                sent_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_order_notifications_order_id ON order_notifications(order_id);
        `
    },
    {
        name: 'add_customer_email_to_orders',
        sql: `
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name='orders' AND column_name='customer_email') THEN
                    ALTER TABLE orders ADD COLUMN customer_email VARCHAR(255);
                END IF;
            END $$;
        `
    },
    {
        name: 'create_login_attempts',
        sql: `
            CREATE TABLE IF NOT EXISTS login_attempts (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) NOT NULL,
                attempts INTEGER DEFAULT 1,
                locked BOOLEAN DEFAULT FALSE,
                ip_address VARCHAR(45),
                last_attempt_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);
            CREATE INDEX IF NOT EXISTS idx_login_attempts_created ON login_attempts(created_at);
        `
    },
    {
        name: 'create_kaspi_payments',
        sql: `
            CREATE TABLE IF NOT EXISTS kaspi_payments (
                id SERIAL PRIMARY KEY,
                order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
                transaction_id VARCHAR(255) NOT NULL UNIQUE,
                kaspi_payment_id VARCHAR(255),
                amount DECIMAL(10, 2) NOT NULL,
                description VARCHAR(255),
                status VARCHAR(50) DEFAULT 'pending',
                customer_phone VARCHAR(20),
                customer_email VARCHAR(255),
                callback_data JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_kaspi_payments_order ON kaspi_payments(order_id);
            CREATE INDEX IF NOT EXISTS idx_kaspi_payments_transaction ON kaspi_payments(transaction_id);
            CREATE INDEX IF NOT EXISTS idx_kaspi_payments_status ON kaspi_payments(status);
        `
    },
    {
        name: 'create_onec_integrations',
        sql: `
            CREATE TABLE IF NOT EXISTS onec_integrations (
                id SERIAL PRIMARY KEY,
                company_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                integration_type VARCHAR(50) NOT NULL DEFAULT 'UNF',
                base_url VARCHAR(500) NOT NULL,
                username VARCHAR(255) NOT NULL,
                password TEXT NOT NULL,
                database_name VARCHAR(255),
                enabled BOOLEAN DEFAULT FALSE,
                sync_settings JSONB DEFAULT '{}',
                last_sync TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(company_id)
            );
            CREATE INDEX IF NOT EXISTS idx_onec_integrations_company ON onec_integrations(company_id);
            CREATE INDEX IF NOT EXISTS idx_onec_integrations_enabled ON onec_integrations(enabled);
        `
    },
    {
        name: 'create_onec_nomenclature',
        sql: `
            CREATE TABLE IF NOT EXISTS onec_nomenclature (
                id SERIAL PRIMARY KEY,
                company_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                onec_id VARCHAR(255) NOT NULL,
                name VARCHAR(500) NOT NULL,
                article VARCHAR(255),
                type VARCHAR(100) DEFAULT 'product',
                unit VARCHAR(50) DEFAULT 'шт',
                price DECIMAL(12, 2) DEFAULT 0,
                onec_data JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(company_id, onec_id)
            );
            CREATE INDEX IF NOT EXISTS idx_onec_nomenclature_company ON onec_nomenclature(company_id);
            CREATE INDEX IF NOT EXISTS idx_onec_nomenclature_onec_id ON onec_nomenclature(onec_id);
            CREATE INDEX IF NOT EXISTS idx_onec_nomenclature_type ON onec_nomenclature(type);
        `
    },
    {
        name: 'create_onec_sync_logs',
        sql: `
            CREATE TABLE IF NOT EXISTS onec_sync_logs (
                id SERIAL PRIMARY KEY,
                company_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                entity_type VARCHAR(100) NOT NULL,
                synced_count INTEGER DEFAULT 0,
                status VARCHAR(50) NOT NULL,
                error_message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_onec_sync_logs_company ON onec_sync_logs(company_id);
            CREATE INDEX IF NOT EXISTS idx_onec_sync_logs_created ON onec_sync_logs(created_at);
        `
    },
    {
        name: 'add_onec_fields_to_orders',
        sql: `
            ALTER TABLE orders 
            ADD COLUMN IF NOT EXISTS onec_id VARCHAR(255),
            ADD COLUMN IF NOT EXISTS onec_synced_at TIMESTAMP,
            ADD COLUMN IF NOT EXISTS onec_error TEXT;
            
            CREATE INDEX IF NOT EXISTS idx_orders_onec_id ON orders(onec_id);
        `
    },
    {
        name: 'add_company_id_to_customers',
        sql: `
            ALTER TABLE customers 
            ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES users(id);
            
            CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(company_id);
        `
    }
];

// Таблица для отслеживания выполненных миграций
const createMigrationsTable = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE,
            executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);
};

// Проверка, была ли миграция выполнена
const isMigrationExecuted = async (name) => {
    const result = await pool.query(
        'SELECT 1 FROM schema_migrations WHERE name = $1',
        [name]
    );
    return result.rows.length > 0;
};

// Запись о выполненной миграции
const recordMigration = async (name) => {
    await pool.query(
        'INSERT INTO schema_migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
        [name]
    );
};

// Выполнение всех pending миграций
export const runMigrations = async () => {
    console.log('🔄 Запуск миграций базы данных...');
    
    try {
        await createMigrationsTable();
        
        let executedCount = 0;
        
        for (const migration of migrations) {
            const isExecuted = await isMigrationExecuted(migration.name);
            
            if (!isExecuted) {
                console.log(`   📦 Выполняется: ${migration.name}`);
                
                try {
                    await pool.query(migration.sql);
                    await recordMigration(migration.name);
                    console.log(`   ✅ ${migration.name} выполнена`);
                    executedCount++;
                } catch (error) {
                    console.error(`   ❌ Ошибка в миграции ${migration.name}:`, error.message);
                    // Продолжаем с другими миграциями, не прерываем
                }
            }
        }
        
        if (executedCount === 0) {
            console.log('   ✅ Все миграции уже выполнены');
        } else {
            console.log(`   ✅ Выполнено ${executedCount} миграций`);
        }
        
        return true;
    } catch (error) {
        console.error('❌ Ошибка при выполнении миграций:', error.message);
        return false;
    }
};

// Очистка старых токенов сброса пароля
export const cleanupExpiredTokens = async () => {
    try {
        const result = await pool.query(`
            DELETE FROM password_resets 
            WHERE expires_at < CURRENT_TIMESTAMP 
               OR (used = TRUE AND created_at < CURRENT_TIMESTAMP - INTERVAL '1 hour')
        `);
        
        if (result.rowCount > 0) {
            console.log(`🧹 Очищено ${result.rowCount} истёкших токенов`);
        }
    } catch (error) {
        console.error('❌ Ошибка очистки токенов:', error.message);
    }
};

export default { runMigrations, cleanupExpiredTokens };
