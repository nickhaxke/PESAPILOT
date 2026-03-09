import { useState, useEffect } from 'react'
import { 
  Search, 
  Filter,
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Download,
  ChevronLeft,
  ChevronRight
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

export default function Transactions() {
  const [transactions, setTransactions] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    type: '',
    startDate: '',
    endDate: '',
    search: ''
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 0
  })

  useEffect(() => {
    fetchTransactions()
  }, [filters, pagination.page])

  const fetchTransactions = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...(filters.type && { type: filters.type }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
        ...(filters.search && { search: filters.search })
      })

      const [transRes, summaryRes] = await Promise.all([
        api.get(`/transactions?${params}`),
        api.get(`/transactions/summary?${params}`)
      ])

      setTransactions(transRes.data.transactions)
      setPagination(prev => ({
        ...prev,
        total: transRes.data.pagination.total,
        totalPages: transRes.data.pagination.totalPages
      }))
      setSummary(summaryRes.data.summary)
    } catch (error) {
      toast.error('Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const clearFilters = () => {
    setFilters({ type: '', startDate: '', endDate: '', search: '' })
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        ...(filters.type && { type: filters.type }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate })
      })

      const res = await api.get(`/transactions/export?${params}`)
      
      // Download CSV
      const blob = new Blob([res.data.csv], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `pesapilot-transactions-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
      
      toast.success('Transactions exported successfully')
    } catch (error) {
      toast.error('Failed to export transactions')
    }
  }

  const hasFilters = filters.type || filters.startDate || filters.endDate || filters.search

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="text-gray-600">View all your income and expenses</p>
        </div>
        <button onClick={handleExport} className="btn btn-secondary">
          <Download className="w-5 h-5 mr-2" />
          Export CSV
        </button>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Income</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(summary.totalIncome)}</p>
                <p className="text-xs text-gray-400">{summary.incomeCount} transactions</p>
              </div>
            </div>
          </div>
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <TrendingDown className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Expenses</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(summary.totalExpenses)}</p>
                <p className="text-xs text-gray-400">{summary.expenseCount} transactions</p>
              </div>
            </div>
          </div>
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${summary.netBalance >= 0 ? 'bg-blue-100' : 'bg-yellow-100'}`}>
                <TrendingUp className={`w-5 h-5 ${summary.netBalance >= 0 ? 'text-blue-600' : 'text-yellow-600'}`} />
              </div>
              <div>
                <p className="text-sm text-gray-500">Net Balance</p>
                <p className={`text-xl font-bold ${summary.netBalance >= 0 ? 'text-blue-600' : 'text-yellow-600'}`}>
                  {formatCurrency(summary.netBalance)}
                </p>
                <p className="text-xs text-gray-400">Income - Expenses</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap items-end gap-3">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <label className="label">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="input pl-10"
                placeholder="Search transactions..."
              />
            </div>
          </div>

          {/* Type filter */}
          <div className="w-36">
            <label className="label">Type</label>
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="input"
            >
              <option value="">All</option>
              <option value="income">Income</option>
              <option value="expense">Expenses</option>
            </select>
          </div>

          {/* Date range */}
          <div className="w-40">
            <label className="label">From</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="input pl-10"
              />
            </div>
          </div>

          <div className="w-40">
            <label className="label">To</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="input pl-10"
              />
            </div>
          </div>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="btn btn-secondary"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Transactions list */}
      <div className="card">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">
            All Transactions
            {hasFilters && <span className="text-sm font-normal text-gray-500 ml-2">(filtered)</span>}
          </h3>
          <span className="text-sm text-gray-500">{pagination.total} total</span>
        </div>

        {loading ? (
          <div className="p-8 flex items-center justify-center">
            <div className="spinner text-primary-600" />
          </div>
        ) : transactions.length > 0 ? (
          <>
            {/* Mobile view */}
            <div className="divide-y divide-gray-100 md:hidden">
              {transactions.map((t) => (
                <div key={`${t.type}-${t.id}`} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      t.type === 'income' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {t.type === 'income' 
                        ? <TrendingUp className="w-4 h-4 text-green-600" />
                        : <TrendingDown className="w-4 h-4 text-red-600" />
                      }
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{t.category}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(t.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                  <span className={`font-semibold ${
                    t.type === 'income' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                  </span>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-500 bg-gray-50">
                    <th className="px-6 py-3 font-medium">Type</th>
                    <th className="px-6 py-3 font-medium">Category/Source</th>
                    <th className="px-6 py-3 font-medium">Date</th>
                    <th className="px-6 py-3 font-medium">Description</th>
                    <th className="px-6 py-3 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.map((t) => (
                    <tr key={`${t.type}-${t.id}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 text-sm font-medium px-2.5 py-1 rounded-full ${
                          t.type === 'income' 
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {t.type === 'income' 
                            ? <TrendingUp className="w-3.5 h-3.5" />
                            : <TrendingDown className="w-3.5 h-3.5" />
                          }
                          {t.type === 'income' ? 'Income' : 'Expense'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-800">{t.category}</td>
                      <td className="px-6 py-4 text-gray-500">
                        {new Date(t.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 text-gray-500 truncate max-w-[200px]">
                        {t.description || '-'}
                      </td>
                      <td className={`px-6 py-4 text-right font-semibold ${
                        t.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="p-4 border-t border-gray-100 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Page {pagination.page} of {pagination.totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                    disabled={pagination.page === 1}
                    className="btn btn-secondary py-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                    disabled={pagination.page === pagination.totalPages}
                    className="btn btn-secondary py-2"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="p-8 text-center text-gray-500">
            {hasFilters 
              ? 'No transactions match your filters'
              : 'No transactions yet'}
          </div>
        )}
      </div>
    </div>
  )
}
