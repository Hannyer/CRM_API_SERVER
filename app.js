const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express'); 
const { specs } = require('./src/config/swagger');  
const routes = require('./src/routes');
const { sendErrorResponse } = require('./src/utils/errorHandler');

const app = express();

// Middlewares
const allowedOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || 'https://core-link-three.vercel.app,http://localhost:5173')
  .split(',').map(value => value.trim()).filter(Boolean);
app.use(cors({
  origin(origin, callback) { callback(null, !origin || allowedOrigins.includes(origin)); },
  credentials: true,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));
const proxyHops = Number(process.env.TRUST_PROXY_HOPS || (process.env.RENDER ? 1 : 0));
if (!Number.isInteger(proxyHops) || proxyHops < 0 || proxyHops > 5) throw new Error('Invalid TRUST_PROXY_HOPS');
app.set('trust proxy', proxyHops);
app.use(express.json({ limit: '100kb' }));

// Healthcheck
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Database healthcheck: uses the same PostgreSQL pool as the API.
app.get('/health/db', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const { pool } = require('./src/config/db.pg');
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'ok' });
  } catch (error) {
    console.error('Database healthcheck failed:', error.code || 'unknown');
    res.status(503).json({ status: 'error', database: 'unavailable' });
  }
});
// API routes
app.use('/api', routes);
// swagger
app.use('/docs', swaggerUi.serve, swaggerUi.setup(specs));



app.get('/', (req, res) => {
  res.send('CRM API OK ✅');
});


// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  sendErrorResponse(res, err, err.status || 500, 'Error interno del servidor');
});

module.exports = app;
