import { useState, useEffect } from 'react'
import { 
  Plus, 
  TrendingUp, 
  Edit2, 
  Trash2, 
  X,
  Calendar,
  DollarSign,
  FileText
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

const defaultSources = ['Salary', 'Business', 'Freelance', 'Investments', 'Rental', 'Gift', 'Other']

export default function Income() {
  const [incomeList, setIncomeList] = useState([])
  const [sources, setSources] = useState(defaultSources)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [formData, setFormData] = useState({
    amount: '',
    source: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [incomeRes, sourcesRes] = await Promise.all([
        api.get('/income'),
        api.get('/income/sources')
      ])
      setIncomeList(incomeRes.data.income)
      if (sourcesRes.data.sources?.length > 0) {
        setSources(sourcesRes.data.sources)
      }
    } catch (error) {
      toast.error('Failed to load income data')
    } finally {
      setLoading(false)
    }
  }

  const openAddModal = () => {
    setEditingItem(null)
    setFormData({
      amount: '',
      source: sources[0] || '',
      date: new Date().toISOString().split('T')[0],
      notes: ''
    })
    setShowModal(true)
  }

  const openEditModal = (item) => {
    setEditingItem(item)
    setFormData({
      amount: item.amount.toString(),
      source: item.source,
      date: item.date.split('T')[0],
      notes: item.notes || ''
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      if (editingItem) {
        await api.put(`/income/${editingItem.id}`, formData)
        toast.success('Income updated successfully')
      } else {
        await api.post('/income', formData)
        toast.success('Income added successfully')
      }
      setShowModal(false)
      fetchData()
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to save income'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this income entry?')) return

    try {
      await api.delete(`/income/${id}`)
      toast.success('Income deleted successfully')
      fetchData()
    } catch (error) {
      toast.error('Failed to delete income')
    }
  }

  // Calculate total
  const totalIncome = incomeList.reduce((sum, item) => sum + parseFloat(item.amount), 0)

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
          <h1 className="text-2xl font-bold text-gray-900">Income</h1>
          <p className="text-gray-600">Track your income sources</p>
        </div>
        <button onClick={openAddModal} className="btn btn-primary">
          <Plus className="w-5 h-5 mr-2" />
          Add Income
        </button>
      </div>

      {/* Summary card */}
      <div className="card p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-green-100 rounded-xl">
            <TrendingUp className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Income</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalIncome)}</p>
          </div>
        </div>
      </div>

      {/* Income list */}
      <div className="card">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Income History</h3>
        </div>
        {incomeList.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {incomeList.map((item) => (
              <div key={item.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{item.source}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(item.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                      {item.notes && ` • ${item.notes}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-green-600">
                    +{formatCurrency(item.amount)}
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
            No income entries yet. Click "Add Income" to get started!
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md animate-fade-in">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">
                {editingItem ? 'Edit Income' : 'Add Income'}
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
                <label className="label">Source</label>
                <select
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="input"
                  required
                >
                  <option value="">Select source</option>
                  {sources.map((source) => (
                    <option key={source} value={source}>{source}</option>
                  ))}
                </select>
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
                <label className="label">Notes (Optional)</label>
                <div className="relative">
                  <FileText className="absolute left-4 top-3 w-5 h-5 text-gray-400" />
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="input pl-12 min-h-[80px]"
                    placeholder="Add notes..."
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
                  className="btn btn-success flex-1"
                >
                  {submitting ? <span className="spinner" /> : (editingItem ? 'Update' : 'Add Income')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
