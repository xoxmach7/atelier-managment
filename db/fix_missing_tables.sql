-- Создание недостающих таблиц для фронтенда

-- Таблица смет (quotes)
CREATE TABLE IF NOT EXISTS quotes (
    id SERIAL PRIMARY KEY,
    task_id INTEGER,
    quote_number VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'draft',
    total_amount DECIMAL(12,2) DEFAULT 0,
    valid_until DATE,
    estimated_days INTEGER,
    internal_notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Позиции сметы
CREATE TABLE IF NOT EXISTS quote_items (
    id SERIAL PRIMARY KEY,
    quote_id INTEGER REFERENCES quotes(id) ON DELETE CASCADE,
    item_type VARCHAR(50) NOT NULL, -- 'fabric', 'cornice', 'sewing', 'accessory'
    description TEXT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    total_price DECIMAL(12,2) NOT NULL,
    fabric_id INTEGER REFERENCES fabrics(id),
    cornice_id INTEGER REFERENCES cornices(id)
);

-- Назначения в производство
CREATE TABLE IF NOT EXISTS production_assignments (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    assigned_to INTEGER REFERENCES users(id),
    deadline DATE,
    priority INTEGER DEFAULT 2,
    complexity VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(50) DEFAULT 'assigned',
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    quality_check_notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Логи производства
CREATE TABLE IF NOT EXISTS production_logs (
    id SERIAL PRIMARY KEY,
    assignment_id INTEGER REFERENCES production_assignments(id),
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    changed_by INTEGER REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_quotes_task_id ON quotes(task_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_production_assignments_order_id ON production_assignments(order_id);
CREATE INDEX IF NOT EXISTS idx_production_assignments_assigned_to ON production_assignments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_production_assignments_status ON production_assignments(status);
