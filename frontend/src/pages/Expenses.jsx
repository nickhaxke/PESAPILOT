import { useState, useEffect } from 'react'
import { 
  Plus, 
  TrendingDown, 
  Edit2, 
  Trash2, 
  X,
  Calendar,
  DollarSign,
  FileText,
  Tag
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

export default function Expenses() {
  const [expenseList, setExpenseList] = useState([])
  const [categories, setCategories] = useState(defaultCategories)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [formData, setFormData] = useState({
    amount: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
    description: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [expenseRes, categoriesRes] = await Promise.all([
        api.get('/expenses'),
        api.get('/expenses/categories')
      ])
      setExpenseList(expenseRes.data.expenses)
      if (categoriesRes.data.categories?.length > 0) {
        setCategories(categoriesRes.data.categories)
      }
    } catch (error) {
      toast.error('Failed to load expense data')
    } finally {
      setLoading(false)
    }
  }

  const openAddModal = () => {
    setEditingItem(null)
    setFormData({
      amount: '',
      category: categories[0]?.name || '',
      date: new Date().toISOString().split('T')[0],
      description: ''
    })
    setShowModal(true)
  }

  const openEditModal = (item) => {
    setEditingItem(item)
    setFormData({
      amount: item.amount.toString(),
      category: item.category,
      date: item.date.split('T')[0],
      description: item.description || ''
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      if (editingItem) {
        await api.put(`/expenses/${editingItem.id}`, formData)
        toast.success('Expense updated successfully')
      } else {
        await api.post('/expenses', formData)
        toast.success('Expense added successfully')
      }
      setShowModal(false)
      fetchData()
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to save expense'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this expense?')) return

    try {
      await api.delete(`/expenses/${id}`)
      toast.success('Expense deleted successfully')
      fetchData()
    } catch (error) {
      toast.error('Failed to delete expense')
    }
  }

  // Filter expenses
  const filteredExpenses = filter 
    ? expenseList.filter(e => e.category === filter)
    : expenseList

  // Calculate total
  const totalExpenses = filteredExpenses.reduce((sum, item) => sum + parseFloat(item.amount), 0)

  // Get category color
  const getCategoryColor = (categoryName) => {
    const cat = categories.find(c => c.name === categoryName)
    return cat?.color || '#C9CBCF'
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="text-gray-600">Track your spending</p>
        </div>
        <button onClick={openAddModal} className="btn btn-primary">
          <Plus className="w-5 h-5 mr-2" />
          Add Expense
        </button>
      </div>

      {/* Summary and filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="card p-6 flex-1">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 rounded-xl">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">
                {filter ? `${filter} Expenses` : 'Total Expenses'}
              </p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalExpenses)}</p>
            </div>
          </div>
        </div>
        <div className="card p-4 sm:p-6">
          <label className="label">Filter by Category</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="input min-w-[200px]"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.name} value={cat.name}>{cat.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Expense list */}
      <div className="card">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Expense History</h3>
        </div>
        {filteredExpenses.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {filteredExpenses.map((item) => (
              <div key={item.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  <div 
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: `${getCategoryColor(item.category)}20` }}
                  >
                    <TrendingDown 
                      className="w-5 h-5"
                      style={{ color: getCategoryColor(item.category) }}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-800">{item.category}</p>
                      <span 
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ 
                          backgroundColor: `${getCategoryColor(item.category)}20`,
                          color: getCategoryColor(item.category)
                        }}
                      >
                        {item.category}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {new Date(item.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                      {item.description && ` • ${item.description}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-red-600">
                    -{formatCurrency(item.amount)}
                  </span>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => openEditModal(item)}
                      className="p-2 text-gray-400 hover:text-primary-600 hover:bg-gray-100 rounded-lg"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(item.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            {filter 
              ? `No expenses in ${filter} category`
              : 'No expense entries yet. Click "Add Expense" to get started!'
            }
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md animate-fade-in">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">
                {editingItem ? 'Edit Expense' : 'Add Expense'}
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
                <label className="label">Amount (TZS)</label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="input pl-12"
                    placeholder="Enter amount"
                    min="1"
                    step="any"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label">Category</label>
                <div className="relative">
                  <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="input pl-12"
                    required
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat.name} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Date</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="input pl-12"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label">Description (Optional)</label>
                <div className="relative">
                  <FileText className="absolute left-4 top-3 w-5 h-5 text-gray-400" />
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="input pl-12 min-h-[80px]"
                    placeholder="Add description..."
                  />
                </div>
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
                  className="btn btn-danger flex-1"
                >
                  {submitting ? <span className="spinner" /> : (editingItem ? 'Update' : 'Add Expense')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
