#!/bin/bash
# ============================================
# DEPLOY SCRIPT - Ателье "Бригада"
# ============================================

set -e

echo "🚀 Деплой Ателье 'Бригада'"
echo "=========================="

# Проверка .env
if [ ! -f .env ]; then
    echo "❌ Файл .env не найден! Создайте из .env.example"
    exit 1
fi

# Проверка Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен!"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose не установлен!"
    exit 1
fi

# Остановка старых контейнеров
echo "🛑 Остановка старых контейнеров..."
docker-compose down 2>/dev/null || true

# Удаление старых образов (опционально)
if [ "$1" == "--rebuild" ]; then
    echo "🗑️  Удаление старых образов..."
    docker-compose rm -f
    docker system prune -f
fi

# Сборка и запуск
echo "🔨 Сборка образов..."
docker-compose build --no-cache

echo "🚀 Запуск сервисов..."
docker-compose up -d

# Ожидание готовности
echo "⏳ Ожидание готовности..."
sleep 5

# Проверка здоровья
echo "🔍 Проверка здоровья..."
docker-compose ps

# Вывод статуса
echo ""
echo "✅ Деплой завершён!"
echo "=========================="
echo "🌐 Frontend: http://localhost"
echo "🔌 Backend API: http://localhost:5001/api"
echo "🐘 Database: localhost:5432"
echo ""
echo "📋 Команды управления:"
echo "  docker-compose logs -f    # Логи"
echo "  docker-compose down       # Остановка"
echo "  docker-compose ps         # Статус"
echo "=========================="
