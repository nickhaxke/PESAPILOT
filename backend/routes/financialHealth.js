const express = require('express');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Calculate financial health score
async function calculateFinancialHealth(userId) {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  // Get monthly income
  const [incomeData] = await pool.query(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM income WHERE user_id = ? AND MONTH(date) = ? AND YEAR(date) = ?
  `, [userId, currentMonth, currentYear]);
  const monthlyIncome = parseFloat(incomeData[0].total);

  // Get monthly expenses
  const [expenseData] = await pool.query(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM expenses WHERE user_id = ? AND MONTH(date) = ? AND YEAR(date) = ?
  `, [userId, currentMonth, currentYear]);
  const monthlyExpenses = parseFloat(expenseData[0].total);

  // Get total debt
  const [debtData] = await pool.query(`
    SELECT COALESCE(SUM(current_balance), 0) as total
    FROM debts WHERE user_id = ? AND status = 'active'
  `, [userId]);
  const totalDebt = parseFloat(debtData[0].total);

  // Get budget adherence
  const [budgetData] = await pool.query(`
    SELECT 
      COALESCE(SUM(b.amount), 0) as total_budget,
      COALESCE(SUM(
        (SELECT COALESCE(SUM(e.amount), 0) FROM expenses e 
         WHERE e.user_id = b.user_id AND e.category = b.category 
         AND MONTH(e.date) = b.month AND YEAR(e.date) = b.year)
      ), 0) as total_spent
    FROM budgets b
    WHERE b.user_id = ? AND b.month = ? AND b.year = ?
  `, [userId, currentMonth, currentYear]);
  const totalBudget = parseFloat(budgetData[0].total_budget);
  const totalBudgetSpent = parseFloat(budgetData[0].total_spent);

  // Get savings progress
  const [savingsData] = await pool.query(`
    SELECT 
      COALESCE(SUM(target_amount), 0) as total_target,
      COALESCE(SUM(current_amount), 0) as total_saved
    FROM savings_goals WHERE user_id = ? AND status = 'active'
  `, [userId]);
  const savingsTarget = parseFloat(savingsData[0].total_target);
  const totalSaved = parseFloat(savingsData[0].total_saved);

  // Get income stability (variance in last 3 months)
  const [incomeHistory] = await pool.query(`
    SELECT MONTH(date) as month, SUM(amount) as total
    FROM income WHERE user_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
    GROUP BY MONTH(date)
  `, [userId]);

  // Calculate individual scores (0-100 each)
  let scores = {
    savings: 0,
    spending: 0,
    debt: 0,
    budget: 0,
    income_stability: 0
  };

  // Savings Score (20% weight) - Based on savings rate
  if (monthlyIncome > 0) {
    const savingsRate = ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100;
    if (savingsRate >= 20) scores.savings = 100;
    else if (savingsRate >= 10) scores.savings = 70;
    else if (savingsRate >= 5) scores.savings = 50;
    else if (savingsRate > 0) scores.savings = 30;
    else scores.savings = 0;
  }

  // Spending Score (20% weight) - Expenses vs Income
  if (monthlyIncome > 0) {
    const spendingRatio = (monthlyExpenses / monthlyIncome) * 100;
    if (spendingRatio <= 70) scores.spending = 100;
    else if (spendingRatio <= 80) scores.spending = 80;
    else if (spendingRatio <= 90) scores.spending = 60;
    else if (spendingRatio <= 100) scores.spending = 40;
    else scores.spending = 20;
  } else {
    scores.spending = monthlyExpenses > 0 ? 20 : 50;
  }

  // Debt Score (25% weight) - Debt to Income ratio
  if (monthlyIncome > 0) {
    const debtToIncome = (totalDebt / (monthlyIncome * 12)) * 100;
    if (totalDebt === 0) scores.debt = 100;
    else if (debtToIncome <= 20) scores.debt = 90;
    else if (debtToIncome <= 35) scores.debt = 70;
    else if (debtToIncome <= 50) scores.debt = 50;
    else scores.debt = 30;
  } else {
    scores.debt = totalDebt > 0 ? 30 : 80;
  }

  // Budget Score (20% weight) - Budget adherence
  if (totalBudget > 0) {
    const budgetUsage = (totalBudgetSpent / totalBudget) * 100;
    if (budgetUsage <= 80) scores.budget = 100;
    else if (budgetUsage <= 90) scores.budget = 80;
    else if (budgetUsage <= 100) scores.budget = 60;
    else if (budgetUsage <= 110) scores.budget = 40;
    else scores.budget = 20;
  } else {
    scores.budget = 50; // No budget set
  }

  // Income Stability Score (15% weight)
  if (incomeHistory.length >= 2) {
    const incomes = incomeHistory.map(i => parseFloat(i.total));
    const avg = incomes.reduce((a, b) => a + b, 0) / incomes.length;
    const variance = incomes.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / incomes.length;
    const cv = Math.sqrt(variance) / avg; // Coefficient of variation

    if (cv <= 0.1) scores.income_stability = 100;
    else if (cv <= 0.2) scores.income_stability = 80;
    else if (cv <= 0.3) scores.income_stability = 60;
    else scores.income_stability = 40;
  } else {
    scores.income_stability = 50;
  }

  // Calculate weighted overall score
  const overallScore = Math.round(
    scores.savings * 0.20 +
    scores.spending * 0.20 +
    scores.debt * 0.25 +
    scores.budget * 0.20 +
    scores.income_stability * 0.15
  );

  return {
    overall: overallScore,
    breakdown: scores,
    metrics: {
      monthlyIncome,
      monthlyExpenses,
      totalDebt,
      totalBudget,
      totalBudgetSpent,
      savingsTarget,
      totalSaved,
      savingsRate: monthlyIncome > 0 ? Math.round(((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100) : 0
    }
  };
}

// Get financial health score
router.get('/score', async (req, res) => {
  try {
    const health = await calculateFinancialHealth(req.userId);
    
    // Store score in history
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    await pool.query(`
      INSERT INTO financial_health_history 
      (user_id, score, savings_score, spending_score, debt_score, budget_score, income_stability_score, month, year)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        score = ?, savings_score = ?, spending_score = ?, debt_score = ?, 
        budget_score = ?, income_stability_score = ?
    `, [
      req.userId, health.overall, health.breakdown.savings, health.breakdown.spending,
      health.breakdown.debt, health.breakdown.budget, health.breakdown.income_stability,
      currentMonth, currentYear,
      health.overall, health.breakdown.savings, health.breakdown.spending,
      health.breakdown.debt, health.breakdown.budget, health.breakdown.income_stability
    ]);

    // Update user's score
    await pool.query(
      'UPDATE users SET financial_score = ? WHERE id = ?',
      [health.overall, req.userId]
    );

    // Generate grade
    let grade, status;
    if (health.overall >= 80) { grade = 'A'; status = 'Excellent'; }
    else if (health.overall >= 70) { grade = 'B'; status = 'Good'; }
    else if (health.overall >= 60) { grade = 'C'; status = 'Fair'; }
    else if (health.overall >= 50) { grade = 'D'; status = 'Needs Work'; }
    else { grade = 'F'; status = 'Critical'; }

    res.json({
      score: health.overall,
      grade,
      status,
      breakdown: health.breakdown,
      metrics: health.metrics
    });
  } catch (error) {
    console.error('Get financial health error:', error);
    res.status(500).json({ error: 'Failed to calculate financial health' });
  }
});

// Get score history
router.get('/history', async (req, res) => {
  try {
    const [history] = await pool.query(`
      SELECT * FROM financial_health_history
      WHERE user_id = ?
      ORDER BY year DESC, month DESC
      LIMIT 12
    `, [req.userId]);

    res.json({ history });
  } catch (error) {
    console.error('Get score history error:', error);
    res.status(500).json({ error: 'Failed to get history' });
  }
});

// Get AI insights
router.get('/insights', async (req, res) => {
  try {
    const health = await calculateFinancialHealth(req.userId);
    const insights = [];

    // Savings insights
    if (health.metrics.savingsRate < 10) {
      insights.push({
        type: 'warning',
        category: 'savings',
        title: 'Low Savings Rate',
        message: `You're only saving ${health.metrics.savingsRate}% of your income. Try to increase this to at least 20%.`,
        priority: 'high',
        action: 'Set up automatic savings contributions'
      });
    } else if (health.metrics.savingsRate >= 20) {
      insights.push({
        type: 'success',
        category: 'savings',
        title: 'Great Savings Habit!',
        message: `You're saving ${health.metrics.savingsRate}% of your income. Keep up the excellent work!`,
        priority: 'low'
      });
    }

    // Spending insights
    const spendingRatio = health.metrics.monthlyIncome > 0 
      ? Math.round((health.metrics.monthlyExpenses / health.metrics.monthlyIncome) * 100)
      : 100;

    if (spendingRatio > 90) {
      insights.push({
        type: 'danger',
        category: 'spending',
        title: 'High Spending Alert',
        message: `You're spending ${spendingRatio}% of your income. This leaves little room for savings or emergencies.`,
        priority: 'high',
        action: 'Review your spending categories'
      });
    }

    // Get top spending category
    const [topCategory] = await pool.query(`
      SELECT category, SUM(amount) as total
      FROM expenses
      WHERE user_id = ? AND MONTH(date) = MONTH(CURDATE()) AND YEAR(date) = YEAR(CURDATE())
      GROUP BY category
      ORDER BY total DESC
      LIMIT 1
    `, [req.userId]);

    if (topCategory.length > 0) {
      const catPercent = health.metrics.monthlyExpenses > 0 
        ? Math.round((parseFloat(topCategory[0].total) / health.metrics.monthlyExpenses) * 100)
        : 0;
      
      if (catPercent > 40) {
        insights.push({
          type: 'info',
          category: 'spending',
          title: 'Spending Concentration',
          message: `${topCategory[0].category} accounts for ${catPercent}% of your total spending. Consider diversifying your expenses.`,
          priority: 'medium'
        });
      }
    }

    // Debt insights
    if (health.metrics.totalDebt > health.metrics.monthlyIncome * 6) {
      insights.push({
        type: 'warning',
        category: 'debt',
        title: 'High Debt Level',
        message: `Your total debt is more than 6 months of income. Prioritize debt repayment.`,
        priority: 'high',
        action: 'Create a debt payoff plan'
      });
    }

    // Budget insights
    if (health.metrics.totalBudget > 0) {
      const budgetUsage = Math.round((health.metrics.totalBudgetSpent / health.metrics.totalBudget) * 100);
      if (budgetUsage > 100) {
        insights.push({
          type: 'warning',
          category: 'budget',
          title: 'Over Budget',
          message: `You've exceeded your monthly budget by ${budgetUsage - 100}%. Review your spending.`,
          priority: 'high'
        });
      } else if (budgetUsage >= 80) {
        insights.push({
          type: 'info',
          category: 'budget',
          title: 'Budget Alert',
          message: `You've used ${budgetUsage}% of your monthly budget. Be mindful of remaining spending.`,
          priority: 'medium'
        });
      }
    } else {
      insights.push({
        type: 'tip',
        category: 'budget',
        title: 'Set Up Budgets',
        message: 'You haven\'t set any budgets yet. Budgets help you control spending.',
        priority: 'medium',
        action: 'Create your first budget'
      });
    }

    // Savings goal insights
    if (health.metrics.savingsTarget > 0) {
      const savingsProgress = Math.round((health.metrics.totalSaved / health.metrics.savingsTarget) * 100);
      insights.push({
        type: 'info',
        category: 'goals',
        title: 'Savings Progress',
        message: `You've reached ${savingsProgress}% of your savings goals. ${100 - savingsProgress}% to go!`,
        priority: 'low'
      });
    }

    // Potential savings calculation
    const potentialSavings = Math.round(health.metrics.monthlyExpenses * 0.15);
    if (potentialSavings > 0 && health.metrics.savingsRate < 20) {
      insights.push({
        type: 'tip',
        category: 'savings',
        title: 'Potential Savings',
        message: `By reducing expenses by 15%, you could save an additional ${potentialSavings.toLocaleString()} TZS monthly.`,
        priority: 'medium',
        action: 'View spending breakdown'
      });
    }

    res.json({ 
      insights,
      score: health.overall,
      metrics: health.metrics
    });
  } catch (error) {
    console.error('Get insights error:', error);
    res.status(500).json({ error: 'Failed to get insights' });
  }
});

// Get community comparison stats
router.get('/community', async (req, res) => {
  try {
    // Get user's country
    const [user] = await pool.query('SELECT country FROM users WHERE id = ?', [req.userId]);
    const country = user[0]?.country || 'Tanzania';

    // Get community averages
    const [communityStats] = await pool.query(`
      SELECT category, avg_percentage, sample_size
      FROM community_stats
      WHERE country = ? AND month = MONTH(CURDATE()) AND year = YEAR(CURDATE())
      ORDER BY avg_percentage DESC
    `, [country]);

    // Get user's spending percentages
    const [userSpending] = await pool.query(`
      SELECT 
        e.category,
        SUM(e.amount) as total,
        ROUND(SUM(e.amount) / (SELECT SUM(amount) FROM expenses WHERE user_id = ? AND MONTH(date) = MONTH(CURDATE()) AND YEAR(date) = YEAR(CURDATE())) * 100, 1) as percentage
      FROM expenses e
      WHERE e.user_id = ? AND MONTH(e.date) = MONTH(CURDATE()) AND YEAR(e.date) = YEAR(CURDATE())
      GROUP BY e.category
    `, [req.userId, req.userId]);

    // Compare user to community
    const comparison = communityStats.map(stat => {
      const userCat = userSpending.find(u => u.category === stat.category);
      return {
        category: stat.category,
        community_avg: parseFloat(stat.avg_percentage),
        your_percentage: userCat ? parseFloat(userCat.percentage) : 0,
        difference: userCat ? parseFloat(userCat.percentage) - parseFloat(stat.avg_percentage) : -parseFloat(stat.avg_percentage),
        sample_size: stat.sample_size
      };
    });

    res.json({
      country,
      comparison,
      userSpending
    });
  } catch (error) {
    console.error('Get community stats error:', error);
    res.status(500).json({ error: 'Failed to get community stats' });
  }
});

// Get personalized tips
router.get('/tips', async (req, res) => {
  try {
    const health = await calculateFinancialHealth(req.userId);
    const tips = [];

    // Generate tips based on score
    if (health.breakdown.savings < 60) {
      tips.push({
        icon: 'piggy-bank',
        title: 'Automate Your Savings',
        description: 'Set up automatic transfers to savings as soon as you receive income. Pay yourself first!'
      });
    }

    if (health.breakdown.spending < 60) {
      tips.push({
        icon: 'scissors',
        title: 'Track Small Expenses',
        description: 'Small daily purchases add up. Track everything, including mobile money transactions.'
      });
    }

    if (health.breakdown.debt < 70) {
      tips.push({
        icon: 'target',
        title: 'Snowball Your Debt',
        description: 'Pay off smallest debts first for quick wins, then tackle larger ones.'
      });
    }

    if (health.breakdown.budget < 60) {
      tips.push({
        icon: 'calculator',
        title: 'Use the 50/30/20 Rule',
        description: '50% for needs, 30% for wants, 20% for savings and debt repayment.'
      });
    }

    // Always show some general tips
    tips.push(
      {
        icon: 'alert-circle',
        title: 'Build Emergency Fund',
        description: 'Aim for 3-6 months of expenses in an easily accessible savings account.'
      },
      {
        icon: 'trending-up',
        title: 'Review Monthly',
        description: 'Check your financial health score monthly to track your progress.'
      }
    );

    res.json({ tips: tips.slice(0, 5) }); // Return top 5 tips
  } catch (error) {
    console.error('Get tips error:', error);
    res.status(500).json({ error: 'Failed to get tips' });
  }
});

module.exports = router;
