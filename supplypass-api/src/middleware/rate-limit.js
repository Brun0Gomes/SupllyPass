function createRateLimiter({ limit, windowMs, keyOf = (req) => req.ip || 'unknown' }) {
  const buckets = new Map();

  return function rateLimit(req, res, next) {
    const now = Date.now();
    const key = String(keyOf(req));
    const current = buckets.get(key);
    const bucket = !current || now >= current.resetAt
      ? { count: 0, resetAt: now + windowMs }
      : current;
    bucket.count += 1;
    buckets.set(key, bucket);

    if (bucket.count > limit) {
      res.setHeader('Retry-After', Math.ceil((bucket.resetAt - now) / 1000));
      return res.status(429).json({ error: 'Muitas requisições. Aguarde um instante e tente novamente.' });
    }
    return next();
  };
}

const globalApiLimiter = createRateLimiter({ limit: 300, windowMs: 15 * 60 * 1000 });
const loginLimiter = createRateLimiter({ limit: 20, windowMs: 15 * 60 * 1000 });
const authenticatedLimiter = createRateLimiter({
  limit: 600,
  windowMs: 15 * 60 * 1000,
  keyOf: (req) => req.user?.id || req.ip || 'unknown',
});

module.exports = { globalApiLimiter, loginLimiter, authenticatedLimiter };
