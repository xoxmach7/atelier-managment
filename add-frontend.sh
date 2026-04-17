#!/bin/bash
# ============================================
# БЫСТРОЕ ДОБАВЛЕНИЕ НОВОГО ФРОНТЕНДА
# ============================================

if [ -z "$1" ]; then
    echo "❌ Использование: ./add-frontend.sh <URL>"
    echo "Примеры:"
    echo "  ./add-frontend.sh http://localhost:5173"
    echo "  ./add-frontend.sh https://my-app.vercel.app"
    exit 1
fi

NEW_URL=$1
echo "🌐 Добавление фронтенда: $NEW_URL"

# Читаем текущие URLS
CURRENT_URLS=$(grep "^CLIENT_URLS=" .env | cut -d '=' -f2)

if [ -z "$CURRENT_URLS" ]; then
    # Пусто - просто записываем
    NEW_VALUE="CLIENT_URLS=$NEW_URL"
else
    # Добавляем через запятую
    NEW_VALUE="CLIENT_URLS=$CURRENT_URLS,$NEW_URL"
fi

# Обновляем .env
sed -i "s|^CLIENT_URLS=.*|$NEW_VALUE|" .env

echo "✅ Фронтенд добавлен!"
echo ""
echo "Текущие разрешённые URL:"
echo "$NEW_VALUE" | cut -d '=' -f2 | tr ',' '\n' | sed 's/^/  - /'
echo ""
echo "🚀 Перезапусти сервер для применения изменений:"
echo "  npm run dev"
echo ""
echo "Или если на Railway - переменная обновится автоматически"
