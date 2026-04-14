-- ============================================
-- СХЕМА БАЗЫ ДАННЫХ ДЛЯ АТЕЛЬЕ "БРИГАДА"
-- Пошив штор, продажа тканей, установка карнизов
-- ============================================

-- Перечисления (ENUM)
CREATE TYPE order_status AS ENUM (
    'new',           -- Новый заказ
    'measurement',   -- Назначен замер
    'design',        -- Проектирование
    'fabric_selected', -- Выбрана ткань
    'sewing',        -- Пошив
    'ready',         -- Готово
    'installation',  -- Установка
    'completed',     -- Завершён
    'cancelled'      -- Отменён
);

CREATE TYPE item_type AS ENUM ('fabric', 'cornice', 'service');

-- ============================================
-- 1. КЛИЕНТЫ
-- ============================================
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255),
    address TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 2. СКЛАД: ТКАНИ
-- ============================================
CREATE TABLE fabrics (
    id SERIAL PRIMARY KEY,
    hanger_number VARCHAR(50) UNIQUE NOT NULL,  -- Номер вешалки для QR
    name VARCHAR(255) NOT NULL,
    composition VARCHAR(255),
    width_cm INTEGER,              -- Ширина рулона в см
    stock_meters DECIMAL(10,2) NOT NULL DEFAULT 0,  -- Остаток в метрах
    price_per_meter DECIMAL(10,2) NOT NULL,
    color VARCHAR(100),
    pattern VARCHAR(100),            -- Узор
    supplier VARCHAR(255),           -- Поставщик
    location VARCHAR(50),            -- Расположение на складе
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 3. СКЛАД: КАРНИЗЫ
-- ============================================
CREATE TABLE cornices (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(50) UNIQUE NOT NULL,  -- Артикул
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,       -- Тип: потолочный, настенный, электро, etc
    material VARCHAR(100),            -- Материал: алюминий, пластик, дерево
    color VARCHAR(100),
    length_cm INTEGER,                -- Стандартная длина
    max_load_kg DECIMAL(5,2),         -- Макс. нагрузка
    stock_count INTEGER NOT NULL DEFAULT 0,  -- Количество на складе
    price DECIMAL(10,2) NOT NULL,
    supplier VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 4. УСЛУГИ
-- ============================================
CREATE TABLE services (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,       -- Название: "Пошив портьер", "Установка карниза"
    description TEXT,
    unit VARCHAR(50) NOT NULL,        -- Единица: "метр", "штука", "окно", "выезд"
    price_per_unit DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 5. ЗАКАЗЫ
-- ============================================
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,  -- Номер заказа (О-2024-001)
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    
    -- Адрес установки (может отличаться от адреса клиента)
    installation_address TEXT,
    installation_date DATE,
    
    -- Статус и даты
    status order_status DEFAULT 'new',
    total_amount DECIMAL(12,2) DEFAULT 0,  -- Итоговая сумма
    
    -- Даты
    measurement_date DATE,          -- Дата замера
    planned_completion DATE,          -- Плановая дата готовности
    actual_completion DATE,           -- Фактическая дата
    
    -- Заметки
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 6. ПОЗИЦИИ ЗАКАЗА (что входит в заказ)
-- ============================================
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    item_type item_type NOT NULL,
    
    -- Ссылки на товар (одна из трёх заполнена)
    fabric_id INTEGER REFERENCES fabrics(id),
    cornice_id INTEGER REFERENCES cornices(id),
    service_id INTEGER REFERENCES services(id),
    
    -- Параметры
    quantity DECIMAL(10,2) NOT NULL,  -- Количество (метры, штуки)
    unit_price DECIMAL(10,2) NOT NULL, -- Цена за единицу на момент заказа
    total_price DECIMAL(10,2) NOT NULL, -- Итог по позиции
    
    -- Для ткани: параметры пошива
    sewing_type VARCHAR(100),         -- Тип пошива: "шторы", "тюль", "ламбрекен"
    window_width_cm INTEGER,          -- Ширина окна
    window_height_cm INTEGER,         -- Высота окна
    folds_count INTEGER,              -- Количество складок
    
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 7. ЗАМЕРЫ (детальные размеры окон)
-- ============================================
CREATE TABLE measurements (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    room_name VARCHAR(100),           -- "Гостиная", "Спальня"
    window_name VARCHAR(100),         -- "Окно 1", "Балконная дверь"
    
    -- Размеры в см
    width_cm INTEGER NOT NULL,
    height_cm INTEGER NOT NULL,
    depth_cm INTEGER,                 -- Глубина проёма (для карниза)
    
    -- Тип крепления
    mounting_type VARCHAR(50),        -- "потолок", "стена", "в нишу"
    
    -- Примечания по замеру
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 8. ИСТОРИЯ СТАТУСОВ ЗАКАЗА
-- ============================================
CREATE TABLE order_status_history (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    old_status order_status,
    new_status order_status NOT NULL,
    changed_by VARCHAR(100),          -- Кто изменил (имя пользователя)
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 9. ЛОГ АКТИВНОСТИ
-- ============================================
CREATE TABLE activity_log (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL, -- "order", "customer", "fabric", "cornice"
    entity_id INTEGER NOT NULL,
    action VARCHAR(100) NOT NULL,     -- "created", "updated", "deleted", "status_changed"
    old_values JSONB,                 -- Старые значения
    new_values JSONB,                 -- Новые значения
    performed_by VARCHAR(100),        -- Кто выполнил
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- ИНДЕКСЫ
-- ============================================
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_fabrics_hanger ON fabrics(hanger_number);
CREATE INDEX idx_cornices_sku ON cornices(sku);
CREATE INDEX idx_measurements_order ON measurements(order_id);
CREATE INDEX idx_activity_entity ON activity_log(entity_type, entity_id);
