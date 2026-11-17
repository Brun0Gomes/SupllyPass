// Provisiona segredos no projeto Vercel já vinculado. Não imprime valores.
// Execute apenas em um projeto novo, sem variáveis existentes.
require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

function main() {
  const db = new URL(process.env.SUPABASE_DATABASE_URL || '');
  if (!db.hostname.endsWith('.pooler.supabase.com')) throw new Error('É necessária a URL do pooler do Supabase.');
  db.port = '6543'; // Shared pooler em modo transação, apropriado para funções.
  const ca = fs.readFileSync(process.env.SUPABASE_CA_CERT_PATH, 'utf8');
  const localKey = String(process.env.FILE_KEY || fs.readFileSync(path.join(__dirname, '..', 'data', 'file.key'), 'utf8')).trim();
  if (!/^[a-fA-F0-9]{64}$/.test(localKey)) throw new Error('A chave local dos arquivos é inválida.');
  const variables = {
    SUPPLYPASS_CLOUD: 'true',
    SUPABASE_DATABASE_URL: db.toString(),
    SUPABASE_DB_CA_CERT: ca,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    SUPABASE_BUCKET: process.env.SUPABASE_BUCKET,
    JWT_SECRET: crypto.randomBytes(32).toString('hex'),
    QR_SIGNING_SECRET: crypto.randomBytes(32).toString('hex'),
    FILE_KEY: localKey,
  };
  for (const [name, value] of Object.entries(variables)) {
    if (!value) throw new Error(`Variável necessária ausente: ${name}`);
  }
  if (process.platform !== 'win32') throw new Error('Este assistente de configuração foi preparado para Windows.');

  for (const [name, value] of Object.entries(variables)) {
    const command = `npx --yes vercel env add ${name} --environment preview,production --sensitive --yes`;
    const result = spawnSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', command], {
      input: value,
      encoding: 'utf8',
      timeout: 60000,
      windowsHide: true,
    });
    if (result.error || result.status !== 0) {
      // CLI output is suppressed: it may contain sensitive details.
      console.error(`Não foi possível configurar ${name}. Verifique quais variáveis foram criadas antes de repetir.`);
      process.exitCode = 1;
      return;
    }
    console.log(`${name}: configurada como sensível.`);
  }
}

try { main(); } catch (_) { console.error('Falha de preparação: confira o vínculo, as configurações e a chave local sem compartilhá-las.'); process.exitCode = 1; }
