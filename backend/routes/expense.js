const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get all expenses
router.get('/', async (req, res) => {
  try {
    const { month, year, category, limit } = req.query;
    
    let query = 'SELECT * FROM expenses WHERE user_id = ?';
    const params = [req.userId];

    if (month && year) {
      query += ' AND EXTRACT(MONTH FROM date) = ? AND EXTRACT(YEAR FROM date) = ?';
      params.push(month, year);
    }

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    query += ' ORDER BY date DESC';

    if (limit) {
      query += ' LIMIT ?';
      params.push(parseInt(limit));
    }

    const [expenses] = await pool.query(query, params);
    res.json({ expenses });
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ error: 'Failed to get expenses' });
  }
});

// Get categories
router.get('/categories', async (req, res) => {
  try {
    const [categories] = await pool.query('SELECT name, icon, color FROM categories ORDER BY name');
    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

// Add expense
router.post('/', [
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('date').isDate().withMessage('Valid date is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { amount, category, date, description } = req.body;

    const [result] = await pool.query(
      'INSERT INTO expenses (user_id, amount, category, date, description) VALUES (?, ?, ?, ?, ?) RETURNING *',
      [req.userId, amount, category, date, description || null]
    );

    res.status(201).json({ 
      message: 'Expense added successfully',
      expense: result[0]
    });
  } catch (error) {
    console.error('Add expense error:', error);
    res.status(500).json({ error: 'Failed to add expense' });
  }
});

// Update expense
router.put('/:id', [
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('date').isDate().withMessage('Valid date is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { amount, category, date, description } = req.body;

    // Verify ownership
    const [existing] = await pool.query('SELECT id FROM expenses WHERE id = ? AND user_id = ?', [id, req.userId]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    const [updated] = await pool.query(
      'UPDATE expenses SET amount = ?, category = ?, date = ?, description = ? WHERE id = ? RETURNING *',
      [amount, category, date, description || null, id]
    );

    res.json({ 
      message: 'Expense updated successfully',
      expense: updated[0]
    });
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({ error: 'Failed to update expense' });
  }
});

// Delete expense
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const [existing] = await pool.query('SELECT id FROM expenses WHERE id = ? AND user_id = ?', [id, req.userId]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    await pool.query('DELETE FROM expenses WHERE id = ?', [id]);

    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

module.exports = router;
