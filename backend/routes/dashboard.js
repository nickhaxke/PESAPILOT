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
      WHERE user_id = ? AND MONTH(date) = ? AND YEAR(date) = ?
    `, [req.userId, currentMonth, currentYear]);

    // Get total expenses this month
    const [expenseResult] = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM expenses
      WHERE user_id = ? AND MONTH(date) = ? AND YEAR(date) = ?
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
      WHERE e.user_id = ? AND MONTH(e.date) = ? AND YEAR(e.date) = ?
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
        MONTH(date) as month,
        YEAR(date) as year,
        SUM(amount) as total
      FROM expenses
      WHERE user_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY YEAR(date), MONTH(date)
      ORDER BY year, month
    `, [req.userId]);

    // Get income trend too
    const [incomeTrend] = await pool.query(`
      SELECT 
        MONTH(date) as month,
        YEAR(date) as year,
        SUM(amount) as total
      FROM income
      WHERE user_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY YEAR(date), MONTH(date)
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
      
      const expenseData = trend.find(t => t.month === month && t.year === year);
      const incomeData = incomeTrend.find(t => t.month === month && t.year === year);
      
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
      WHERE user_id = ? AND MONTH(date) = ? AND YEAR(date) = ?
    `, [req.userId, currentMonth, currentYear]);
    const totalExpenses = parseFloat(expenseResult[0].total);

    // Get spending by category
    const [categorySpending] = await pool.query(`
      SELECT category, SUM(amount) as total
      FROM expenses
      WHERE user_id = ? AND MONTH(date) = ? AND YEAR(date) = ?
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
        AND MONTH(e.date) = b.month 
        AND YEAR(e.date) = b.year
      WHERE b.user_id = ? AND b.month = ? AND b.year = ?
      GROUP BY b.id, b.category, b.amount
      HAVING spent_amount >= budget_amount * 0.8
    `, [req.userId, currentMonth, currentYear]);

    // Add budget warnings as insights
    for (const warning of budgetWarnings) {
      const percentage = Math.round((parseFloat(warning.spent_amount) / parseFloat(warning.budget_amount)) * 100);
      const isOver = percentage >= 100;
      insights.push({
        type: isOver ? 'warning' : 'caution',
        message: isOver 
          ? `You have exceeded your ${warning.category} budget by ${percentage - 100}%.`
          : `You have used ${percentage}% of your ${warning.category} budget.`,
        category: warning.category,
        percentage,
        icon: isOver ? 'alert-triangle' : 'alert-circle'
      });
    }

    // Compare to last month
    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    
    const [lastMonthExpenses] = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM expenses
      WHERE user_id = ? AND MONTH(date) = ? AND YEAR(date) = ?
    `, [req.userId, lastMonth, lastMonthYear]);
    
    const lastMonthTotal = parseFloat(lastMonthExpenses[0].total);
    if (lastMonthTotal > 0 && totalExpenses > 0) {
      const change = Math.round(((totalExpenses - lastMonthTotal) / lastMonthTotal) * 100);
      if (change !== 0) {
        insights.push({
          type: change > 0 ? 'info' : 'success',
          message: change > 0 
            ? `Your spending is ${change}% higher than last month.`
            : `Your spending is ${Math.abs(change)}% lower than last month.`,
          percentage: Math.abs(change),
          icon: change > 0 ? 'arrow-up' : 'arrow-down'
        });
      }
    }

    // Savings insight
    const [incomeResult] = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM income
      WHERE user_id = ? AND MONTH(date) = ? AND YEAR(date) = ?
    `, [req.userId, currentMonth, currentYear]);
    
    const totalIncome = parseFloat(incomeResult[0].total);
    if (totalIncome > 0) {
      const savingsRate = Math.round(((totalIncome - totalExpenses) / totalIncome) * 100);
      if (savingsRate > 0) {
        insights.push({
          type: 'success',
          message: `You're saving ${savingsRate}% of your income this month.`,
          percentage: savingsRate,
          icon: 'piggy-bank'
        });
      } else if (savingsRate < 0) {
        insights.push({
          type: 'warning',
          message: `You're spending ${Math.abs(savingsRate)}% more than your income this month.`,
          percentage: Math.abs(savingsRate),
          icon: 'alert-triangle'
        });
      }
    }

    res.json({ insights });
  } catch (error) {
    console.error('Get insights error:', error);
    res.status(500).json({ error: 'Failed to get insights' });
  }
});

// Get recent transactions
router.get('/recent', async (req, res) => {
  try {
    const limit = req.query.limit || 5;

    // Get recent income
    const [recentIncome] = await pool.query(`
      SELECT id, amount, source as category, date, notes as description, 'income' as type
      FROM income
      WHERE user_id = ?
      ORDER BY date DESC, created_at DESC
      LIMIT ?
    `, [req.userId, parseInt(limit)]);

    // Get recent expenses
    const [recentExpenses] = await pool.query(`
      SELECT id, amount, category, date, description, 'expense' as type
      FROM expenses
      WHERE user_id = ?
      ORDER BY date DESC, created_at DESC
      LIMIT ?
    `, [req.userId, parseInt(limit)]);

    // Combine and sort
    const transactions = [...recentIncome, ...recentExpenses]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, parseInt(limit));

    res.json({ transactions });
  } catch (error) {
    console.error('Get recent transactions error:', error);
    res.status(500).json({ error: 'Failed to get recent transactions' });
  }
});

module.exports = router;
