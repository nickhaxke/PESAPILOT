import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
  Lightbulb,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Activity,
  Target,
  CreditCard,
  Smartphone,
  Award
} from 'lucide-react'
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts'
import api from '../services/api'
import toast from 'react-hot-toast'

const COLORS = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#C9CBCF']

// Format number as currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency: 'TZS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

function StatCard({ title, value, icon: Icon, trend, trendValue, color }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600'
  }

  return (
    <div className="card p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {trendValue !== undefined && (
            <div className={`flex items-center mt-2 text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
              {trend === 'up' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              <span>{trendValue}% vs last month</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  )
}

function InsightCard({ insight }) {
  const iconMap = {
    'trending-up': TrendingUp,
    'alert-triangle': AlertTriangle,
    'alert-circle': AlertCircle,
    'arrow-up': ArrowUpRight,
    'arrow-down': ArrowDownRight,
    'piggy-bank': PiggyBank
  }
  
  const typeStyles = {
    spending: 'border-blue-200 bg-blue-50',
    warning: 'border-red-200 bg-red-50',
    caution: 'border-yellow-200 bg-yellow-50',
    success: 'border-green-200 bg-green-50',
    info: 'border-gray-200 bg-gray-50'
  }

  const iconStyles = {
    spending: 'text-blue-600',
    warning: 'text-red-600',
    caution: 'text-yellow-600',
    success: 'text-green-600',
    info: 'text-gray-600'
  }

  const Icon = iconMap[insight.icon] || Lightbulb

  return (
    <div className={`p-4 rounded-lg border ${typeStyles[insight.type]}`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 mt-0.5 ${iconStyles[insight.type]}`} />
        <p className="text-sm text-gray-700">{insight.message}</p>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [overview, setOverview] = useState(null)
  const [spending, setSpending] = useState([])
  const [trend, setTrend] = useState([])
  const [insights, setInsights] = useState([])
  const [recentTransactions, setRecentTransactions] = useState([])
  const [healthScore, setHealthScore] = useState(null)
  const [savingsSummary, setSavingsSummary] = useState(null)
  const [debtsSummary, setDebtsSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [overviewRes, spendingRes, trendRes, insightsRes, recentRes] = await Promise.all([
        api.get('/dashboard/overview'),
        api.get('/dashboard/spending-by-category'),
        api.get('/dashboard/monthly-trend'),
        api.get('/dashboard/insights'),
        api.get('/dashboard/recent?limit=5')
      ])

      setOverview(overviewRes.data.overview)
      setSpending(spendingRes.data.spending)
      setTrend(trendRes.data.trend)
      setInsights(insightsRes.data.insights)
      setRecentTransactions(recentRes.data.transactions)

      // Fetch additional data (non-blocking)
      try {
        const [healthRes, savingsRes, debtsRes] = await Promise.all([
          api.get('/financial-health/score'),
          api.get('/savings/summary/stats'),
          api.get('/debts/summary/stats')
        ])
        setHealthScore(healthRes.data)
        setSavingsSummary(savingsRes.data)
        setDebtsSummary(debtsRes.data)
      } catch (err) {
        console.log('Extended features not available yet')
      }
    } catch (error) {
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="spinner text-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Your financial overview for this month</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Income"
          value={formatCurrency(overview?.totalIncome || 0)}
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          title="Total Expenses"
          value={formatCurrency(overview?.totalExpenses || 0)}
          icon={TrendingDown}
          color="red"
        />
        <StatCard
          title="Balance"
          value={formatCurrency(overview?.balance || 0)}
          icon={Wallet}
          color="blue"
        />
        <StatCard
          title="Budget Used"
          value={`${overview?.budgetUsage || 0}%`}
          icon={PiggyBank}
          color="purple"
        />
      </div>

      {/* Quick Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Financial Health Score */}
        {healthScore && (
          <Link to="/financial-health" className="card p-5 hover:shadow-md transition group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Financial Health</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className={`text-3xl font-bold ${
                    healthScore.score >= 70 ? 'text-green-600' : 
                    healthScore.score >= 50 ? 'text-yellow-600' : 'text-red-600'
                  }`}>{healthScore.score}</span>
                  <span className="text-gray-400">/100</span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <Award className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-500">Grade: {healthScore.grade}</span>
                </div>
              </div>
              <div className={`p-3 rounded-full ${
                healthScore.score >= 70 ? 'bg-green-100' : 
                healthScore.score >= 50 ? 'bg-yellow-100' : 'bg-red-100'
              }`}>
                <Activity className={`w-6 h-6 ${
                  healthScore.score >= 70 ? 'text-green-600' : 
                  healthScore.score >= 50 ? 'text-yellow-600' : 'text-red-600'
                }`} />
              </div>
            </div>
            <div className="mt-3 flex items-center text-sm text-primary-600 group-hover:underline">
              View details <ChevronRight className="w-4 h-4" />
            </div>
          </Link>
        )}

        {/* Savings Progress */}
        {savingsSummary && (
          <Link to="/savings" className="card p-5 hover:shadow-md transition group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Savings Goals</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(savingsSummary.totalSaved)}
                </p>
                <p className="text-sm text-gray-500">
                  of {formatCurrency(savingsSummary.totalTarget)} target
                </p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-3">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full" 
                  style={{ width: `${Math.min((savingsSummary.totalSaved / savingsSummary.totalTarget) * 100 || 0, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">{savingsSummary.totalGoals} active goals</p>
            </div>
          </Link>
        )}

        {/* Debt Summary */}
        {debtsSummary && (
          <Link to="/debts" className="card p-5 hover:shadow-md transition group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Debt</p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  {formatCurrency(debtsSummary.totalOwed)}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {debtsSummary.overdueCount > 0 && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                      {debtsSummary.overdueCount} overdue
                    </span>
                  )}
                  <span className="text-sm text-gray-500">{debtsSummary.totalDebts} debts</span>
                </div>
              </div>
              <div className="p-3 rounded-full bg-red-100">
                <CreditCard className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <div className="mt-3 flex items-center text-sm text-primary-600 group-hover:underline">
              Manage debts <ChevronRight className="w-4 h-4" />
            </div>
          </Link>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link to="/income" className="card p-4 hover:shadow-md transition flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <span className="font-medium text-gray-700">Add Income</span>
        </Link>
        <Link to="/expenses" className="card p-4 hover:shadow-md transition flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <TrendingDown className="w-5 h-5 text-red-600" />
          </div>
          <span className="font-medium text-gray-700">Add Expense</span>
        </Link>
        <Link to="/mobile-money" className="card p-4 hover:shadow-md transition flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Smartphone className="w-5 h-5 text-blue-600" />
          </div>
          <span className="font-medium text-gray-700">Parse SMS</span>
        </Link>
        <Link to="/savings" className="card p-4 hover:shadow-md transition flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <PiggyBank className="w-5 h-5 text-purple-600" />
          </div>
          <span className="font-medium text-gray-700">Add Savings</span>
        </Link>
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending by category */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Spending by Category</h3>
          {spending.length > 0 ? (
            <div className="flex items-center gap-8">
              <div className="w-48 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={spending}
                      dataKey="total"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                    >
                      {spending.map((entry, index) => (
                        <Cell key={entry.category} fill={entry.color || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {spending.slice(0, 5).map((item, index) => (
                  <div key={item.category} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.color || COLORS[index % COLORS.length] }}
                      />
                      <span className="text-sm text-gray-600">{item.category}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{item.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-500">
              No expense data available
            </div>
          )}
        </div>

        {/* Monthly trend */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Monthly Trend</h3>
          {trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="label" 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Legend />
                <Bar dataKey="income" name="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-500">
              No trend data available
            </div>
          )}
        </div>
      </div>

      {/* Insights section */}
      {insights.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            <h3 className="text-lg font-semibold text-gray-800">Financial Insights</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insights.map((insight, index) => (
              <InsightCard key={index} insight={insight} />
            ))}
          </div>
        </div>
      )}

      {/* Recent transactions */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Recent Transactions</h3>
          <Link 
            to="/transactions" 
            className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
          >
            View all
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        {recentTransactions.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {recentTransactions.map((transaction) => (
              <div key={`${transaction.type}-${transaction.id}`} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    transaction.type === 'income' 
                      ? 'bg-green-100 text-green-600'
                      : 'bg-red-100 text-red-600'
                  }`}>
                    {transaction.type === 'income' 
                      ? <TrendingUp className="w-4 h-4" />
                      : <TrendingDown className="w-4 h-4" />
                    }
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{transaction.category}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(transaction.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
                <span className={`font-semibold ${
                  transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {transaction.type === 'income' ? '+' : '-'}
                  {formatCurrency(transaction.amount)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-gray-500">
            No transactions yet. Start by adding income or expenses!
          </div>
        )}
      </div>
    </div>
  )
}
