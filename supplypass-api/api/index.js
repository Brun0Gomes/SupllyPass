// Handler Vercel: a API local continua usando server.js.
const { fromEnvironment } = require('../cloud/app');
module.exports = fromEnvironment().app;
