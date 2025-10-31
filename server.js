require('dotenv').config();
const app = require('./src/app');
const swaggerUi = require('swagger-ui-express');
const swaggerFile = require('./swagger.json');

const PORT = process.env.PORT || 3000;

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerFile));
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
