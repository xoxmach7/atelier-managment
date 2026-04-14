# 🚂 Railway Deployment Guide

## Быстрый старт (3 шага)

### Шаг 1: Подготовка
```bash
# Убедись, что у тебя есть Railway CLI
npm install -g @railway/cli

# Логин
railway login
```

### Шаг 2: Создание проекта
```bash
# В папке проекта
railway init

# Или подключись к существующему
railway link
```

### Шаг 3: Добавление PostgreSQL
```bash
# Создай БД через CLI
railway add --database postgres

# Или через Dashboard:
# 1. Открой https://railway.app/dashboard
# 2. Выбери проект
# 3. Нажми "New" → "Database" → "Add PostgreSQL"
```

## Настройка переменных окружения

Railway автоматически создаёт переменные для БД. Тебе нужно добавить только:

```env
JWT_SECRET=your-super-secret-key-here-min-32-chars
```

**Как добавить:**
1. Открой проект на Railway
2. Перейди в Variables
3. Нажми "New Variable"
4. Имя: `JWT_SECRET`
5. Значение: (сгенерируй случайную строку)

## Деплой Backend

### Вариант 1: Через Dashboard (рекомендуется)

1. **Создай сервис:**
   - Открой проект
   - "New" → "GitHub Repo"
   - Выбери репозиторий `atelier-managment`

2. **Настрой сервис:**
   - Start Command: `node server.js`
   - Healthcheck Path: `/health`

3. **Подключи БД:**
   - Перейди в сервис → Variables
   - Нажми "Add Reference"
   - Выбери созданную PostgreSQL
   - Railway автоматически добавит:
     ```
     DATABASE_URL=postgresql://...
     ```

### Вариант 2: Через CLI

```bash
# Деплой
railway up

# Открой в браузере
railway open
```

## Проблемы и решения

### ❌ "Cannot connect to database"
**Причина:** Не подключена БД к сервису

**Решение:**
1. В Dashboard открой сервис (backend)
2. Перейди во вкладку "Variables"
3. Нажми "Add Reference" → "Database" → выбери PostgreSQL

### ❌ "JWT_SECRET is required"
**Причина:** Не задан JWT_SECRET

**Решение:**
```bash
railway variables set JWT_SECRET="your-secret-key-here"
```

### ❌ "relation 'users' does not exist"
**Причина:** Таблицы не созданы

**Решение:**
```bash
# В Dashboard открой консоль PostgreSQL
# Или через CLI:
railway connect postgres

# Выполни миграции (вручную или создай startup command)
```

## Полная конфигурация для Railway

### 1. Создай сервисы:
- `backend` (из GitHub)
- `postgres` (из Railway Marketplace)

### 2. Настрой Variables для backend:
```
JWT_SECRET=your-secret-key
NODE_ENV=production
PORT=5001
```

### 3. Настрой Networking:
- Backend должен быть публичным (Public)
- Или используй Private если есть frontend

## Деплой Frontend (опционально)

Если нужен отдельный фронтенд:

1. Создай новый сервис
2. Root Directory: `frontend-react`
3. Build Command: `npm run build`
4. Start Command: `npx serve -s dist`
5. Variables:
   ```
   VITE_API_URL=https://your-backend-url.railway.app/api
   ```

## Полезные команды

```bash
# Логи
railway logs

# Переменные
railway variables

# Перезапуск
railway restart

# Консоль БД
railway connect postgres

# Масштабирование
railway scale --replicas 2
```

## Альтернатива: Docker Compose на Railway

Railway поддерживает `docker-compose.yml`:

1. Загрузи `docker-compose.yml` в корень
2. Railway автоматически создаст сервисы
3. Но лучше использовать нативную PostgreSQL Railway

## Ссылки

- Dashboard: https://railway.app/dashboard
- Документация: https://docs.railway.app
- Pricing: https://railway.app/pricing
