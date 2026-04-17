# 🔌 API ДЛЯ ФРОНТЕНДА

**URL:** `https://atelier-managment-production.up.railway.app/api`

## CORS - Добавь свой URL

Сообщи свой фронтенд URL и он будет добавлен в whitelist:
- `http://localhost:3000` (React)
- `http://localhost:5173` (Vite)
- `https://your-domain.com` (Production)

Переменная окружения: `CLIENT_URLS=http://localhost:3000,https://your-app.com`

## Аутентификация

```javascript
// POST /api/auth/login
const res = await fetch(`${API}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
const { data: { token, user } } = await res.json();

// Все запросы с токеном:
headers: { 'Authorization': `Bearer ${token}` }
```

## Основные Endpoints

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/customers` | Список клиентов |
| POST | `/customers` | Создать клиента |
| GET | `/orders` | Список заказов |
| POST | `/orders` | Создать заказ |
| PATCH | `/orders/:id/status` | Изменить статус |
| GET | `/fabrics` | Склад тканей |
| GET | `/dashboard/stats` | Статистика |
| GET | `/quotes/:id/pdf` | PDF смета |

## Формат ответа

```json
{
  "success": true,
  "data": { ... },
  "message": "Описание"
}
```

## Поддержка

Backend: Railway (авто-деплой)
Версия API: 2.1.0
