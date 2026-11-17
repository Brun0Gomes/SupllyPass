const crypto = require('node:crypto');
const { wrap } = require('./auth');

// Contadores ficam no PostgreSQL, compartilhados pelas instâncias da Vercel.
function createLimiter({ pool, key, windowMs = 900000 }) {
  if (!key || key.length < 32) throw new Error('A rate-limit secret with 32 characters is required.');
  return (bucket, limit) => wrap(async (req, res, next) => {
    const start = Math.floor(Date.now() / windowMs) * windowMs;
    const identity = req.user?.id || req.ip || 'unknown';
    const subject = crypto.createHmac('sha256', key).update(identity).digest('hex');
    const result = await pool.query(`INSERT INTO supplypass_private.rate_limits (bucket, subject_hash, window_start, count)
      VALUES ($1, $2, $3, 1) ON CONFLICT (bucket, subject_hash, window_start)
      DO UPDATE SET count = supplypass_private.rate_limits.count + 1 RETURNING count`, [bucket, subject, start]);
    if (result.rows[0].count > limit) {
      res.setHeader('Retry-After', String(Math.ceil((start + windowMs - Date.now()) / 1000)));
      return res.status(429).json({ error: 'Muitas requisições. Tente novamente mais tarde.' });
    }
    return next();
  });
}
module.exports = { createLimiter };
