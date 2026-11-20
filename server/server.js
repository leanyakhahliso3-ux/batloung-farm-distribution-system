const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { testConnection } = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: allowedOrigins.includes('*') ? '*' : allowedOrigins,
  credentials: false,
}));
app.use(express.json());


app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Batloung Farm Distribution API is healthy' });
});

app.use('/api/suppliers', require('./routes/supplierRoutes'));
app.use('/api/fruits', require('./routes/fruitStockRoutes'));
app.use('/api/vendors', require('./routes/vendorRoutes'));
app.use('/api/purchases', require('./routes/purchaseRoutes'));
app.use('/api/sales', require('./routes/saleRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));

app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found' });
});

app.use(errorHandler);

const PORT = Number(process.env.PORT) || 5000;
app.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  await testConnection();
});
