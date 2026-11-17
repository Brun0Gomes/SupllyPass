require('dotenv').config();
const { fromEnvironment } = require('./app');
const { app, storage } = fromEnvironment();
const port = Number(process.env.CLOUD_PORT || 3334);
storage.assertPrivate().then(() => {
  app.listen(port, '127.0.0.1', () => console.log(`API de nuvem para teste local na porta ${port}.`));
}).catch((error) => {
  console.error('Não foi possível iniciar a API de nuvem:', error.message);
  process.exitCode = 1;
});
