const express = require('express');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Get community spending benchmarks
router.get('/benchmarks', async (req, res) => {
  try {
    const [user] = await pool.query('SELECT country FROM users WHERE id = ?', [req.userId]);
    const country = user[0]?.country || 'Tanzania';
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    // Get community stats for current month
    const [benchmarks] = await pool.query(`
      SELECT category, avg_percentage, sample_size
      FROM community_stats
      WHERE country = ? AND month = ? AND year = ?
      ORDER BY avg_percentage DESC
    `, [country, currentMonth, currentYear]);

    // Get user's spending breakdown
    const [userExpenses] = await pool.query(`
      SELECT 
        category,
        SUM(amount) as total
      FROM expenses
      WHERE user_id = ? AND EXTRACT(MONTH FROM date) = ? AND EXTRACT(YEAR FROM date) = ?
      GROUP BY category
    `, [req.userId, currentMonth, currentYear]);

    const totalUserSpending = userExpenses.reduce((sum, e) => sum + parseFloat(e.total), 0);

    // Build comparison
    const comparison = benchmarks.map(bench => {
      const userCat = userExpenses.find(e => e.category === bench.category);
      const userPercentage = userCat && totalUserSpending > 0
        ? Math.round((parseFloat(userCat.total) / totalUserSpending) * 100)
        : 0;
      const communityAvg = parseFloat(bench.avg_percentage);

      return {
        category: bench.category,
        communityAverage: communityAvg,
        yourPercentage: userPercentage,
        difference: userPercentage - communityAvg,
        status: userPercentage <= communityAvg ? 'good' : (userPercentage > communityAvg + 10 ? 'warning' : 'normal'),
        sampleSize: bench.sample_size
      };
    });

    res.json({
      country,
      month: currentMonth,
      year: currentYear,
      benchmarks: comparison,
      totalSpending: totalUserSpending
    });
  } catch (error) {
    console.error('Get benchmarks error:', error);
    res.status(500).json({ error: 'Failed to get benchmarks' });
  }
});

// Get savings comparisons
router.get('/savings-comparison', async (req, res) => {
  try {
    const [user] = await pool.query('SELECT country FROM users WHERE id = ?', [req.userId]);
    const country = user[0]?.country || 'Tanzania';

    // Get user's savings rate
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const [income] = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM income WHERE user_id = ? AND EXTRACT(MONTH FROM date) = ? AND EXTRACT(YEAR FROM date) = ?
    `, [req.userId, currentMonth, currentYear]);

    const [expenses] = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM expenses WHERE user_id = ? AND EXTRACT(MONTH FROM date) = ? AND EXTRACT(YEAR FROM date) = ?
    `, [req.userId, currentMonth, currentYear]);

    const monthlyIncome = parseFloat(income[0].total);
    const monthlyExpenses = parseFloat(expenses[0].total);
    const userSavingsRate = monthlyIncome > 0 
      ? Math.round(((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100)
      : 0;

    // Community averages (these would come from aggregated anonymous data)
    const communityAverages = {
      Tanzania: { avgSavingsRate: 12, topSaversRate: 25 },
      Kenya: { avgSavingsRate: 14, topSaversRate: 28 },
      Uganda: { avgSavingsRate: 10, topSaversRate: 22 }
    };

    const countryData = communityAverages[country] || communityAverages.Tanzania;

    // Determine user's ranking tier
    let tier, percentile;
    if (userSavingsRate >= countryData.topSaversRate) {
      tier = 'top';
      percentile = 10;
    } else if (userSavingsRate >= countryData.avgSavingsRate * 1.5) {
      tier = 'above_average';
      percentile = 25;
    } else if (userSavingsRate >= countryData.avgSavingsRate) {
      tier = 'average';
      percentile = 50;
    } else if (userSavingsRate >= countryData.avgSavingsRate * 0.5) {
      tier = 'below_average';
      percentile = 75;
    } else {
      tier = 'needs_improvement';
      percentile = 90;
    }

    res.json({
      country,
      yourSavingsRate: userSavingsRate,
      communityAverage: countryData.avgSavingsRate,
      topSaversAverage: countryData.topSaversRate,
      tier,
      percentile,
      message: tier === 'top' 
        ? 'Excellent! You\'re among the top savers!'
        : tier === 'above_average'
        ? 'Great job! You\'re saving more than most.'
        : tier === 'average'
        ? 'You\'re on par with the community average.'
        : 'There\'s room to improve your savings rate.'
    });
  } catch (error) {
    console.error('Get savings comparison error:', error);
    res.status(500).json({ error: 'Failed to get comparison' });
  }
});

// Get popular savings goals in community
router.get('/popular-goals', async (req, res) => {
  try {
    const [user] = await pool.query('SELECT country FROM users WHERE id = ?', [req.userId]);
    const country = user[0]?.country || 'Tanzania';

    // Get aggregated goal data (anonymized)
    const [goals] = await pool.query(`
      SELECT 
        sg.name as goal_name,
        COUNT(*) as popularity,
        AVG(sg.target_amount) as avg_target,
        AVG(sg.current_amount / sg.target_amount * 100) as avg_progress
      FROM savings_goals sg
      JOIN users u ON sg.user_id = u.id
      WHERE u.country = ? AND sg.status = 'active'
      GROUP BY sg.name
      ORDER BY popularity DESC
      LIMIT 10
    `, [country]);

    // If no data, provide defaults
    const popularGoals = goals.length > 0 ? goals : [
      { goal_name: 'Emergency Fund', popularity: 150, avg_target: 2000000, avg_progress: 45 },
      { goal_name: 'Business Capital', popularity: 120, avg_target: 5000000, avg_progress: 35 },
      { goal_name: 'Education', popularity: 100, avg_target: 3000000, avg_progress: 40 },
      { goal_name: 'Land/Property', popularity: 80, avg_target: 10000000, avg_progress: 25 },
      { goal_name: 'Vehicle', popularity: 60, avg_target: 8000000, avg_progress: 30 }
    ];

    res.json({
      country,
      popularGoals: popularGoals.map(g => ({
        name: g.goal_name,
        popularity: parseInt(g.popularity),
        averageTarget: Math.round(parseFloat(g.avg_target)),
        averageProgress: Math.round(parseFloat(g.avg_progress) || 0)
      }))
    });
  } catch (error) {
    console.error('Get popular goals error:', error);
    res.status(500).json({ error: 'Failed to get popular goals' });
  }
});

// Get financial tips from community
router.get('/tips', async (req, res) => {
  try {
    // Return curated tips for East African financial context
    const tips = [
      {
        id: 1,
        title: 'M-Pesa Savings Lock',
        description: 'Use M-Pesa\'s locked savings feature to prevent impulse spending on your savings.',
        category: 'savings',
        likes: 234
      },
      {
        id: 2,
        title: 'Track All Transactions',
        description: 'Let PesaPilot automatically track your M-Pesa, Airtel Money, and Tigo Pesa transactions via SMS.',
        category: 'tracking',
        likes: 189
      },
      {
        id: 3,
        title: 'Weekly Budget Reviews',
        description: 'Review your spending every Sunday to stay on track for the month.',
        category: 'budgeting',
        likes: 156
      },
      {
        id: 4,
        title: 'Emergency Fund First',
        description: 'Before other goals, build an emergency fund of 3 months\' expenses.',
        category: 'savings',
        likes: 312
      },
      {
        id: 5,
        title: 'Avoid Borrowing for Wants',
        description: 'Only borrow for necessities or investments that generate income.',
        category: 'debt',
        likes: 278
      },
      {
        id: 6,
        title: 'Group Savings (Chama)',
        description: 'Join or form a savings group for accountability and rotating funds.',
        category: 'savings',
        likes: 198
      },
      {
        id: 7,
        title: 'Bulk Buying',
        description: 'Buy frequently used items in bulk to save money in the long run.',
        category: 'spending',
        likes: 145
      },
      {
        id: 8,
        title: 'Side Income',
        description: 'Look for opportunities to earn extra income to boost your savings rate.',
        category: 'income',
        likes: 267
      }
    ];

    // Sort by likes
    tips.sort((a, b) => b.likes - a.likes);

    res.json({ tips });
  } catch (error) {
    console.error('Get community tips error:', error);
    res.status(500).json({ error: 'Failed to get tips' });
  }
});

// Get spending trends in community
router.get('/trends', async (req, res) => {
  try {
    const [user] = await pool.query('SELECT country FROM users WHERE id = ?', [req.userId]);
    const country = user[0]?.country || 'Tanzania';

    // Get last 6 months of community stats
    const [trends] = await pool.query(`
      SELECT category, month, year, avg_percentage
      FROM community_stats
      WHERE country = ? AND 
        ((year = EXTRACT(YEAR FROM CURRENT_DATE) AND month <= EXTRACT(MONTH FROM CURRENT_DATE)) 
         OR (year = EXTRACT(YEAR FROM CURRENT_DATE) - 1 AND month > EXTRACT(MONTH FROM CURRENT_DATE)))
      ORDER BY year DESC, month DESC, avg_percentage DESC
      LIMIT 60
    `, [country]);

    // Group by month
    const monthlyTrends = {};
    trends.forEach(t => {
      const key = `${t.year}-${t.month}`;
      if (!monthlyTrends[key]) {
        monthlyTrends[key] = { month: t.month, year: t.year, categories: [] };
      }
      monthlyTrends[key].categories.push({
        category: t.category,
        percentage: parseFloat(t.avg_percentage)
      });
    });

    res.json({
      country,
      trends: Object.values(monthlyTrends).slice(0, 6)
    });
  } catch (error) {
    console.error('Get trends error:', error);
    res.status(500).json({ error: 'Failed to get trends' });
  }
});

// Opt-in/out of anonymous data sharing
router.post('/privacy', async (req, res) => {
  try {
    const { shareData } = req.body;

    await pool.query(
      'UPDATE users SET share_anonymous_data = ? WHERE id = ?',
      [shareData ? 1 : 0, req.userId]
    );

    res.json({
      success: true,
      message: shareData 
        ? 'You are now contributing to community insights (anonymously).'
        : 'You have opted out of anonymous data sharing.'
    });
  } catch (error) {
    console.error('Update privacy error:', error);
    res.status(500).json({ error: 'Failed to update privacy settings' });
  }
});

// Get user's data sharing status
router.get('/privacy', async (req, res) => {
  try {
    const [user] = await pool.query(
      'SELECT share_anonymous_data FROM users WHERE id = ?',
      [req.userId]
    );

    res.json({
      shareData: user[0]?.share_anonymous_data === 1
    });
  } catch (error) {
    console.error('Get privacy status error:', error);
    res.status(500).json({ error: 'Failed to get privacy status' });
  }
});

module.exports = router;
