const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get budgets for a month
router.get('/', async (req, res) => {
  try {
    const { month, year } = req.query;
    const currentMonth = month || new Date().getMonth() + 1;
    const currentYear = year || new Date().getFullYear();

    // Get budgets with spent amounts
    const [budgets] = await pool.query(`
      SELECT 
        b.id,
        b.category,
        b.amount as budget_amount,
        b.month,
        b.year,
        COALESCE(SUM(e.amount), 0) as spent_amount
      FROM budgets b
      LEFT JOIN expenses e ON e.user_id = b.user_id 
        AND e.category = b.category 
        AND MONTH(e.date) = b.month 
        AND YEAR(e.date) = b.year
      WHERE b.user_id = ? AND b.month = ? AND b.year = ?
      GROUP BY b.id, b.category, b.amount, b.month, b.year
      ORDER BY b.category
    `, [req.userId, currentMonth, currentYear]);

    // Calculate percentages and remaining
    const budgetsWithStats = budgets.map(b => ({
      ...b,
      remaining: parseFloat(b.budget_amount) - parseFloat(b.spent_amount),
      percentage: Math.min(100, Math.round((parseFloat(b.spent_amount) / parseFloat(b.budget_amount)) * 100))
    }));

    res.json({ budgets: budgetsWithStats });
  } catch (error) {
    console.error('Get budgets error:', error);
    res.status(500).json({ error: 'Failed to get budgets' });
  }
});

// Set/Update budget
router.post('/', [
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
  body('month').isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12'),
  body('year').isInt({ min: 2000 }).withMessage('Valid year is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { category, amount, month, year } = req.body;

    // Upsert - insert or update if exists
    await pool.query(`
      INSERT INTO budgets (user_id, category, amount, month, year)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE amount = ?
    `, [req.userId, category, amount, month, year, amount]);

    // Get the updated budget
    const [budgets] = await pool.query(`
      SELECT 
        b.id,
        b.category,
        b.amount as budget_amount,
        b.month,
        b.year,
        COALESCE(SUM(e.amount), 0) as spent_amount
      FROM budgets b
      LEFT JOIN expenses e ON e.user_id = b.user_id 
        AND e.category = b.category 
        AND MONTH(e.date) = b.month 
        AND YEAR(e.date) = b.year
      WHERE b.user_id = ? AND b.category = ? AND b.month = ? AND b.year = ?
      GROUP BY b.id, b.category, b.amount, b.month, b.year
    `, [req.userId, category, month, year]);

    const budget = budgets[0];
    const budgetWithStats = {
      ...budget,
      remaining: parseFloat(budget.budget_amount) - parseFloat(budget.spent_amount),
      percentage: Math.min(100, Math.round((parseFloat(budget.spent_amount) / parseFloat(budget.budget_amount)) * 100))
    };

    res.json({ 
      message: 'Budget saved successfully',
      budget: budgetWithStats
    });
  } catch (error) {
    console.error('Set budget error:', error);
    res.status(500).json({ error: 'Failed to set budget' });
  }
});

// Delete budget
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const [existing] = await pool.query('SELECT id FROM budgets WHERE id = ? AND user_id = ?', [id, req.userId]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    await pool.query('DELETE FROM budgets WHERE id = ?', [id]);

    res.json({ message: 'Budget deleted successfully' });
  } catch (error) {
    console.error('Delete budget error:', error);
    res.status(500).json({ error: 'Failed to delete budget' });
  }
});

// Copy budgets from previous month
router.post('/copy', async (req, res) => {
  try {
    const { fromMonth, fromYear, toMonth, toYear } = req.body;

    // Get budgets from source month
    const [sourceBudgets] = await pool.query(
      'SELECT category, amount FROM budgets WHERE user_id = ? AND month = ? AND year = ?',
      [req.userId, fromMonth, fromYear]
    );

    if (sourceBudgets.length === 0) {
      return res.status(404).json({ error: 'No budgets found for the source month' });
    }

    // Copy to destination month
    for (const budget of sourceBudgets) {
      await pool.query(`
        INSERT INTO budgets (user_id, category, amount, month, year)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE amount = ?
      `, [req.userId, budget.category, budget.amount, toMonth, toYear, budget.amount]);
    }

    res.json({ message: `${sourceBudgets.length} budgets copied successfully` });
  } catch (error) {
    console.error('Copy budgets error:', error);
    res.status(500).json({ error: 'Failed to copy budgets' });
  }
});

module.exports = router;
