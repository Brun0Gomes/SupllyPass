// Provisionamento inicial: somente em banco sem usuários e usando variáveis de ambiente.
const db = require('../src/db');
const { hashPassword, newId } = require('../src/services/crypto');

const email = String(process.env.BOOTSTRAP_ADMIN_EMAIL || '').trim().toLowerCase();
const name = String(process.env.BOOTSTRAP_ADMIN_NAME || '').trim();
const password = String(process.env.BOOTSTRAP_ADMIN_PASSWORD || '');
if (!name || !/^\S+@\S+\.\S+$/.test(email) || password.length < 10) {
  throw new Error('Defina BOOTSTRAP_ADMIN_NAME, BOOTSTRAP_ADMIN_EMAIL e BOOTSTRAP_ADMIN_PASSWORD (mínimo 10 caracteres).');
}
const create = db.transaction(() => {
  if (db.prepare('SELECT COUNT(*) AS n FROM users').get().n !== 0) {
    throw new Error('O banco já contém usuários; provisionamento inicial recusado.');
  }
  const { hash, salt } = hashPassword(password);
  db.prepare(`INSERT INTO users (id, name, email, password_hash, password_salt, role, active, created_at)
    VALUES (?, ?, ?, ?, ?, 'administrador', 1, ?)`).run(newId('usr'), name, email, hash, salt, new Date().toISOString());
});
create();
db.close();
console.log('Administrador inicial criado. Configure o MFA no primeiro acesso.');
