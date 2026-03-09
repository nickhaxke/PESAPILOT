import { useState, useEffect } from 'react';
import { Plus, CreditCard, TrendingDown, Calendar, AlertTriangle, Edit2, Trash2, Banknote } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

function Debts() {
  const [debts, setDebts] = useState([]);
  const [summary, setSummary] = useState({ totalDebts: 0, totalOwed: 0, overdueCount: 0, thisMonthPayments: 0 });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    creditor: '',
    original_amount: '',
    current_balance: '',
    interest_rate: '',
    minimum_payment: '',
    due_date: '',
    category: 'personal_loan'
  });
  const [paymentAmount, setPaymentAmount] = useState('');

  const debtCategories = ['personal_loan', 'credit_card', 'mobile_loan', 'business_loan', 'mortgage', 'vehicle_loan', 'student_loan', 'other'];

  useEffect(() => {
    fetchDebts();
    fetchSummary();
  }, []);

  const fetchDebts = async () => {
    try {
      const { data } = await api.get('/debts');
      setDebts(data.debts);
    } catch (error) {
      toast.error('Failed to fetch debts');
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const { data } = await api.get('/debts/summary/stats');
      setSummary(data);
    } catch (error) {
      console.error('Failed to fetch summary');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedDebt) {
        await api.put(`/debts/${selectedDebt.id}`, formData);
        toast.success('Debt updated successfully');
      } else {
        await api.post('/debts', formData);
        toast.success('Debt added successfully');
      }
      setShowModal(false);
      resetForm();
      fetchDebts();
      fetchSummary();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save debt');
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/debts/${selectedDebt.id}/payment`, { amount: parseFloat(paymentAmount) });
      toast.success('Payment recorded successfully');
      setShowPaymentModal(false);
      setPaymentAmount('');
      fetchDebts();
      fetchSummary();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to record payment');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this debt record?')) return;
    try {
      await api.delete(`/debts/${id}`);
      toast.success('Debt deleted successfully');
      fetchDebts();
      fetchSummary();
    } catch (error) {
      toast.error('Failed to delete debt');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', creditor: '', original_amount: '', current_balance: '', interest_rate: '', minimum_payment: '', due_date: '', category: 'personal_loan' });
    setSelectedDebt(null);
  };

  const openEditModal = (debt) => {
    setSelectedDebt(debt);
    setFormData({
      name: debt.name,
      creditor: debt.creditor || '',
      original_amount: debt.original_amount,
      current_balance: debt.current_balance,
      interest_rate: debt.interest_rate || '',
      minimum_payment: debt.minimum_payment || '',
      due_date: debt.due_date ? debt.due_date.split('T')[0] : '',
      category: debt.category
    });
    setShowModal(true);
  };

  const openPaymentModal = (debt) => {
    setSelectedDebt(debt);
    setPaymentAmount(debt.minimum_payment || '');
    setShowPaymentModal(true);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS', minimumFractionDigits: 0 }).format(amount);
  };

  const formatCategoryName = (category) => {
    return category.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const getCategoryColor = (category) => {
    const colors = {
      personal_loan: 'bg-blue-100 text-blue-700',
      credit_card: 'bg-purple-100 text-purple-700',
      mobile_loan: 'bg-green-100 text-green-700',
      business_loan: 'bg-orange-100 text-orange-700',
      mortgage: 'bg-red-100 text-red-700',
      vehicle_loan: 'bg-yellow-100 text-yellow-700',
      student_loan: 'bg-indigo-100 text-indigo-700',
      other: 'bg-gray-100 text-gray-700'
    };
    return colors[category] || colors.other;
  };

  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Debt Management</h1>
          <p className="text-gray-500">Track and manage your loans and debts</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5" /> Add Debt
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg"><CreditCard className="w-5 h-5 text-blue-600" /></div>
            <div>
              <p className="text-sm text-gray-500">Active Debts</p>
              <p className="text-xl font-bold">{summary.totalDebts}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg"><TrendingDown className="w-5 h-5 text-red-600" /></div>
            <div>
              <p className="text-sm text-gray-500">Total Owed</p>
              <p className="text-xl font-bold text-red-600">{formatCurrency(summary.totalOwed)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg"><AlertTriangle className="w-5 h-5 text-orange-600" /></div>
            <div>
              <p className="text-sm text-gray-500">Overdue</p>
              <p className="text-xl font-bold text-orange-600">{summary.overdueCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg"><Banknote className="w-5 h-5 text-green-600" /></div>
            <div>
              <p className="text-sm text-gray-500">Paid This Month</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(summary.thisMonthPayments)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Debts List */}
      {debts.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center">
          <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700">No debts recorded</h3>
          <p className="text-gray-500 mb-4">Track your loans and debts to manage your financial health</p>
          <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg">Add Debt</button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Debt</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Category</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Balance</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Original</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Progress</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Due Date</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {debts.map(debt => (
                  <tr key={debt.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{debt.name}</p>
                        {debt.creditor && <p className="text-sm text-gray-500">{debt.creditor}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(debt.category)}`}>
                        {formatCategoryName(debt.category)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right font-medium text-red-600">
                      {formatCurrency(debt.current_balance)}
                    </td>
                    <td className="px-4 py-4 text-right text-gray-600">
                      {formatCurrency(debt.original_amount)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full" 
                            style={{ width: `${debt.paid_percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-500">{debt.paid_percentage}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      {debt.due_date ? (
                        <span className={`flex items-center justify-center gap-1 text-sm ${isOverdue(debt.due_date) ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                          {isOverdue(debt.due_date) && <AlertTriangle className="w-4 h-4" />}
                          {new Date(debt.due_date).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openPaymentModal(debt)}
                          className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200 transition"
                        >
                          Pay
                        </button>
                        <button onClick={() => openEditModal(debt)} className="p-1 text-gray-600 hover:bg-gray-100 rounded">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(debt.id)} className="p-1 text-red-600 hover:bg-red-100 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Debt Payoff Strategy Tip */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
        <h3 className="font-semibold text-blue-900 mb-2">💡 Debt Payoff Strategy</h3>
        <p className="text-sm text-blue-800">
          <strong>Snowball Method:</strong> Pay off smallest debts first for quick wins. 
          <strong className="ml-2">Avalanche Method:</strong> Pay highest interest debts first to save money long-term.
        </p>
      </div>

      {/* Add/Edit Debt Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{selectedDebt ? 'Edit Debt' : 'Add New Debt'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Debt Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., M-Shwari Loan"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Creditor/Lender</label>
                  <input
                    type="text"
                    value={formData.creditor}
                    onChange={(e) => setFormData({...formData, creditor: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Safaricom"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {debtCategories.map(cat => (
                      <option key={cat} value={cat}>{formatCategoryName(cat)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Original Amount (TZS)</label>
                  <input
                    type="number"
                    value={formData.original_amount}
                    onChange={(e) => setFormData({...formData, original_amount: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="500,000"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Balance (TZS)</label>
                  <input
                    type="number"
                    value={formData.current_balance}
                    onChange={(e) => setFormData({...formData, current_balance: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="350,000"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Interest Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.interest_rate}
                    onChange={(e) => setFormData({...formData, interest_rate: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="7.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min. Monthly Payment</label>
                  <input
                    type="number"
                    value={formData.minimum_payment}
                    onChange={(e) => setFormData({...formData, minimum_payment: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="50,000"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{selectedDebt ? 'Update' : 'Add Debt'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedDebt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-6">
            <h2 className="text-xl font-bold mb-2">Make Payment</h2>
            <p className="text-sm text-gray-500 mb-1">{selectedDebt.name}</p>
            <p className="text-sm text-gray-600 mb-4">Balance: <span className="font-medium text-red-600">{formatCurrency(selectedDebt.current_balance)}</span></p>
            <form onSubmit={handlePayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Amount (TZS)</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="Enter amount"
                  max={selectedDebt.current_balance}
                  required
                />
                {selectedDebt.minimum_payment && (
                  <p className="text-xs text-gray-500 mt-1">Minimum payment: {formatCurrency(selectedDebt.minimum_payment)}</p>
                )}
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowPaymentModal(false)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Record Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Debts;
