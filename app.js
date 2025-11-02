const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express'); 
const { specs } = require('./src/config/swagger');  
const routes = require('./src/routes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Healthcheck
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// API routes
app.use('/api', routes);
// swagger
app.use('/docs', swaggerUi.serve, swaggerUi.setup(specs));

app.use(cors({
  origin: [
    "https://core-link-three.vercel.app",
    "http://localhost:5173"
  ],
  credentials: true,
  methods: "GET,POST,PUT,DELETE,OPTIONS"
}));

app.get('/', (req, res) => {
  res.send('CRM API OK ✅');
});


// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error'
  });
});

module.exports = app;
