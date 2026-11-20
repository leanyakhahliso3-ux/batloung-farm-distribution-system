const path = require('path');
const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { testConnection } = require('./config/db');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { authenticate, requireRole } = require('./middleware/auth');

const authRoutes = require('./routes/auth');
const suppliersRoutes = require('./routes/suppliers');
const fruitsRoutes = require('./routes/fruits');
const stockRoutes = require('./routes/stock');
const vendorsRoutes = require('./routes/vendors');
const purchasesRoutes = require('./routes/purchases');
const salesRoutes = require('./routes/sales');
const paymentsRoutes = require('./routes/payments');
const reportsRoutes = require('./routes/reports');

const app = express();
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

app.use(cors({
    origin: allowedOrigins.includes('*') ? '*' : allowedOrigins,
    credentials: false
}));
app.use(express.json());

app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Welcome to Batloung Farm Distribution System API',
        status: 'Server is running successfully'
    });
});

app.get('/api/health', async (req, res) => {
    try {
        await testConnection();
        res.status(200).json({
            success: true,
            status: 'OK',
            database: 'connected'
        });
    } catch (error) {
        res.status(503).json({
            success: false,
            status: 'DEGRADED',
            database: 'disconnected',
            message: 'Database connection is unavailable.'
        });
    }
});

app.use('/api/auth', authRoutes);
app.use('/api', authenticate);
app.use('/api', (req, res, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        return requireRole('ADMIN', 'MANAGER')(req, res, next);
    }

    return next();
});

app.use('/api/suppliers', suppliersRoutes);
app.use('/api/fruits', fruitsRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/vendors', vendorsRoutes);
app.use('/api/purchases', purchasesRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/reports', reportsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 5001;

app.listen(PORT, () => {
    console.log('======================================');
    console.log('BATLOUNG FARM DISTRIBUTION SYSTEM');
    console.log('======================================');
    console.log(`Server running on port ${PORT}`);
    console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
    console.log('======================================');
});

testConnection()
    .then(() => console.log('MySQL connection: Successful'))
    .catch(() => console.log('MySQL connection: Unavailable. Start the API after the database is ready.'));
