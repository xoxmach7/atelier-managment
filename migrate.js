import pool from './config/db.js'

const migrations = [
  // Quotes table
  `CREATE TABLE IF NOT EXISTS quotes (
    id SERIAL PRIMARY KEY,
    task_id INTEGER,
    quote_number VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'draft',
    total_amount DECIMAL(12,2) DEFAULT 0,
    valid_until DATE,
    estimated_days INTEGER,
    internal_notes TEXT,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`,

  // Quote items
  `CREATE TABLE IF NOT EXISTS quote_items (
    id SERIAL PRIMARY KEY,
    quote_id INTEGER,
    item_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    total_price DECIMAL(12,2) NOT NULL,
    fabric_id INTEGER,
    cornice_id INTEGER
  )`,

  // Production assignments
  `CREATE TABLE IF NOT EXISTS production_assignments (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    assigned_to INTEGER,
    deadline DATE,
    priority INTEGER DEFAULT 2,
    complexity VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(50) DEFAULT 'assigned',
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    quality_check_notes TEXT,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
  )`,

  // Production logs
  `CREATE TABLE IF NOT EXISTS production_logs (
    id SERIAL PRIMARY KEY,
    assignment_id INTEGER,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    changed_by INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  )`,
]

async function runMigrations() {
  try {
    for (const sql of migrations) {
      await pool.query(sql)
      console.log('✅ Таблица создана/проверена')
    }
    console.log('\n🎉 Все таблицы готовы!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Ошибка миграции:', error.message)
    process.exit(1)
  }
}

runMigrations()
