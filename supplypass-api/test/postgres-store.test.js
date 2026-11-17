const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createPostgresStore } = require('../cloud/postgres-store');

test('transação PostgreSQL desfaz alterações em caso de falha e libera conexão', async () => {
  const calls = [];
  const connection = { query: async (sql) => { calls.push(sql); }, release: () => calls.push('release') };
  const store = createPostgresStore({ connect: async () => connection });
  await assert.rejects(store.transaction(async () => { throw new Error('falha'); }), /falha/);
  assert.deepEqual(calls, ['BEGIN', 'ROLLBACK', 'release']);
});

test('transação PostgreSQL confirma sucesso e libera conexão', async () => {
  const calls = [];
  const connection = { query: async (sql) => { calls.push(sql); }, release: () => calls.push('release') };
  const store = createPostgresStore({ connect: async () => connection });
  assert.equal(await store.transaction(async () => 42), 42);
  assert.deepEqual(calls, ['BEGIN', 'COMMIT', 'release']);
});
