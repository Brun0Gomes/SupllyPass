const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'supplypass-workflow-'));
process.env.DB_FILE = path.join(temporary, 'test.db');
process.env.JWT_SECRET = 'test-only-secret-with-at-least-32-characters';
process.env.DEMO_PASSWORD = 'test-password-not-for-production';
process.env.FILE_KEY = 'a'.repeat(64);
const config = require('../src/config');
config.storageDir = path.join(temporary, 'storage');
fs.mkdirSync(config.storageDir);
const db = require('../src/db');
const { hashPassword } = require('../src/services/crypto');
const app = require('../src/app');

test('cadastro, envio, análise e reenvio usam dados persistidos e respeitam perfis', async () => {
  const password = 'test-password-not-for-production';
  const { hash, salt } = hashPassword(password);
  const insert = db.prepare(`INSERT INTO users
    (id, name, email, password_hash, password_salt, role, company, supplier_id, active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`);
  const now = new Date().toISOString();
  insert.run('gestor-test', 'Gestor', 'gestor@test.invalid', hash, salt, 'gestor', 'Teste', null, now);
  insert.run('analista-test', 'Analista', 'analista@test.invalid', hash, salt, 'analista', 'Teste', null, now);
  insert.run('admin-test', 'Admin', 'admin@test.invalid', hash, salt, 'administrador', 'Teste', null, now);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  async function request(route, options = {}) {
    const response = await fetch(`${base}${route}`, options);
    const type = response.headers.get('content-type') || '';
    return { response, body: type.includes('application/json') ? await response.json() : await response.arrayBuffer() };
  }
  const headers = (token) => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });
  const session = db.prepare(`INSERT INTO sessions (id, user_id, created_at, last_seen_at, expires_at) VALUES (?, ?, ?, ?, ?)`);
  const jwt = require('jsonwebtoken');
  function tokenFor(id) {
    const sid = `session-${id}`;
    session.run(sid, id, now, now, new Date(Date.now() + 3600000).toISOString());
    return jwt.sign({ sub: id, sid }, config.jwtSecret, { expiresIn: '1h' });
  }
  try {
    const gestorLogin = await request('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'gestor@test.invalid', password }) });
    assert.equal(gestorLogin.response.status, 200);
    assert.ok(gestorLogin.body.token);
    assert.equal(gestorLogin.body.user.role, 'gestor');
    const adminLogin = await request('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@test.invalid', password }) });
    assert.equal(adminLogin.response.status, 200);
    assert.equal(adminLogin.body.mfaSetupRequired, true);
    assert.equal(adminLogin.body.token, undefined);
    const gestorToken = tokenFor('gestor-test');
    const analystToken = tokenFor('analista-test');
    const created = await request('/suppliers', { method: 'POST', headers: headers(gestorToken), body: JSON.stringify({ name: 'Fornecedor Isolado', cnpj: '12345678000190', category: 'Tecnologia' }) });
    assert.equal(created.response.status, 201);
    const supplierId = created.body.supplier.id;
    insert.run('fornecedor-test', 'Fornecedor', 'fornecedor@test.invalid', hash, salt, 'fornecedor', 'Teste', supplierId, now);
    const supplierToken = tokenFor('fornecedor-test');
    const forbidden = await request('/suppliers', { method: 'POST', headers: headers(analystToken), body: '{}' });
    assert.equal(forbidden.response.status, 403);
    async function upload(contents) {
      const form = new FormData();
      form.append('file', new Blob([contents], { type: 'application/pdf' }), 'documento.pdf');
      form.append('type', 'contrato');
      form.append('expiresAt', '2099-12-31');
      return request('/me/documents', { method: 'POST', headers: { Authorization: `Bearer ${supplierToken}` }, body: form });
    }
    const first = await upload('%PDF-1.4\narquivo de teste');
    assert.equal(first.response.status, 201);
    assert.equal(first.body.supplier.status, 'irregular');
    const id = first.body.document.id;
    const queue = await request('/reviews', { headers: { Authorization: `Bearer ${analystToken}` } });
    assert.equal(queue.body.reviews[0].id, id);
    const download = await request(`/reviews/${id}/download`, { headers: { Authorization: `Bearer ${analystToken}` } });
    assert.equal(download.response.status, 200);
    assert.equal(Buffer.from(download.body).toString(), '%PDF-1.4\narquivo de teste');
    const denied = await request(`/reviews/${id}/download`, { headers: { Authorization: `Bearer ${supplierToken}` } });
    assert.equal(denied.response.status, 403);
    const rejected = await request(`/reviews/${id}/decision`, { method: 'POST', headers: headers(analystToken), body: JSON.stringify({ decision: 'rejected', note: 'Corrigir documento' }) });
    assert.equal(rejected.response.status, 200);
    const owner = await request('/me/passport', { headers: { Authorization: `Bearer ${supplierToken}` } });
    assert.equal(owner.body.supplier.passport.find((item) => item.key === 'contrato').document.reviewNote, 'Corrigir documento');
    const second = await upload('%PDF-1.4\narquivo corrigido');
    assert.equal(second.response.status, 201);
    assert.notEqual(second.body.document.id, id);
    assert.equal(second.body.document.reviewStatus, 'pending');
    const stale = await request(`/reviews/${id}/decision`, { method: 'POST', headers: headers(analystToken), body: JSON.stringify({ decision: 'approved' }) });
    assert.equal(stale.response.status, 409);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    db.close();
  }
});
