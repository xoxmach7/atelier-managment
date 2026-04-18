import bcrypt from 'bcryptjs';

const password = 'admin123';
const saltRounds = 10;

const hash = bcrypt.hashSync(password, saltRounds);
console.log('Пароль:', password);
console.log('Хеш:', hash);
console.log('\nSQL для обновления:');
console.log(`UPDATE users SET password_hash = '${hash}' WHERE email = 'admin@test.com';`);
