const crypto = require('node:crypto');
// Single-instance bounded store. Use a shared store before horizontal scaling.
function rateLimit({ windowMs, max, identity = false, maxKeys = 10000, now = Date.now }) {
  const buckets = new Map();
  return (req, res, next) => {
    const time = now();
    for (const [key, entry] of buckets) if (entry.expires <= time) buckets.delete(key);
    const account = String(req.body?.username || req.body?.email || '').trim().toLowerCase();
    const raw = `${req.ip || req.socket?.remoteAddress || 'unknown'}:${identity ? account : ''}`;
    const key = crypto.createHash('sha256').update(raw).digest('hex');
    let bucket = buckets.get(key);
    if (!bucket) {
      if (buckets.size >= maxKeys) return res.status(429).json({ message: 'Demasiadas solicitudes. Intenta mas tarde.' });
      bucket = { count: 0, expires: time + windowMs }; buckets.set(key, bucket);
    }
    if (++bucket.count > max) {
      res.set('Retry-After', String(Math.max(1, Math.ceil((bucket.expires - time) / 1000))));
      return res.status(429).json({ message: 'Demasiados intentos. Intenta mas tarde.' });
    }
    return next();
  };
}
module.exports = { rateLimit };
