# Идеи для развития приложения Ателье

## 1. МОБИЛЬНЫЙ СКАНЕР ✅ (уже сделан прототип)
- QR-коды на вешалках с тканью
- Сканер на HTML5-QRCode (работает в браузере телефона)
- Быстрый просмотр остатков и пополнение

---

## 2. АНАЛИТИКА И ОТЧЁТЫ

### Дашборд для руководителя
```sql
-- Выручка по месяцам
SELECT DATE_TRUNC('month', created_at) as month, 
       SUM(total_amount) as revenue,
       COUNT(*) as orders_count
FROM orders WHERE status = 'completed'
GROUP BY month ORDER BY month;

-- Популярные ткани
SELECT f.name, SUM(oi.quantity) as total_meters
FROM order_items oi
JOIN fabrics f ON oi.fabric_id = f.id
GROUP BY f.id ORDER BY total_meters DESC LIMIT 10;
```

### Графики (можно подключить Chart.js)
- Продажи по месяцам (линейный)
- Распределение заказов по статусам (круговая)
- Топ-10 тканей (столбчатая)

---

## 3. КАЛЕНДАРЬ ЗАМЕРОВ

### Сущность `measurement_appointments`
```sql
CREATE TABLE measurement_appointments (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
    order_id INTEGER REFERENCES orders(id),
    appointment_date TIMESTAMP NOT NULL,
    address TEXT,
    assigned_to VARCHAR(100),  -- Кто выезжает на замер
    status VARCHAR(50),        -- scheduled, completed, cancelled
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Функционал
- Google Calendar / Outlook интеграция
- SMS-напоминания клиенту за день до замера
- Мобильное приложение для замерщика (офлайн-форма)

---

## 4. УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ (RBAC)

### Роли
```javascript
const ROLES = {
    ADMIN: 'admin',           // Всё
    MANAGER: 'manager',       // Заказы, клиенты
    WAREHOUSE: 'warehouse',   // Склад, пополнение
    SEAMSTRESS: 'seamstress', // Только статус "шью/готово"
    MEASURER: 'measurer'      // Замеры, мобильное приложение
};
```

### JWT аутентификация
```javascript
// Добавить в package.json
"dependencies": {
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2"
}
```

---

## 5. ИНТЕГРАЦИИ

### SMS-рассылка (SMSC.ru / Twilio)
```javascript
// Уведомления клиенту
"Ваш заказ О-2024-015 готов к установке. Звоните: +7..."

// Напоминание о замере
"Завтра в 14:00 ждём вас по адресу: ..."
```

### Telegram бот
- Получать уведомления о новых заказах
- Быстро менять статус заказа
- Запрос остатков ткани по названию

### 1C / МойСклад интеграция
- Двусторонняя синхронизация остатков
- Выгрузка заказов в бухгалтерию

---

## 6. ДОКУМЕНТЫ

### Генерация PDF
```javascript
// Квитанция клиенту
// package.json: "pdfkit": "^0.14.0"

const PDFDocument = require('pdfkit');
// Номер заказа, дата, перечень товаров, сумма, подписи

// Договор оферты
// Смета на установку
```

### Печать этикеток
- Термопринтер для QR-кодов на вешалках
- Бейджи заказов для пакетов с тканью

---

## 7. ФОТОГРАФИИ

### Сущность `photos`
```sql
CREATE TABLE photos (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50),  -- 'order', 'fabric', 'measurement'
    entity_id INTEGER,
    url TEXT NOT NULL,
    description TEXT,
    taken_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Сценарии
- Фото замера (окно, особенности)
- Фото ткани (в реальном освещении)
- Фото готовых штор (для портфолио)
- Фото установки (подтверждение выполнения)

### Загрузка файлов
```javascript
// multer для Express
// Хранилище: локально / AWS S3 / Яндекс.Облако
```

---

## 8. КАЛЬКУЛЯТОР СТОИМОСТИ

### Расчёт материала
```javascript
function calculateFabric(windowWidth, windowHeight, folds, fabricWidth) {
    // Коэффициент сборки (обычно 2-2.5)
    const gatheringRatio = 2.2;
    
    // Ширина ткани = ширина окна * коэффициент
    const fabricWidthNeeded = windowWidth * gatheringRatio / 100; // в метрах
    
    // Высота + припуски (10см сверху, 15см снизу)
    const fabricHeightNeeded = (windowHeight + 25) / 100; // в метрах
    
    // Если ткань шириной 280см, а окно 300см — нужно 2 полотна
    const panels = Math.ceil(windowWidth / fabricWidth);
    
    return {
        meters: fabricHeightNeeded * panels,
        panels: panels,
        price: meters * pricePerMeter
    };
}
```

### API эндпоинт
```bash
POST /api/calculate
{
    "window_width_cm": 300,
    "window_height_cm": 250,
    "fabric_id": 1,
    "folds_count": 2,
    "sewing_type": "шторы"
}
```

---

## 9. УВЕДОМЛЕНИЯ В РЕАЛЬНОМ ВРЕМЕНИ

### WebSocket (Socket.io)
```javascript
// Когда заказ переведён в статус "готово"
io.emit('order_ready', { order_id: 15, customer_name: "..." });

// На складе: когда остаток ткани < 5м
io.emit('low_stock_alert', { fabric_id: 3, current_stock: 4.5 });
```

### Push-уведомления
- Service Worker для PWA
- Firebase Cloud Messaging

---

## 10. ПОСТАВЩИКИ И ЗАКУПКИ

### Сущности
```sql
CREATE TABLE suppliers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    contact_person VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT
);

CREATE TABLE purchase_orders (
    id SERIAL PRIMARY KEY,
    supplier_id INTEGER REFERENCES suppliers(id),
    status VARCHAR(50),  -- draft, sent, delivered
    total_amount DECIMAL(12,2),
    order_date DATE,
    expected_delivery DATE
);

CREATE TABLE purchase_items (
    id SERIAL PRIMARY KEY,
    purchase_order_id INTEGER,
    fabric_id INTEGER,  -- или NULL если новая ткань
    description TEXT,
    quantity DECIMAL(10,2),
    unit_price DECIMAL(10,2)
);
```

---

## 11. ПРОИЗВОДСТВО (цех)

### Распределение заказов по швеям
```sql
CREATE TABLE sewing_assignments (
    id SERIAL PRIMARY KEY,
    order_id INTEGER,
    seamstress_name VARCHAR(100),
    assigned_date DATE,
    due_date DATE,
    status VARCHAR(50),  -- assigned, in_progress, completed
    completed_date DATE
);
```

### Табель учёта
- Сколько метров сшила каждая швея
- Расчёт зарплаты (сдельная оплата)

---

## 12. МОБИЛЬНОЕ ПРИЛОЖЕНИЕ (PWA)

### Стек
- **Фронт**: React + Vite (или чистый HTML/JS как MOBILE_SCANNER.html)
- **Состояние**: Zustand или Redux Toolkit
- **Офлайн**: IndexedDB + Service Worker
- **Синхронизация**: Фоновая синхронизация при появлении сети

### Функции
- [ ] QR-сканер склада
- [ ] Форма замера (офлайн)
- [ ] Просмотр заказов
- [ ] Смена статуса заказа
- [ ] Загрузка фото

---

## Приоритезация фич

| Фича | Сложность | Ценность | Очерёдность |
|------|-----------|----------|-------------|
| QR-сканер | Низкая | Высокая | 1 |
| Пользователи/роли | Средняя | Высокая | 2 |
| Калькулятор | Низкая | Средняя | 3 |
| Фото | Средняя | Средняя | 4 |
| SMS-уведомления | Низкая | Средняя | 5 |
| PDF-квитанции | Средняя | Средняя | 6 |
| Аналитика | Средняя | Низкая | 7 |
| Telegram бот | Низкая | Низкая | 8 |
| Поставщики | Высокая | Низкая | 9 |
| WebSocket | Высокая | Низкая | 10 |

---

## Следующий шаг?

Что хочешь добавить в первую очередь?

1. **JWT аутентификацию** (вход по логину/паролю)
2. **Калькулятор стоимости** (расчёт метража по размерам окна)
3. **Загрузку фото** (модель + API для фотографий)
4. **Telegram бот** (уведомления + команды)
