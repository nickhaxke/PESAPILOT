import { useState, useEffect } from 'react';
import { Plus, Target, TrendingUp, Calendar, DollarSign, Edit2, Trash2, PiggyBank } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

function SavingsGoals() {
  const [goals, setGoals] = useState([]);
  const [summary, setSummary] = useState({ totalGoals: 0, totalSaved: 0, totalTarget: 0, monthlySavings: 0 });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    target_amount: '',
    current_amount: '',
    deadline: '',
    priority: 'medium',
    category: 'general'
  });
  const [contributeAmount, setContributeAmount] = useState('');

  const categories = ['emergency', 'vacation', 'education', 'vehicle', 'property', 'business', 'retirement', 'general'];
  const priorities = ['low', 'medium', 'high'];

  useEffect(() => {
    fetchGoals();
    fetchSummary();
  }, []);

  const fetchGoals = async () => {
    try {
      const { data } = await api.get('/savings');
      setGoals(data.goals);
    } catch (error) {
      toast.error('Failed to fetch savings goals');
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const { data } = await api.get('/savings/summary/stats');
      setSummary(data);
    } catch (error) {
      console.error('Failed to fetch summary');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedGoal) {
        await api.put(`/savings/${selectedGoal.id}`, formData);
        toast.success('Goal updated successfully');
      } else {
        await api.post('/savings', formData);
        toast.success('Goal created successfully');
      }
      setShowModal(false);
      resetForm();
      fetchGoals();
      fetchSummary();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save goal');
    }
  };

  const handleContribute = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/savings/${selectedGoal.id}/contribute`, { amount: parseFloat(contributeAmount) });
      toast.success('Contribution added successfully');
      setShowContributeModal(false);
      setContributeAmount('');
      fetchGoals();
      fetchSummary();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to add contribution');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this goal?')) return;
    try {
      await api.delete(`/savings/${id}`);
      toast.success('Goal deleted successfully');
      fetchGoals();
      fetchSummary();
    } catch (error) {
      toast.error('Failed to delete goal');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', target_amount: '', current_amount: '', deadline: '', priority: 'medium', category: 'general' });
    setSelectedGoal(null);
  };

  const openEditModal = (goal) => {
    setSelectedGoal(goal);
    setFormData({
      name: goal.name,
      target_amount: goal.target_amount,
      current_amount: goal.current_amount,
      deadline: goal.deadline?.split('T')[0] || '',
      priority: goal.priority,
      category: goal.category
    });
    setShowModal(true);
  };

  const openContributeModal = (goal) => {
    setSelectedGoal(goal);
    setShowContributeModal(true);
  };

  const getProgressColor = (progress) => {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 75) return 'bg-blue-500';
    if (progress >= 50) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS', minimumFractionDigits: 0 }).format(amount);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Savings Goals</h1>
          <p className="text-gray-500">Track your progress towards financial goals</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5" /> New Goal
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg"><Target className="w-5 h-5 text-blue-600" /></div>
            <div>
              <p className="text-sm text-gray-500">Active Goals</p>
              <p className="text-xl font-bold">{summary.totalGoals}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg"><PiggyBank className="w-5 h-5 text-green-600" /></div>
            <div>
              <p className="text-sm text-gray-500">Total Saved</p>
              <p className="text-xl font-bold">{formatCurrency(summary.totalSaved)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg"><DollarSign className="w-5 h-5 text-purple-600" /></div>
            <div>
              <p className="text-sm text-gray-500">Total Target</p>
              <p className="text-xl font-bold">{formatCurrency(summary.totalTarget)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg"><TrendingUp className="w-5 h-5 text-orange-600" /></div>
            <div>
              <p className="text-sm text-gray-500">Monthly Savings</p>
              <p className="text-xl font-bold">{formatCurrency(summary.monthlySavings)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Goals Grid */}
      {goals.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center">
          <PiggyBank className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700">No savings goals yet</h3>
          <p className="text-gray-500 mb-4">Start by creating your first savings goal</p>
          <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg">Create Goal</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map(goal => (
            <div key={goal.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{goal.name}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(goal.priority)}`}>
                    {goal.priority} priority
                  </span>
                </div>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{goal.category}</span>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500">Progress</span>
                  <span className="font-medium">{goal.progress_percentage?.toFixed(1) || 0}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className={`h-2 rounded-full ${getProgressColor(goal.progress_percentage || 0)}`} style={{ width: `${Math.min(goal.progress_percentage || 0, 100)}%` }}></div>
                </div>
              </div>

              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-500">Saved</span>
                  <span className="font-medium text-green-600">{formatCurrency(goal.current_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Target</span>
                  <span className="font-medium">{formatCurrency(goal.target_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Remaining</span>
                  <span className="font-medium text-orange-600">{formatCurrency(goal.remaining_amount || 0)}</span>
                </div>
                {goal.deadline && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Deadline</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(goal.deadline).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => openContributeModal(goal)}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm hover:bg-green-700 transition"
                >
                  + Add Savings
                </button>
                <button
                  onClick={() => openEditModal(goal)}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(goal.id)}
                  className="p-2 text-red-600 hover:bg-red-100 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Goal Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">{selectedGoal ? 'Edit Goal' : 'New Savings Goal'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Goal Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Emergency Fund"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Amount (TZS)</label>
                  <input
                    type="number"
                    value={formData.target_amount}
                    onChange={(e) => setFormData({...formData, target_amount: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="1,000,000"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Savings</label>
                  <input
                    type="number"
                    value={formData.current_amount}
                    onChange={(e) => setFormData({...formData, current_amount: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {priorities.map(pri => (
                      <option key={pri} value={pri}>{pri.charAt(0).toUpperCase() + pri.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deadline (Optional)</label>
                <input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({...formData, deadline: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{selectedGoal ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contribute Modal */}
      {showContributeModal && selectedGoal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-6">
            <h2 className="text-xl font-bold mb-2">Add to {selectedGoal.name}</h2>
            <p className="text-sm text-gray-500 mb-4">Current: {formatCurrency(selectedGoal.current_amount)} / {formatCurrency(selectedGoal.target_amount)}</p>
            <form onSubmit={handleContribute} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (TZS)</label>
                <input
                  type="number"
                  value={contributeAmount}
                  onChange={(e) => setContributeAmount(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="Enter amount"
                  required
                />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowContributeModal(false)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default SavingsGoals;
