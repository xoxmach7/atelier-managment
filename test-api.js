// Тест API
const baseUrl = 'http://localhost:5000';

async function test() {
    try {
        // 1. Проверка сервера
        console.log('1. Проверка сервера...');
        const health = await fetch(`${baseUrl}/`);
        const healthData = await health.json();
        console.log('✅ Сервер:', healthData.version);

        // 2. Регистрация админа
        console.log('\n2. Регистрация админа...');
        const register = await fetch(`${baseUrl}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@brigada.com',
                password: 'admin123',
                full_name: 'Админ',
                role: 'admin'
            })
        });
        const registerData = await register.json();
        console.log(registerData.success ? '✅ Админ создан' : '⚠️', registerData.error?.message || registerData.message);

        // 3. Логин
        console.log('\n3. Логин...');
        const login = await fetch(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@brigada.com',
                password: 'admin123'
            })
        });
        const loginData = await login.json();
        
        if (loginData.success) {
            console.log('✅ Логин успешен, токен получен');
            const token = loginData.data.token;
            
            // 4. Создание задачи
            console.log('\n4. Создание задачи...');
            const task = await fetch(`${baseUrl}/api/tasks`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    client_name: 'Тестовый Клиент',
                    client_phone: '+77001234567',
                    source: 'walk_in',
                    description: 'Тестовая задача'
                })
            });
            const taskData = await task.json();
            console.log(taskData.success ? `✅ Задача создана: ${taskData.data.task_number}` : '❌', taskData.error?.message);
            
            // 5. Список тканей
            console.log('\n5. Проверка склада...');
            const fabrics = await fetch(`${baseUrl}/api/fabrics`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const fabricsData = await fabrics.json();
            console.log(`✅ Тканей на складе: ${fabricsData.count || fabricsData.data?.length || 0}`);
            
        } else {
            console.log('❌ Логин не удался:', loginData.error?.message);
        }
        
        console.log('\n🎉 Тестирование завершено!');
        
    } catch (error) {
        console.error('❌ Ошибка:', error.message);
        console.log('\nУбедись что сервер запущен: npm run dev');
    }
}

test();
