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

const app = express();

// O app roda no celular, em outro dispositivo: o navegador/RN precisa de CORS liberado.
app.use(cors());
app.use(express.json({ limit: '1mb' }));

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
