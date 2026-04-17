# 📱 ПУБЛИКАЦИЯ В GOOGLE PLAY И APP STORE
## Ателье "Бригада" - PWA → Native Apps

---

## 🎯 БЫСТРЫЙ СТАРТ (3 шага)

### 1. Сборка PWA
```bash
cd frontend-react
npm run build
```

### 2. Инициализация мобильных платформ
```bash
# Установка Capacitor (один раз)
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios

# Инициализация
npx cap init kz.brigada.atelier "Бригада - Ателье" --web-dir build

# Добавление платформ
npx cap add android
npx cap add ios
```

### 3. Синхронизация и открытие
```bash
# Синхронизировать код
npx cap sync

# Android
npx cap open android

# iOS (только macOS)
npx cap open ios
```

---

## 🤖 GOOGLE PLAY (Android)

### Требования:
- [ ] Android Studio
- [ ] Google Play Console аккаунт ($25 один раз)
- [ ] release-key.keystore
- [ ] Иконки 512x512, 1024x500
- [ ] Скриншоты (телефон + планшет)

### Пошагово:

#### 1. Генерация подписанного APK/AAB
```bash
# В Android Studio:
# Build → Generate Signed Bundle/APK
# Выбрать: Android App Bundle (.aab)

# Или через командную строку:
cd android
./gradlew bundleRelease

# Подписать:
jarsigner -keystore release-key.keystore \
  app/build/outputs/bundle/release/app-release.aab \
  brigada
```

#### 2. Создание keystore (один раз)
```bash
keytool -genkey -v -keystore release-key.keystore \
  -alias brigada -keyalg RSA -keysize 2048 -validity 10000
```

#### 3. Настройка build.gradle
```gradle
android {
    signingConfigs {
        release {
            storeFile file("release-key.keystore")
            storePassword "YOUR_PASSWORD"
            keyAlias "brigada"
            keyPassword "YOUR_PASSWORD"
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

#### 4. Публикация в Play Console
1. Открыть [play.google.com/console](https://play.google.com/console)
2. Создать приложение → Название: "Бригада - Ателье"
3. Загрузить AAB файл (App Bundle)
4. Заполнить:
   - Короткое описание (80 символов)
   - Полное описание (4000 символов)
   - Иконка (512x512 PNG)
   - Графический элемент (1024x500)
   - Скриншоты (минимум 2 для телефона, 1 для планшета)
5. Настроить цены/страны (Казахстан + другие)
6. Отправить на модерацию (1-3 дня)

---

## 🍎 APP STORE (iOS)

### Требования:
- [ ] macOS (Xcode работает только на Mac)
- [ ] Apple Developer аккаунт ($99/год)
- [ ] Xcode 14+
- [ ] Иконки всех размеров
- [ ] Скриншоты для всех устройств

### Пошагово:

#### 1. Настройка Xcode проекта
```bash
# Открыть проект
npx cap open ios

# В Xcode:
# 1. Выбрать проект → Signing & Capabilities
# 2. Включить Automatically manage signing
# 3. Выбрать Team (Apple ID)
# 4. Изменить Bundle Identifier: kz.brigada.atelier
```

#### 2. Архивация (сборка)
```
Xcode → Product → Archive
# Дождаться сборки
# Window → Organizer → Выбрать архив → Distribute App
# Выбрать: App Store Connect → Upload
```

#### 3. App Store Connect
1. Открыть [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. My Apps → + → New App
3. Заполнить:
   - Platforms: iOS
   - Name: Бригада - Ателье
   - Primary Language: Russian
   - Bundle ID: kz.brigada.atelier
   - SKU: brigada-atelier-001
4. Загрузить сборку (через Xcode или Transporter)
5. Заполнить:
   - Промо текст (170 символов)
   - Описание
   - Ключевые слова (100 символов)
   - URL поддержки
   - Маркетинг URL (опционально)
   - Скриншоты:
     * iPhone 6.5" (1242x2688) - обязательно
     * iPhone 5.5" (1242x2208) - обязательно
     * iPad Pro 12.9" (2048x2732) - если поддерживается
6. App Review Information:
   - Контактная информация
   - Демо-аккаунт (login/password для тестирования)
7. Отправить на ревью (1-2 дня)

---

## 🔧 ТЕХНИЧЕСКИЕ НАСТРОЙКИ

### 1. CORS для мобильных приложений
В `server.js` добавить:
```javascript
const allowedOrigins = [
    'http://localhost',
    'https://atelier-managment-production.up.railway.app',
    'capacitor://localhost',  // iOS
    'http://localhost'        // Android
];

app.use(cors({
    origin: function(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
```

### 2. Deep Links (для Push уведомлений)
```json
// capacitor.config.json
{
  "plugins": {
    "PushNotifications": {
      "presentationOptions": ["badge", "sound", "alert"]
    }
  }
}
```

### 3. Оффлайн режим (Service Worker)
```javascript
// Уже есть в проекте - работает автоматически
// Приложение будет работать без интернета
```

---

## 📸 ТРЕБОВАНИЯ К ГРАФИКЕ

### Иконки (Android):
- launcher-icon: 48x48, 72x72, 96x96, 144x144, 192x192
- Play Store: 512x512 PNG
- Feature Graphic: 1024x500 JPG/PNG

### Иконки (iOS):
- 20x20, 29x29, 40x40, 58x58, 60x60, 76x76, 80x80, 87x87, 120x120, 152x152, 167x167, 180x180, 1024x1024

### Скриншоты:
- **Android**: 1080x1920 (телефон), 2048x2732 (планшет)
- **iOS**: 1242x2688 (iPhone X+), 1242x2208 (iPhone 8), 2048x2732 (iPad)

---

## 🔐 БЕЗОПАСНОСТЬ

### 1. HTTPS обязателен
```javascript
// В capacitor.config.json
{
  "server": {
    "hostname": "atelier-managment-production.up.railway.app",
    "androidScheme": "https",
    "allowNavigation": ["atelier-managment-production.up.railway.app"]
  }
}
```

### 2. API Keys
- Не хранить в коде приложения
- Использовать переменные окружения на сервере
- Для мобильного приложения - только публичные endpoint'ы

---

## 💰 МОНЕТИЗАЦИЯ

### Бесплатное приложение (рекомендуется):
- Бесплатная загрузка
- Заработок через подписку внутри приложения
- Или комиссия с заказов

### In-App Purchases (опционально):
```javascript
// Для подписок внутри приложения
import { Purchases } from '@revenuecat/purchases-capacitor';
```

---

## 📋 ЧЕКЛИСТ ПЕРЕД ПУБЛИКАЦИЕЙ

### Функционал:
- [ ] Авторизация работает
- [ ] Заказы создаются
- [ ] Push уведомления приходят
- [ ] Работает оффлайн
- [ ] Нет багов/крашей

### Документы:
- [ ] Политика конфиденциальности (URL)
- [ ] Условия использования (URL)
- [ ] Контактная поддержка

### Графика:
- [ ] Иконки всех размеров
- [ ] Скриншоты (5-8 штук)
- [ ] Feature Graphic (Android)
- [ ] Promo video (опционально)

---

## 🚀 АВТОМАТИЗАЦИЯ (CI/CD)

### GitHub Actions для автосборки:
```yaml
# .github/workflows/mobile.yml
name: Mobile Build
on: [push]
jobs:
  build-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: cd frontend-react && npm ci
      - run: cd frontend-react && npm run build
      - run: cd frontend-react/android && ./gradlew bundleRelease
```

---

## ❓ ПОЛЕЗНЫЕ ССЫЛКИ

- **Capacitor Docs**: https://capacitorjs.com/docs
- **Android Publishing**: https://developer.android.com/studio/publish
- **iOS Publishing**: https://developer.apple.com/app-store/submissions/
- **Icons Generator**: https://appicon.co/
- **Screenshots**: https://screenshotbuddy.com/

---

## 📞 ПОДДЕРЖКА

Если возникнут проблемы:
1. Проверить логи в Android Studio (Logcat)
2. Проверить Console в Safari (для iOS)
3. Включить Debug в Capacitor:
   ```javascript
   // capacitor.config.json
   {
     "server": {
       "url": "http://YOUR_IP:3000",
       "cleartext": true
     }
   }
   ```
