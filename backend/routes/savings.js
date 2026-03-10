const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Get all savings goals
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = `
      SELECT sg.*, 
        ROUND((sg.current_amount / sg.target_amount) * 100, 1) as progress_percentage,
        (sg.deadline - CURRENT_DATE) as days_remaining
      FROM savings_goals sg
      WHERE sg.user_id = ?
    `;
    const params = [req.userId];

    if (status) {
      query += ' AND sg.status = ?';
      params.push(status);
    }

    query += ' ORDER BY sg.priority DESC, sg.deadline ASC';

    const [goals] = await pool.query(query, params);

    // Calculate monthly savings needed for each goal
    const goalsWithCalc = goals.map(goal => {
      const remaining = parseFloat(goal.target_amount) - parseFloat(goal.current_amount);
      const monthsLeft = goal.days_remaining ? Math.max(1, Math.ceil(goal.days_remaining / 30)) : 1;
      const monthlyNeeded = remaining > 0 ? Math.ceil(remaining / monthsLeft) : 0;
      
      return {
        ...goal,
        remaining_amount: remaining,
        monthly_savings_needed: monthlyNeeded,
        progress_percentage: parseFloat(goal.progress_percentage) || 0
      };
    });

    res.json({ goals: goalsWithCalc });
  } catch (error) {
    console.error('Get savings goals error:', error);
    res.status(500).json({ error: 'Failed to get savings goals' });
  }
});

// Summary route MUST be before /:id route
router.get('/summary/stats', async (req, res) => {
  try {
    const [summary] = await pool.query(`
      SELECT 
        COUNT(*) as total_goals,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_goals,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_goals,
        COALESCE(SUM(target_amount), 0) as total_target,
        COALESCE(SUM(current_amount), 0) as total_saved,
        COALESCE(SUM(CASE WHEN status = 'active' THEN target_amount - current_amount ELSE 0 END), 0) as total_remaining
      FROM savings_goals
      WHERE user_id = ?
    `, [req.userId]);

    // Get this month's contributions
    const [monthlyContrib] = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) as monthly_savings
      FROM savings_contributions
      WHERE user_id = ? AND EXTRACT(MONTH FROM date) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM date) = EXTRACT(YEAR FROM CURRENT_DATE)
    `, [req.userId]);

    res.json({
      totalGoals: parseInt(summary[0].active_goals) || 0,
      totalSaved: parseFloat(summary[0].total_saved) || 0,
      totalTarget: parseFloat(summary[0].total_target) || 0,
      monthlySavings: parseFloat(monthlyContrib[0].monthly_savings) || 0,
      completedGoals: parseInt(summary[0].completed_goals) || 0,
      totalRemaining: parseFloat(summary[0].total_remaining) || 0
    });
  } catch (error) {
    console.error('Get savings summary error:', error);
    res.status(500).json({ error: 'Failed to get savings summary' });
  }
});

// Get single goal with contributions
router.get('/:id', async (req, res) => {
  try {
    const [goals] = await pool.query(
      `SELECT sg.*, 
        ROUND((sg.current_amount / sg.target_amount) * 100, 1) as progress_percentage
       FROM savings_goals sg
       WHERE sg.id = ? AND sg.user_id = ?`,
      [req.params.id, req.userId]
    );

    if (goals.length === 0) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    const [contributions] = await pool.query(
      'SELECT * FROM savings_contributions WHERE goal_id = ? ORDER BY date DESC LIMIT 20',
      [req.params.id]
    );

    res.json({ goal: goals[0], contributions });
  } catch (error) {
    console.error('Get goal error:', error);
    res.status(500).json({ error: 'Failed to get goal' });
  }
});

// Create savings goal
router.post('/', [
  body('name').trim().notEmpty().withMessage('Goal name is required'),
  body('target_amount').isFloat({ min: 1 }).withMessage('Target amount must be positive'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, target_amount, current_amount, deadline, icon, color, priority, category } = req.body;

    const [result] = await pool.query(
      `INSERT INTO savings_goals (user_id, name, target_amount, current_amount, deadline, icon, color, priority, category)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      [
        req.userId, 
        name, 
        target_amount, 
        current_amount || 0, 
        deadline || null, 
        icon || 'target', 
        color || '#0ea5e9', 
        priority || 'medium',
        category || 'general'
      ]
    );

    res.status(201).json({ message: 'Goal created successfully', goal: result[0] });
  } catch (error) {
    console.error('Create goal error:', error);
    res.status(500).json({ error: 'Failed to create goal' });
  }
});

// Add contribution to goal
router.post('/:id/contribute', [
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
    const [goals] = await pool.query(
      'SELECT * FROM savings_goals WHERE id = ? AND user_id = ?',
      [id, req.userId]
    );

    if (goals.length === 0) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    const goal = goals[0];

    // Add contribution
    await pool.query(
      'INSERT INTO savings_contributions (goal_id, user_id, amount, date, notes) VALUES (?, ?, ?, ?, ?)',
      [id, req.userId, amount, date || new Date().toISOString().split('T')[0], notes || null]
    );

    // Update goal current amount
    const newAmount = parseFloat(goal.current_amount) + parseFloat(amount);
    const status = newAmount >= parseFloat(goal.target_amount) ? 'completed' : 'active';

    const [updatedGoal] = await pool.query(
      'UPDATE savings_goals SET current_amount = ?, status = ? WHERE id = ? RETURNING *',
      [newAmount, status, id]
    );

    res.json({ 
      message: status === 'completed' ? 'Congratulations! Goal completed!' : 'Contribution added',
      goal: updatedGoal[0]
    });
  } catch (error) {
    console.error('Add contribution error:', error);
    res.status(500).json({ error: 'Failed to add contribution' });
  }
});

// Update savings goal
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, target_amount, deadline, icon, color, priority, category } = req.body;

    const [existing] = await pool.query(
      'SELECT * FROM savings_goals WHERE id = ? AND user_id = ?',
      [id, req.userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    const [updated] = await pool.query(
      `UPDATE savings_goals SET 
        name = COALESCE(?, name),
        target_amount = COALESCE(?, target_amount),
        deadline = COALESCE(?, deadline),
        icon = COALESCE(?, icon),
        color = COALESCE(?, color),
        priority = COALESCE(?, priority),
        category = COALESCE(?, category)
       WHERE id = ? RETURNING *`,
      [name, target_amount, deadline, icon, color, priority, category, id]
    );

    res.json({ message: 'Goal updated successfully', goal: updated[0] });
  } catch (error) {
    console.error('Update goal error:', error);
    res.status(500).json({ error: 'Failed to update goal' });
  }
});

// Delete savings goal
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.query(
      'SELECT id FROM savings_goals WHERE id = ? AND user_id = ?',
      [id, req.userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    await pool.query('DELETE FROM savings_goals WHERE id = ?', [id]);

    res.json({ message: 'Goal deleted successfully' });
  } catch (error) {
    console.error('Delete goal error:', error);
    res.status(500).json({ error: 'Failed to delete goal' });
  }
});

module.exports = router;
