# Workflow Ателье "Бригада" v2

## 6 Этапов работы с клиентом

```
┌─────────┐    ┌──────────┐    ┌─────────┐    ┌─────────┐    ┌───────────┐    ┌──────────┐
│  Лид    │───▶│  Замер   │───▶│  Смета  │───▶│  Оплата │───▶│ Производ. │───▶│  Монтаж  │
└─────────┘    └──────────┘    └─────────┘    └─────────┘    └───────────┘    └──────────┘
     │               │              │              │               │              │
     ▼               ▼              ▼              ▼               ▼              ▼
  Task           Measurement    Quote         Payment      Production      Installation
  (lead)         + Photos       (КП)          (предопл)   Assignment     + Photos
```

---

## Этап 1: Лид и Замер

### Сценарий
Клиент позвонил или пришёл в шоурум. Дизайнер создаёт задачу.

### API Запросы

**Создать лид:**
```bash
POST /api/tasks
{
  "client_name": "Анна Петрова",
  "client_phone": "+7(999)555-44-33",
  "client_address": "г. Москва, ул. Ленина 10",
  "source": "instagram",
  "description": "Хочет шторы в гостиную",
  "client_wishes": "Современный стиль, blackout",
  "preferred_date": "2024-01-20",
  "priority": 3
}
```

**Назначить дизайнера:**
```bash
PATCH /api/tasks/1/assign
{ "designer_id": 2 }
```

**Добавить фото:**
```bash
POST /api/tasks/1/photos
{
  "url": "https://storage.com/photo1.jpg",
  "description": "Окно гостиной"
}
```

**Выполнить замер:**
```bash
POST /api/tasks/1/measurements
{
  "room_name": "Гостиная",
  "window_name": "Большое окно",
  "width_cm": 320,
  "height_cm": 240,
  "mounting_type": "потолок",
  "has_radiator": true,
  "obstacles": "Батарея мешает карнизу"
}
```

**Статусы задачи:**
- `lead` → `measurement_scheduled` → `measurement_done`

---

## Этап 2: Подбор материалов и Бронирование

### Сценарий
Дизайнер со клиентом на складе. Сканируют QR на вешалке.

### API Запросы

**Найти ткань по QR:**
```bash
GET /api/fabrics/by-hanger/A-101
```

**Проверить доступность (с учётом броней):**
```bash
GET /api/reservations/availability/1

# Ответ:
{
  "stock_meters": 25.5,
  "reserved_meters": 10.0,      # Уже забронировано
  "available_meters": 15.5       # Доступно для бронирования
}
```

**Забронировать ткань:**
```bash
POST /api/reservations
{
  "task_id": 1,
  "fabric_id": 1,
  "reserved_meters": 8.5,
  "expires_days": 3,  # Бронь на 3 дня
  "notes": "Для штор в гостиную"
}
```

> **Важно:** Бронь НЕ списывает ткань со склада. Ткань остаётся физически, но другой дизайнер видит, что она зарезервирована.

**Список бронирований задачи:**
```bash
GET /api/reservations?task_id=1
```

**Отменить бронь (если клиент передумал):**
```bash
PATCH /api/reservations/1/cancel
{ "reason": "Клиент выбрал другую ткань" }
```

---

## Этап 3: Расчёт сметы (КП)

### Сценарий
Дизайнер рассчитывает материалы и формирует коммерческое предложение.

### API Запросы

**Калькулятор материалов:**
```bash
POST /api/quotes/calculate
{
  "window_width_cm": 320,
  "window_height_cm": 240,
  "fabric_id": 1,
  "sewing_type": "шторы",
  "folds_count": 2
}

# Ответ:
{
  "meters_needed": 7.2,
  "panels_needed": 2,
  "fabric_cost": 32400  # 7.2м × 4500₽
}
```

**Создать смету:**
```bash
POST /api/quotes
{
  "task_id": 1,
  "valid_until": "2024-02-01",
  "estimated_days": 14,
  "internal_notes": "Срочный заказ, делаем в первую очередь",
  "items": [
    {
      "item_type": "fabric",
      "fabric_id": 1,
      "quantity": 7.2,
      "unit_price": 4500,
      "sewing_type": "шторы",
      "window_width_cm": 320,
      "window_height_cm": 240
    },
    {
      "item_type": "cornice",
      "cornice_id": 2,
      "quantity": 1,
      "unit_price": 4500
    },
    {
      "item_type": "service",
      "service_id": 1,
      "quantity": 7.2,
      "unit_price": 1500
    },
    {
      "item_type": "service",
      "service_id": 3,
      "quantity": 1,
      "unit_price": 2500
    }
  ]
}
```

**Отправить КП клиенту:**
```bash
POST /api/quotes/1/send
{
  "send_via": "whatsapp",
  "send_to": "+7(999)555-44-33"
}
```

**Статусы сметы:**
- `draft` → `sent` → `approved` / `rejected`

**Клиент согласовал:**
```bash
POST /api/quotes/1/approve
```

---

## Этап 4: Оплата и Закупка

### Сценарий
Клиент внёс предоплату. Если ткани не хватало — создаётся заявка на закупку.

### API Запросы

**Создать заказ (конвертация из задачи):**
```bash
POST /api/orders
{
  "customer_id": 1,
  "task_id": 1,           # Конвертируем задачу
  "installation_address": "г. Москва, ул. Ленина 10",
  "items": [...]          # Позиции из сметы
}
```

> При создании заказа бронирования автоматически конвертируются в списания.

**Добавить оплату:**
```bash
POST /api/orders/1/payments
{
  "payment_type": "prepayment",
  "method": "card",
  "amount": 25000,
  "notes": "Предоплата 50%"
}
```

**Проверка автозакупки:**
Если при создании заказа ткани не хватало:
```sql
-- Автоматически создаётся запись в fabric_purchases
-- status: 'pending'
-- Закупщик видит в своём дашборде
```

---

## Этап 5: Производство

### Сценарий
Заказ передан в цех. Назначается швея, отслеживается прогресс.

### API Запросы

**Назначить на производство:**
```bash
POST /api/orders/1/production
{
  "assigned_to": 5,        # ID швеи
  "deadline": "2024-01-30",
  "priority": 2,
  "complexity": "medium"
}
```

**Статусы производства:**
- `queued` → `assigned` → `cutting` → `sewing` → `quality_check` → `ready`

**Швея отмечает готово:**
```bash
PATCH /api/production/1/status
{ "status": "ready", "notes": "Проверено, дефектов нет" }
```

---

## Этап 6: Монтаж и Закрытие

### Сценарий
Установщик выезжает к клиенту. Делает фото "до" и "после".

### API Запросы

**Назначить установку:**
```bash
POST /api/orders/1/installation
{
  "scheduled_date": "2024-02-05",
  "scheduled_time": "14:00",
  "installer_id": 3,
  "address": "г. Москва, ул. Ленина 10"
}
```

**Добавить фото установки:**
```bash
POST /api/orders/1/photos
{
  "url": "...",
  "description": "Готовые шторы, вид слева",
  "type": "after_installation"
}
```

**Завершить заказ:**
```bash
PATCH /api/orders/1/status
{ "status": "completed" }
```

**Ткань списывается окончательно** (если не была списана раньше).

---

## Права доступа (Роли)

| Эндпоинт | Admin | Manager | Designer | Seamstress | Installer | Warehouse |
|----------|:-----:|:-------:|:--------:|:----------:|:---------:|:---------:|
| `POST /api/tasks` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `POST /api/reservations` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `POST /api/quotes` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `POST /api/orders` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `POST /api/production` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `PATCH /api/production/:id/status` | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `POST /api/installation` | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `POST /api/fabrics/:id/add-stock` | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## Дашборды по ролям

### Дизайнер
- Мои задачи (`/api/tasks?designer_id=2`)
- Сегодняшние замеры
- КП ждут отправки

### Менеджер
- Все заказы в работе
- Оплаты за сегодня
- Просроченные дедлайны

### Швея
- Мои назначения (`/api/production?assigned_to=5`)
- Срочные заказы

### Склад
- Низкие остатки (`/api/fabrics?low_stock=true`)
- Активные бронирования
- Заявки на закупку

### Установщик
- Заказы на сегодня
- Маршрут по адресам

---

## Полный цикл в одном запросе (для теста)

```bash
# 1. Создаём админа
POST /api/auth/register
{ "email": "admin@brigada.com", "password": "admin123", "full_name": "Админ", "role": "admin" }

# 2. Логинимся
POST /api/auth/login
{ "email": "admin@brigada.com", "password": "admin123" }
# → получаем token

# 3. Создаём задачу (с токеном в header)
POST /api/tasks
Authorization: Bearer <token>
{ "client_name": "Тест", "client_phone": "+7999", "source": "walk_in" }

# 4. Бронируем ткань
POST /api/reservations
{ "task_id": 1, "fabric_id": 1, "reserved_meters": 5 }

# 5. Создаём смету
POST /api/quotes
{ "task_id": 1, "items": [...] }

# 6. Отправляем КП
POST /api/quotes/1/send
{ "send_via": "whatsapp", "send_to": "+7999" }
```
