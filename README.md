# Бригада v2 — Backend для ателье

API для управления ателье по пошиву штор, продаже тканей и установке карнизов.

## Архитектура проекта

```
brigada-v2/
├── config/
│   └── db.js              # Подключение к PostgreSQL
├── controllers/
│   ├── customerController.js   # Клиенты
│   ├── fabricController.js     # Ткани (склад)
│   ├── corniceController.js    # Карнизы (склад)
│   └── orderController.js      # Заказы (основная логика)
├── routes/
│   ├── customerRoutes.js
│   ├── fabricRoutes.js
│   ├── corniceRoutes.js
│   └── orderRoutes.js
├── middleware/
│   ├── errorHandler.js    # Обработка ошибок
│   └── validator.js       # Валидация запросов
├── db/
│   ├── schema.sql         # SQL-схема базы данных
│   ├── init.js            # Скрипт создания таблиц
│   └── seed.js            # Заполнение тестовыми данными
├── server.js              # Главный файл
└── package.json
```

## Установка и запуск

```bash
# 1. Установка зависимостей
npm install

# 2. Настройка окружения
cp .env.example .env
# Отредактируй .env - укажи свои данные PostgreSQL

# 3. Создание базы данных (в psql)
CREATE DATABASE atelier_db;

# 4. Инициализация таблиц
npm run db:init

# 5. Заполнение тестовыми данными
npm run seed

# 6. Запуск в dev-режиме
npm run dev
```

## API Endpoints

### Клиенты
```
GET    /api/customers              # Список клиентов (с поиском)
GET    /api/customers/:id          # Детали клиента + его заказы
POST   /api/customers              # Создать клиента
PATCH  /api/customers/:id          # Обновить клиента
DELETE /api/customers/:id          # Удалить клиента (если нет заказов)
```

### Ткани (склад)
```
GET    /api/fabrics                # Список тканей
GET    /api/fabrics/:id            # Детали ткани
GET    /api/fabrics/by-hanger/:num # Найти по QR (номер вешалки)
POST   /api/fabrics                # Добавить ткань
PATCH  /api/fabrics/:id            # Обновить ткань
POST   /api/fabrics/:id/add-stock  # Пополнить остаток
DELETE /api/fabrics/:id            # Удалить ткань

# Query params:
?search=бархат     # Поиск по названию
?color=синий       # Фильтр по цвету
?low_stock=true    # Только с остатком < 10м
```

### Карнизы (склад)
```
GET    /api/cornices               # Список карнизов
GET    /api/cornices/:id           # Детали карниза
POST   /api/cornices               # Добавить карниз
PATCH  /api/cornices/:id           # Обновить карниз
DELETE /api/cornices/:id           # Удалить карниз

# Query params:
?type=потолочный   # Фильтр по типу
?material=металл   # Фильтр по материалу
```

### Заказы
```
GET    /api/orders                 # Список заказов
GET    /api/orders/:id             # Детали заказа (всё включено)
POST   /api/orders                 # Создать заказ
PATCH  /api/orders/:id/status     # Изменить статус
POST   /api/orders/:id/measurements # Добавить замер
DELETE /api/orders/:id             # Удалить заказ (только new/cancelled)
```

## Статусы заказа

```
new → measurement → design → fabric_selected → sewing → ready → installation → completed
                         ↘ cancelled (в любой момент)
```

## Пример создания заказа

```bash
curl -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": 1,
    "installation_address": "г. Москва, ул. Ленина 10",
    "measurement_date": "2024-01-15",
    "planned_completion": "2024-02-01",
    "items": [
      {
        "item_type": "fabric",
        "fabric_id": 1,
        "quantity": 6,
        "sewing_type": "шторы",
        "window_width_cm": 300,
        "window_height_cm": 250
      },
      {
        "item_type": "cornice",
        "cornice_id": 1,
        "quantity": 2
      },
      {
        "item_type": "service",
        "service_id": 1,
        "quantity": 6
      }
    ]
  }'
```

## Что исправлено по сравнению с v1

1. **ES modules** — везде `import/export` вместо `require/module.exports`
2. **Правильная архитектура** — разделение на клиентов, заказы и позиции заказа
3. **Карнизы** — отдельная сущность с учётом остатков
4. **Транзакции** — списание со склада атомарно (ROLLBACK при ошибке)
5. **Валидация** — `express-validator` для проверки входных данных
6. **Обработка ошибок** — централизованный errorHandler
7. **ENUM статусы** — типизированные статусы заказа в PostgreSQL
8. **Каскадное удаление** — удаление заказа возвращает товары на склад
