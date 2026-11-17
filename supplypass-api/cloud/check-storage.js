// Verificação somente de leitura do bucket configurado.
require('dotenv').config();
const { createPrivateStorage } = require('./private-storage');

async function main() {
  const storage = createPrivateStorage({
    url: process.env.SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SECRET_KEY,
    bucket: process.env.SUPABASE_BUCKET,
  });
  await storage.assertPrivate();
  console.log('Bucket acessível e privado. Nenhum arquivo foi enviado ou apagado.');
}

main().catch((error) => {
  // Não imprimir resposta do provedor ou dados de configuração.
  const safe = /^Bucket indisponível \(HTTP \d+\)\.$/.test(error.message) || error.message === 'O bucket de documentos não é privado.';
  console.error('Falha na verificação:', safe ? error.message : 'verifique a configuração e a conexão.');
  process.exitCode = 1;
});
