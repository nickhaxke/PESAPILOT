const express = require('express');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get dashboard overview
router.get('/overview', async (req, res) => {
  try {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    // Get total income this month
    const [incomeResult] = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM income
      WHERE user_id = ? AND EXTRACT(MONTH FROM date) = ? AND EXTRACT(YEAR FROM date) = ?
    `, [req.userId, currentMonth, currentYear]);

    // Get total expenses this month
    const [expenseResult] = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM expenses
      WHERE user_id = ? AND EXTRACT(MONTH FROM date) = ? AND EXTRACT(YEAR FROM date) = ?
    `, [req.userId, currentMonth, currentYear]);

    // Get total budget for this month
    const [budgetResult] = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM budgets
      WHERE user_id = ? AND month = ? AND year = ?
    `, [req.userId, currentMonth, currentYear]);

    const totalIncome = parseFloat(incomeResult[0].total);
    const totalExpenses = parseFloat(expenseResult[0].total);
    const totalBudget = parseFloat(budgetResult[0].total);
    const balance = totalIncome - totalExpenses;
    const budgetUsage = totalBudget > 0 ? Math.round((totalExpenses / totalBudget) * 100) : 0;

    res.json({
      overview: {
        totalIncome,
        totalExpenses,
        balance,
        totalBudget,
        budgetUsage,
        month: currentMonth,
        year: currentYear
      }
    });
  } catch (error) {
    console.error('Get overview error:', error);
    res.status(500).json({ error: 'Failed to get overview' });
  }
});

// Get spending by category (for pie chart)
router.get('/spending-by-category', async (req, res) => {
  try {
    const { month, year } = req.query;
    const currentMonth = month || new Date().getMonth() + 1;
    const currentYear = year || new Date().getFullYear();

    const [spending] = await pool.query(`
      SELECT 
        e.category,
        SUM(e.amount) as total,
        c.color,
        c.icon
      FROM expenses e
      LEFT JOIN categories c ON c.name = e.category
      WHERE e.user_id = ? AND EXTRACT(MONTH FROM e.date) = ? AND EXTRACT(YEAR FROM e.date) = ?
      GROUP BY e.category, c.color, c.icon
      ORDER BY total DESC
    `, [req.userId, currentMonth, currentYear]);

    // Calculate percentages
    const totalSpending = spending.reduce((sum, s) => sum + parseFloat(s.total), 0);
    const spendingWithPercentage = spending.map(s => ({
      ...s,
      total: parseFloat(s.total),
      percentage: totalSpending > 0 ? Math.round((parseFloat(s.total) / totalSpending) * 100) : 0
    }));

    res.json({ spending: spendingWithPercentage });
  } catch (error) {
    console.error('Get spending by category error:', error);
    res.status(500).json({ error: 'Failed to get spending by category' });
  }
});

// Get monthly spending trend (last 6 months)
router.get('/monthly-trend', async (req, res) => {
  try {
    const [trend] = await pool.query(`
      SELECT 
        EXTRACT(MONTH FROM date) as month,
        EXTRACT(YEAR FROM date) as year,
        SUM(amount) as total
      FROM expenses
      WHERE user_id = ? AND date >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY EXTRACT(YEAR FROM date), EXTRACT(MONTH FROM date)
      ORDER BY year, month
    `, [req.userId]);

    // Get income trend too
    const [incomeTrend] = await pool.query(`
      SELECT 
        EXTRACT(MONTH FROM date) as month,
        EXTRACT(YEAR FROM date) as year,
        SUM(amount) as total
      FROM income
      WHERE user_id = ? AND date >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY EXTRACT(YEAR FROM date), EXTRACT(MONTH FROM date)
      ORDER BY year, month
    `, [req.userId]);

    // Create month labels
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Build complete trend data for last 6 months
    const trendData = [];
    const currentDate = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      
      const expenseData = trend.find(t => parseInt(t.month) === month && parseInt(t.year) === year);
      const incomeData = incomeTrend.find(t => parseInt(t.month) === month && parseInt(t.year) === year);
      
      trendData.push({
        label: `${months[month - 1]} ${year}`,
        month,
        year,
        expenses: expenseData ? parseFloat(expenseData.total) : 0,
        income: incomeData ? parseFloat(incomeData.total) : 0
      });
    }

    res.json({ trend: trendData });
  } catch (error) {
    console.error('Get monthly trend error:', error);
    res.status(500).json({ error: 'Failed to get monthly trend' });
  }
});

// Get financial insights
router.get('/insights', async (req, res) => {
  try {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    const insights = [];

    // Get total expenses this month
    const [expenseResult] = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM expenses
      WHERE user_id = ? AND EXTRACT(MONTH FROM date) = ? AND EXTRACT(YEAR FROM date) = ?
    `, [req.userId, currentMonth, currentYear]);
    const totalExpenses = parseFloat(expenseResult[0].total);

    // Get spending by category
    const [categorySpending] = await pool.query(`
      SELECT category, SUM(amount) as total
      FROM expenses
      WHERE user_id = ? AND EXTRACT(MONTH FROM date) = ? AND EXTRACT(YEAR FROM date) = ?
      GROUP BY category
      ORDER BY total DESC
    `, [req.userId, currentMonth, currentYear]);

    // Insight: Top spending category
    if (categorySpending.length > 0) {
      const topCategory = categorySpending[0];
      const percentage = totalExpenses > 0 ? Math.round((parseFloat(topCategory.total) / totalExpenses) * 100) : 0;
      insights.push({
        type: 'spending',
        message: `${topCategory.category} spending is ${percentage}% of your total expenses.`,
        category: topCategory.category,
        percentage,
        icon: 'trending-up'
      });
    }

    // Get budget warnings
    const [budgetWarnings] = await pool.query(`
      SELECT 
        b.category,
        b.amount as budget_amount,
        COALESCE(SUM(e.amount), 0) as spent_amount
      FROM budgets b
      LEFT JOIN expenses e ON e.user_id = b.user_id 
        AND e.category = b.category 
        AND EXTRACT(MONTH FROM e.date) = b.month 
        AND EXTRACT(YEAR FROM e.date) = b.year
      WHERE b.user_id = ? AND b.month = ? AND b.year = ?
      GROUP BY b.id, b.category, b.amount
      HAVING COALESCE(SUM(e.amount), 0) > b.amount * 0.8
    `, [req.userId, currentMonth, currentYear]);

    // Add budget warnings as insights
    budgetWarnings.forEach(bw => {
      const percentage = Math.round((parseFloat(bw.spent_amount) / parseFloat(bw.budget_amount)) * 100);
      const isOver = percentage >= 100;
      insights.push({
        type: isOver ? 'warning' : 'caution',
        message: isOver 
          ? `You've exceeded your ${bw.category} budget by ${percentage - 100}%!`
          : `${bw.category} budget is at ${percentage}%. Be careful!`,
        category: bw.category,
        percentage,
        icon: isOver ? 'alert-triangle' : 'alert-circle'
      });
    });

    // Get recent transactions
    const [recentTransactions] = await pool.query(`
      SELECT 'expense' as type, amount, category, date, description
      FROM expenses WHERE user_id = ?
      UNION ALL
      SELECT 'income' as type, amount, source as category, date, notes as description
      FROM income WHERE user_id = ?
      ORDER BY date DESC LIMIT 5
    `, [req.userId, req.userId]);

    res.json({ 
      insights,
      recentTransactions,
      summary: {
        totalExpenses,
        categoriesCount: categorySpending.length,
        budgetWarningsCount: budgetWarnings.length
      }
    });
  } catch (error) {
    console.error('Get insights error:', error);
    res.status(500).json({ error: 'Failed to get insights' });
  }
});

// Get quick stats for dashboard
router.get('/quick-stats', async (req, res) => {
  try {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    // Get savings goals stats
    const [savingsStats] = await pool.query(`
      SELECT 
        COUNT(*) as total_goals,
        COALESCE(SUM(current_amount), 0) as total_saved,
        COALESCE(SUM(target_amount), 0) as total_target
      FROM savings_goals
      WHERE user_id = ? AND status = 'active'
    `, [req.userId]);

    // Get debts stats
    const [debtsStats] = await pool.query(`
      SELECT 
        COUNT(*) as total_debts,
        COALESCE(SUM(current_balance), 0) as total_owed
      FROM debts
      WHERE user_id = ? AND status = 'active'
    `, [req.userId]);

    res.json({
      savings: {
        totalGoals: parseInt(savingsStats[0].total_goals) || 0,
        totalSaved: parseFloat(savingsStats[0].total_saved) || 0,
        totalTarget: parseFloat(savingsStats[0].total_target) || 0
      },
      debts: {
        totalDebts: parseInt(debtsStats[0].total_debts) || 0,
        totalOwed: parseFloat(debtsStats[0].total_owed) || 0
      }
    });
  } catch (error) {
    console.error('Get quick stats error:', error);
    res.status(500).json({ error: 'Failed to get quick stats' });
  }
});

module.exports = router;
