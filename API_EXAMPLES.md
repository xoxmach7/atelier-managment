# Примеры запросов к API

## Базовый URL
```
http://localhost:5000/api
```

---

## 1. КЛИЕНТЫ

### Создать клиента
```bash
curl -X POST http://localhost:5000/api/customers \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Петрова Анна Сергеевна",
    "phone": "+7(999)555-44-33",
    "email": "anna@mail.ru",
    "address": "г. Москва, ул. Пушкина 25, кв. 12",
    "notes": "Аллергия на синтетику"
  }'
```

**Ответ:**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "full_name": "Петрова Анна Сергеевна",
    "phone": "+7(999)555-44-33",
    "created_at": "2024-01-15T10:30:00.000Z"
  }
}
```

### Поиск клиентов
```bash
# Поиск по имени или телефону
curl "http://localhost:5000/api/customers?search=анна"

# Пагинация
curl "http://localhost:5000/api/customers?limit=10&offset=0"
```

### Получить клиента с заказами
```bash
curl http://localhost:5000/api/customers/1
```

---

## 2. ТКАНИ (СКЛАД)

### Добавить новую ткань
```bash
curl -X POST http://localhost:5000/api/fabrics \
  -H "Content-Type: application/json" \
  -d '{
    "hanger_number": "Z-999",
    "name": "Велюр Premium Green",
    "composition": "100% Polyester",
    "width_cm": 280,
    "stock_meters": 35.5,
    "price_per_meter": 5200,
    "color": "Зелёный",
    "pattern": "Однотонный",
    "supplier": "Турция",
    "location": "Склад А, стеллаж 3"
  }'
```

### Найти по QR (номер вешалки)
```bash
# Сканер QR читает "A-101" и делает запрос:
curl http://localhost:5000/api/fabrics/by-hanger/A-101
```

**Ответ для мобильного сканера:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "hanger_number": "A-101",
    "name": "Бархат Royal Blue",
    "stock_meters": 25.50,
    "price_per_meter": 4500,
    "color": "Синий",
    "composition": "100% Polyester",
    "width_cm": 280
  }
}
```

### Пополнить остаток (приход на склад)
```bash
curl -X POST http://localhost:5000/api/fabrics/1/add-stock \
  -H "Content-Type: application/json" \
  -d '{"amount": 15.5}'
```

### Фильтры для склада
```bash
# Низкий остаток (менее 10м)
curl "http://localhost:5000/api/fabrics?low_stock=true"

# Поиск по названию
curl "http://localhost:5000/api/fabrics?search=бархат"

# Фильтр по цвету
curl "http://localhost:5000/api/fabrics?color=синий"

# Комбинированный поиск
curl "http://localhost:5000/api/fabrics?search=лен&min_stock=10"
```

---

## 3. КАРНИЗЫ

### Добавить карниз
```bash
curl -X POST http://localhost:5000/api/cornices \
  -H "Content-Type: application/json" \
  -d '{
    "sku": "CRN-010",
    "name": "Потолочный двухрядный 3м",
    "type": "потолочный",
    "material": "алюминий",
    "color": "белый",
    "length_cm": 300,
    "max_load_kg": 20,
    "stock_count": 8,
    "price": 6200,
    "supplier": "Россия"
  }'
```

### Фильтр по типу
```bash
curl "http://localhost:5000/api/cornices?type=потолочный"
curl "http://localhost:5000/api/cornices?material=металл"
```

---

## 4. ЗАКАЗЫ (основное)

### Создать заказ с тканями и услугами
```bash
curl -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": 2,
    "installation_address": "г. Москва, ул. Пушкина 25, кв. 12",
    "measurement_date": "2024-01-20",
    "planned_completion": "2024-02-10",
    "notes": "Детская комната, безопасные материалы",
    "items": [
      {
        "item_type": "fabric",
        "fabric_id": 3,
        "quantity": 5.5,
        "sewing_type": "шторы",
        "window_width_cm": 180,
        "window_height_cm": 220,
        "folds_count": 2
      },
      {
        "item_type": "fabric",
        "fabric_id": 4,
        "quantity": 6,
        "sewing_type": "тюль",
        "window_width_cm": 180,
        "window_height_cm": 220
      },
      {
        "item_type": "cornice",
        "cornice_id": 2,
        "quantity": 1
      },
      {
        "item_type": "service",
        "service_id": 1,
        "quantity": 5.5
      },
      {
        "item_type": "service",
        "service_id": 2,
        "quantity": 6
      },
      {
        "item_type": "service",
        "service_id": 3,
        "quantity": 1
      }
    ]
  }'
```

**Что происходит:**
1. Создаётся заказ №О-2024-002
2. Со склада списывается 5.5м ткани #3 и 6м ткани #4
3. Со склада списывается 1 карниз #2
4. Рассчитывается итоговая сумма (автоматически)

### Получить заказ полностью
```bash
curl http://localhost:5000/api/orders/1
```

**Ответ содержит:**
- Данные заказа + клиента
- Массив items с тканями/карнизами/услугами
- Замеры
- История статусов

### Изменить статус заказа
```bash
curl -X PATCH http://localhost:5000/api/orders/1/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "sewing",
    "notes": "Ткань отрезана, начат пошив"
  }'
```

### Добавить замер к заказу
```bash
curl -X POST http://localhost:5000/api/orders/1/measurements \
  -H "Content-Type: application/json" \
  -d '{
    "room_name": "Детская",
    "window_name": "Окно угловое",
    "width_cm": 180,
    "height_cm": 220,
    "depth_cm": 12,
    "mounting_type": "потолок",
    "notes": "Нужен двухрядный карниз"
  }'
```

### Фильтр заказов по статусу
```bash
# Все в работе
curl "http://localhost:5000/api/orders?status=sewing"

# Новые заказы
curl "http://localhost:5000/api/orders?status=new"

# По клиенту
curl "http://localhost:5000/api/orders?customer_id=1"

# Поиск по номеру заказа
curl "http://localhost:5000/api/orders?search=О-2024"
```

---

## 5. МОБИЛЬНЫЙ СКАНЕР (QR)

### Сценарий использования
1. Работник склада сканирует QR на вешалке
2. QR содержит: `https://atelier.ru/fabric/A-101` или просто `A-101`
3. Мобильное приложение делает запрос:
```bash
curl http://localhost:5000/api/fabrics/by-hanger/A-101
```
4. На экране отображается:
   - Название ткани
   - Остаток в метрах
   - Цена
   - Кнопки: "Пополнить", "Посмотреть заказы"

---

## Ошибки и их обработка

### Недостаточно ткани
```bash
curl -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": 1,
    "items": [{"item_type": "fabric", "fabric_id": 7, "quantity": 100}]
  }'
```

**Ответ 400:**
```json
{
  "success": false,
  "error": {
    "message": "Недостаточно ткани на склаке. В наличии: 8.5м"
  }
}
```

### Валидация
```bash
curl -X POST http://localhost:5000/api/customers \
  -H "Content-Type: application/json" \
  -d '{"full_name": "", "phone": "не телефон"}'
```

**Ответ 400:**
```json
{
  "success": false,
  "error": {
    "message": "Ошибка валидации данных",
    "details": [
      { "field": "full_name", "message": "ФИО обязательно" },
      { "field": "phone", "message": "Неверный формат телефона" }
    ]
  }
}
```
