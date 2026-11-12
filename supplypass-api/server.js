require('dotenv').config();

const os = require('node:os');

const app = require('./src/app');
const config = require('./src/config');
const { ensureSeed } = require('./src/db/seed');

// Na primeira execucao o banco esta vazio: populamos com os dados de demonstracao.
ensureSeed();

app.listen(config.port, '0.0.0.0', () => {
  console.log('\n  SupplyPass API no ar');
  console.log(`  local:  http://localhost:${config.port}/api/health`);

  // O celular nao enxerga "localhost": ele precisa do IP da maquina na rede.
  const interfaces = os.networkInterfaces();
  Object.values(interfaces).forEach((list) => {
    (list || []).forEach((net) => {
      if (net.family === 'IPv4' && !net.internal) {
        console.log(`  rede:   http://${net.address}:${config.port}/api  <- use este no app`);
      }
    });
  });
  console.log('');
});
