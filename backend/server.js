require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/auth');
const incomeRoutes = require('./routes/income');
const expenseRoutes = require('./routes/expense');
const budgetRoutes = require('./routes/budget');
const dashboardRoutes = require('./routes/dashboard');
const transactionRoutes = require('./routes/transactions');
const savingsRoutes = require('./routes/savings');
const debtsRoutes = require('./routes/debts');
const mobileMoneyRoutes = require('./routes/mobileMoney');
const financialHealthRoutes = require('./routes/financialHealth');
const communityRoutes = require('./routes/community');
const aiAssistantRoutes = require('./routes/aiAssistant');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/income', incomeRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/savings', savingsRoutes);
app.use('/api/debts', debtsRoutes);
app.use('/api/mobile-money', mobileMoneyRoutes);
app.use('/api/financial-health', financialHealthRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/ai', aiAssistantRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'PesaPilot API is running' });
});

// Database connection test
app.get('/api/db-test', async (req, res) => {
  try {
    const pool = require('./config/database');
    const [rows] = await pool.query('SELECT 1 as test');
    res.json({ status: 'ok', database: 'connected', result: rows });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      database: 'failed',
      message: error.message,
      code: error.code 
    });
  }
});

// Environment check (hide sensitive data)
app.get('/api/env-check', (req, res) => {
  res.json({
    NODE_ENV: process.env.NODE_ENV || 'not set',
    PORT: process.env.PORT || 'not set',
    DB_HOST: process.env.DB_HOST ? 'SET' : 'NOT SET',
    DB_USER: process.env.DB_USER ? 'SET' : 'NOT SET',
    DB_PASSWORD: process.env.DB_PASSWORD ? 'SET' : 'NOT SET',
    DB_NAME: process.env.DB_NAME ? 'SET' : 'NOT SET',
    JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT SET'
  });
});

app.use(cors({
  origin: 'https://your-netlify-app.netlify.app', // BADILISHA na Netlify domain yako kamili
  credentials: true
}));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`PesaPilot server running on port ${PORT}`);
});
