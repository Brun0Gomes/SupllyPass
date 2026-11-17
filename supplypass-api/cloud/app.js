// Aplicação de nuvem separada da versão SQLite. Ainda requer variáveis e
// provisionamento explícito antes do deploy.
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('node:fs');
const { newId } = require('../src/services/crypto');
const { DOC_TYPES } = require('../src/services/score');
const { createPool } = require('./database');
const { createPostgresStore } = require('./postgres-store');
const { createPrivateStorage } = require('./private-storage');
const { createPassports } = require('./passports');
const { createLimiter } = require('./rate-limit');
const { createAuth, wrap } = require('./auth');
const { createRoutes } = require('./routes');
const { createDocumentRoutes } = require('./documents');

function createCloudApp({ config, pool, storage }) {
  const app = express();
  // A Vercel repassa o IP de origem através do proxy gerenciado.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(cors({
    origin(origin, callback) {
      if (!origin || config.corsOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Origem não permitida.'));
    },
    methods: ['GET', 'POST', 'PATCH'], allowedHeaders: ['Authorization', 'Content-Type'],
  }));
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cache-Control', 'no-store');
    if (req.secure) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });
  app.use(express.json({ limit: '1mb' }));

  const audit = async ({ kind, actor, action, target = null, ip = null }) => {
    await pool.query(`INSERT INTO supplypass_private.audit_logs (id,kind,actor,action,target,ip,at)
      VALUES ($1,$2,$3,$4,$5,$6,$7)`, [newId('log'), kind, actor, action, target, ip, new Date().toISOString()]);
  };
  const limiter = createLimiter({ pool, key: config.jwtSecret });
  const passports = createPassports(pool);
  const store = createPostgresStore(pool);
  const auth = createAuth({ pool, config, audit, limiter });
  app.use('/api', limiter('global', 300));
  app.get('/api/health', wrap(async (req, res) => {
    await pool.query('SELECT 1');
    return res.json({ status: 'ok', service: 'supplypass-api' });
  }));
  app.get('/api/doc-types', (req, res) => res.json({ docTypes: DOC_TYPES, alertWindowDays: config.alertWindowDays }));
  app.use('/api/auth', auth.router);
  app.use('/api', createRoutes({ pool, passports, auth, audit, limiter }));
  app.use('/api', createDocumentRoutes({ pool, config, storage, store, passports, auth, audit, limiter }));
  app.use((req, res) => res.status(404).json({ error: 'Rota não encontrada.' }));
  app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) return res.status(400).json({ error: 'Arquivo excede o limite permitido de 3 MB ou formulário inválido.' });
    console.error('Falha na API de nuvem:', error.code || error.name || 'erro');
    return res.status(500).json({ error: 'Não foi possível concluir a operação.' });
  });
  return app;
}

function fromEnvironment() {
  if (process.env.SUPPLYPASS_CLOUD !== 'true') throw new Error('SUPPLYPASS_CLOUD must be true.');
  const config = require('../src/config');
  const ca = process.env.SUPABASE_DB_CA_CERT || (process.env.SUPABASE_CA_CERT_PATH ? fs.readFileSync(process.env.SUPABASE_CA_CERT_PATH, 'utf8') : null);
  if (!ca) throw new Error('SUPABASE_DB_CA_CERT or SUPABASE_CA_CERT_PATH is required.');
  const pool = createPool({ connectionString: process.env.SUPABASE_DATABASE_URL, caCertificate: ca });
  const storage = createPrivateStorage({ url: process.env.SUPABASE_URL, serviceKey: process.env.SUPABASE_SECRET_KEY, bucket: process.env.SUPABASE_BUCKET });
  return { app: createCloudApp({ config, pool, storage }), pool, storage };
}

module.exports = { createCloudApp, fromEnvironment };
