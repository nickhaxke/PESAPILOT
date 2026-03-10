const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get all income entries
router.get('/', async (req, res) => {
  try {
    const { month, year, limit } = req.query;
    
    let query = 'SELECT * FROM income WHERE user_id = ?';
    const params = [req.userId];

    if (month && year) {
      query += ' AND EXTRACT(MONTH FROM date) = ? AND EXTRACT(YEAR FROM date) = ?';
      params.push(month, year);
    }

    query += ' ORDER BY date DESC';

    if (limit) {
      query += ' LIMIT ?';
      params.push(parseInt(limit));
    }

    const [income] = await pool.query(query, params);
    res.json({ income });
  } catch (error) {
    console.error('Get income error:', error);
    res.status(500).json({ error: 'Failed to get income' });
  }
});

// Get income sources
router.get('/sources', async (req, res) => {
  try {
    const [sources] = await pool.query('SELECT name FROM income_sources ORDER BY name');
    res.json({ sources: sources.map(s => s.name) });
  } catch (error) {
    console.error('Get sources error:', error);
    res.status(500).json({ error: 'Failed to get sources' });
  }
});

// Add income
router.post('/', [
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
  body('source').trim().notEmpty().withMessage('Source is required'),
  body('date').isDate().withMessage('Valid date is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { amount, source, date, notes } = req.body;

    const [result] = await pool.query(
      'INSERT INTO income (user_id, amount, source, date, notes) VALUES (?, ?, ?, ?, ?) RETURNING *',
      [req.userId, amount, source, date, notes || null]
    );

    res.status(201).json({ 
      message: 'Income added successfully',
      income: result[0]
    });
  } catch (error) {
    console.error('Add income error:', error);
    res.status(500).json({ error: 'Failed to add income' });
  }
});

// Update income
router.put('/:id', [
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
  body('source').trim().notEmpty().withMessage('Source is required'),
  body('date').isDate().withMessage('Valid date is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { amount, source, date, notes } = req.body;

    // Verify ownership
    const [existing] = await pool.query('SELECT id FROM income WHERE id = ? AND user_id = ?', [id, req.userId]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Income not found' });
    }

    const [updated] = await pool.query(
      'UPDATE income SET amount = ?, source = ?, date = ?, notes = ? WHERE id = ? RETURNING *',
      [amount, source, date, notes || null, id]
    );

    res.json({ 
      message: 'Income updated successfully',
      income: updated[0]
    });
  } catch (error) {
    console.error('Update income error:', error);
    res.status(500).json({ error: 'Failed to update income' });
  }
});

// Delete income
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const [existing] = await pool.query('SELECT id FROM income WHERE id = ? AND user_id = ?', [id, req.userId]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Income not found' });
    }

    await pool.query('DELETE FROM income WHERE id = ?', [id]);

    res.json({ message: 'Income deleted successfully' });
  } catch (error) {
    console.error('Delete income error:', error);
    res.status(500).json({ error: 'Failed to delete income' });
  }
});

module.exports = router;
