-- ============================================
-- ТЕСТОВЫЕ ПОЛЬЗОВАТЕЛИ (все роли)
-- Пароль для всех: test123
-- ============================================

-- Хеш пароля "test123" (bcrypt с salt 10)
-- $2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi

-- Удаляем тестовых если есть (чтобы не дублировать)
DELETE FROM users WHERE email LIKE '%@test.com';

-- ============================================
-- ADMIN (администратор)
-- ============================================
INSERT INTO users (email, password_hash, full_name, role, phone, is_active, created_at)
VALUES (
    'admin@test.com',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'Администратор Тестовый',
    'admin',
    '+77001111111',
    true,
    NOW()
);

-- ============================================
-- MANAGER (менеджер)
-- ============================================
INSERT INTO users (email, password_hash, full_name, role, phone, is_active, created_at)
VALUES (
    'manager@test.com',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'Менеджер Тестовый',
    'manager',
    '+77002222222',
    true,
    NOW()
);

-- ============================================
-- DESIGNER (дизайнер)
-- ============================================
INSERT INTO users (email, password_hash, full_name, role, phone, is_active, created_at)
VALUES (
    'designer@test.com',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'Дизайнер Тестовый',
    'designer',
    '+77003333333',
    true,
    NOW()
);

-- ============================================
-- SEAMSTRESS (швея)
-- ============================================
INSERT INTO users (email, password_hash, full_name, role, phone, is_active, created_at)
VALUES (
    'seamstress@test.com',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'Швея Тестовая',
    'seamstress',
    '+77004444444',
    true,
    NOW()
);

-- ============================================
-- INSTALLER (установщик)
-- ============================================
INSERT INTO users (email, password_hash, full_name, role, phone, is_active, created_at)
VALUES (
    'installer@test.com',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'Установщик Тестовый',
    'installer',
    '+77005555555',
    true,
    NOW()
);

-- ============================================
-- WAREHOUSE (склад)
-- ============================================
INSERT INTO users (email, password_hash, full_name, role, phone, is_active, created_at)
VALUES (
    'warehouse@test.com',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'Кладовщик Тестовый',
    'warehouse',
    '+77006666666',
    true,
    NOW()
);

-- ============================================
-- PURCHASER (закупщик)
-- ============================================
INSERT INTO users (email, password_hash, full_name, role, phone, is_active, created_at)
VALUES (
    'purchaser@test.com',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'Закупщик Тестовый',
    'purchaser',
    '+77007777777',
    true,
    NOW()
);

-- ============================================
-- ПРОВЕРКА
-- ============================================
SELECT 
    id,
    email,
    full_name,
    role,
    phone,
    is_active,
    created_at
FROM users 
WHERE email LIKE '%@test.com'
ORDER BY id;
