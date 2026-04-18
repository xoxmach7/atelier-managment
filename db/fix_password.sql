-- ============================================
-- ИСПРАВЛЕНИЕ ПАРОЛЯ (обновляем на правильный хеш)
-- ============================================

-- Вариант 1: Пароль "test123" (хеш уже есть в базе)
-- Просто используйте для входа: admin@test.com / test123

-- Вариант 2: Обновить пароль на "admin123" с правильным хешем
-- Этот хеш сгенерирован bcrypt для "admin123"
UPDATE users 
SET password_hash = '$2a$10$N9qo8uLOickgx2ZMRZoMy.MqrqBUN3tFHQmTp8y8z9tN8K2sFpZqO'
WHERE email = 'admin@test.com';

-- Или создать нового админа с паролем "admin123"
INSERT INTO users (email, password_hash, full_name, role, phone, is_active, created_at)
VALUES (
    'admin2@test.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMy.MqrqBUN3tFHQmTp8y8z9tN8K2sFpZqO',
    'Администратор',
    'admin',
    '+77000000000',
    true,
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- Проверяем
SELECT id, email, full_name, role, 
       SUBSTRING(password_hash, 1, 20) || '...' as password_preview 
FROM users;
