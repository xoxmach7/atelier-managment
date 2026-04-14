-- Добавляем предоплаты и выплаты мастерам

-- Таблица платежей (предоплаты, доплаты)
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    payment_type VARCHAR(50) NOT NULL, -- 'prepayment', 'final', 'additional'
    payment_method VARCHAR(50), -- 'cash', 'card', 'transfer', 'kaspi'
    received_by INTEGER REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Таблица выплат мастерам
CREATE TABLE IF NOT EXISTS seamstress_payments (
    id SERIAL PRIMARY KEY,
    assignment_id INTEGER REFERENCES production_assignments(id) ON DELETE CASCADE,
    seamstress_id INTEGER REFERENCES users(id),
    base_amount DECIMAL(12,2) NOT NULL, -- базовая сумма за заказ
    complexity_bonus DECIMAL(12,2) DEFAULT 0, -- бонус за сложность
    total_amount DECIMAL(12,2) NOT NULL, -- итого к выплате
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'paid', 'cancelled'
    paid_at TIMESTAMP,
    paid_by INTEGER REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Добавляем сложность в сметы (для расчёта стоимости пошива)
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS sewing_complexity VARCHAR(20) DEFAULT 'medium';
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS sewing_cost DECIMAL(12,2) DEFAULT 0;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS accessories_cost DECIMAL(12,2) DEFAULT 0;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS prepayment_amount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS prepayment_received BOOLEAN DEFAULT FALSE;

-- Добавляем статус закупки в заказы
ALTER TABLE orders ADD COLUMN IF NOT EXISTS procurement_status VARCHAR(50);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_seamstress_payments_seamstress_id ON seamstress_payments(seamstress_id);
CREATE INDEX IF NOT EXISTS idx_seamstress_payments_status ON seamstress_payments(status);
