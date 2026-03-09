import { useState, useEffect } from 'react'
import { 
  Plus, 
  Wallet, 
  Edit2, 
  Trash2, 
  X,
  DollarSign,
  Tag,
  AlertTriangle,
  CheckCircle,
  Copy
} from 'lucide-react'
import api from '../services/api'
import toast from 'react-hot-toast'

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency: 'TZS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const defaultCategories = [
  { name: 'Food', color: '#FF6384' },
  { name: 'Transport', color: '#36A2EB' },
  { name: 'Rent', color: '#FFCE56' },
  { name: 'Bills', color: '#4BC0C0' },
  { name: 'Entertainment', color: '#9966FF' },
  { name: 'Shopping', color: '#FF9F40' },
  { name: 'Health', color: '#FF6384' },
  { name: 'Education', color: '#36A2EB' },
  { name: 'Other', color: '#C9CBCF' }
]

function BudgetCard({ budget, onEdit, onDelete, getCategoryColor }) {
  const percentage = budget.percentage || 0
  const isOver = percentage >= 100
  const isWarning = percentage >= 80 && percentage < 100

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div 
            className="p-2 rounded-lg"
            style={{ backgroundColor: `${getCategoryColor(budget.category)}20` }}
          >
            <Wallet 
              className="w-5 h-5"
              style={{ color: getCategoryColor(budget.category) }}
            />
          </div>
          <div>
            <h4 className="font-semibold text-gray-800">{budget.category}</h4>
            <p className="text-sm text-gray-500">Monthly Budget</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={onEdit}
            className="p-2 text-gray-400 hover:text-primary-600 hover:bg-gray-100 rounded-lg"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button 
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-300 ${
              isOver ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm">
        <div>
          <span className="text-gray-500">Spent: </span>
          <span className={`font-semibold ${isOver ? 'text-red-600' : 'text-gray-800'}`}>
            {formatCurrency(budget.spent_amount)}
          </span>
        </div>
        <div>
          <span className="text-gray-500">Budget: </span>
          <span className="font-semibold text-gray-800">
            {formatCurrency(budget.budget_amount)}
          </span>
        </div>
      </div>

      {/* Status */}
      <div className={`mt-3 flex items-center gap-2 text-sm ${
        isOver ? 'text-red-600' : isWarning ? 'text-yellow-600' : 'text-green-600'
      }`}>
        {isOver ? (
          <>
            <AlertTriangle className="w-4 h-4" />
            <span>Over budget by {formatCurrency(Math.abs(budget.remaining))}</span>
          </>
        ) : isWarning ? (
          <>
            <AlertTriangle className="w-4 h-4" />
            <span>{percentage}% used - {formatCurrency(budget.remaining)} remaining</span>
          </>
        ) : (
          <>
            <CheckCircle className="w-4 h-4" />
            <span>{percentage}% used - {formatCurrency(budget.remaining)} remaining</span>
          </>
        )}
      </div>
    </div>
  )
}

export default function Budgets() {
  const currentDate = new Date()
  const [budgets, setBudgets] = useState([])
  const [categories, setCategories] = useState(defaultCategories)
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear())
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [formData, setFormData] = useState({
    category: '',
    amount: ''
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchData()
  }, [selectedMonth, selectedYear])

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const res = await api.get('/expenses/categories')
      if (res.data.categories?.length > 0) {
        setCategories(res.data.categories)
      }
    } catch (error) {
      // Use defaults
    }
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/budgets?month=${selectedMonth}&year=${selectedYear}`)
      setBudgets(res.data.budgets)
    } catch (error) {
      toast.error('Failed to load budgets')
    } finally {
      setLoading(false)
    }
  }

  const openAddModal = () => {
    // Filter out categories that already have budgets
    const existingCategories = budgets.map(b => b.category)
    const availableCategories = categories.filter(c => !existingCategories.includes(c.name))
    
    if (availableCategories.length === 0) {
      toast.error('All categories already have budgets for this month')
      return
    }

    setEditingItem(null)
    setFormData({
      category: availableCategories[0]?.name || '',
      amount: ''
    })
    setShowModal(true)
  }

  const openEditModal = (budget) => {
    setEditingItem(budget)
    setFormData({
      category: budget.category,
      amount: budget.budget_amount.toString()
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      await api.post('/budgets', {
        ...formData,
        month: selectedMonth,
        year: selectedYear
      })
      toast.success(editingItem ? 'Budget updated successfully' : 'Budget created successfully')
      setShowModal(false)
      fetchData()
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to save budget'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this budget?')) return

    try {
      await api.delete(`/budgets/${id}`)
      toast.success('Budget deleted successfully')
      fetchData()
    } catch (error) {
      toast.error('Failed to delete budget')
    }
  }

  const handleCopyFromPrevious = async () => {
    const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1
    const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear

    try {
      await api.post('/budgets/copy', {
        fromMonth: prevMonth,
        fromYear: prevYear,
        toMonth: selectedMonth,
        toYear: selectedYear
      })
      toast.success('Budgets copied from previous month')
      fetchData()
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to copy budgets'
      toast.error(message)
    }
  }

  const getCategoryColor = (categoryName) => {
    const cat = categories.find(c => c.name === categoryName)
    return cat?.color || '#C9CBCF'
  }

  // Calculate totals
  const totalBudget = budgets.reduce((sum, b) => sum + parseFloat(b.budget_amount), 0)
  const totalSpent = budgets.reduce((sum, b) => sum + parseFloat(b.spent_amount), 0)
  const overallPercentage = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0

  // Generate year options
  const years = []
  for (let y = currentDate.getFullYear() - 2; y <= currentDate.getFullYear() + 1; y++) {
    years.push(y)
  }

  // Get available categories for adding new budget
  const existingCategories = budgets.map(b => b.category)
  const availableCategories = categories.filter(c => 
    editingItem ? true : !existingCategories.includes(c.name)
  )

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Budgets</h1>
          <p className="text-gray-600">Set and track your monthly budgets</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleCopyFromPrevious}
            className="btn btn-secondary"
            title="Copy budgets from previous month"
          >
            <Copy className="w-5 h-5 sm:mr-2" />
            <span className="hidden sm:inline">Copy Previous</span>
          </button>
          <button onClick={openAddModal} className="btn btn-primary">
            <Plus className="w-5 h-5 mr-2" />
            Add Budget
          </button>
        </div>
      </div>

      {/* Month/Year selector */}
      <div className="card p-4 flex flex-wrap items-center gap-4">
        <div>
          <label className="label">Month</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="input"
          >
            {months.map((month, index) => (
              <option key={month} value={index + 1}>{month}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Year</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="input"
          >
            {years.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 flex justify-end">
          <div className="text-right">
            <p className="text-sm text-gray-500">Total Budget Usage</p>
            <p className={`text-2xl font-bold ${
              overallPercentage >= 100 ? 'text-red-600' : 
              overallPercentage >= 80 ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {overallPercentage}%
            </p>
            <p className="text-sm text-gray-500">
              {formatCurrency(totalSpent)} of {formatCurrency(totalBudget)}
            </p>
          </div>
        </div>
      </div>

      {/* Budget cards */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="spinner text-primary-600" />
        </div>
      ) : budgets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.map((budget) => (
            <BudgetCard
              key={budget.id}
              budget={budget}
              onEdit={() => openEditModal(budget)}
              onDelete={() => handleDelete(budget.id)}
              getCategoryColor={getCategoryColor}
            />
          ))}
        </div>
      ) : (
        <div className="card p-8 text-center">
          <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">No budgets set</h3>
          <p className="text-gray-500 mb-4">
            Set budgets for different categories to track your spending
          </p>
          <button onClick={openAddModal} className="btn btn-primary">
            <Plus className="w-5 h-5 mr-2" />
            Add Your First Budget
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md animate-fade-in">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">
                {editingItem ? 'Edit Budget' : 'Add Budget'}
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="label">Category</label>
                <div className="relative">
                  <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="input pl-12"
                    required
                    disabled={editingItem}
                  >
                    <option value="">Select category</option>
                    {(editingItem ? categories : availableCategories).map((cat) => (
                      <option key={cat.name} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Budget Amount (TZS)</label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="input pl-12"
                    placeholder="Enter budget amount"
                    min="1"
                    step="any"
                    required
                  />
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                <p>This budget will be set for <strong>{months[selectedMonth - 1]} {selectedYear}</strong></p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary flex-1"
                >
                  {submitting ? <span className="spinner" /> : (editingItem ? 'Update' : 'Create Budget')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
