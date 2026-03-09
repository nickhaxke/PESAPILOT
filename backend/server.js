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

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  // Serve frontend build files
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  
  // Handle React routing - send all non-API requests to index.html
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
    }
  });
}

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`PesaPilot server running on port ${PORT}`);
});
