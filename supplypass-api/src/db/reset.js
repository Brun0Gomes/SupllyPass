const fs = require('node:fs');
const path = require('node:path');

const config = require('../config');

// Apaga banco e arquivos criptografados para recomecar do zero.
// Usado com "npm run reset" antes de uma apresentacao, por exemplo.
[config.dbFile, `${config.dbFile}-wal`, `${config.dbFile}-shm`].forEach((file) => {
  if (fs.existsSync(file)) fs.unlinkSync(file);
});

fs.readdirSync(config.storageDir).forEach((file) => {
  if (file.endsWith('.enc')) fs.unlinkSync(path.join(config.storageDir, file));
});

console.log('Banco e arquivos removidos.');

// O require abaixo recria o schema e roda a carga inicial.
const { ensureSeed } = require('./seed');

ensureSeed();
console.log('Banco recriado com os dados de demonstração.');
