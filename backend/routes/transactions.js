const express = require('express');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get all transactions with filtering
router.get('/', async (req, res) => {
  try {
    const { 
      type, 
      category, 
      startDate, 
      endDate, 
      search,
      page = 1,
      limit = 20,
      sortBy = 'date',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const transactions = [];
    let totalCount = 0;

    // Build income query
    if (!type || type === 'income') {
      let incomeQuery = `
        SELECT id, amount, source as category, date, notes as description, 'income' as type, created_at
        FROM income
        WHERE user_id = ?
      `;
      const incomeParams = [req.userId];

      if (startDate) {
        incomeQuery += ' AND date >= ?';
        incomeParams.push(startDate);
      }

      if (endDate) {
        incomeQuery += ' AND date <= ?';
        incomeParams.push(endDate);
      }

      if (category && type === 'income') {
        incomeQuery += ' AND source = ?';
        incomeParams.push(category);
      }

      if (search) {
        incomeQuery += ' AND (source LIKE ? OR notes LIKE ?)';
        incomeParams.push(`%${search}%`, `%${search}%`);
      }

      const [income] = await pool.query(incomeQuery, incomeParams);
      transactions.push(...income);
    }

    // Build expenses query
    if (!type || type === 'expense') {
      let expenseQuery = `
        SELECT id, amount, category, date, description, 'expense' as type, created_at
        FROM expenses
        WHERE user_id = ?
      `;
      const expenseParams = [req.userId];

      if (startDate) {
        expenseQuery += ' AND date >= ?';
        expenseParams.push(startDate);
      }

      if (endDate) {
        expenseQuery += ' AND date <= ?';
        expenseParams.push(endDate);
      }

      if (category && type === 'expense') {
        expenseQuery += ' AND category = ?';
        expenseParams.push(category);
      }

      if (search) {
        expenseQuery += ' AND (category LIKE ? OR description LIKE ?)';
        expenseParams.push(`%${search}%`, `%${search}%`);
      }

      const [expenses] = await pool.query(expenseQuery, expenseParams);
      transactions.push(...expenses);
    }

    // Sort transactions
    transactions.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        comparison = new Date(b.date) - new Date(a.date);
      } else if (sortBy === 'amount') {
        comparison = parseFloat(b.amount) - parseFloat(a.amount);
      } else if (sortBy === 'category') {
        comparison = a.category.localeCompare(b.category);
      }
      return sortOrder === 'ASC' ? -comparison : comparison;
    });

    totalCount = transactions.length;

    // Apply pagination
    const paginatedTransactions = transactions.slice(offset, offset + parseInt(limit));

    res.json({
      transactions: paginatedTransactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to get transactions' });
  }
});

// Get transaction summary
router.get('/summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let incomeQuery = `
      SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
      FROM income
      WHERE user_id = ?
    `;
    const incomeParams = [req.userId];

    let expenseQuery = `
      SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
      FROM expenses
      WHERE user_id = ?
    `;
    const expenseParams = [req.userId];

    if (startDate) {
      incomeQuery += ' AND date >= ?';
      expenseQuery += ' AND date >= ?';
      incomeParams.push(startDate);
      expenseParams.push(startDate);
    }

    if (endDate) {
      incomeQuery += ' AND date <= ?';
      expenseQuery += ' AND date <= ?';
      incomeParams.push(endDate);
      expenseParams.push(endDate);
    }

    const [incomeResult] = await pool.query(incomeQuery, incomeParams);
    const [expenseResult] = await pool.query(expenseQuery, expenseParams);

    res.json({
      summary: {
        totalIncome: parseFloat(incomeResult[0].total),
        incomeCount: incomeResult[0].count,
        totalExpenses: parseFloat(expenseResult[0].total),
        expenseCount: expenseResult[0].count,
        netBalance: parseFloat(incomeResult[0].total) - parseFloat(expenseResult[0].total)
      }
    });
  } catch (error) {
    console.error('Get transactions summary error:', error);
    res.status(500).json({ error: 'Failed to get transactions summary' });
  }
});

// Export transactions (CSV format)
router.get('/export', async (req, res) => {
  try {
    const { startDate, endDate, type } = req.query;

    let transactions = [];

    // Get income
    if (!type || type === 'income') {
      let incomeQuery = `
        SELECT 'Income' as Type, amount as Amount, source as Category, date as Date, notes as Description
        FROM income
        WHERE user_id = ?
      `;
      const incomeParams = [req.userId];

      if (startDate) {
        incomeQuery += ' AND date >= ?';
        incomeParams.push(startDate);
      }

      if (endDate) {
        incomeQuery += ' AND date <= ?';
        incomeParams.push(endDate);
      }

      const [income] = await pool.query(incomeQuery, incomeParams);
      transactions.push(...income);
    }

    // Get expenses
    if (!type || type === 'expense') {
      let expenseQuery = `
        SELECT 'Expense' as Type, amount as Amount, category as Category, date as Date, description as Description
        FROM expenses
        WHERE user_id = ?
      `;
      const expenseParams = [req.userId];

      if (startDate) {
        expenseQuery += ' AND date >= ?';
        expenseParams.push(startDate);
      }

      if (endDate) {
        expenseQuery += ' AND date <= ?';
        expenseParams.push(endDate);
      }

      const [expenses] = await pool.query(expenseQuery, expenseParams);
      transactions.push(...expenses);
    }

    // Sort by date
    transactions.sort((a, b) => new Date(b.Date) - new Date(a.Date));

    // Convert to CSV
    if (transactions.length === 0) {
      return res.json({ csv: 'Type,Amount,Category,Date,Description\n' });
    }

    const headers = Object.keys(transactions[0]).join(',');
    const rows = transactions.map(t => 
      Object.values(t).map(v => 
        typeof v === 'string' && v.includes(',') ? `"${v}"` : v
      ).join(',')
    );

    const csv = [headers, ...rows].join('\n');

    res.json({ csv });
  } catch (error) {
    console.error('Export transactions error:', error);
    res.status(500).json({ error: 'Failed to export transactions' });
  }
});

module.exports = router;
