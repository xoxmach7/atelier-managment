-- ============================================
-- РАСШИРЕННАЯ СХЕМА ДЛЯ WORKFLOW АТЕЛЬЕ v2
-- 6 этапов: Лид → Замер → Смета → Оплата → Производство → Монтаж
-- ============================================

-- ============================================
-- 0. ПОЛЬЗОВАТЕЛИ И РОЛИ (JWT)
-- ============================================
CREATE TYPE user_role AS ENUM (
    'admin',        -- Полный доступ
    'designer',     -- Дизайнер (лиды, замеры, сметы)
    'manager',      -- Менеджер (заказы, оплаты)
    'seamstress',   -- Швея (только производство)
    'installer',    -- Установщик (монтаж)
    'warehouse',    -- Склад (ткани, карнизы)
    'purchaser'     -- Закупщик (закупки ткани)
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,  -- bcrypt hash
    full_name VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'designer',
    phone VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 1. ЛИДЫ И ЗАДАЧИ (Этап 1: Заявка и Замер)
-- ============================================
CREATE TYPE task_status AS ENUM (
    'lead',          -- Новый лид (только контакт)
    'contacted',     -- Связались с клиентом
    'measurement_scheduled', -- Назначен замер
    'measurement_done',      -- Замер выполнен
    'quote_preparing',       -- Готовится смета
    'quote_sent',            -- КП отправлено
    'negotiation',           -- Переговоры
    'converted_to_order',    -- Переведён в заказ
    'lost',                  -- Отказ/проигран
    'postponed'              -- Отложен
);

CREATE TYPE task_source AS ENUM (
    'instagram', 'whatsapp', 'phone_call', 
    'walk_in', 'referral', 'website', 'other'
);

CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    task_number VARCHAR(50) UNIQUE NOT NULL,  -- З-2024-001
    
    -- Клиент (может быть без регистрации на старте)
    client_name VARCHAR(255),
    client_phone VARCHAR(50) NOT NULL,
    client_address TEXT,
    
    -- Или ссылка на существующего клиента
    customer_id INTEGER REFERENCES customers(id),
    
    -- Источник и статус
    source task_source DEFAULT 'other',
    status task_status DEFAULT 'lead',
    priority INTEGER DEFAULT 1,  -- 1-5, 5 = срочно
    
    -- Назначенный дизайнер
    assigned_designer_id INTEGER REFERENCES users(id),
    
    -- Даты
    preferred_date DATE,         -- Желаемая дата клиента
    measurement_date TIMESTAMP,  -- Назначенный замер
    deadline DATE,               -- Дедлайн по задаче
    
    -- Описание
    description TEXT,
    client_wishes TEXT,          -- Пожелания клиента
    budget_estimate VARCHAR(100), -- "до 100к", "50-80к"
    
    -- Коммуникация
    last_contact_at TIMESTAMP,
    next_contact_date DATE,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id)
);

-- ============================================
-- 2. ФОТОГРАФИИ (к задачам, заказам, тканям)
-- ============================================
CREATE TABLE photos (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,  -- 'task', 'order', 'fabric', 'measurement'
    entity_id INTEGER NOT NULL,
    
    url TEXT NOT NULL,               -- URL файла (S3/локально)
    thumbnail_url TEXT,              -- Превью для списка
    
    description TEXT,                -- "Окно гостиной", "Цвет в реальном освещении"
    taken_by INTEGER REFERENCES users(id),
    taken_at TIMESTAMP DEFAULT NOW(),
    
    -- Метаданные
    file_size INTEGER,               -- в байтах
    mime_type VARCHAR(50),
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 3. ЗАМЕРЫ (детальные размеры окон в задаче)
-- ============================================
CREATE TABLE measurements (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    
    room_name VARCHAR(100) NOT NULL,     -- "Гостиная", "Спальня"
    window_name VARCHAR(100),            -- "Окно 1", "Балкон"
    
    -- Размеры в см
    width_cm INTEGER NOT NULL,
    height_cm INTEGER NOT NULL,
    depth_cm INTEGER,                    -- Глубина проёма
    ceiling_height_cm INTEGER,           -- Высота потолка
    
    -- Типы
    window_type VARCHAR(50),             -- "прямое", "эркер", "балкон"
    mounting_type VARCHAR(50),           -- "потолок", "стена", "в нишу"
    
    -- Технические особенности
    has_radiator BOOLEAN DEFAULT FALSE,
    has_slope BOOLEAN DEFAULT FALSE,     -- Откосы
    obstacles TEXT,                      -- "Батарея мешает", "Выступ 5см"
    
    -- Выбранные параметры
    selected_fabric_id INTEGER REFERENCES fabrics(id),
    selected_cornice_type VARCHAR(100),
    
    notes TEXT,
    measured_by INTEGER REFERENCES users(id),
    measured_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 4. БРОНИРОВАНИЕ ТКАНИ (резерв без списания)
-- ============================================
CREATE TYPE reservation_status AS ENUM (
    'active',     -- Забронировано
    'converted',  -- Переведено в заказ (списано)
    'cancelled',  -- Бронь отменена
    'expired'     -- Истекло (например, 3 дня)
);

CREATE TABLE fabric_reservations (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    fabric_id INTEGER REFERENCES fabrics(id),
    
    reserved_meters DECIMAL(10,2) NOT NULL,
    status reservation_status DEFAULT 'active',
    
    reserved_by INTEGER REFERENCES users(id),
    reserved_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,  -- Автоотмена через N дней
    
    -- Когда перевели в заказ
    converted_to_order_id INTEGER,
    converted_at TIMESTAMP,
    
    notes TEXT
);

-- Триггер: при бронировании проверяем доступность
-- (реализуем в приложении или отдельной функцией)

-- ============================================
-- 5. СМЕТЫ И КОММЕРЧЕСКИЕ ПРЕДЛОЖЕНИЯ (КП)
-- ============================================
CREATE TYPE quote_status AS ENUM (
    'draft',      -- Черновик
    'sent',       -- Отправлено клиенту
    'viewed',     -- Клиент открыл
    'approved',   -- Клиент согласовал
    'rejected',   -- Отклонено
    'expired'     -- Просрочено
);

CREATE TABLE quotes (
    id SERIAL PRIMARY KEY,
    quote_number VARCHAR(50) UNIQUE NOT NULL,  -- КП-2024-001
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    
    status quote_status DEFAULT 'draft',
    
    -- Суммы
    fabrics_total DECIMAL(12,2) DEFAULT 0,      -- Ткани
    cornices_total DECIMAL(12,2) DEFAULT 0,     -- Карнизы
    services_total DECIMAL(12,2) DEFAULT 0,     -- Услуги (пошив, монтаж)
    materials_total DECIMAL(12,2) DEFAULT 0,    -- Фурнитура, крючки
    discount_amount DECIMAL(12,2) DEFAULT 0,   -- Скидка
    total_amount DECIMAL(12,2) NOT NULL,         -- Итого
    
    -- Сроки
    valid_until DATE,                           -- КП действует до
    estimated_days INTEGER,                     -- Срок выполнения (дней)
    
    -- Отправка
    sent_via VARCHAR(50),                       -- "whatsapp", "email", "telegram"
    sent_at TIMESTAMP,
    sent_to VARCHAR(255),                       -- Куда отправили
    
    -- Примечания
    client_comment TEXT,                        -- Комментарий клиента
    internal_notes TEXT,                        -- Внутренние заметки
    
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Позиции сметы
CREATE TABLE quote_items (
    id SERIAL PRIMARY KEY,
    quote_id INTEGER REFERENCES quotes(id) ON DELETE CASCADE,
    
    item_type item_type NOT NULL,  -- 'fabric', 'cornice', 'service'
    
    -- Ссылки
    fabric_id INTEGER REFERENCES fabrics(id),
    cornice_id INTEGER REFERENCES cornices(id),
    service_id INTEGER REFERENCES services(id),
    
    -- Параметры
    description TEXT,             -- Название для клиента
    quantity DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    
    -- Для ткани
    sewing_type VARCHAR(100),      -- "шторы", "тюль", "ламбрекен"
    window_width_cm INTEGER,
    window_height_cm INTEGER,
    
    -- Скидка на позицию
    discount_percent INTEGER DEFAULT 0,
    
    sort_order INTEGER DEFAULT 0
);

-- ============================================
-- 6. ОПЛАТЫ
-- ============================================
CREATE TYPE payment_type AS ENUM ('prepayment', 'final', 'additional');
CREATE TYPE payment_method AS ENUM ('cash', 'card', 'transfer', 'kaspi', 'other');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'cancelled', 'refunded');

CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    
    payment_type payment_type NOT NULL,
    method payment_method NOT NULL,
    status payment_status DEFAULT 'pending',
    
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'KZT',
    
    -- Детали
    received_by INTEGER REFERENCES users(id),
    received_at TIMESTAMP,
    
    -- Документ
    receipt_number VARCHAR(100),
    receipt_file_url TEXT,
    
    -- Примечание
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 7. АВТОЗАКУП ТКАНИ (когда нет на складе)
-- ============================================
CREATE TYPE purchase_status AS ENUM (
    'pending',      -- Ожидает закупки
    'ordered',      -- Заказано у поставщика
    'in_transit',   -- В пути
    'received',     -- Получено на склад
    'cancelled'     -- Отменено
);

CREATE TABLE fabric_purchases (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id),
    order_id INTEGER REFERENCES orders(id),
    
    fabric_id INTEGER REFERENCES fabrics(id),
    required_meters DECIMAL(10,2) NOT NULL,
    
    status purchase_status DEFAULT 'pending',
    priority INTEGER DEFAULT 1,  -- 1-5
    
    -- Закупка
    supplier_id INTEGER,  -- references suppliers (если создашь таблицу)
    supplier_name VARCHAR(255),
    ordered_at TIMESTAMP,
    expected_delivery DATE,
    received_at TIMESTAMP,
    
    -- Финансы
    purchase_price_per_meter DECIMAL(10,2),
    total_purchase_amount DECIMAL(12,2),
    
    requested_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 8. ПРОИЗВОДСТВО (Цех)
-- ============================================
CREATE TYPE production_status AS ENUM (
    'queued',        -- В очереди
    'assigned',      -- Назначена швея
    'cutting',       -- Раскрой
    'sewing',        -- Пошив
    'quality_check', -- Проверка качества
    'ready',         -- Готово к установке
    'returned'       -- Возврат на доработку
);

CREATE TABLE production_assignments (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    
    assigned_to INTEGER REFERENCES users(id),  -- Швея
    status production_status DEFAULT 'queued',
    
    -- Сроки
    assigned_at TIMESTAMP DEFAULT NOW(),
    deadline DATE,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Детали
    priority INTEGER DEFAULT 2,
    complexity VARCHAR(50),  -- "simple", "medium", "complex"
    
    -- Контроль качества
    checked_by INTEGER REFERENCES users(id),
    quality_notes TEXT,
    defects_found TEXT,
    
    -- Списание материалов (фактическое)
    actual_fabric_used DECIMAL(10,2),
    
    created_by INTEGER REFERENCES users(id)
);

-- Лог изменений статуса производства
CREATE TABLE production_logs (
    id SERIAL PRIMARY KEY,
    assignment_id INTEGER REFERENCES production_assignments(id),
    old_status production_status,
    new_status production_status,
    changed_by INTEGER REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 9. ОБНОВЛЁННЫЕ ЗАКАЗЫ (финальный этап)
-- ============================================
-- Расширяем существующую таблицу orders через ALTER TABLE
-- или создаём связанные данные

CREATE TABLE order_installations (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    
    scheduled_date DATE,
    scheduled_time TIME,
    
    installer_id INTEGER REFERENCES users(id),
    
    -- Адрес (может отличаться от изначального)
    address TEXT,
    client_phone VARCHAR(50),
    
    -- Статус
    status VARCHAR(50) DEFAULT 'scheduled',  -- scheduled, in_progress, completed, cancelled
    
    -- Выполнение
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Фото установки
    before_photos INTEGER[],  -- IDs из photos
    after_photos INTEGER[],
    
    -- Примечания
    client_signed BOOLEAN DEFAULT FALSE,  -- Подпись клиента получена
    installation_notes TEXT,
    issues_encountered TEXT,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 10. ИСТОРИЯ И ЛОГИ
-- ============================================
CREATE TABLE task_history (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    
    action VARCHAR(100) NOT NULL,  -- 'status_changed', 'assigned', 'measurement_added'
    old_value TEXT,
    new_value TEXT,
    
    performed_by INTEGER REFERENCES users(id),
    performed_at TIMESTAMP DEFAULT NOW(),
    notes TEXT
);

-- Уведомления пользователям
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    
    title VARCHAR(255) NOT NULL,
    message TEXT,
    
    entity_type VARCHAR(50),  -- 'task', 'order', 'production'
    entity_id INTEGER,
    
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- ИНДЕКСЫ
-- ============================================
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_designer ON tasks(assigned_designer_id);
CREATE INDEX idx_tasks_phone ON tasks(client_phone);
CREATE INDEX idx_fabric_reservations_active ON fabric_reservations(status) WHERE status = 'active';
CREATE INDEX idx_quotes_task ON quotes(task_id);
CREATE INDEX idx_production_assignee ON production_assignments(assigned_to);
CREATE INDEX idx_production_status ON production_assignments(status);
CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
