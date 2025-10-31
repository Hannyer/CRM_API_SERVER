require('dotenv').config();
const app = require('./app');
const swaggerUi = require('swagger-ui-express');
const swaggerFile = require('./swagger.json');

const PORT = process.env.PORT || 3000;

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerFile));
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
