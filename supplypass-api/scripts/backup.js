// Execute com a API parada para obter uma cópia consistente do banco e arquivos.
const Database = require('better-sqlite3');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();

async function main() {
  const destination = process.argv[2];
  if (!destination) throw new Error('Informe uma pasta de destino nova: npm run backup -- CAMINHO');
  const target = path.resolve(destination);
  const root = path.resolve(__dirname, '..');
  const dbPath = path.resolve(process.env.DB_FILE || path.join(root, 'data', 'supplypass.db'));
  const storage = path.join(root, 'storage');
  if (!fs.existsSync(dbPath)) throw new Error('Banco não encontrado.');
  if (fs.existsSync(target)) throw new Error('A pasta de destino já existe; escolha outra.');
  const relativeToStorage = path.relative(storage, target);
  if (!relativeToStorage.startsWith('..') && !path.isAbsolute(relativeToStorage)) {
    throw new Error('O destino não pode ficar dentro da pasta de arquivos da API.');
  }
  fs.mkdirSync(target, { recursive: false, mode: 0o700 });
  const db = new Database(dbPath, { readonly: true, fileMustExist: true });
  try {
    await db.backup(path.join(target, 'supplypass.db'));
  } finally {
    db.close();
  }
  if (fs.existsSync(storage)) fs.cpSync(storage, path.join(target, 'storage'), { recursive: true, errorOnExist: true });
  console.log('Cópia criada. Proteja o destino e faça backup separado das chaves necessárias.');
}

main().catch((error) => {
  console.error(`Backup incompleto: ${error.message}`);
  process.exitCode = 1;
});
