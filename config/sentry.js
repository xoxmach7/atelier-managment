// ============================================
// SENTRY ERROR MONITORING
// Отслеживание ошибок в реальном времени
// ============================================
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

export const initSentry = () => {
    if (!process.env.SENTRY_DSN) {
        console.log('⚠️ SENTRY_DSN не настроен - мониторинг ошибок отключен');
        return false;
    }

    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        release: process.env.RAILWAY_GIT_COMMIT_SHA || 'dev',
        
        // Интеграции
        integrations: [
            nodeProfilingIntegration(),
            Sentry.httpIntegration({
                breadcrumbs: true,
                tracing: true
            }),
            Sentry.expressIntegration()
        ],
        
        // Трассировка производительности
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        profilesSampleRate: 0.1,
        
        // Отправлять ошибки только в production
        beforeSend: (event) => {
            // Фильтруем localhost ошибки
            if (event.request?.url?.includes('localhost')) {
                return null;
            }
            return event;
        },
        
        // Дополнительные опции
        attachStacktrace: true,
        debug: process.env.NODE_ENV !== 'production',
        
        // Игнорируемые ошибки
        ignoreErrors: [
            'ECONNREFUSED',
            'ETIMEDOUT',
            'ECONNRESET',
            'Token expired',
            'jwt expired'
        ]
    });

    console.log('✅ Sentry инициализирован');
    return true;
};

// Middleware для Express
export const sentryRequestHandler = Sentry.Handlers.requestHandler();
export const sentryErrorHandler = Sentry.Handlers.errorHandler({
    shouldHandleError: (error) => {
        // Не отправляем 4xx ошибки в Sentry
        if (error.statusCode && error.statusCode < 500) {
            return false;
        }
        return true;
    }
});

// Установка scope с дополнительной информацией
export const setUserContext = (user) => {
    Sentry.setUser({
        id: user.id,
        email: user.email,
        username: user.full_name
    });
};

export const clearUserContext = () => {
    Sentry.setUser(null);
};

// Добавление тегов
export const setTags = (tags) => {
    Object.entries(tags).forEach(([key, value]) => {
        Sentry.setTag(key, value);
    });
};

// Ручная отправка ошибки
export const captureException = (error, context = {}) => {
    Sentry.withScope((scope) => {
        if (context.tags) {
            Object.entries(context.tags).forEach(([key, value]) => {
                scope.setTag(key, value);
            });
        }
        if (context.extra) {
            Object.entries(context.extra).forEach(([key, value]) => {
                scope.setExtra(key, value);
            });
        }
        Sentry.captureException(error);
    });
};

// Отправка сообщения
export const captureMessage = (message, level = 'info') => {
    Sentry.captureMessage(message, level);
};

// Performance monitoring
export const startTransaction = (name, op) => {
    return Sentry.startTransaction({ name, op });
};

export default {
    initSentry,
    sentryRequestHandler,
    sentryErrorHandler,
    setUserContext,
    clearUserContext,
    setTags,
    captureException,
    captureMessage,
    startTransaction
};
