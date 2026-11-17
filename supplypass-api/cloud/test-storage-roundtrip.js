// Teste controlado: envia um objeto fictício cifrado com nome aleatório,
// baixa, valida e remove somente o objeto que este processo criou.
require('dotenv').config();
const crypto = require('node:crypto');
const { createPrivateStorage } = require('./private-storage');
const { encryptBuffer, decryptBuffer, newId } = require('../src/services/crypto');

async function main() {
  const storage = createPrivateStorage({ url: process.env.SUPABASE_URL, serviceKey: process.env.SUPABASE_SECRET_KEY, bucket: process.env.SUPABASE_BUCKET });
  await storage.assertPrivate();
  const name = `${newId('doc')}.enc`;
  const key = crypto.randomBytes(32);
  const original = Buffer.from('SupplyPass: teste temporário de armazenamento.');
  const { encrypted, iv, authTag } = encryptBuffer(original, key);
  let uploaded = false;
  let verified = false;
  try {
    await storage.put(name, encrypted);
    uploaded = true;
    const downloaded = await storage.get(name);
    if (!downloaded || !decryptBuffer(downloaded, key, iv, authTag).equals(original)) {
      throw new Error('VERIFICACAO_DE_CONTEUDO_FALHOU');
    }
    verified = true;
  } finally {
    if (uploaded) {
      try {
        await storage.remove(name);
      } catch (_) {
        // O nome não contém dados pessoais e permite localizar o objeto órfão.
        console.error(`Não foi possível remover o objeto temporário ${name} do bucket configurado.`);
        throw new Error('LIMPEZA_FALHOU');
      }
    }
  }
  if (verified) console.log('Teste concluído: objeto cifrado enviado, conferido e removido.');
}

main().catch((error) => {
  const safe = ['VERIFICACAO_DE_CONTEUDO_FALHOU', 'LIMPEZA_FALHOU'];
  console.error('Falha no teste de armazenamento:', safe.includes(error.message) ? error.message : 'verifique conexão e permissões.');
  process.exitCode = 1;
});
