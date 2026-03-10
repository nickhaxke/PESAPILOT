const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// ============================================
// AI FINANCIAL ANALYSIS ENGINE
// ============================================

class FinancialAI {
  constructor(userId) {
    this.userId = userId;
    this.data = {};
  }

  // Load all user financial data
  async loadUserData() {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    // Get user's name for personalization
    const [userInfo] = await pool.query(`
      SELECT name FROM users WHERE id = ?
    `, [this.userId]);
    this.userName = userInfo[0]?.name?.split(' ')[0] || 'Rafiki'; // Use first name only

    // Get income
    const [income] = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) as total,
        COUNT(*) as count,
        STRING_AGG(DISTINCT source, ',') as sources
      FROM income WHERE user_id = ? AND EXTRACT(MONTH FROM date) = ? AND EXTRACT(YEAR FROM date) = ?
    `, [this.userId, currentMonth, currentYear]);

    // Get expenses by category
    const [expenses] = await pool.query(`
      SELECT category, SUM(amount) as total, COUNT(*) as count
      FROM expenses WHERE user_id = ? AND EXTRACT(MONTH FROM date) = ? AND EXTRACT(YEAR FROM date) = ?
      GROUP BY category ORDER BY total DESC
    `, [this.userId, currentMonth, currentYear]);

    // Get total expenses
    const [totalExpenses] = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM expenses WHERE user_id = ? AND EXTRACT(MONTH FROM date) = ? AND EXTRACT(YEAR FROM date) = ?
    `, [this.userId, currentMonth, currentYear]);

    // Get budgets
    const [budgets] = await pool.query(`
      SELECT b.*, 
        COALESCE((SELECT SUM(e.amount) FROM expenses e 
          WHERE e.user_id = b.user_id AND e.category = b.category 
          AND EXTRACT(MONTH FROM e.date) = b.month AND EXTRACT(YEAR FROM e.date) = b.year), 0) as spent
      FROM budgets b WHERE b.user_id = ? AND b.month = ? AND b.year = ?
    `, [this.userId, currentMonth, currentYear]);

    // Get savings goals
    const [savings] = await pool.query(`
      SELECT * FROM savings_goals WHERE user_id = ? AND status = 'active'
    `, [this.userId]);

    // Get debts
    const [debts] = await pool.query(`
      SELECT * FROM debts WHERE user_id = ? AND status = 'active'
    `, [this.userId]);

    // Get last 3 months spending trend
    const [spendingTrend] = await pool.query(`
      SELECT EXTRACT(MONTH FROM date) as month, EXTRACT(YEAR FROM date) as year, SUM(amount) as total
      FROM expenses WHERE user_id = ? AND date >= CURRENT_DATE - INTERVAL '3 months'
      GROUP BY EXTRACT(MONTH FROM date), EXTRACT(YEAR FROM date) ORDER BY year, month
    `, [this.userId]);

    // Get recent transactions
    const [recentTransactions] = await pool.query(`
      SELECT * FROM expenses WHERE user_id = ? ORDER BY date DESC LIMIT 20
    `, [this.userId]);

    this.data = {
      income: {
        total: parseFloat(income[0]?.total) || 0,
        count: income[0]?.count || 0,
        sources: income[0]?.sources?.split(',') || []
      },
      expenses: {
        total: parseFloat(totalExpenses[0]?.total) || 0,
        byCategory: expenses.map(e => ({
          category: e.category,
          amount: parseFloat(e.total),
          count: e.count
        }))
      },
      budgets: budgets.map(b => ({
        category: b.category,
        budget: parseFloat(b.amount),
        spent: parseFloat(b.spent),
        remaining: parseFloat(b.amount) - parseFloat(b.spent),
        percentUsed: Math.round((parseFloat(b.spent) / parseFloat(b.amount)) * 100)
      })),
      savings: savings.map(s => ({
        name: s.name,
        target: parseFloat(s.target_amount),
        current: parseFloat(s.current_amount),
        progress: Math.round((parseFloat(s.current_amount) / parseFloat(s.target_amount)) * 100),
        deadline: s.deadline,
        priority: s.priority
      })),
      debts: debts.map(d => ({
        name: d.name,
        original: parseFloat(d.original_amount),
        balance: parseFloat(d.current_balance),
        rate: parseFloat(d.interest_rate),
        minimumPayment: parseFloat(d.minimum_payment),
        paidPercentage: Math.round(((parseFloat(d.original_amount) - parseFloat(d.current_balance)) / parseFloat(d.original_amount)) * 100)
      })),
      spendingTrend,
      recentTransactions,
      currentMonth,
      currentYear
    };

    return this.data;
  }

  // Calculate financial health score
  calculateHealthScore() {
    const { income, expenses, budgets, savings, debts } = this.data;
    let scores = { savings: 50, spending: 50, debt: 50, budget: 50, emergency: 50 };

    // Savings Score (20%)
    if (income.total > 0) {
      const savingsRate = ((income.total - expenses.total) / income.total) * 100;
      if (savingsRate >= 20) scores.savings = 100;
      else if (savingsRate >= 10) scores.savings = 75;
      else if (savingsRate >= 5) scores.savings = 50;
      else if (savingsRate > 0) scores.savings = 30;
      else scores.savings = 10;
    }

    // Spending Score (20%)
    if (income.total > 0) {
      const spendingRatio = (expenses.total / income.total) * 100;
      if (spendingRatio <= 70) scores.spending = 100;
      else if (spendingRatio <= 80) scores.spending = 80;
      else if (spendingRatio <= 90) scores.spending = 60;
      else if (spendingRatio <= 100) scores.spending = 40;
      else scores.spending = 20;
    }

    // Debt Score (25%)
    const totalDebt = debts.reduce((sum, d) => sum + d.balance, 0);
    if (income.total > 0) {
      const debtToIncome = (totalDebt / (income.total * 12)) * 100;
      if (totalDebt === 0) scores.debt = 100;
      else if (debtToIncome <= 20) scores.debt = 90;
      else if (debtToIncome <= 35) scores.debt = 70;
      else if (debtToIncome <= 50) scores.debt = 50;
      else scores.debt = 30;
    }

    // Budget Adherence Score (20%)
    if (budgets.length > 0) {
      const overBudgetCount = budgets.filter(b => b.percentUsed > 100).length;
      const adherenceRate = ((budgets.length - overBudgetCount) / budgets.length) * 100;
      scores.budget = Math.round(adherenceRate);
    }

    // Emergency Fund Score (15%)
    const emergencyGoal = savings.find(s => s.name.toLowerCase().includes('emergency'));
    if (emergencyGoal) {
      scores.emergency = Math.min(100, emergencyGoal.progress);
    } else if (income.total > 0) {
      const monthlyExpenses = expenses.total;
      const totalSaved = savings.reduce((sum, s) => sum + s.current, 0);
      const monthsCovered = totalSaved / monthlyExpenses;
      if (monthsCovered >= 6) scores.emergency = 100;
      else if (monthsCovered >= 3) scores.emergency = 70;
      else scores.emergency = 30;
    }

    const overall = Math.round(
      scores.savings * 0.20 +
      scores.spending * 0.20 +
      scores.debt * 0.25 +
      scores.budget * 0.20 +
      scores.emergency * 0.15
    );

    return { overall, breakdown: scores };
  }

  // Generate financial diagnosis
  generateDiagnosis() {
    const { income, expenses, budgets, savings, debts } = this.data;
    const health = this.calculateHealthScore();
    const issues = [];
    const positives = [];

    // Analyze income vs expenses
    if (income.total === 0) {
      issues.push({
        severity: 'high',
        area: 'income',
        message: 'No income recorded this month. Please add your income to get accurate insights.',
        action: 'Go to Income page and add your salary or other income sources.'
      });
    } else {
      const savingsRate = ((income.total - expenses.total) / income.total) * 100;
      
      if (savingsRate < 0) {
        issues.push({
          severity: 'critical',
          area: 'spending',
          message: `You're spending ${Math.abs(savingsRate).toFixed(0)}% more than you earn! This is unsustainable.`,
          action: 'Immediately reduce non-essential expenses and find additional income sources.'
        });
      } else if (savingsRate < 10) {
        issues.push({
          severity: 'high',
          area: 'savings',
          message: `Your savings rate is only ${savingsRate.toFixed(0)}%. Financial experts recommend at least 20%.`,
          action: 'Try to cut back on discretionary spending to increase your savings rate.'
        });
      } else if (savingsRate >= 20) {
        positives.push({
          area: 'savings',
          message: `Excellent! You're saving ${savingsRate.toFixed(0)}% of your income - above the recommended 20%.`
        });
      }
    }

    // Analyze budget adherence
    const overBudget = budgets.filter(b => b.percentUsed > 100);
    const nearLimit = budgets.filter(b => b.percentUsed >= 80 && b.percentUsed <= 100);
    
    overBudget.forEach(b => {
      issues.push({
        severity: 'high',
        area: 'budget',
        message: `Budget exceeded for ${b.category}: ${b.percentUsed}% used (TSh ${b.spent.toLocaleString()} of TSh ${b.budget.toLocaleString()})`,
        action: `Reduce ${b.category} spending by TSh ${(b.spent - b.budget).toLocaleString()} to stay on track.`
      });
    });

    nearLimit.forEach(b => {
      issues.push({
        severity: 'medium',
        area: 'budget',
        message: `Budget warning for ${b.category}: ${b.percentUsed}% used`,
        action: `You have TSh ${b.remaining.toLocaleString()} remaining in ${b.category} budget.`
      });
    });

    // Analyze debt
    const totalDebt = debts.reduce((sum, d) => sum + d.balance, 0);
    const highInterestDebts = debts.filter(d => d.rate > 15);
    
    if (highInterestDebts.length > 0) {
      issues.push({
        severity: 'high',
        area: 'debt',
        message: `You have ${highInterestDebts.length} high-interest debt(s) over 15% APR.`,
        action: 'Prioritize paying off high-interest debts first using the avalanche method.'
      });
    }

    if (totalDebt > 0 && income.total > 0) {
      const debtToIncome = (totalDebt / (income.total * 12)) * 100;
      if (debtToIncome > 40) {
        issues.push({
          severity: 'critical',
          area: 'debt',
          message: `Your debt-to-income ratio is ${debtToIncome.toFixed(0)}% - this is too high!`,
          action: 'Focus on aggressive debt repayment. Consider debt consolidation options.'
        });
      }
    }

    // Analyze savings goals
    const behindSchedule = savings.filter(s => {
      if (!s.deadline) return false;
      const daysLeft = Math.ceil((new Date(s.deadline) - new Date()) / (1000 * 60 * 60 * 24));
      const monthsLeft = Math.max(1, daysLeft / 30);
      const needed = (s.target - s.current) / monthsLeft;
      const canSave = income.total - expenses.total;
      return needed > canSave * 0.5; // If needed > 50% of available savings
    });

    behindSchedule.forEach(s => {
      issues.push({
        severity: 'medium',
        area: 'savings',
        message: `Savings goal "${s.name}" is behind schedule at ${s.progress}% progress.`,
        action: `Increase monthly contributions or extend the deadline.`
      });
    });

    // Positive reinforcements
    if (budgets.length > 0 && overBudget.length === 0) {
      positives.push({
        area: 'budget',
        message: 'Great job! You\'re staying within all your budgets this month.'
      });
    }

    if (debts.length === 0 || totalDebt === 0) {
      positives.push({
        area: 'debt',
        message: 'Congratulations! You\'re debt-free. Keep it up!'
      });
    }

    return { health, issues, positives };
  }

  // Generate personalized recommendations
  generateRecommendations() {
    const { income, expenses, budgets, savings, debts } = this.data;
    const recommendations = [];

    // Budget recommendations
    if (budgets.length === 0 && expenses.byCategory.length > 0) {
      recommendations.push({
        type: 'budget',
        priority: 'high',
        title: 'Create Budgets for Your Spending Categories',
        description: 'You have expense categories without budgets. Setting budgets helps control spending.',
        action: 'Create budgets',
        details: expenses.byCategory.slice(0, 5).map(e => ({
          category: e.category,
          suggestedBudget: Math.ceil(e.amount * 1.1 / 1000) * 1000, // Round up to nearest 1000
          currentSpending: e.amount
        }))
      });
    }

    // Savings recommendations
    const emergencyFund = savings.find(s => s.name.toLowerCase().includes('emergency'));
    if (!emergencyFund && income.total > 0) {
      const recommended = expenses.total * 6; // 6 months expenses
      recommendations.push({
        type: 'savings',
        priority: 'high',
        title: 'Start an Emergency Fund',
        description: 'You don\'t have an emergency fund. Aim for 3-6 months of expenses.',
        action: 'Create emergency fund goal',
        details: {
          recommended_amount: recommended,
          monthly_contribution: Math.ceil(recommended / 12 / 1000) * 1000
        }
      });
    }

    // Debt payoff strategy
    if (debts.length > 1) {
      const sortedByRate = [...debts].sort((a, b) => b.rate - a.rate);
      const sortedByBalance = [...debts].sort((a, b) => a.balance - b.balance);
      
      recommendations.push({
        type: 'debt',
        priority: 'high',
        title: 'Debt Payoff Strategy',
        description: 'You have multiple debts. Choose a strategy to pay them off faster.',
        strategies: [
          {
            name: 'Avalanche Method',
            description: 'Pay highest interest debt first',
            firstTarget: sortedByRate[0]?.name,
            benefit: 'Saves the most money on interest'
          },
          {
            name: 'Snowball Method',
            description: 'Pay smallest balance first',
            firstTarget: sortedByBalance[0]?.name,
            benefit: 'Quick wins for motivation'
          }
        ]
      });
    }

    // Spending optimization
    const topExpenses = expenses.byCategory.slice(0, 3);
    if (topExpenses.length > 0 && income.total > 0) {
      const topSpendingPercentage = (topExpenses.reduce((s, e) => s + e.amount, 0) / income.total) * 100;
      
      if (topSpendingPercentage > 50) {
        recommendations.push({
          type: 'spending',
          priority: 'medium',
          title: 'Reduce Top Spending Categories',
          description: `Your top 3 categories consume ${topSpendingPercentage.toFixed(0)}% of your income.`,
          details: topExpenses.map(e => ({
            category: e.category,
            amount: e.amount,
            percentage: ((e.amount / income.total) * 100).toFixed(1),
            suggestion: `Try to reduce by 10-15% (save TSh ${Math.round(e.amount * 0.1).toLocaleString()})`
          }))
        });
      }
    }

    // 50/30/20 rule analysis
    if (income.total > 0) {
      const needs = ['Food', 'Transport', 'Bills', 'Health', 'Rent'].reduce((sum, cat) => {
        const expense = expenses.byCategory.find(e => e.category === cat);
        return sum + (expense?.amount || 0);
      }, 0);
      const wants = expenses.total - needs;
      const savingsAmount = income.total - expenses.total;

      const needsPercent = (needs / income.total) * 100;
      const wantsPercent = (wants / income.total) * 100;
      const savingsPercent = (savingsAmount / income.total) * 100;

      recommendations.push({
        type: 'budgeting',
        priority: 'medium',
        title: '50/30/20 Budget Analysis',
        description: 'The 50/30/20 rule: 50% needs, 30% wants, 20% savings',
        current: {
          needs: { amount: needs, percentage: needsPercent.toFixed(1), target: 50 },
          wants: { amount: wants, percentage: wantsPercent.toFixed(1), target: 30 },
          savings: { amount: savingsAmount, percentage: savingsPercent.toFixed(1), target: 20 }
        },
        adjustments: needsPercent > 50 
          ? 'Your needs exceed 50%. Look for ways to reduce fixed costs.'
          : wantsPercent > 30
          ? 'Your wants exceed 30%. Cut back on discretionary spending.'
          : savingsPercent < 20
          ? 'Increase your savings rate to reach the 20% target.'
          : 'Great! You\'re close to the ideal 50/30/20 split.'
      });
    }

    return recommendations;
  }

  // Generate scenario simulations
  generateScenarios(goalAmount, monthlyContribution, interestRate = 0) {
    const scenarios = [];
    const contributions = [monthlyContribution * 0.5, monthlyContribution, monthlyContribution * 1.5, monthlyContribution * 2];

    contributions.forEach(contribution => {
      let balance = 0;
      let months = 0;
      const monthlyRate = interestRate / 100 / 12;

      while (balance < goalAmount && months < 240) { // Max 20 years
        balance = balance * (1 + monthlyRate) + contribution;
        months++;
      }

      scenarios.push({
        monthlyContribution: Math.round(contribution),
        monthsToGoal: months,
        yearsToGoal: (months / 12).toFixed(1),
        totalContributed: Math.round(contribution * months),
        interestEarned: Math.round(balance - (contribution * months))
      });
    });

    return scenarios;
  }

  // Answer financial questions - supports English and Swahili
  async answerQuestion(question) {
    const lowerQ = question.toLowerCase();
    const { income, expenses, budgets, savings, debts } = this.data;

    // Detect Swahili language
    const isSwahili = this.detectSwahili(lowerQ);

    // ============================================
    // SPENDING ANALYSIS
    // ============================================
    if (lowerQ.includes('spend') || lowerQ.includes('matumizi') || lowerQ.includes('tumia') || 
        lowerQ.includes('most') || lowerQ.includes('top') || lowerQ.includes('zaidi')) {
      const top = expenses.byCategory.slice(0, 3);
      
      if (isSwahili) {
        return {
          type: 'spending_analysis',
          answer: `📊 Makundi ya matumizi yako makubwa mwezi huu:\n\n${top.map((e, i) => 
            `${i + 1}. ${e.category}: TSh ${e.amount.toLocaleString()} (miamala ${e.count})`
          ).join('\n')}\n\n💡 Ushauri: Jaribu kupunguza matumizi katika makundi haya kwa 10-15%.`,
          data: top
        };
      }
      return {
        type: 'spending_analysis',
        answer: `📊 Your top spending categories this month:\n\n${top.map((e, i) => 
          `${i + 1}. ${e.category}: TSh ${e.amount.toLocaleString()} (${e.count} transactions)`
        ).join('\n')}\n\n💡 Tip: Try to reduce spending in these categories by 10-15%.`,
        data: top
      };
    }

    // ============================================
    // SAVINGS TO MEET TARGET/GOAL ANALYSIS
    // ============================================
    if ((lowerQ.includes('target') || lowerQ.includes('lengo') || lowerQ.includes('goal') || 
         lowerQ.includes('fikia') || lowerQ.includes('meet') || lowerQ.includes('reach')) &&
        (lowerQ.includes('save') || lowerQ.includes('akiba') || lowerQ.includes('weka') ||
         lowerQ.includes('mapato') || lowerQ.includes('income') || lowerQ.includes('kiasi'))) {
      
      const availableToSave = income.total - expenses.total;
      const rate = income.total > 0 ? ((availableToSave / income.total) * 100).toFixed(1) : 0;
      
      // Check if user has savings goals
      if (savings.length > 0) {
        const activeGoals = savings.map(g => {
          const remaining = g.target - g.current;
          const monthsNeeded = availableToSave > 0 ? Math.ceil(remaining / availableToSave) : 'Haijulikani';
          const suggestedMonthly = g.deadline 
            ? Math.ceil(remaining / Math.max(1, Math.ceil((new Date(g.deadline) - new Date()) / (30 * 24 * 60 * 60 * 1000))))
            : Math.ceil(remaining / 6); // Default 6 months
          return { ...g, remaining, monthsNeeded, suggestedMonthly };
        });

        if (isSwahili) {
          return {
            type: 'savings_target_plan',
            answer: `Habari ${this.userName}! 🤗 Nimekagua mapato na malengo yako, haya ndiyo ninayoyaona:\n\n💰 **Mapato yako mwezi huu:** TSh ${income.total.toLocaleString()}\n💸 **Matumizi yako:** TSh ${expenses.total.toLocaleString()}\n✨ **Pesa inayobaki kwa akiba:** TSh ${Math.max(0, availableToSave).toLocaleString()} (${rate}%)\n\n🎯 **Malengo yako ya Akiba:**\n${activeGoals.map((g, i) => 
              `\n${i + 1}. **${g.name}**\n   • Lengo: TSh ${g.target.toLocaleString()}\n   • Umeweka: TSh ${g.current.toLocaleString()} (${g.progress}%)\n   • Imebaki: TSh ${g.remaining.toLocaleString()}\n   • Miezi ya kumaliza: ${availableToSave > 0 ? g.monthsNeeded : '∞'}\n   • 💡 Weka TSh ${g.suggestedMonthly.toLocaleString()}/mwezi kufikia lengo`
            ).join('\n')}\n\n📊 **Ushauri wangu kwako ${this.userName}:**\n${availableToSave > 0 
              ? `✅ Una uwezo wa kuweka akiba TSh ${availableToSave.toLocaleString()} kila mwezi. ${rate >= 20 ? 'Hii ni nzuri sana!' : 'Jaribu kupunguza matumizi ili uongeze akiba.'}`
              : `⚠️ Matumizi yako ni zaidi ya mapato. Punguza matumizi kwanza kabla ya kuweka akiba.`}\n\n💪 Nakuamini ${this.userName}, unaweza kufikia malengo yako!`,
            data: { income: income.total, expenses: expenses.total, availableToSave, goals: activeGoals }
          };
        }
        
        return {
          type: 'savings_target_plan',
          answer: `Hi ${this.userName}! 🤗 I've analyzed your income and goals, here's what I found:\n\n💰 **Your income this month:** TSh ${income.total.toLocaleString()}\n💸 **Your expenses:** TSh ${expenses.total.toLocaleString()}\n✨ **Available to save:** TSh ${Math.max(0, availableToSave).toLocaleString()} (${rate}%)\n\n🎯 **Your Savings Goals:**\n${activeGoals.map((g, i) => 
            `\n${i + 1}. **${g.name}**\n   • Target: TSh ${g.target.toLocaleString()}\n   • Saved: TSh ${g.current.toLocaleString()} (${g.progress}%)\n   • Remaining: TSh ${g.remaining.toLocaleString()}\n   • Months to complete: ${availableToSave > 0 ? g.monthsNeeded : '∞'}\n   • 💡 Save TSh ${g.suggestedMonthly.toLocaleString()}/month to reach goal`
          ).join('\n')}\n\n📊 **My advice for you ${this.userName}:**\n${availableToSave > 0 
            ? `✅ You can save TSh ${availableToSave.toLocaleString()} each month. ${rate >= 20 ? 'This is excellent!' : 'Try to reduce expenses to increase savings.'}`
            : `⚠️ Your expenses exceed your income. Reduce spending first before saving.`}\n\n💪 I believe in you ${this.userName}, you can reach your goals!`,
          data: { income: income.total, expenses: expenses.total, availableToSave, goals: activeGoals }
        };
      }
      
      // No savings goals yet
      if (isSwahili) {
        return {
          type: 'savings_target_plan',
          answer: `Habari ${this.userName}! 🤗 Nimekagua mapato yako:\n\n💰 **Mapato yako:** TSh ${income.total.toLocaleString()}\n💸 **Matumizi yako:** TSh ${expenses.total.toLocaleString()}\n✨ **Pesa inayobaki:** TSh ${Math.max(0, availableToSave).toLocaleString()}\n\n📋 **${this.userName}, bado haujaweka lengo la akiba!**\n\nNenda ukurasa wa "Savings Goals" uweke lengo lako la kwanza. Kisha nitakusaidia kupanga mpango wa kufikia lengo lako.\n\n💡 **Mapendekezo ya malengo:**\n• Akiba ya dharura (miezi 3 ya matumizi)\n• Safari\n• Elimu\n• Biashara\n\n💪 Anza sasa ${this.userName}!`,
          data: { income: income.total, expenses: expenses.total, availableToSave }
        };
      }
      
      return {
        type: 'savings_target_plan',
        answer: `Hi ${this.userName}! 🤗 I've checked your finances:\n\n💰 **Your income:** TSh ${income.total.toLocaleString()}\n💸 **Your expenses:** TSh ${expenses.total.toLocaleString()}\n✨ **Money remaining:** TSh ${Math.max(0, availableToSave).toLocaleString()}\n\n📋 **${this.userName}, you haven't set any savings goals yet!**\n\nGo to the "Savings Goals" page to create your first goal. Then I can help you plan how to reach it.\n\n💡 **Goal suggestions:**\n• Emergency fund (3 months expenses)\n• Travel\n• Education\n• Business\n\n💪 Start now ${this.userName}!`,
        data: { income: income.total, expenses: expenses.total, availableToSave }
      };
    }

    // ============================================
    // SAVINGS ANALYSIS
    // ============================================
    if (lowerQ.includes('save') || lowerQ.includes('akiba') || lowerQ.includes('weka') || 
        lowerQ.includes('kiasi gani') || lowerQ.includes('nimeweka')) {
      const saved = income.total - expenses.total;
      const rate = income.total > 0 ? ((saved / income.total) * 100).toFixed(1) : 0;
      
      if (isSwahili) {
        return {
          type: 'savings',
          answer: `Habari ${this.userName}! 🤗\n\n` + (saved > 0 
            ? `✅ Hongera ${this.userName}! Mwezi huu umeweka akiba TSh ${saved.toLocaleString()}, sawa na ${rate}% ya mapato yako.\n\n📈 Lengo: Wataalamu wa fedha wanapendekeza kuweka akiba angalau 20% ya mapato.\n\n💡 Ushauri: ${rate >= 20 ? 'Unafanya vizuri sana! Endelea hivyo.' : `Jaribu kuongeza akiba yako hadi 20% - hii itakuwa TSh ${Math.round(income.total * 0.20).toLocaleString()} kwa mwezi.`}`
            : `⚠️ Pole ${this.userName}, mwezi huu umetumia zaidi ya mapato yako kwa TSh ${Math.abs(saved).toLocaleString()}.\n\n💡 Ushauri: Angalia matumizi yako makubwa na upunguze yale yasiyohitajika.`),
          data: { saved, rate }
        };
      }
      return {
        type: 'savings',
        answer: `Hi ${this.userName}! 🤗\n\n` + (saved > 0 
          ? `✅ Great job ${this.userName}! This month you've saved TSh ${saved.toLocaleString()}, which is ${rate}% of your income.\n\n📈 Goal: Financial experts recommend saving at least 20% of your income.\n\n💡 Tip: ${rate >= 20 ? 'You\'re doing excellent! Keep it up.' : `Try to increase your savings to 20% - that would be TSh ${Math.round(income.total * 0.20).toLocaleString()} per month.`}`
          : `⚠️ Unfortunately ${this.userName}, you've overspent by TSh ${Math.abs(saved).toLocaleString()} this month.\n\n💡 Tip: Review your biggest expenses and cut back on non-essentials.`),
        data: { saved, rate }
      };
    }

    // ============================================
    // BUDGET STATUS
    // ============================================
    if (lowerQ.includes('budget') || lowerQ.includes('bajeti') || lowerQ.includes('yakoje') ||
        lowerQ.includes('status') || lowerQ.includes('hali')) {
      const overBudget = budgets.filter(b => b.percentUsed > 100);
      const onTrack = budgets.filter(b => b.percentUsed <= 100);
      
      if (isSwahili) {
        if (budgets.length === 0) {
          return {
            type: 'budget_status',
            answer: '📋 Bado haujaweka bajeti yoyote.\n\n💡 Ushauri: Bajeti inakusaidia kudhibiti matumizi yako. Nenda ukurasa wa "Budgets" kuweka bajeti kwa kila kundi la matumizi.',
            data: null
          };
        }
        return {
          type: 'budget_status',
          answer: overBudget.length > 0
            ? `⚠️ Umevuka bajeti katika makundi ${overBudget.length}:\n${overBudget.map(b => `• ${b.category}: ${b.percentUsed}% (TSh ${b.spent.toLocaleString()} / ${b.budget.toLocaleString()})`).join('\n')}\n\n✅ Makundi ${onTrack.length} bado yako sawa.\n\n💡 Ushauri: Punguza matumizi katika makundi yaliyovuka.`
            : `✅ Hongera! Bajeti zako zote ${budgets.length} ziko sawa!\n\n${budgets.map(b => `• ${b.category}: ${b.percentUsed}% imetumika`).join('\n')}\n\n💡 Endelea kudhibiti matumizi yako vizuri!`,
          data: { overBudget, onTrack }
        };
      }
      if (budgets.length === 0) {
        return {
          type: 'budget_status',
          answer: '📋 You haven\'t set any budgets yet.\n\n💡 Tip: Budgets help you control your spending. Go to the "Budgets" page to create budgets for each expense category.',
          data: null
        };
      }
      return {
        type: 'budget_status',
        answer: overBudget.length > 0
          ? `⚠️ You've exceeded ${overBudget.length} budget(s):\n${overBudget.map(b => `• ${b.category}: ${b.percentUsed}% (TSh ${b.spent.toLocaleString()} / ${b.budget.toLocaleString()})`).join('\n')}\n\n✅ ${onTrack.length} budgets are still on track.\n\n💡 Tip: Cut back on categories that exceeded the budget.`
          : `✅ Great news! All ${budgets.length} budgets are on track!\n\n${budgets.map(b => `• ${b.category}: ${b.percentUsed}% used`).join('\n')}\n\n💡 Keep up the good budget discipline!`,
        data: { overBudget, onTrack }
      };
    }

    // ============================================
    // DEBT STRATEGY
    // ============================================
    if (lowerQ.includes('debt') || lowerQ.includes('deni') || lowerQ.includes('madeni') ||
        lowerQ.includes('pay') || lowerQ.includes('lipa') || lowerQ.includes('kwanza')) {
      if (debts.length === 0) {
        return {
          type: 'debt',
          answer: isSwahili 
            ? '🎉 Hongera! Huna madeni yoyote! Fikiria kuwekeza pesa yako ya ziada.'
            : '🎉 Congratulations! You\'re debt-free! Consider investing your extra money.',
          data: null
        };
      }
      
      const totalDebt = debts.reduce((sum, d) => sum + d.balance, 0);
      const highestRate = debts.reduce((max, d) => d.rate > max.rate ? d : max, debts[0]);
      const smallestBalance = debts.reduce((min, d) => d.balance < min.balance ? d : min, debts[0]);
      
      if (isSwahili) {
        return {
          type: 'debt_strategy',
          answer: `💳 Jumla ya madeni yako: TSh ${totalDebt.toLocaleString()} (akaunti ${debts.length})\n\n📊 Mikakati ya kumaliza madeni:\n\n1️⃣ Njia ya Avalanche (Inayopendekezwa):\n• Lipa deni lenye riba kubwa kwanza\n• Anza na: "${highestRate.name}" (riba ${highestRate.rate}%)\n• Faida: Unaokoa pesa nyingi za riba\n\n2️⃣ Njia ya Snowball:\n• Lipa deni dogo kwanza\n• Anza na: "${smallestBalance.name}" (TSh ${smallestBalance.balance.toLocaleString()})\n• Faida: Motisha ya haraka\n\n💡 Ushauri: Lipa kiasi cha chini cha madeni mengine, weka pesa ya ziada kwenye deni moja.`,
          data: { totalDebt, recommendation: highestRate }
        };
      }
      return {
        type: 'debt_strategy',
        answer: `💳 Total debt: TSh ${totalDebt.toLocaleString()} across ${debts.length} accounts\n\n📊 Debt payoff strategies:\n\n1️⃣ Avalanche Method (Recommended):\n• Pay highest interest debt first\n• Start with: "${highestRate.name}" (${highestRate.rate}% interest)\n• Benefit: Saves the most money on interest\n\n2️⃣ Snowball Method:\n• Pay smallest balance first\n• Start with: "${smallestBalance.name}" (TSh ${smallestBalance.balance.toLocaleString()})\n• Benefit: Quick wins for motivation\n\n💡 Tip: Pay minimum on all debts, put extra money toward one debt at a time.`,
        data: { totalDebt, recommendation: highestRate }
      };
    }

    // ============================================
    // FINANCIAL EDUCATION - Swahili
    // ============================================
    if (lowerQ.includes('fundish') || lowerQ.includes('elim') || lowerQ.includes('nini') ||
        lowerQ.includes('teach') || lowerQ.includes('learn') || lowerQ.includes('explain')) {
      
      // Budget education
      if (lowerQ.includes('bajeti') || lowerQ.includes('budget')) {
        return {
          type: 'education',
          answer: isSwahili 
            ? `📚 ELIMU YA BAJETI\n\n🎯 Bajeti ni nini?\nBajeti ni mpango wa jinsi utakavyotumia pesa yako. Inakusaidia kujua pesa yako inaenda wapi.\n\n📋 Sheria ya 50/30/20:\n• 50% - Mahitaji (chakula, nyumba, usafiri)\n• 30% - Matakwa (burudani, mavazi)\n• 20% - Akiba na madeni\n\n✅ Hatua za kutengeneza bajeti:\n1. Jua mapato yako ya mwezi\n2. Orodhesha matumizi yote\n3. Weka kikomo kwa kila kundi\n4. Fuatilia matumizi yako\n5. Rekebisha kila mwezi\n\n💡 Ushauri: Anza kwa kuandika matumizi yako yote kwa wiki moja.`
            : `📚 BUDGET EDUCATION\n\n🎯 What is a Budget?\nA budget is a plan for how you'll spend your money. It helps you understand where your money goes.\n\n📋 The 50/30/20 Rule:\n• 50% - Needs (food, housing, transport)\n• 30% - Wants (entertainment, clothing)\n• 20% - Savings and debt payments\n\n✅ Steps to create a budget:\n1. Know your monthly income\n2. List all expenses\n3. Set limits for each category\n4. Track your spending\n5. Adjust monthly\n\n💡 Tip: Start by writing down all your expenses for one week.`,
          data: null
        };
      }
      
      // Savings education
      if (lowerQ.includes('akiba') || lowerQ.includes('sav') || lowerQ.includes('weka')) {
        return {
          type: 'education',
          answer: isSwahili
            ? `📚 ELIMU YA AKIBA\n\n🎯 Kwa nini kuweka akiba?\n• Dharura (ugonjwa, kupoteza kazi)\n• Malengo makubwa (gari, nyumba)\n• Utulivu wa mawazo\n\n💰 Aina za Akiba:\n1. Akiba ya Dharura: Miezi 3-6 ya matumizi\n2. Akiba ya Lengo: Kwa kitu maalum\n3. Uwekezaji: Kwa muda mrefu\n\n✅ Mbinu za kuweka akiba:\n• Lipa mwenyewe kwanza (weka akiba kabla ya kutumia)\n• Automatiki (weka amri ya kudebiti)\n• Changamoto ya siku 30 (weka TSh 1,000 kila siku)\n• Sheria ya 24 saa (subiri siku moja kabla kununua)\n\n📊 Kiwango kinachopendekezwa: Angalau 20% ya mapato yako.`
            : `📚 SAVINGS EDUCATION\n\n🎯 Why save money?\n• Emergencies (illness, job loss)\n• Big goals (car, house)\n• Peace of mind\n\n💰 Types of Savings:\n1. Emergency Fund: 3-6 months of expenses\n2. Goal-based Savings: For specific things\n3. Investments: For long term\n\n✅ Savings techniques:\n• Pay yourself first (save before spending)\n• Automate (set up auto-debit)\n• 30-day challenge (save TSh 1,000 daily)\n• 24-hour rule (wait a day before buying)\n\n📊 Recommended rate: At least 20% of your income.`,
          data: null
        };
      }
      
      // Debt education
      if (lowerQ.includes('deni') || lowerQ.includes('debt') || lowerQ.includes('loan')) {
        return {
          type: 'education',
          answer: isSwahili
            ? `📚 ELIMU YA MADENI\n\n⚠️ Madeni mazuri vs mabaya:\n\n✅ Madeni mazuri:\n• Mkopo wa elimu (inakuongezea thamani)\n• Mkopo wa biashara (inaongeza mapato)\n• Nyumba (inakuwa mali yako)\n\n❌ Madeni mabaya:\n• Kadi ya mkopo kwa vitu visivyohitajika\n• Mikopo ya vitu vya anasa\n• Mikopo ya riba kubwa\n\n📊 Jinsi ya kusimamia madeni:\n1. Orodhesha madeni yote na riba zake\n2. Lipa zaidi ya kiwango cha chini\n3. Chagua mkakati (Avalanche au Snowball)\n4. Epuka madeni mapya\n\n💡 Kumbuka: Kama una madeni ya riba zaidi ya 15%, yawalekee kipaumbele!`
            : `📚 DEBT EDUCATION\n\n⚠️ Good debt vs Bad debt:\n\n✅ Good debt:\n• Education loan (increases your value)\n• Business loan (generates income)\n• Mortgage (becomes your asset)\n\n❌ Bad debt:\n• Credit card for non-essentials\n• Loans for luxury items\n• High-interest loans\n\n📊 How to manage debt:\n1. List all debts with their interest rates\n2. Pay more than the minimum\n3. Choose a strategy (Avalanche or Snowball)\n4. Avoid new debt\n\n💡 Remember: If you have debt with >15% interest, prioritize paying it off!`,
          data: null
        };
      }
      
      // General financial literacy
      return {
        type: 'education',
        answer: isSwahili
          ? `📚 ELIMU YA FEDHA\n\nNinaweza kukufundisha kuhusu:\n\n1️⃣ Bajeti - Jinsi ya kupanga matumizi yako\n   → Andika "nifundishe kuhusu bajeti"\n\n2️⃣ Akiba - Jinsi ya kuweka pesa\n   → Andika "nifundishe kuhusu akiba"\n\n3️⃣ Madeni - Jinsi ya kusimamia na kumaliza madeni\n   → Andika "nifundishe kuhusu madeni"\n\n4️⃣ Uwekezaji - Jinsi ya kukuza pesa yako\n   → Andika "nifundishe kuhusu uwekezaji"\n\n💡 Chagua mada moja kuendelea!`
          : `📚 FINANCIAL EDUCATION\n\nI can teach you about:\n\n1️⃣ Budgeting - How to plan your spending\n   → Type "teach me about budgeting"\n\n2️⃣ Savings - How to save money\n   → Type "teach me about savings"\n\n3️⃣ Debt - How to manage and eliminate debt\n   → Type "teach me about debt"\n\n4️⃣ Investing - How to grow your money\n   → Type "teach me about investing"\n\n💡 Choose a topic to continue!`,
        data: null
      };
    }

    // ============================================
    // TIPS AND ADVICE
    // ============================================
    if (lowerQ.includes('tip') || lowerQ.includes('ushauri') || lowerQ.includes('advice') || 
        lowerQ.includes('help') || lowerQ.includes('saidia')) {
      const tips = isSwahili ? [
        '💡 Fuatilia kila matumizi, hata madogo - yanajumlika haraka!',
        '💡 Weka akiba automatiki mara tu unapopokea mshahara.',
        '💡 Tumia sheria ya saa 24: subiri siku moja kabla ya kununua kitu cha ghafla.',
        '💡 Angalia usajili wako kila mwezi - sitisha usiyotumia.',
        '💡 Lipa mwenyewe kwanza: fikiria akiba kama matumizi ya lazima.',
        '💡 Tengeneza akiba ya dharura ya miezi 3-6 ya matumizi.',
        '💡 Epuka kuongeza matumizi unapopata nyongeza ya mshahara.',
        '💡 Weka malengo maalum ya fedha yenye tarehe ya mwisho.',
        '💡 Pika nyumbani badala ya kula nje - unaweza kuokoa 50%!',
        '💡 Kabla ya kununua, jiulize: Je, ninahitaji au nataka?'
      ] : [
        '💡 Track every expense, even small ones - they add up quickly!',
        '💡 Automate your savings by transferring money right after payday.',
        '💡 Use the 24-hour rule: wait a day before making impulse purchases.',
        '💡 Review your subscriptions monthly - cancel what you don\'t use.',
        '💡 Pay yourself first: treat savings like a mandatory expense.',
        '💡 Build an emergency fund of 3-6 months of expenses.',
        '💡 Avoid lifestyle inflation when you get a raise.',
        '💡 Set specific, measurable financial goals with deadlines.',
        '💡 Cook at home instead of eating out - you can save 50%!',
        '💡 Before buying, ask yourself: Do I need this or want this?'
      ];
      return {
        type: 'tips',
        answer: tips[Math.floor(Math.random() * tips.length)],
        data: tips
      };
    }

    // ============================================
    // GOALS
    // ============================================
    if (lowerQ.includes('goal') || lowerQ.includes('lengo') || lowerQ.includes('target') || 
        lowerQ.includes('malengo')) {
      if (savings.length === 0) {
        return {
          type: 'goals',
          answer: isSwahili
            ? '🎯 Bado haujaweka malengo ya akiba.\n\nKuwa na malengo ni hatua ya kwanza ya mafanikio ya kifedha!\n\n📋 Malengo yanayopendekezwa:\n• Akiba ya dharura (miezi 3-6 ya matumizi)\n• Safari au likizo\n• Elimu au mafunzo\n• Gari au pikipiki\n• Nyumba au ardhi\n\nNenda ukurasa wa "Savings Goals" kuanza!'
            : '🎯 You haven\'t set any savings goals yet.\n\nHaving goals is the first step to financial success!\n\n📋 Recommended goals:\n• Emergency fund (3-6 months expenses)\n• Travel or vacation\n• Education or training\n• Car or motorcycle\n• House or land\n\nGo to "Savings Goals" page to start!',
          data: null
        };
      }
      const nearest = savings.sort((a, b) => b.progress - a.progress)[0];
      return {
        type: 'goals',
        answer: isSwahili
          ? `🎯 Una malengo ya akiba ${savings.length}.\n\n📊 Lengo lako la karibu kufikia:\n"${nearest.name}" - ${nearest.progress}%\n(TSh ${nearest.current.toLocaleString()} / ${nearest.target.toLocaleString()})\n\n${savings.map(s => `• ${s.name}: ${s.progress}%`).join('\n')}\n\n💡 Ushauri: Endelea kuchangia mara kwa mara!`
          : `🎯 You have ${savings.length} active savings goal(s).\n\n📊 Closest to completion:\n"${nearest.name}" - ${nearest.progress}%\n(TSh ${nearest.current.toLocaleString()} / ${nearest.target.toLocaleString()})\n\n${savings.map(s => `• ${s.name}: ${s.progress}%`).join('\n')}\n\n💡 Tip: Keep contributing regularly!`,
        data: savings
      };
    }

    // ============================================
    // BUSINESS EDUCATION - BIASHARA
    // ============================================
    if (lowerQ.includes('biashara') || lowerQ.includes('business') || lowerQ.includes('enterprise') ||
        lowerQ.includes('kazi') || lowerQ.includes('kuanz') || lowerQ.includes('start')) {
      
      // Starting a business
      if (lowerQ.includes('anz') || lowerQ.includes('start') || lowerQ.includes('begin') || lowerQ.includes('mpya')) {
        return {
          type: 'business_education',
          answer: isSwahili
            ? `🚀 JINSI YA KUANZA BIASHARA\n\n📋 Hatua 7 za Kuanza:\n\n1️⃣ WAZO LA BIASHARA\n• Tatua tatizo la watu\n• Angalia soko linalohitaji\n• Fanya utafiti wa washindani\n\n2️⃣ MPANGO WA BIASHARA\n• Andika malengo yako\n• Hesabu gharama za kuanza\n• Panga jinsi utakavyopata wateja\n\n3️⃣ MTAJI\n• Hesabu kiasi unachohitaji\n• Anza na mtaji mdogo (TSh 50,000-500,000)\n• Fikiria mikopo ya vikundi (VICOBA, SACCOS)\n\n4️⃣ USAJILI\n• Jina la biashara (BRELA)\n• TIN number (TRA)\n• Leseni ya biashara\n\n5️⃣ MAHALI\n• Eneo lenye wateja wengi\n• Bei ya kodi inayofaa\n• Online pia inawezekana!\n\n6️⃣ BIDHAA/HUDUMA\n• Anza na bidhaa chache\n• Quality ni muhimu kuliko quantity\n• Sikiliza maoni ya wateja\n\n7️⃣ MASOKO\n• WhatsApp Business (bure!)\n• Instagram/Facebook\n• Wateja wa kwanza = marafiki na familia\n\n💡 Biashara nzuri za kuanza Tanzania:\n• Kilimo (mboga, matunda)\n• Chakula (mama lishe, juice)\n• Simu (airtime, M-Pesa)\n• Nguo (mitumba, fashion)\n• Huduma (salon, fundi)`
            : `🚀 HOW TO START A BUSINESS\n\n📋 7 Steps to Start:\n\n1️⃣ BUSINESS IDEA\n• Solve people's problems\n• Find market demand\n• Research competitors\n\n2️⃣ BUSINESS PLAN\n• Write your goals\n• Calculate startup costs\n• Plan customer acquisition\n\n3️⃣ CAPITAL\n• Calculate how much you need\n• Start small (TSh 50,000-500,000)\n• Consider group loans (VICOBA, SACCOS)\n\n4️⃣ REGISTRATION\n• Business name (BRELA)\n• TIN number (TRA)\n• Business license\n\n5️⃣ LOCATION\n• Area with many customers\n• Affordable rent\n• Online is also possible!\n\n6️⃣ PRODUCTS/SERVICES\n• Start with few products\n• Quality over quantity\n• Listen to customer feedback\n\n7️⃣ MARKETING\n• WhatsApp Business (free!)\n• Instagram/Facebook\n• First customers = friends and family\n\n💡 Good businesses to start:\n• Farming (vegetables, fruits)\n• Food (restaurant, juice)\n• Mobile (airtime, M-Pesa)\n• Clothing (mitumba, fashion)\n• Services (salon, repair)`,
          data: null
        };
      }
      
      // Business profit/loss
      if (lowerQ.includes('faida') || lowerQ.includes('hasara') || lowerQ.includes('profit') || lowerQ.includes('loss')) {
        return {
          type: 'business_education',
          answer: isSwahili
            ? `📊 KUHESABU FAIDA NA HASARA\n\n🧮 Formula rahisi:\nFAIDA = MAPATO - GHARAMA\n\n📥 MAPATO (Pesa inayoingia):\n• Mauzo ya bidhaa/huduma\n• Malipo ya wateja\n\n📤 GHARAMA (Pesa inayotoka):\n• Kununua bidhaa (cost price)\n• Kodi ya duka\n• Mshahara wa wafanyakazi\n• Umeme, maji\n• Usafiri\n• Simu na data\n\n✅ MFANO:\nMauzo: TSh 500,000\nGharama za bidhaa: TSh 300,000\nKodi: TSh 50,000\nUsafiri: TSh 30,000\nMengine: TSh 20,000\n\nFAIDA = 500,000 - (300,000+50,000+30,000+20,000)\nFAIDA = TSh 100,000 ✅\n\n📈 MARGIN YA FAIDA:\n(Faida ÷ Mapato) × 100\n= (100,000 ÷ 500,000) × 100\n= 20%\n\n💡 Lengo: Margin ya 20-30% ni nzuri!`
            : `📊 CALCULATING PROFIT AND LOSS\n\n🧮 Simple formula:\nPROFIT = REVENUE - EXPENSES\n\n📥 REVENUE (Money coming in):\n• Sales of goods/services\n• Customer payments\n\n📤 EXPENSES (Money going out):\n• Buying goods (cost price)\n• Shop rent\n• Staff salaries\n• Electricity, water\n• Transport\n• Phone and data\n\n✅ EXAMPLE:\nSales: TSh 500,000\nCost of goods: TSh 300,000\nRent: TSh 50,000\nTransport: TSh 30,000\nOther: TSh 20,000\n\nPROFIT = 500,000 - (300,000+50,000+30,000+20,000)\nPROFIT = TSh 100,000 ✅\n\n📈 PROFIT MARGIN:\n(Profit ÷ Revenue) × 100\n= (100,000 ÷ 500,000) × 100\n= 20%\n\n💡 Target: 20-30% margin is good!`,
          data: null
        };
      }
      
      // General business
      return {
        type: 'business_education',
        answer: isSwahili
          ? `🏪 ELIMU YA BIASHARA\n\nNinaweza kukufundisha:\n\n1️⃣ Kuanza biashara\n   → "Nifundishe kuanza biashara"\n\n2️⃣ Kuhesabu faida na hasara\n   → "Nifundishe kuhesabu faida"\n\n3️⃣ Kusimamia pesa za biashara\n   → "Nifundishe kusimamia pesa"\n\n4️⃣ Kupata wateja\n   → "Nifundishe marketing"\n\n5️⃣ Kukuza biashara\n   → "Nifundishe kukuza biashara"\n\n💡 Chagua mada!`
          : `🏪 BUSINESS EDUCATION\n\nI can teach you:\n\n1️⃣ Starting a business\n   → "Teach me to start a business"\n\n2️⃣ Calculating profit and loss\n   → "Teach me to calculate profit"\n\n3️⃣ Managing business money\n   → "Teach me money management"\n\n4️⃣ Getting customers\n   → "Teach me marketing"\n\n5️⃣ Growing your business\n   → "Teach me to grow business"\n\n💡 Choose a topic!`,
        data: null
      };
    }

    // ============================================
    // INVESTMENT EDUCATION - UWEKEZAJI
    // ============================================
    if (lowerQ.includes('invest') || lowerQ.includes('wekez') || lowerQ.includes('hisa') ||
        lowerQ.includes('stock') || lowerQ.includes('bond') || lowerQ.includes('kukuza pesa')) {
      return {
        type: 'investment_education',
        answer: isSwahili
          ? `📈 ELIMU YA UWEKEZAJI\n\n🎯 Uwekezaji ni nini?\nKuweka pesa mahali itakapozaa pesa zaidi.\n\n💰 AINA ZA UWEKEZAJI TANZANIA:\n\n1️⃣ AKAUNTI YA AKIBA (Low Risk)\n• Riba: 2-4% kwa mwaka\n• Pesa yako salama\n• Unaweza kutoa wakati wowote\n• Nzuri kwa: Akiba ya dharura\n\n2️⃣ FIXED DEPOSIT (Low Risk)\n• Riba: 5-10% kwa mwaka\n• Weka miezi 3-12\n• Benki: CRDB, NMB, NBC\n• Nzuri kwa: Malengo ya muda mfupi\n\n3️⃣ UNIT TRUST (Medium Risk)\n• Riba: 8-15% kwa mwaka\n• UTT AMIS, Umoja Fund\n• Anza na TSh 10,000\n• Nzuri kwa: Muda wa miaka 3+\n\n4️⃣ HISA - DSE (Higher Risk)\n• Kununua sehemu ya kampuni\n• Faida: Dividend + bei kupanda\n• CDS Account inahitajika\n• Nzuri kwa: Muda wa miaka 5+\n\n5️⃣ MALI ISIYOHAMISHIKA (Medium Risk)\n• Ardhi, nyumba\n• Mtaji mkubwa unahitajika\n• Thamani inapanda kwa muda\n\n⚠️ MUHIMU:\n• Usiweke yote mahali pamoja\n• Kwanza, weka akiba ya dharura\n• Elewa hatari kabla ya kuweka\n• Pesa unayohitaji = usiwekeze`
          : `📈 INVESTMENT EDUCATION\n\n🎯 What is investing?\nPutting money where it will grow more money.\n\n💰 INVESTMENT OPTIONS IN TANZANIA:\n\n1️⃣ SAVINGS ACCOUNT (Low Risk)\n• Interest: 2-4% per year\n• Money is safe\n• Withdraw anytime\n• Good for: Emergency fund\n\n2️⃣ FIXED DEPOSIT (Low Risk)\n• Interest: 5-10% per year\n• Lock for 3-12 months\n• Banks: CRDB, NMB, NBC\n• Good for: Short-term goals\n\n3️⃣ UNIT TRUST (Medium Risk)\n• Returns: 8-15% per year\n• UTT AMIS, Umoja Fund\n• Start with TSh 10,000\n• Good for: 3+ years horizon\n\n4️⃣ STOCKS - DSE (Higher Risk)\n• Buy part of a company\n• Profit: Dividends + price increase\n• Need CDS Account\n• Good for: 5+ years horizon\n\n5️⃣ REAL ESTATE (Medium Risk)\n• Land, buildings\n• Large capital needed\n• Value appreciates over time\n\n⚠️ IMPORTANT:\n• Don't put all eggs in one basket\n• First, build emergency fund\n• Understand risks before investing\n• Money you need = don't invest`,
        data: null
      };
    }

    // ============================================
    // M-PESA / MOBILE MONEY BUSINESS
    // ============================================
    if (lowerQ.includes('mpesa') || lowerQ.includes('m-pesa') || lowerQ.includes('wakala') ||
        lowerQ.includes('agent') || lowerQ.includes('tigo') || lowerQ.includes('airtel money')) {
      return {
        type: 'mobile_money_business',
        answer: isSwahili
          ? `📱 BIASHARA YA M-PESA/WAKALA\n\n💼 KUANZA WAKALA:\n\n1️⃣ MAHITAJI:\n• Mtaji: TSh 500,000 - 2,000,000\n• Kitambulisho halali\n• Simu nzuri\n• Mahali pazuri/salama\n\n2️⃣ USAJILI:\n• M-Pesa: Nenda Vodacom shop\n• Tigopesa: Nenda Tigo shop\n• Airtel Money: Nenda Airtel shop\n\n3️⃣ COMMISSION (MFANO M-PESA):\n• Kutoa TSh 10,000: ~TSh 200\n• Kutoa TSh 100,000: ~TSh 800\n• Kuweka hailipi commission\n\n4️⃣ MAPATO YA MWEZI:\n• Mtaji TSh 1M = ~TSh 150,000-300,000\n• Inategemea eneo na wateja\n\n💡 VIDOKEZO:\n• Fanya kazi saa nyingi (asubuhi-usiku)\n• Weka float ya kutosha\n• Usitoe mkopo kwa mtu\n• Weka pesa benki kila siku\n• Ongeza huduma: airtime, bills\n\n⚠️ HATARI:\n• Wizi - weka usalama\n• Pesa bandia - kagua vizuri\n• Fraud - fuata taratibu`
          : `📱 M-PESA/MOBILE MONEY BUSINESS\n\n💼 STARTING AS AGENT:\n\n1️⃣ REQUIREMENTS:\n• Capital: TSh 500,000 - 2,000,000\n• Valid ID\n• Good phone\n• Safe location\n\n2️⃣ REGISTRATION:\n• M-Pesa: Visit Vodacom shop\n• Tigopesa: Visit Tigo shop\n• Airtel Money: Visit Airtel shop\n\n3️⃣ COMMISSION (M-PESA EXAMPLE):\n• Withdraw TSh 10,000: ~TSh 200\n• Withdraw TSh 100,000: ~TSh 800\n• Deposit doesn't pay commission\n\n4️⃣ MONTHLY INCOME:\n• Capital TSh 1M = ~TSh 150,000-300,000\n• Depends on location and customers\n\n💡 TIPS:\n• Work long hours (morning-night)\n• Keep enough float\n• Don't give loans\n• Bank money daily\n• Add services: airtime, bills\n\n⚠️ RISKS:\n• Theft - ensure security\n• Fake money - check carefully\n• Fraud - follow procedures`,
        data: null
      };
    }

    // ============================================
    // MARKETING & CUSTOMERS - MASOKO
    // ============================================
    if (lowerQ.includes('market') || lowerQ.includes('masoko') || lowerQ.includes('wateja') ||
        lowerQ.includes('customer') || lowerQ.includes('adverti') || lowerQ.includes('tangazo')) {
      return {
        type: 'marketing_education',
        answer: isSwahili
          ? `📣 ELIMU YA MASOKO\n\n🎯 JINSI YA KUPATA WATEJA:\n\n1️⃣ WHATSAPP BUSINESS (Bure!)\n• Weka picha za bidhaa\n• Catalog ya bidhaa\n• Status kila siku\n• Majibu ya haraka (auto-reply)\n\n2️⃣ INSTAGRAM & FACEBOOK\n• Post picha nzuri 3x kwa wiki\n• Hashtag za Tanzania\n• Reels/Videos zinafanya vizuri\n• Facebook groups za eneo lako\n\n3️⃣ WATEJA WA MWANZO\n• Anza na familia na marafiki\n• Omba referrals (rafiki=rafiki)\n• Toa discount ya kwanza\n\n4️⃣ WORD OF MOUTH\n• Huduma nzuri = wateja wanarudi\n• Wateja waridhika = wanasema wengine\n• Shida itatuliwe haraka\n\n5️⃣ MAHALI PA BIASHARA\n• Eneo lenye watu wengi\n• Onekane kutoka barabarani\n• Bango/sign kubwa\n\n💡 FORMULA YA MASOKO:\n• Bidhaa nzuri + Bei sawa + Huduma bora = Wateja wengi\n\n📊 BUDGET YA MASOKO:\n• 5-10% ya mapato = kwa masoko\n• Mfano: Ukipata TSh 1M, weka TSh 50,000-100,000 kwa ads`
          : `📣 MARKETING EDUCATION\n\n🎯 HOW TO GET CUSTOMERS:\n\n1️⃣ WHATSAPP BUSINESS (Free!)\n• Post product photos\n• Product catalog\n• Daily status updates\n• Quick replies (auto-reply)\n\n2️⃣ INSTAGRAM & FACEBOOK\n• Post nice photos 3x per week\n• Tanzania hashtags\n• Reels/Videos perform well\n• Local Facebook groups\n\n3️⃣ FIRST CUSTOMERS\n• Start with family and friends\n• Ask for referrals\n• Give first-time discount\n\n4️⃣ WORD OF MOUTH\n• Good service = customers return\n• Satisfied customers = tell others\n• Solve problems quickly\n\n5️⃣ BUSINESS LOCATION\n• High foot traffic area\n• Visible from the road\n• Big sign/banner\n\n💡 MARKETING FORMULA:\n• Good product + Fair price + Great service = Many customers\n\n📊 MARKETING BUDGET:\n• 5-10% of revenue = for marketing\n• Example: If you make TSh 1M, spend TSh 50,000-100,000 on ads`,
        data: null
      };
    }

    // ============================================
    // EMERGENCY FUND - AKIBA YA DHARURA
    // ============================================
    if (lowerQ.includes('dharura') || lowerQ.includes('emergency') || lowerQ.includes('tatizo') ||
        lowerQ.includes('shida') || lowerQ.includes('ugonjwa') || lowerQ.includes('ajali')) {
      return {
        type: 'emergency_fund',
        answer: isSwahili
          ? `🆘 AKIBA YA DHARURA\n\n❓ Ni nini?\nPesa uliyoweka kwa matukio yasiyotarajiwa.\n\n🎯 KWA NINI UNAHITAJI?\n• Kupoteza kazi\n• Ugonjwa/hospitali\n• Ajali\n• Marekebisho ya gari/nyumba\n• Msaada wa familia\n\n💰 KIASI GANI?\n• Lengo: Miezi 3-6 ya matumizi\n• Mfano: Unatumia TSh 500,000/mwezi\n• Lengo = TSh 1,500,000 - 3,000,000\n\n📋 JINSI YA KUANZA:\n\n1️⃣ HESABU MATUMIZI:\n• Orodhesha matumizi yako yote ya mwezi\n• Jumlisha = kiasi cha mwezi 1\n\n2️⃣ WEKA LENGO:\n• Anza na mwezi 1 wa matumizi\n• Ongeza hadi miezi 3\n• Hatimaye miezi 6\n\n3️⃣ WEKA AKIBA:\n• 10% ya mapato kila mwezi\n• Mfano: Mshahara TSh 800,000\n• Weka TSh 80,000 kwa akiba ya dharura\n\n4️⃣ WEKA WAPI?\n• Akaunti tofauti ya benki\n• Usitumie kwa vitu vingine!\n• Easy access (unaweza kutoa haraka)\n\n⚠️ MUHIMU:\n• Dharura TU = unatumia\n• Sio safari, sio simu mpya\n• Ukitoa = jaza tena haraka!`
          : `🆘 EMERGENCY FUND\n\n❓ What is it?\nMoney set aside for unexpected events.\n\n🎯 WHY DO YOU NEED IT?\n• Job loss\n• Illness/hospital\n• Accidents\n• Car/house repairs\n• Family emergency\n\n💰 HOW MUCH?\n• Target: 3-6 months of expenses\n• Example: You spend TSh 500,000/month\n• Target = TSh 1,500,000 - 3,000,000\n\n📋 HOW TO START:\n\n1️⃣ CALCULATE EXPENSES:\n• List all monthly expenses\n• Total = 1 month amount\n\n2️⃣ SET TARGET:\n• Start with 1 month of expenses\n• Increase to 3 months\n• Eventually 6 months\n\n3️⃣ SAVE REGULARLY:\n• 10% of income every month\n• Example: Salary TSh 800,000\n• Save TSh 80,000 for emergency\n\n4️⃣ WHERE TO KEEP?\n• Separate bank account\n• Don't use for other things!\n• Easy access (can withdraw quickly)\n\n⚠️ IMPORTANT:\n• Emergency ONLY = use it\n• Not vacation, not new phone\n• If you use = replenish quickly!`,
        data: null
      };
    }

    // ============================================
    // COMPOUND INTEREST - RIBA YA MRUNDIKANO
    // ============================================
    if (lowerQ.includes('compound') || lowerQ.includes('riba') || lowerQ.includes('interest') ||
        lowerQ.includes('kukua') || lowerQ.includes('grow')) {
      const example1 = Math.round(100000 * Math.pow(1.10, 5));
      const example2 = Math.round(100000 * Math.pow(1.10, 10));
      const example3 = Math.round(100000 * Math.pow(1.10, 20));
      
      return {
        type: 'compound_interest',
        answer: isSwahili
          ? `📈 NGUVU YA RIBA YA MRUNDIKANO\n\n🎯 Ni nini?\nRiba inayoongezwa juu ya riba = pesa inakua haraka!\n\n🧮 FORMULA:\nKiasi cha Baadaye = Mtaji × (1 + Riba)^Miaka\n\n✅ MFANO (Riba 10% kwa mwaka):\n\nUkiweka TSh 100,000:\n• Baada ya miaka 5: TSh ${example1.toLocaleString()}\n• Baada ya miaka 10: TSh ${example2.toLocaleString()}\n• Baada ya miaka 20: TSh ${example3.toLocaleString()}\n\n🎯 SIRI MBILI:\n\n1️⃣ ANZA MAPEMA\n• Umri 25: Weka TSh 50,000/mwezi\n• Umri 45: Unakuwa na zaidi ya TSh 40M!\n\n2️⃣ KUWA MVUMILIVU\n• Usiondoe pesa\n• Wacha riba ifanye kazi\n• Muda = rafiki yako\n\n💡 SHERIA YA 72:\nMiaka ya pesa kuongezeka mara 2 = 72 ÷ Riba%\n• Riba 10%: 72÷10 = Miaka 7.2\n• Riba 8%: 72÷8 = Miaka 9\n\n⚠️ TAHADHARI:\nRiba ya mkopo pia inafanya kazi hivyo - ndiyo maana madeni yanakua haraka!`
          : `📈 POWER OF COMPOUND INTEREST\n\n🎯 What is it?\nInterest added on top of interest = money grows fast!\n\n🧮 FORMULA:\nFuture Value = Principal × (1 + Rate)^Years\n\n✅ EXAMPLE (10% annual interest):\n\nIf you invest TSh 100,000:\n• After 5 years: TSh ${example1.toLocaleString()}\n• After 10 years: TSh ${example2.toLocaleString()}\n• After 20 years: TSh ${example3.toLocaleString()}\n\n🎯 TWO SECRETS:\n\n1️⃣ START EARLY\n• Age 25: Save TSh 50,000/month\n• Age 45: You'll have over TSh 40M!\n\n2️⃣ BE PATIENT\n• Don't withdraw\n• Let interest work\n• Time = your friend\n\n💡 RULE OF 72:\nYears to double money = 72 ÷ Interest%\n• 10% interest: 72÷10 = 7.2 years\n• 8% interest: 72÷8 = 9 years\n\n⚠️ WARNING:\nLoan interest also works this way - that's why debts grow fast!`,
        data: null
      };
    }

    // ============================================
    // SIDE HUSTLE IDEAS - KAZI ZA ZIADA
    // ============================================
    if (lowerQ.includes('side') || lowerQ.includes('hustle') || lowerQ.includes('ziada') ||
        lowerQ.includes('extra') || lowerQ.includes('part time') || lowerQ.includes('nyingine')) {
      return {
        type: 'side_hustle',
        answer: isSwahili
          ? `💼 KAZI ZA ZIADA (SIDE HUSTLES)\n\n🏠 KAZI ZA NYUMBANI:\n\n1️⃣ ONLINE:\n• Kuuza WhatsApp/Instagram\n• Kuandika content (TSh 20,000-100,000/article)\n• Virtual assistant\n• Teaching online (Kiingereza, Math)\n• Graphic design (Canva ni bure!)\n\n2️⃣ SKILLS:\n• Kushona nguo\n• Kupika/catering\n• Kutengeneza nywele/makeup\n• Kufundi (simu, umeme)\n• Driving (Uber, bolt)\n\n3️⃣ BIDHAA:\n• Kuuza airtime/M-Pesa\n• Bidhaa za uzuri\n• Nguo za mitumba\n• Chakula (sambusa, vitumbua)\n• Mimea (flowers, mboga)\n\n💰 MATARAJIO YA MAPATO:\n• Part time: TSh 100,000-500,000/mwezi\n• Active hustle: TSh 500,000-2,000,000/mwezi\n\n✅ HATUA ZA KUANZA:\n1. Chagua hustle inayofaa skills zako\n2. Anza ndogo - usitumie pesa nyingi\n3. Jaribu wikendi/usiku\n4. Ikifanikiwa = ongeza nguvu\n\n💡 KANUNI YA DHAHABU:\nFanya kazi unayoipenda + Watu wanaihitaji = Biashara nzuri!`
          : `💼 SIDE HUSTLE IDEAS\n\n🏠 WORK FROM HOME:\n\n1️⃣ ONLINE:\n• Selling on WhatsApp/Instagram\n• Content writing (TSh 20,000-100,000/article)\n• Virtual assistant\n• Teaching online (English, Math)\n• Graphic design (Canva is free!)\n\n2️⃣ SKILLS-BASED:\n• Tailoring\n• Cooking/catering\n• Hairdressing/makeup\n• Repairs (phones, electrical)\n• Driving (Uber, Bolt)\n\n3️⃣ PRODUCTS:\n• Selling airtime/M-Pesa\n• Beauty products\n• Mitumba clothes\n• Food (sambusa, vitumbua)\n• Plants (flowers, vegetables)\n\n💰 INCOME EXPECTATIONS:\n• Part time: TSh 100,000-500,000/month\n• Active hustle: TSh 500,000-2,000,000/month\n\n✅ STEPS TO START:\n1. Choose a hustle matching your skills\n2. Start small - don't overspend\n3. Try weekends/evenings\n4. If successful = scale up\n\n💡 GOLDEN RULE:\nDo what you love + People need it = Good business!`,
        data: null
      };
    }

    // ============================================
    // TAX BASICS - KODI
    // ============================================
    if (lowerQ.includes('tax') || lowerQ.includes('kodi') || lowerQ.includes('tra') ||
        lowerQ.includes('ushuru') || lowerQ.includes('paye')) {
      return {
        type: 'tax_education',
        answer: isSwahili
          ? `🏛️ ELIMU YA KODI (TANZANIA)\n\n📋 AINA ZA KODI:\n\n1️⃣ PAYE (Pay As You Earn)\n• Kodi ya mshahara\n• TRA inakatwa moja kwa moja\n• Viwango:\n  - TSh 0-270,000: 0%\n  - 270,001-520,000: 8%\n  - 520,001-760,000: 20%\n  - 760,001-1,000,000: 25%\n  - Zaidi ya 1M: 30%\n\n2️⃣ KODI YA BIASHARA\n• Biashara ndogo: Presumptive tax\n• Mapato < TSh 100M/mwaka: Bei maalum\n• Mapato > TSh 100M: 30% ya faida\n\n3️⃣ VAT (Kodi ya Ongezeko)\n• 18% ya bei ya bidhaa/huduma\n• Kama unauza > TSh 100M/mwaka\n\n4️⃣ TIN NUMBER\n• Lazima kwa biashara yoyote\n• Bure kupata - nenda TRA\n• Online: tra.go.tz\n\n💡 VIDOKEZO:\n• Weka receipts zote\n• File returns kwa wakati (Penalty ni kubwa!)\n• Tumia accountant kama huelewi\n\n⚠️ MUHIMU:\n• Kulipa kodi ni wajibu wa kisheria\n• TRA wanaweza kukagua wakati wowote\n• Faini za kuchelewa ni kubwa sana`
          : `🏛️ TAX EDUCATION (TANZANIA)\n\n📋 TYPES OF TAXES:\n\n1️⃣ PAYE (Pay As You Earn)\n• Salary tax\n• TRA deducts automatically\n• Rates:\n  - TSh 0-270,000: 0%\n  - 270,001-520,000: 8%\n  - 520,001-760,000: 20%\n  - 760,001-1,000,000: 25%\n  - Above 1M: 30%\n\n2️⃣ BUSINESS TAX\n• Small business: Presumptive tax\n• Income < TSh 100M/year: Fixed rates\n• Income > TSh 100M: 30% of profit\n\n3️⃣ VAT (Value Added Tax)\n• 18% of product/service price\n• If you sell > TSh 100M/year\n\n4️⃣ TIN NUMBER\n• Required for any business\n• Free to get - visit TRA\n• Online: tra.go.tz\n\n💡 TIPS:\n• Keep all receipts\n• File returns on time (Penalties are high!)\n• Use an accountant if unsure\n\n⚠️ IMPORTANT:\n• Paying tax is a legal duty\n• TRA can audit anytime\n• Late penalties are very high`,
        data: null
      };
    }

    // ============================================
    // LOANS & BORROWING - MIKOPO
    // ============================================
    if (lowerQ.includes('mkopo') || lowerQ.includes('loan') || lowerQ.includes('borrow') ||
        lowerQ.includes('azim') || lowerQ.includes('credit')) {
      return {
        type: 'loan_education',
        answer: isSwahili
          ? `💳 ELIMU YA MIKOPO\n\n⚠️ KABLA YA KUKOPA - JIULIZE:\n• Je, ninahitaji au ninataka?\n• Je, nitaweza kulipa?\n• Riba ni kiasi gani?\n\n📊 AINA ZA MIKOPO:\n\n1️⃣ MIKOPO YA BENKI\n• Riba: 15-25% kwa mwaka\n• Inahitaji: Mshahara/collateral\n• Muda: Miezi 12-60\n\n2️⃣ MOBILE LOANS (M-Shwari, Tala)\n• Riba: ~10% kwa mwezi = 120%/mwaka! 😱\n• Rahisi kupata\n• Hatari: Madeni yanakua haraka\n\n3️⃣ VICOBA/SACCOS\n• Riba: 5-15% kwa mwaka\n• Chama cha akiba na mkopo\n• Nzuri: Husaidiana\n\n4️⃣ SHYLOCK\n• Riba: 20-50%+ kwa mwezi\n• EPUKA KABISA! ❌\n\n💡 KANUNI ZA KUKOPA:\n\n✅ FANYA:\n• Linganisha riba za mikopo\n• Soma masharti yote\n• Hesabu malipo yote (principal + riba)\n• Kopa kwa kitu kinachozalisha\n\n❌ USIFANYE:\n• Kukopa kwa anasa (TV, simu)\n• Kukopa kulipa mkopo mwingine\n• Kukopa bila mpango wa kulipa\n\n🧮 MFANO:\nMkopo: TSh 1,000,000\nRiba: 20%/mwaka\nMuda: Mwaka 1\n\nUtalipa: TSh 1,200,000\nRiba = TSh 200,000`
          : `💳 LOAN EDUCATION\n\n⚠️ BEFORE BORROWING - ASK:\n• Do I need this or want this?\n• Can I afford to repay?\n• What's the interest rate?\n\n📊 TYPES OF LOANS:\n\n1️⃣ BANK LOANS\n• Interest: 15-25% per year\n• Requires: Salary/collateral\n• Period: 12-60 months\n\n2️⃣ MOBILE LOANS (M-Shwari, Tala)\n• Interest: ~10% per month = 120%/year! 😱\n• Easy to get\n• Danger: Debts grow fast\n\n3️⃣ VICOBA/SACCOS\n• Interest: 5-15% per year\n• Savings and loan group\n• Good: Mutual support\n\n4️⃣ SHYLOCKS\n• Interest: 20-50%+ per month\n• AVOID COMPLETELY! ❌\n\n💡 BORROWING RULES:\n\n✅ DO:\n• Compare loan interest rates\n• Read all terms\n• Calculate total payment (principal + interest)\n• Borrow for income-generating purposes\n\n❌ DON'T:\n• Borrow for luxuries (TV, phone)\n• Borrow to pay another loan\n• Borrow without repayment plan\n\n🧮 EXAMPLE:\nLoan: TSh 1,000,000\nInterest: 20%/year\nPeriod: 1 year\n\nYou'll pay: TSh 1,200,000\nInterest = TSh 200,000`,
        data: null
      };
    }

    // ============================================
    // INFLATION - MFUMUKO WA BEI
    // ============================================
    if (lowerQ.includes('inflation') || lowerQ.includes('mfumuko') || lowerQ.includes('bei kupanda') ||
        lowerQ.includes('price') || lowerQ.includes('gharama')) {
      return {
        type: 'inflation_education',
        answer: isSwahili
          ? `📈 MFUMUKO WA BEI (INFLATION)\n\n❓ Ni nini?\nBei za bidhaa zinapanda, pesa yako inapoteza thamani.\n\n🇹🇿 TANZANIA:\n• Mfumuko: ~4-6% kwa mwaka\n• Maana: TSh 100,000 leo = TSh 95,000 mwaka ujao\n\n🧮 ATHARI:\n\nLeo: Mchele kg 1 = TSh 3,000\nMwaka 1: TSh 3,150\nMiaka 5: TSh 3,830\nMiaka 10: TSh 4,890\n\n💡 JINSI YA KUSHINDA MFUMUKO:\n\n1️⃣ USIWEKE PESA CHINI YA GODORO\n• Pesa cash inapoteza thamani\n• Angalau weka benki (riba kidogo)\n\n2️⃣ WEKEZA PESA\n• Riba > Mfumuko = Unashinda\n• Mfano: Uwekezaji 10%, Mfumuko 5%\n• Faida halisi = 5%\n\n3️⃣ NUNUA MALI\n• Ardhi/nyumba - bei inapanda\n• Bidhaa muhimu (wholesale)\n\n4️⃣ ONGEZA MAPATO\n• Ujuzi mpya = Mshahara mkubwa\n• Biashara ya ziada\n\n⚠️ JIHADHARI:\n• Akiba ya benki (2-4%) < Mfumuko (5%)\n• Pesa benki = bado inapoteza thamani polepole\n• Lazima uwekeze kupata faida halisi`
          : `📈 INFLATION\n\n❓ What is it?\nPrices of goods rise, your money loses value.\n\n🇹🇿 TANZANIA:\n• Inflation: ~4-6% per year\n• Meaning: TSh 100,000 today = TSh 95,000 next year\n\n🧮 IMPACT:\n\nToday: Rice 1kg = TSh 3,000\nYear 1: TSh 3,150\nYear 5: TSh 3,830\nYear 10: TSh 4,890\n\n💡 HOW TO BEAT INFLATION:\n\n1️⃣ DON'T KEEP CASH UNDER MATTRESS\n• Cash loses value\n• At least put in bank (small interest)\n\n2️⃣ INVEST YOUR MONEY\n• Interest > Inflation = You win\n• Example: Investment 10%, Inflation 5%\n• Real gain = 5%\n\n3️⃣ BUY ASSETS\n• Land/property - prices increase\n• Essential goods (wholesale)\n\n4️⃣ INCREASE INCOME\n• New skills = Higher salary\n• Side business\n\n⚠️ BE CAREFUL:\n• Bank savings (2-4%) < Inflation (5%)\n• Money in bank = still losing value slowly\n• Must invest to get real gains`,
        data: null
      };
    }

    // ============================================
    // DEFAULT / GREETING
    // ============================================
    if (lowerQ.includes('habari') || lowerQ.includes('mambo') || lowerQ.includes('hello') || 
        lowerQ.includes('hi') || lowerQ.includes('hujambo')) {
      return {
        type: 'greeting',
        answer: isSwahili
          ? `Habari ${this.userName}! 👋 Mimi ni Msaidizi wako wa Fedha na Biashara.\n\n🎯 Ninaweza kukusaidia na:\n\n📊 FEDHA BINAFSI:\n• Uchambuzi wa matumizi\n• Hali ya bajeti\n• Mikakati ya madeni\n• Malengo ya akiba\n\n📚 ELIMU YA FEDHA:\n• Bajeti na matumizi\n• Akiba na uwekezaji\n• Mikopo na madeni\n• Mfumuko wa bei\n\n🏪 BIASHARA:\n• Kuanza biashara\n• Marketing/Masoko\n• M-Pesa/Wakala\n• Kazi za ziada\n\n💬 JARIBU:\n• "Kulingana na mapato yangu niweke akiba kiasi gani kufikia lengo?"\n• "Nifundishe kuhusu biashara"\n• "Niambie kuhusu uwekezaji"\n• "Nipe ushauri wa fedha"\n\nNiko hapa kukusaidia ${this.userName}! 😊`
          : `Hello ${this.userName}! 👋 I'm your Finance and Business Assistant.\n\n🎯 I can help you with:\n\n📊 PERSONAL FINANCE:\n• Spending analysis\n• Budget status\n• Debt strategies\n• Savings goals\n\n📚 FINANCIAL EDUCATION:\n• Budgeting & spending\n• Savings & investing\n• Loans & debt\n• Inflation\n\n🏪 BUSINESS:\n• Starting a business\n• Marketing\n• M-Pesa/Agent business\n• Side hustles\n\n💬 TRY ASKING:\n• "Based on my income, how much should I save to meet my target?"\n• "Teach me about business"\n• "Tell me about investing"\n• "Give me financial tips"\n\nI'm here to help you ${this.userName}! 😊`,
        data: null
      };
    }

    // Default response
    return {
      type: 'general',
      answer: isSwahili
        ? `${this.userName}, sijaelewa vizuri swali lako, lakini usiwe na wasiwasi! 🤗\n\n💬 Ninaweza kukusaidia na:\n\n📊 FEDHA:\n• "Kulingana na mapato yangu niweke akiba kiasi gani kufikia lengo?"\n• "Matumizi yangu yakoje?"\n• "Bajeti yangu ikoje?"\n\n📚 ELIMU:\n• "Nifundishe kuhusu bajeti"\n• "Nifundishe kuhusu biashara"\n• "Nifundishe kuhusu uwekezaji"\n\n🏪 BIASHARA:\n• "Niambie kuhusu kuanza biashara"\n• "Nifundishe marketing"\n\n💡 USHAURI:\n• "Nipe ushauri wa fedha"\n• "Kazi za ziada gani nifanye?"\n\nJaribu kuuliza tena ${this.userName}! Niko hapa kukusaidia. 😊`
        : `${this.userName}, I didn't quite understand your question, but don't worry! 🤗\n\n💬 I can help with:\n\n📊 FINANCE:\n• "Based on my income, how much should I save to meet my target?"\n• "What did I spend most on?"\n• "How are my budgets?"\n\n📚 EDUCATION:\n• "Teach me about budgeting"\n• "Teach me about business"\n• "Teach me about investing"\n\n🏪 BUSINESS:\n• "Tell me about starting a business"\n• "Teach me marketing"\n\n💡 ADVICE:\n• "Give me financial tips"\n• "What side hustles can I do?"\n\nTry asking again ${this.userName}! I'm here to help. 😊`,
      data: null
    };
  }

  // Helper: Detect if question is in Swahili
  detectSwahili(text) {
    const swahiliWords = ['habari', 'mambo', 'nini', 'vipi', 'je', 'gani', 'yangu', 'yako', 
      'matumizi', 'akiba', 'deni', 'bajeti', 'fedha', 'pesa', 'nifundishe', 'ushauri',
      'kiasi', 'mwezi', 'saidia', 'eleza', 'weka', 'lipa', 'lengo', 'malengo', 'hali',
      'yakoje', 'kwanza', 'zaidi', 'kidogo', 'sana', 'vizuri', 'mbaya', 'nzuri', 'biashara',
      'uwekezaji', 'mkopo', 'faida', 'hasara', 'wateja', 'masoko', 'dharura', 'kodi',
      'mfumuko', 'riba', 'bei', 'gharama', 'wakala', 'mpesa', 'kuanza', 'kukuza'];
    
    const words = text.toLowerCase().split(/\s+/);
    const swahiliCount = words.filter(w => swahiliWords.includes(w)).length;
    
    return swahiliCount >= 1 || text.includes('tsh') || text.includes('shilingi');
  }
}

// ============================================
// API ROUTES
// ============================================

// Get full financial diagnosis
router.get('/diagnosis', async (req, res) => {
  try {
    const ai = new FinancialAI(req.userId);
    await ai.loadUserData();
    const diagnosis = ai.generateDiagnosis();
    
    res.json({
      success: true,
      diagnosis,
      summary: {
        income: ai.data.income.total,
        expenses: ai.data.expenses.total,
        savings: ai.data.income.total - ai.data.expenses.total,
        savingsRate: ai.data.income.total > 0 
          ? ((ai.data.income.total - ai.data.expenses.total) / ai.data.income.total * 100).toFixed(1)
          : 0
      }
    });
  } catch (error) {
    console.error('Diagnosis error:', error);
    res.status(500).json({ error: 'Failed to generate diagnosis' });
  }
});

// Get personalized recommendations
router.get('/recommendations', async (req, res) => {
  try {
    const ai = new FinancialAI(req.userId);
    await ai.loadUserData();
    const recommendations = ai.generateRecommendations();
    
    res.json({ success: true, recommendations });
  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

// Chat with AI assistant
router.post('/chat', [
  body('message').trim().notEmpty().withMessage('Message is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { message } = req.body;
    
    const ai = new FinancialAI(req.userId);
    await ai.loadUserData();
    const response = await ai.answerQuestion(message);

    // Store chat history
    await pool.query(
      'INSERT INTO ai_chat_history (user_id, message, response, response_type) VALUES (?, ?, ?, ?)',
      [req.userId, message, response.answer, response.type]
    );

    res.json({
      success: true,
      response: response.answer,
      type: response.type,
      data: response.data
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

// Get scenario simulations
router.post('/simulate', [
  body('goalAmount').isFloat({ min: 1 }).withMessage('Goal amount is required'),
  body('monthlyContribution').isFloat({ min: 0 }).withMessage('Monthly contribution is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { goalAmount, monthlyContribution, interestRate = 0 } = req.body;
    
    const ai = new FinancialAI(req.userId);
    const scenarios = ai.generateScenarios(goalAmount, monthlyContribution, interestRate);

    res.json({ success: true, scenarios });
  } catch (error) {
    console.error('Simulation error:', error);
    res.status(500).json({ error: 'Failed to run simulation' });
  }
});

// Get budget alerts
router.get('/alerts', async (req, res) => {
  try {
    const ai = new FinancialAI(req.userId);
    await ai.loadUserData();
    
    const alerts = [];
    const { budgets, debts, savings } = ai.data;

    // Budget alerts
    budgets.forEach(b => {
      if (b.percentUsed >= 100) {
        alerts.push({
          type: 'budget_exceeded',
          severity: 'high',
          category: b.category,
          message: `Budget exceeded! ${b.category}: ${b.percentUsed}% used`,
          amount: b.spent - b.budget
        });
      } else if (b.percentUsed >= 80) {
        alerts.push({
          type: 'budget_warning',
          severity: 'medium',
          category: b.category,
          message: `Budget warning: ${b.category} is at ${b.percentUsed}%`,
          remaining: b.remaining
        });
      }
    });

    // Debt due alerts
    debts.forEach(d => {
      if (d.minimumPayment > 0) {
        const today = new Date().getDate();
        // Assuming due_day is stored
        alerts.push({
          type: 'payment_due',
          severity: 'medium',
          name: d.name,
          message: `Payment of TSh ${d.minimumPayment.toLocaleString()} due for ${d.name}`,
          amount: d.minimumPayment
        });
      }
    });

    // Savings goal milestones
    savings.forEach(s => {
      if (s.progress >= 75 && s.progress < 100) {
        alerts.push({
          type: 'goal_milestone',
          severity: 'info',
          name: s.name,
          message: `Almost there! "${s.name}" is at ${s.progress}%`,
          remaining: s.target - s.current
        });
      }
    });

    res.json({ success: true, alerts });
  } catch (error) {
    console.error('Alerts error:', error);
    res.status(500).json({ error: 'Failed to get alerts' });
  }
});

// Get chat history
router.get('/chat/history', async (req, res) => {
  try {
    const [history] = await pool.query(
      'SELECT * FROM ai_chat_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [req.userId]
    );
    res.json({ success: true, history });
  } catch (error) {
    console.error('Chat history error:', error);
    res.status(500).json({ error: 'Failed to get chat history' });
  }
});

// Get financial coaching tips
router.get('/coaching', async (req, res) => {
  try {
    const ai = new FinancialAI(req.userId);
    await ai.loadUserData();
    const diagnosis = ai.generateDiagnosis();
    
    const coachingTips = [];
    const { health, issues } = diagnosis;

    // Personalized coaching based on issues
    if (health.breakdown.savings < 50) {
      coachingTips.push({
        area: 'savings',
        title: 'Boost Your Savings',
        steps: [
          'Review all subscriptions and cancel unused ones',
          'Set up automatic transfers to savings on payday',
          'Use the "pay yourself first" method',
          'Track small daily expenses - they add up',
          'Find one expense to cut this week'
        ]
      });
    }

    if (health.breakdown.spending > 70) {
      coachingTips.push({
        area: 'spending',
        title: 'Control Your Spending',
        steps: [
          'Use the 24-hour rule before purchases',
          'Create a weekly spending allowance',
          'Unsubscribe from marketing emails',
          'Delete shopping apps from your phone',
          'Plan meals to reduce food costs'
        ]
      });
    }

    if (health.breakdown.debt < 70) {
      coachingTips.push({
        area: 'debt',
        title: 'Accelerate Debt Payoff',
        steps: [
          'List all debts with interest rates',
          'Pay minimums on all, extra on highest rate',
          'Find side income for extra payments',
          'Negotiate lower interest rates',
          'Celebrate each debt paid off!'
        ]
      });
    }

    if (health.breakdown.budget < 60) {
      coachingTips.push({
        area: 'budgeting',
        title: 'Master Your Budget',
        steps: [
          'Review your budget weekly, not monthly',
          'Identify your biggest budget-busters',
          'Set realistic limits based on past spending',
          'Leave buffer room for unexpected expenses',
          'Adjust budgets that are consistently broken'
        ]
      });
    }

    // Always include general tips
    coachingTips.push({
      area: 'habits',
      title: 'Build Good Financial Habits',
      steps: [
        'Check your accounts every morning',
        'Review expenses every Sunday',
        'Set monthly financial check-in dates',
        'Celebrate small wins along the way',
        'Learn something new about finance weekly'
      ]
    });

    res.json({ 
      success: true, 
      healthScore: health.overall,
      coachingTips 
    });
  } catch (error) {
    console.error('Coaching error:', error);
    res.status(500).json({ error: 'Failed to get coaching tips' });
  }
});

module.exports = router;
