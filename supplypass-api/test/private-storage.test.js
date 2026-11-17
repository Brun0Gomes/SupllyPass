const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createPrivateStorage } = require('../cloud/private-storage');

test('armazenamento privado envia apenas bytes informados e impede caminhos arbitrários', async () => {
  const calls = [];
  const fakeFetch = async (url, options) => {
    calls.push({ url, options });
    return { ok: true, status: 200, json: async () => ({ public: false }), arrayBuffer: async () => Uint8Array.from([1, 2, 3]).buffer };
  };
  const storage = createPrivateStorage({ url: 'https://project.supabase.co', serviceKey: 'local-test-key', bucket: 'private-documents', request: fakeFetch });
  const payload = Buffer.from([1, 2, 3]);
  await storage.put('doc_0123456789abcdef.enc', payload);
  assert.equal(calls[0].url, 'https://project.supabase.co/storage/v1/object/private-documents/doc_0123456789abcdef.enc');
  assert.equal(calls[0].options.headers['x-upsert'], 'false');
  assert.deepEqual(calls[0].options.body, payload);
  assert.deepEqual(await storage.get('doc_0123456789abcdef.enc'), payload);
  await storage.assertPrivate();
  await assert.rejects(storage.get('../secret'), /Nome do arquivo inválido/);
  assert.throws(() => createPrivateStorage({ url: 'http://project.supabase.co', serviceKey: 'key', bucket: 'private' }), /HTTPS/);
});
