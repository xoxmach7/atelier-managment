# Настройка PostgreSQL для Windows

## 1. Проверь что PostgreSQL установлен

Открой PowerShell **от имени администратора** и выполни:

```powershell
# Проверить службу PostgreSQL
Get-Service -Name "postgresql*"

# Если не установлен — скачай с https://www.postgresql.org/download/windows/
```

## 2. Создай базу данных

Открой **SQL Shell (psql)** из меню Пуск → PostgreSQL:

```sql
-- Создаём базу
CREATE DATABASE atelier_db;

-- Создаём пользователя (если хочешь отдельного, а не postgres)
CREATE USER atelier_user WITH PASSWORD 'your_password_here';

-- Даём права
GRANT ALL PRIVILEGES ON DATABASE atelier_db TO atelier_user;

-- Выход
\q
```

## 3. Настрой .env

Открой файл `c:\Users\XoXmach\Desktop\Projects\brigada-v2\.env` и пропиши:

```env
NODE_ENV=development
PORT=5000
JWT_SECRET=your-secret-key-here-change-in-production

# PostgreSQL
DB_USER=postgres
DB_HOST=localhost
DB_NAME=atelier_db
DB_PASSWORD=ВАШ_РЕАЛЬНЫЙ_ПАРОЛЬ_ОТ_POSTGRES
DB_PORT=5432
```

⚠️ **Важно:** `DB_PASSWORD` должен быть тем паролем, который ты указывал при установке PostgreSQL!

## 4. Проверка подключения

```powershell
cd c:\Users\XoXmach\Desktop\Projects\brigada-v2
node -e "
const pool = require('./config/db.js').default;
pool.query('SELECT NOW()').then(r => console.log('✅ Подключено!', r.rows[0])).catch(e => console.error('❌', e.message)).finally(() => process.exit());
"
```

## 5. Создание таблиц

```powershell
node db/init.js
```

Или если не работает:

```powershell
# В psql выполни вручную:
\c atelier_db
\i c:/Users/XoXmach/Desktop/Projects/brigada-v2/db/schema_v2.sql
```

## 6. Запуск

```powershell
npm run dev
```

---

## Альтернатива: Docker (если PostgreSQL не хочешь ставить)

```powershell
# Установи Docker Desktop, потом:
docker run --name atelier-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=atelier_db -p 5432:5432 -d postgres:15

# Тогда в .env:
DB_PASSWORD=postgres
```

---

## Частые ошибки

| Ошибка | Решение |
|--------|---------|
| `password authentication failed` | Неверный пароль в `.env` |
| `database "atelier_db" does not exist` | Не создана база, выполни `CREATE DATABASE` |
| `connect ECONNREFUSED` | PostgreSQL не запущен, проверь службу |
| `role "postgres" does not exist` | Нет такого пользователя, создай или используй существующего |
