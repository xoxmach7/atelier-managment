// ============================================
// RATE LIMITING - Защита от брутфорса и DDoS
// ============================================

// Простой in-memory rate limiter
// В продакшене лучше использовать Redis

const requests = new Map();

const WINDOW_MS = 15 * 60 * 1000; // 15 минут
const MAX_REQUESTS = 100; // макс запросов за окно

export const rateLimiter = (options = {}) => {
    const windowMs = options.windowMs || WINDOW_MS;
    const maxRequests = options.maxRequests || MAX_REQUESTS;
    const keyGenerator = options.keyGenerator || ((req) => req.ip);
    
    return (req, res, next) => {
        const key = keyGenerator(req);
        const now = Date.now();
        
        // Получаем или создаём запись
        let record = requests.get(key);
        if (!record || now - record.resetTime > windowMs) {
            record = {
                count: 0,
                resetTime: now + windowMs
            };
        }
        
        // Проверяем лимит
        if (record.count >= maxRequests) {
            const retryAfter = Math.ceil((record.resetTime - now) / 1000);
            res.setHeader('Retry-After', retryAfter);
            return res.status(429).json({
                success: false,
                error: {
                    message: `Слишком много запросов. Попробуйте через ${retryAfter} секунд.`,
                    code: 'RATE_LIMIT_EXCEEDED'
                }
            });
        }
        
        // Увеличиваем счётчик
        record.count++;
        requests.set(key, record);
        
        // Добавляем заголовки
        res.setHeader('X-RateLimit-Limit', maxRequests);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - record.count));
        
        next();
    };
};

// Строгий лимит для авторизации (защита от брутфорса)
export const authRateLimiter = rateLimiter({
    windowMs: 15 * 60 * 1000, // 15 минут
    maxRequests: 10, // 10 попыток входа
    keyGenerator: (req) => {
        // Лимит по IP + email
        return `${req.ip}:${req.body?.email || 'unknown'}`;
    }
});

// API лимит для обычных запросов
export const apiRateLimiter = rateLimiter({
    windowMs: 15 * 60 * 1000, // 15 минут
    maxRequests: 100 // 100 запросов
});

// Очистка старых записей каждые 30 минут
setInterval(() => {
    const now = Date.now();
    for (const [key, record] of requests.entries()) {
        if (now > record.resetTime) {
            requests.delete(key);
        }
    }
}, 30 * 60 * 1000);
