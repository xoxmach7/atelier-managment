# 🐳 Docker Развёртывание

## Быстрый старт

```bash
# 1. Клонируйте репозиторий
git clone https://github.com/xoxmach7/atelier-managment.git
cd atelier-managment

# 2. Создайте .env из примера
cp .env.example .env
# Отредактируйте .env, добавьте JWT_SECRET

# 3. Запустите
./deploy.sh
```

## Ручной запуск

```bash
# Сборка и запуск
docker-compose up -d --build

# Логи
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres

# Остановка
docker-compose down

# Пересборка
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## Разработка (hot reload)

```bash
docker-compose -f docker-compose.dev.yml up
```

## Production деплой на сервер

```bash
# На сервере
git clone https://github.com/xoxmach7/atelier-managment.git
cd atelier-managment

# Создайте production .env
nano .env

# Запустите
./deploy.sh
```

## Облачные платформы

### Railway / Render / Fly.io
Поддерживают `docker-compose.yml` из коробки.

### AWS ECS / Google Cloud Run
```bash
# Сборка и пуш в registry
docker build -t your-registry/atelier-backend:latest -f Dockerfile.backend .
docker build -t your-registry/atelier-frontend:latest -f Dockerfile.frontend .
docker push your-registry/atelier-backend:latest
docker push your-registry/atelier-frontend:latest
```

## Переменные окружения

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| `JWT_SECRET` | **Обязательно!** Секретный ключ | - |
| `DB_PASSWORD` | Пароль PostgreSQL | postgres |
| `FRONTEND_PORT` | Порт фронтенда | 80 |
| `DB_PORT` | Порт базы данных | 5432 |

## Технические детали

### Архитектура
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Nginx     │────▶│   Backend   │────▶│  Postgres   │
│  (React)    │     │  (Node.js)  │     │   (SQL)     │
│   :80       │     │   :5001     │     │   :5432     │
└─────────────┘     └─────────────┘     └─────────────┘
```

### Volumes
- `postgres_data` - данные БД (persist)

### Networks
- `atelier-network` - изолированная сеть контейнеров

## Troubleshooting

```bash
# Сброс всего
docker-compose down -v  # удалить volumes
docker system prune -a  # очистить всё

# Проверка БД
docker-compose exec postgres psql -U postgres -d atelier

# Ручная миграция
docker-compose exec backend node migrate.js
```
