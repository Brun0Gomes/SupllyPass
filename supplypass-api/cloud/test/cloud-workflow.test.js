// Integração no PostgreSQL real com transação revertida ao final; não usa o bucket real.
require('dotenv').config();
process.env.SUPPLYPASS_CLOUD = 'true';
process.env.FILE_KEY = 'a'.repeat(64);
process.env.JWT_SECRET = 'segredo-de-teste-isolado-nao-usar-em-producao';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const jwt = require('jsonwebtoken');
const { createPool } = require('../database');
const { createCloudApp } = require('../app');
const config = require('../../src/config');
const { hashPassword } = require('../../src/services/crypto');
const { createPrivateStorage } = require('../private-storage');

test('API de nuvem mantém o fluxo e as permissões em PostgreSQL', async () => {
  const pool = createPool({ connectionString: process.env.SUPABASE_DATABASE_URL, caCertificate: fs.readFileSync(process.env.SUPABASE_CA_CERT_PATH, 'utf8') });
  const connection = await pool.connect();
  let server;
  const objectsToRemove = [];
  let realStorage;
  try {
    await connection.query('BEGIN');
    // Tabela nova é criada dentro da transação de teste e depois revertida.
    await connection.query(fs.readFileSync(path.join(__dirname, '..', 'rate-limit.sql'), 'utf8'));
    const scoped = {
      query: (sql, args) => connection.query(sql, args),
      connect: async () => ({
        query: (sql, args) => {
          if (sql === 'BEGIN') return connection.query('SAVEPOINT test_document');
          if (sql === 'COMMIT') return connection.query('RELEASE SAVEPOINT test_document');
          if (sql === 'ROLLBACK') return connection.query('ROLLBACK TO SAVEPOINT test_document');
          return connection.query(sql, args);
        },
        release: () => {},
      }),
    };
    const blobs = new Map();
    if (process.env.CLOUD_TEST_REAL_STORAGE === 'true') {
      realStorage = createPrivateStorage({ url: process.env.SUPABASE_URL, serviceKey: process.env.SUPABASE_SECRET_KEY, bucket: process.env.SUPABASE_BUCKET });
      await realStorage.assertPrivate();
    }
    const storage = {
      assertPrivate: async () => { if (realStorage) await realStorage.assertPrivate(); },
      put: async (name, bytes) => {
        if (realStorage) {
          await realStorage.put(name, bytes);
          objectsToRemove.push(name);
        }
        blobs.set(name, bytes);
      },
      get: async (name) => realStorage ? realStorage.get(name) : blobs.get(name),
      remove: async (name) => {
        if (realStorage) {
          await realStorage.remove(name);
          const index = objectsToRemove.indexOf(name);
          if (index >= 0) objectsToRemove.splice(index, 1);
        }
        blobs.delete(name);
      },
    };
    const password = 'senha-de-teste-nao-real';
    const { hash, salt } = hashPassword(password);
    for (const [id, role] of [['gestor-isolado', 'gestor'], ['analista-isolado', 'analista'], ['admin-isolado', 'administrador']]) {
      await connection.query(`INSERT INTO supplypass_private.users (id,name,email,password_hash,password_salt,role,created_at)
        VALUES ($1,$1,$2,$3,$4,$5,$6)`, [id, `${id}@example.invalid`, hash, salt, role, new Date().toISOString()]);
    }
    const adminSession = 'sessao-admin-teste';
    const now = new Date().toISOString();
    await connection.query(`INSERT INTO supplypass_private.sessions (id,user_id,created_at,last_seen_at,expires_at)
      VALUES ($1,$2,$3,$3,$4)`, [adminSession, 'admin-isolado', now, new Date(Date.now() + 3600000).toISOString()]);
    const adminToken = jwt.sign({ sub: 'admin-isolado', sid: adminSession }, config.jwtSecret, { expiresIn: '1h' });
    server = createCloudApp({ config, pool: scoped, storage }).listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const jsonHeaders = (token) => ({ 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) });
    async function request(endpoint, options) {
      const response = await fetch(base + endpoint, options);
      const body = (response.headers.get('content-type') || '').includes('application/json') ? await response.json() : await response.arrayBuffer();
      return { response, body };
    }
    async function login(role) {
      const result = await request('/auth/login', { method: 'POST', headers: jsonHeaders(), body: JSON.stringify({ email: `${role}-isolado@example.invalid`, password }) });
      assert.equal(result.response.status, 200);
      return result.body.token;
    }
    const gestor = await login('gestor');
    const analyst = await login('analista');
    const created = await request('/suppliers', { method: 'POST', headers: jsonHeaders(gestor), body: JSON.stringify({ name: 'Fornecedor isolado', cnpj: '12345678000190', category: 'Tecnologia' }) });
    assert.equal(created.response.status, 201, JSON.stringify(created.body));
    const supplierId = created.body.supplier.id;
    const account = await request('/users', { method: 'POST', headers: jsonHeaders(adminToken), body: JSON.stringify({ name: 'Fornecedor', email: 'fornecedor-isolado@example.invalid', password, role: 'fornecedor', supplierId }) });
    assert.equal(account.response.status, 201, JSON.stringify(account.body));
    const supplier = await login('fornecedor');
    const form = new FormData();
    form.append('file', new Blob(['%PDF-1.4\nconteúdo de teste'], { type: 'application/pdf' }), 'arquivo.pdf');
    form.append('type', 'contrato'); form.append('expiresAt', '2099-12-31');
    const upload = await request('/me/documents', { method: 'POST', headers: { Authorization: `Bearer ${supplier}` }, body: form });
    assert.equal(upload.response.status, 201, JSON.stringify(upload.body));
    assert.equal(upload.body.document.reviewStatus, 'pending');
    const bytes = [...blobs.values()][0];
    assert.ok(bytes && !bytes.includes(Buffer.from('conteúdo de teste')));
    const reviewId = upload.body.document.id;
    const downloaded = await request(`/reviews/${reviewId}/download`, { headers: { Authorization: `Bearer ${analyst}` } });
    assert.equal(downloaded.response.status, 200);
    assert.equal(Buffer.from(downloaded.body).toString(), '%PDF-1.4\nconteúdo de teste');
    const denied = await request(`/reviews/${reviewId}/download`, { headers: { Authorization: `Bearer ${supplier}` } });
    assert.equal(denied.response.status, 403);
    const decision = await request(`/reviews/${reviewId}/decision`, { method: 'POST', headers: jsonHeaders(analyst), body: JSON.stringify({ decision: 'rejected', note: 'Arquivo precisa de correção' }) });
    assert.equal(decision.response.status, 200, JSON.stringify(decision.body));
    const owner = await request('/me/passport', { headers: { Authorization: `Bearer ${supplier}` } });
    assert.equal(owner.body.supplier.passport.find((item) => item.key === 'contrato').document.reviewNote, 'Arquivo precisa de correção');
    const verified = await request('/verify', { method: 'POST', headers: jsonHeaders(gestor), body: JSON.stringify({ code: owner.body.supplier.qrCode }) });
    assert.equal(verified.response.status, 200, JSON.stringify(verified.body));
    assert.equal(verified.body.supplier.id, supplierId);
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    await connection.query('ROLLBACK').catch(() => {});
    connection.release();
    await pool.end();
    for (const name of objectsToRemove) {
      try { await realStorage.remove(name); }
      catch (_) { throw new Error(`Não foi possível remover o objeto temporário ${name}.`); }
    }
  }
});
