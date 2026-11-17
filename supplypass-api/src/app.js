const express = require('express');
const cors = require('cors');
const multer = require('multer');

const config = require('./config');
const { DOC_TYPES } = require('./services/score');
const authRoutes = require('./routes/auth.routes');
const suppliersRoutes = require('./routes/suppliers.routes');
const meRoutes = require('./routes/me.routes');
const verifyRoutes = require('./routes/verify.routes');
const logsRoutes = require('./routes/logs.routes');
const usersRoutes = require('./routes/users.routes');
const reviewsRoutes = require('./routes/reviews.routes');
const { globalApiLimiter } = require('./middleware/rate-limit');

const app = express();

// O aplicativo nativo não envia Origin. Em navegador, só origens explicitamente
// permitidas passam; em produção, defina CORS_ORIGINS no .env.
app.use(cors({
  origin(origin, callback) {
    if (!origin || config.corsOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origem não permitida pelo CORS.'));
  },
  methods: ['GET', 'POST', 'PATCH'],
  allowedHeaders: ['Authorization', 'Content-Type'],
}));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(self)');
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  return next();
});
app.use(express.json({ limit: '1mb' }));
app.use('/api', globalApiLimiter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'supplypass-api', now: new Date().toISOString() });
});

// Catalogo de documentos e pesos: o app usa para montar os formularios.
app.get('/api/doc-types', (req, res) => {
  res.json({ docTypes: DOC_TYPES, alertWindowDays: config.alertWindowDays });
});

app.use('/api/auth', authRoutes);
app.use('/api/suppliers', suppliersRoutes);
app.use('/api/me', meRoutes);
app.use('/api/verify', verifyRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/reviews', reviewsRoutes);

app.use((req, res) => {
  res.status(404).json({ error: `Rota não encontrada: ${req.method} ${req.originalUrl}` });
});

// Tratador de erros: precisa dos quatro parametros para o Express reconhece-lo.
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    const tooBig = error.code === 'LIMIT_FILE_SIZE';
    return res.status(400).json({
      error: tooBig
        ? `Arquivo maior que o limite de ${Math.round(config.maxUploadBytes / 1024 / 1024)} MB.`
        : `Falha no upload: ${error.message}`,
    });
  }
  if (error) {
    console.error('[erro]', error.message);
    return res.status(400).json({ error: error.message || 'Erro inesperado.' });
  }
  return next();
});

module.exports = app;
