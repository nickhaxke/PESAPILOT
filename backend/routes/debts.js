const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Get all debts
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = `
      SELECT d.*,
        ROUND(((d.original_amount - d.current_balance) / d.original_amount) * 100, 1) as paid_percentage,
        DATEDIFF(d.end_date, CURDATE()) as days_until_due
      FROM debts d
      WHERE d.user_id = ?
    `;
    const params = [req.userId];

    if (status) {
      query += ' AND d.status = ?';
      params.push(status);
    }

    query += ' ORDER BY d.due_day ASC, d.current_balance DESC';

    const [debts] = await pool.query(query, params);

    const debtsWithCalc = debts.map(debt => ({
      ...debt,
      total_paid: parseFloat(debt.original_amount) - parseFloat(debt.current_balance),
      paid_percentage: parseFloat(debt.paid_percentage) || 0,
      is_overdue: debt.days_until_due < 0 && debt.status === 'active'
    }));

    res.json({ debts: debtsWithCalc });
  } catch (error) {
    console.error('Get debts error:', error);
    res.status(500).json({ error: 'Failed to get debts' });
  }
});

// ⚠️ IMPORTANT: Summary route MUST be before /:id route
router.get('/summary/stats', async (req, res) => {
  try {
    const [summary] = await pool.query(`
      SELECT 
        COUNT(*) as total_debts,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_debts,
        SUM(CASE WHEN status = 'paid_off' THEN 1 ELSE 0 END) as paid_off_debts,
        COALESCE(SUM(original_amount), 0) as total_original,
        COALESCE(SUM(current_balance), 0) as total_owed,
        COALESCE(SUM(original_amount - current_balance), 0) as total_paid,
        COALESCE(SUM(CASE WHEN status = 'active' THEN minimum_payment ELSE 0 END), 0) as monthly_minimum
      FROM debts
      WHERE user_id = ?
    `, [req.userId]);

    // Get this month's payments
    const [monthlyPayments] = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) as monthly_paid
      FROM debt_payments
      WHERE user_id = ? AND MONTH(date) = MONTH(CURDATE()) AND YEAR(date) = YEAR(CURDATE())
    `, [req.userId]);

    // Get overdue debts count
    const [overdue] = await pool.query(`
      SELECT COUNT(*) as overdue_count
      FROM debts
      WHERE user_id = ? AND status = 'active' AND end_date < CURDATE()
    `, [req.userId]);

    // Get upcoming payments (debts due in next 7 days)
    const [upcoming] = await pool.query(`
      SELECT id, name, minimum_payment, due_day
      FROM debts
      WHERE user_id = ? AND status = 'active' AND due_day BETWEEN DAY(CURDATE()) AND DAY(CURDATE()) + 7
      ORDER BY due_day ASC
    `, [req.userId]);

    // Return camelCase format expected by frontend
    res.json({
      totalDebts: parseInt(summary[0].active_debts) || 0,
      totalOwed: parseFloat(summary[0].total_owed) || 0,
      totalPaid: parseFloat(summary[0].total_paid) || 0,
      overdueCount: parseInt(overdue[0].overdue_count) || 0,
      thisMonthPayments: parseFloat(monthlyPayments[0].monthly_paid) || 0,
      monthlyMinimum: parseFloat(summary[0].monthly_minimum) || 0,
      upcomingPayments: upcoming
    });
  } catch (error) {
    console.error('Get debt summary error:', error);
    res.status(500).json({ error: 'Failed to get debt summary' });
  }
});

// Get debt with payments (MUST be after /summary/stats)
router.get('/:id', async (req, res) => {
  try {
    const [debts] = await pool.query(
      `SELECT d.*,
        ROUND(((d.original_amount - d.current_balance) / d.original_amount) * 100, 1) as paid_percentage
       FROM debts d
       WHERE d.id = ? AND d.user_id = ?`,
      [req.params.id, req.userId]
    );

    if (debts.length === 0) {
      return res.status(404).json({ error: 'Debt not found' });
    }

    const [payments] = await pool.query(
      'SELECT * FROM debt_payments WHERE debt_id = ? ORDER BY date DESC LIMIT 20',
      [req.params.id]
    );

    res.json({ debt: debts[0], payments });
  } catch (error) {
    console.error('Get debt error:', error);
    res.status(500).json({ error: 'Failed to get debt' });
  }
});

// Create debt
router.post('/', [
  body('name').trim().notEmpty().withMessage('Debt name is required'),
  body('original_amount').isFloat({ min: 1 }).withMessage('Amount must be positive'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      name, type, lender, creditor, original_amount, current_balance, 
      interest_rate, minimum_payment, due_day, start_date, end_date, due_date, category 
    } = req.body;

    // Map frontend category to valid database type ENUM
    const categoryToType = {
      'personal_loan': 'personal',
      'credit_card': 'credit_card',
      'mobile_loan': 'loan',
      'business_loan': 'loan',
      'mortgage': 'mortgage',
      'vehicle_loan': 'loan',
      'student_loan': 'loan',
      'other': 'other'
    };
    const dbType = type || categoryToType[category] || 'loan';

    const [result] = await pool.query(
      `INSERT INTO debts (user_id, name, type, lender, original_amount, current_balance, 
        interest_rate, minimum_payment, due_day, start_date, end_date, category)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.userId, 
        name, 
        dbType, 
        lender || creditor || null, 
        original_amount,
        current_balance || original_amount, 
        interest_rate || 0, 
        minimum_payment || 0,
        due_day || (due_date ? new Date(due_date).getDate() : 1), 
        start_date || new Date().toISOString().split('T')[0], 
        end_date || due_date || null,
        category || 'personal_loan'
      ]
    );

    const [newDebt] = await pool.query('SELECT * FROM debts WHERE id = ?', [result.insertId]);

    res.status(201).json({ message: 'Debt added successfully', debt: newDebt[0] });
  } catch (error) {
    console.error('Create debt error:', error.message, error.sql || '');
    res.status(500).json({ error: 'Failed to create debt: ' + error.message });
  }
});

// Make payment on debt
router.post('/:id/payment', [
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be positive'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { amount, date, notes } = req.body;

    // Verify ownership
    const [debts] = await pool.query(
      'SELECT * FROM debts WHERE id = ? AND user_id = ?',
      [id, req.userId]
    );

    if (debts.length === 0) {
      return res.status(404).json({ error: 'Debt not found' });
    }

    const debt = debts[0];

    // Add payment
    await pool.query(
      'INSERT INTO debt_payments (debt_id, user_id, amount, date, notes) VALUES (?, ?, ?, ?, ?)',
      [id, req.userId, amount, date || new Date().toISOString().split('T')[0], notes || null]
    );

    // Update debt balance
    const newBalance = Math.max(0, parseFloat(debt.current_balance) - parseFloat(amount));
    const status = newBalance <= 0 ? 'paid_off' : 'active';

    await pool.query(
      'UPDATE debts SET current_balance = ?, status = ? WHERE id = ?',
      [newBalance, status, id]
    );

    // Also record as expense - so it shows in spending reports
    await pool.query(
      'INSERT INTO expenses (user_id, amount, category, date, description, source) VALUES (?, ?, ?, ?, ?, ?)',
      [req.userId, amount, 'Debt Payment', date || new Date().toISOString().split('T')[0], `Malipo ya deni: ${debt.name}`, 'debt_payment']
    );

    const [updatedDebt] = await pool.query('SELECT * FROM debts WHERE id = ?', [id]);

    res.json({ 
      message: status === 'paid_off' ? 'Congratulations! Debt paid off!' : 'Payment recorded',
      debt: updatedDebt[0]
    });
  } catch (error) {
    console.error('Make payment error:', error);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

// Update debt
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const [existing] = await pool.query(
      'SELECT id FROM debts WHERE id = ? AND user_id = ?',
      [id, req.userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Debt not found' });
    }

    const allowedFields = ['name', 'type', 'lender', 'interest_rate', 'minimum_payment', 'due_day', 'end_date', 'status'];
    const updateFields = [];
    const values = [];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        values.push(updates[field]);
      }
    }

    if (updateFields.length > 0) {
      values.push(id);
      await pool.query(`UPDATE debts SET ${updateFields.join(', ')} WHERE id = ?`, values);
    }

    const [updated] = await pool.query('SELECT * FROM debts WHERE id = ?', [id]);
    res.json({ message: 'Debt updated', debt: updated[0] });
  } catch (error) {
    console.error('Update debt error:', error);
    res.status(500).json({ error: 'Failed to update debt' });
  }
});

// Delete debt
router.delete('/:id', async (req, res) => {
  try {
    const [existing] = await pool.query(
      'SELECT id FROM debts WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Debt not found' });
    }

    // Delete payments first
    await pool.query('DELETE FROM debt_payments WHERE debt_id = ?', [req.params.id]);
    await pool.query('DELETE FROM debts WHERE id = ?', [req.params.id]);
    
    res.json({ message: 'Debt deleted' });
  } catch (error) {
    console.error('Delete debt error:', error);
    res.status(500).json({ error: 'Failed to delete debt' });
  }
});

module.exports = router;
