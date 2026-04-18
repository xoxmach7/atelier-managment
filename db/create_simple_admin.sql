-- Создаём админа с паролем "123456" (простой пароль для теста)
-- Хеш для "123456":
DELETE FROM users WHERE email = 'admin@test.com';

INSERT INTO users (email, password_hash, full_name, role, phone, is_active, created_at)
VALUES (
    'admin@test.com',
    '$2a$10$O0C.jJQOInJ8QIWKlH/f2uQXSIxUa8sTuhSYD2JoIKqA6h1I29oGK',
    'Администратор',
    'admin',
    '+77000000000',
    true,
    NOW()
);

-- Для входа: admin@test.com / 123456
SELECT id, email, full_name FROM users WHERE email = 'admin@test.com';
