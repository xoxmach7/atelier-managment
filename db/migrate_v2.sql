-- ============================================
-- МИГРАЦИЯ: Добавляем новые таблицы для workflow v2
-- Запускать после базовой schema.sql
-- ============================================

-- ============================================
-- 0. ПОЛЬЗОВАТЕЛИ (если нет)
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'designer', 'manager', 'seamstress', 'installer', 'warehouse', 'purchaser');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'designer',
    phone VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 1. ЗАДАЧИ/ЛИДЫ (расширяем tasks или создаём новые)
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
        CREATE TYPE task_status AS ENUM ('lead', 'contacted', 'measurement_scheduled', 'measurement_done', 
            'quote_preparing', 'quote_sent', 'negotiation', 'converted_to_order', 'lost', 'postponed');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_source') THEN
        CREATE TYPE task_source AS ENUM ('instagram', 'whatsapp', 'phone_call', 'walk_in', 'referral', 'website', 'other');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    task_number VARCHAR(50) UNIQUE NOT NULL,
    client_name VARCHAR(255),
    client_phone VARCHAR(50) NOT NULL,
    client_address TEXT,
    customer_id INTEGER REFERENCES customers(id),
    source task_source DEFAULT 'other',
    status task_status DEFAULT 'lead',
    priority INTEGER DEFAULT 1,
    assigned_designer_id INTEGER,
    preferred_date DATE,
    measurement_date TIMESTAMP,
    deadline DATE,
    description TEXT,
    client_wishes TEXT,
    budget_estimate VARCHAR(100),
    last_contact_at TIMESTAMP,
    next_contact_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by INTEGER
);

-- ============================================
-- 2. ФОТО
-- ============================================
CREATE TABLE IF NOT EXISTS photos (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER NOT NULL,
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    description TEXT,
    taken_by INTEGER,
    taken_at TIMESTAMP DEFAULT NOW(),
    file_size INTEGER,
    mime_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 3. ЗАМЕРЫ (новые, связаны с задачами)
-- ============================================
CREATE TABLE IF NOT EXISTS measurements (
    id SERIAL PRIMARY KEY,
    task_id INTEGER,
    order_id INTEGER,
    room_name VARCHAR(100) NOT NULL,
    window_name VARCHAR(100),
    width_cm INTEGER NOT NULL,
    height_cm INTEGER NOT NULL,
    depth_cm INTEGER,
    ceiling_height_cm INTEGER,
    window_type VARCHAR(50),
    mounting_type VARCHAR(50),
    has_radiator BOOLEAN DEFAULT FALSE,
    has_slope BOOLEAN DEFAULT FALSE,
    obstacles TEXT,
    selected_fabric_id INTEGER REFERENCES fabrics(id),
    selected_cornice_type VARCHAR(100),
    notes TEXT,
    measured_by INTEGER,
    measured_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 4. БРОНИРОВАНИЕ ТКАНИ
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reservation_status') THEN
        CREATE TYPE reservation_status AS ENUM ('active', 'converted', 'cancelled', 'expired');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS fabric_reservations (
    id SERIAL PRIMARY KEY,
    task_id INTEGER,
    fabric_id INTEGER REFERENCES fabrics(id),
    reserved_meters DECIMAL(10,2) NOT NULL,
    status reservation_status DEFAULT 'active',
    reserved_by INTEGER,
    reserved_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    converted_to_order_id INTEGER,
    converted_at TIMESTAMP,
    notes TEXT
);

-- ============================================
-- 5. СМЕТЫ И КП
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quote_status') THEN
        CREATE TYPE quote_status AS ENUM ('draft', 'sent', 'viewed', 'approved', 'rejected', 'expired');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS quotes (
    id SERIAL PRIMARY KEY,
    quote_number VARCHAR(50) UNIQUE NOT NULL,
    task_id INTEGER,
    status quote_status DEFAULT 'draft',
    fabrics_total DECIMAL(12,2) DEFAULT 0,
    cornices_total DECIMAL(12,2) DEFAULT 0,
    services_total DECIMAL(12,2) DEFAULT 0,
    materials_total DECIMAL(12,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL,
    valid_until DATE,
    estimated_days INTEGER,
    sent_via VARCHAR(50),
    sent_at TIMESTAMP,
    sent_to VARCHAR(255),
    client_comment TEXT,
    internal_notes TEXT,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quote_items (
    id SERIAL PRIMARY KEY,
    quote_id INTEGER REFERENCES quotes(id) ON DELETE CASCADE,
    item_type VARCHAR(50) NOT NULL,
    fabric_id INTEGER REFERENCES fabrics(id),
    cornice_id INTEGER REFERENCES cornices(id),
    service_id INTEGER REFERENCES services(id),
    description TEXT,
    quantity DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    sewing_type VARCHAR(100),
    window_width_cm INTEGER,
    window_height_cm INTEGER,
    discount_percent INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0
);

-- ============================================
-- 6. ОПЛАТЫ
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_type') THEN
        CREATE TYPE payment_type AS ENUM ('prepayment', 'final', 'additional');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
        CREATE TYPE payment_method AS ENUM ('cash', 'card', 'transfer', 'kaspi', 'other');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
        CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'cancelled', 'refunded');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    order_id INTEGER,
    payment_type payment_type NOT NULL,
    method payment_method NOT NULL,
    status payment_status DEFAULT 'pending',
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'KZT',
    received_by INTEGER,
    received_at TIMESTAMP,
    receipt_number VARCHAR(100),
    receipt_file_url TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 7. ПРОИЗВОДСТВО
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'production_status') THEN
        CREATE TYPE production_status AS ENUM ('queued', 'assigned', 'cutting', 'sewing', 'quality_check', 'ready', 'returned');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS production_assignments (
    id SERIAL PRIMARY KEY,
    order_id INTEGER,
    assigned_to INTEGER,
    status production_status DEFAULT 'queued',
    assigned_at TIMESTAMP DEFAULT NOW(),
    deadline DATE,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    priority INTEGER DEFAULT 2,
    complexity VARCHAR(50),
    checked_by INTEGER,
    quality_notes TEXT,
    defects_found TEXT,
    actual_fabric_used DECIMAL(10,2),
    created_by INTEGER
);

CREATE TABLE IF NOT EXISTS production_logs (
    id SERIAL PRIMARY KEY,
    assignment_id INTEGER,
    old_status production_status,
    new_status production_status,
    changed_by INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 8. ИСТОРИЯ И УВЕДОМЛЕНИЯ
-- ============================================
CREATE TABLE IF NOT EXISTS task_history (
    id SERIAL PRIMARY KEY,
    task_id INTEGER,
    action VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    performed_by INTEGER,
    performed_at TIMESTAMP DEFAULT NOW(),
    notes TEXT
);

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    entity_type VARCHAR(50),
    entity_id INTEGER,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 9. ЗАКУПКИ ТКАНИ
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'purchase_status') THEN
        CREATE TYPE purchase_status AS ENUM ('pending', 'ordered', 'in_transit', 'received', 'cancelled');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS fabric_purchases (
    id SERIAL PRIMARY KEY,
    task_id INTEGER,
    order_id INTEGER,
    fabric_id INTEGER REFERENCES fabrics(id),
    required_meters DECIMAL(10,2) NOT NULL,
    status purchase_status DEFAULT 'pending',
    priority INTEGER DEFAULT 1,
    supplier_id INTEGER,
    supplier_name VARCHAR(255),
    ordered_at TIMESTAMP,
    expected_delivery DATE,
    received_at TIMESTAMP,
    purchase_price_per_meter DECIMAL(10,2),
    total_purchase_amount DECIMAL(12,2),
    requested_by INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 10. УСЛУГИ (если нет)
-- ============================================
CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    unit VARCHAR(50) NOT NULL,
    price_per_unit DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- ИНДЕКСЫ
-- ============================================
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_designer ON tasks(assigned_designer_id);
CREATE INDEX IF NOT EXISTS idx_fabric_reservations_active ON fabric_reservations(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_quotes_task ON quotes(task_id);
CREATE INDEX IF NOT EXISTS idx_production_assignee ON production_assignments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_production_status ON production_assignments(status);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
