#!/usr/bin/env node
// ============================================
// АВТОМАТИЗАЦИЯ СБОРКИ МОБИЛЬНЫХ ПРИЛОЖЕНИЙ
// ============================================
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const FRONTEND_DIR = './frontend-react';
const ANDROID_DIR = `${FRONTEND_DIR}/android`;
const IOS_DIR = `${FRONTEND_DIR}/ios`;

console.log('🚀 Сборка мобильных приложений для Бригады\n');

// Проверка зависимостей
function checkDependencies() {
    console.log('📦 Проверка зависимостей...');
    
    const packageJson = JSON.parse(fs.readFileSync(`${FRONTEND_DIR}/package.json`, 'utf8'));
    const deps = packageJson.dependencies || {};
    
    const required = ['@capacitor/core', '@capacitor/cli'];
    const missing = required.filter(d => !deps[d]);
    
    if (missing.length > 0) {
        console.log(`⚠️ Отсутствуют зависимости: ${missing.join(', ')}`);
        console.log('Установка...');
        execSync(`cd ${FRONTEND_DIR} && npm install ${missing.join(' ')}`, { stdio: 'inherit' });
    }
}

// Сборка PWA
function buildPWA() {
    console.log('\n🏗️  Сборка PWA...');
    execSync(`cd ${FRONTEND_DIR} && npm run build`, { stdio: 'inherit' });
    console.log('✅ PWA собран');
}

// Инициализация Capacitor
function initCapacitor() {
    console.log('\n⚡ Инициализация Capacitor...');
    
    const configPath = `${FRONTEND_DIR}/capacitor.config.json`;
    if (!fs.existsSync(configPath)) {
        console.log('❌ capacitor.config.json не найден');
        return false;
    }
    
    // Проверяем android/ios
    if (!fs.existsSync(ANDROID_DIR)) {
        console.log('📱 Добавление Android...');
        execSync(`cd ${FRONTEND_DIR} && npx cap add android`, { stdio: 'inherit' });
    }
    
    if (!fs.existsSync(IOS_DIR)) {
        console.log('🍎 Добавление iOS (только macOS)...');
        try {
            execSync(`cd ${FRONTEND_DIR} && npx cap add ios`, { stdio: 'inherit' });
        } catch (e) {
            console.log('⚠️ iOS не добавлен (требуется macOS)');
        }
    }
    
    return true;
}

// Синхронизация
function sync() {
    console.log('\n🔄 Синхронизация кода...');
    execSync(`cd ${FRONTEND_DIR} && npx cap sync`, { stdio: 'inherit' });
    console.log('✅ Синхронизировано');
}

// Открытие в IDE
function openIDE() {
    console.log('\n📲 Открытие проектов...');
    
    if (fs.existsSync(ANDROID_DIR)) {
        console.log('Android: запуск Android Studio...');
        try {
            execSync(`cd ${FRONTEND_DIR} && npx cap open android`, { stdio: 'inherit' });
        } catch (e) {
            console.log('Android Studio не найден или ошибка открытия');
        }
    }
    
    if (fs.existsSync(IOS_DIR)) {
        console.log('iOS: запуск Xcode...');
        try {
            execSync(`cd ${FRONTEND_DIR} && npx cap open ios`, { stdio: 'inherit' });
        } catch (e) {
            console.log('Xcode не найден или требуется macOS');
        }
    }
}

// Проверка конфигурации
function checkConfig() {
    console.log('\n🔍 Проверка конфигурации...');
    
    const config = JSON.parse(fs.readFileSync(`${FRONTEND_DIR}/capacitor.config.json`, 'utf8'));
    
    console.log(`App ID: ${config.appId}`);
    console.log(`App Name: ${config.appName}`);
    console.log(`Web Dir: ${config.webDir}`);
    
    if (config.appId === 'kz.brigada.atelier') {
        console.log('⚠️  Убедитесь, что appId уникален для вашего приложения');
    }
}

// Генерация иконок
function generateIcons() {
    console.log('\n🎨 Генерация иконок...');
    console.log('Требуются исходники:');
    console.log('- icon.png (1024x1024) для Android');
    console.log('- icon.png (1024x1024) для iOS');
    console.log('- splash.png (2732x2732) для экрана загрузки');
    
    // Проверяем наличие иконок
    const iconPath = `${FRONTEND_DIR}/public/icon.png`;
    if (!fs.existsSync(iconPath)) {
        console.log('⚠️  Иконка не найдена в public/icon.png');
        console.log('Создайте иконку 1024x1024 и положите в frontend-react/public/icon.png');
    }
}

// Основной процесс
async function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'full';
    
    switch (command) {
        case 'init':
            checkDependencies();
            checkConfig();
            buildPWA();
            initCapacitor();
            sync();
            console.log('\n✅ Инициализация завершена!');
            console.log('Следующий шаг: npm run mobile:open');
            break;
            
        case 'build':
            buildPWA();
            sync();
            console.log('\n✅ Сборка завершена!');
            break;
            
        case 'open':
            openIDE();
            break;
            
        case 'full':
        default:
            checkDependencies();
            checkConfig();
            buildPWA();
            initCapacitor();
            sync();
            generateIcons();
            console.log('\n✅ Всё готово к публикации!');
            console.log('\nСледующие шаги:');
            console.log('1. Android: Откройте Android Studio и соберите AAB');
            console.log('2. iOS: Откройте Xcode и соберите Archive');
            console.log('3. Подробнее в MOBILE_DEPLOY.md');
            break;
    }
}

main().catch(err => {
    console.error('❌ Ошибка:', err.message);
    process.exit(1);
});
