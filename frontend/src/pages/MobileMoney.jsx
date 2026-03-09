import { useState, useEffect } from 'react';
import { Smartphone, ArrowUpRight, ArrowDownLeft, RefreshCw, Search, Filter, MessageSquare, TrendingUp, Clock } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

function MobileMoney() {
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showParseModal, setShowParseModal] = useState(false);
  const [smsText, setSmsText] = useState('');
  const [parsedResult, setParsedResult] = useState(null);
  const [filter, setFilter] = useState({ provider: '', type: '', period: '30' });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchTransactions();
    fetchAccounts();
    fetchInsights();
  }, [filter]);

  const fetchTransactions = async () => {
    try {
      const params = new URLSearchParams();
      if (filter.provider) params.append('provider', filter.provider);
      if (filter.type) params.append('type', filter.type);
      params.append('limit', '100');
      
      const { data } = await api.get(`/mobile-money/transactions?${params}`);
      setTransactions(data.transactions);
    } catch (error) {
      console.error('Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const { data } = await api.get('/mobile-money/accounts');
      setAccounts(data.accounts);
    } catch (error) {
      console.error('Failed to fetch accounts');
    }
  };

  const fetchInsights = async () => {
    try {
      const { data } = await api.get('/mobile-money/insights');
      setInsights(data);
    } catch (error) {
      console.error('Failed to fetch insights');
    }
  };

  const handleParseSMS = async () => {
    if (!smsText.trim()) {
      toast.error('Please enter SMS text');
      return;
    }
    
    try {
      const { data } = await api.post('/mobile-money/parse', { smsText: smsText.trim() });
      if (data.success) {
        setParsedResult(data.transaction);
        toast.success('SMS parsed successfully!');
        fetchTransactions();
        fetchInsights();
      } else {
        toast.error('Could not parse this SMS format');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to parse SMS');
    }
  };

  const handleBulkParse = async () => {
    const messages = smsText.split('\n\n').filter(m => m.trim());
    if (messages.length === 0) {
      toast.error('Please enter SMS messages');
      return;
    }

    try {
      const { data } = await api.post('/mobile-money/parse/bulk', { messages });
      toast.success(`Parsed ${data.successCount} of ${data.totalReceived} messages`);
      setSmsText('');
      setParsedResult(null);
      setShowParseModal(false);
      fetchTransactions();
      fetchInsights();
    } catch (error) {
      toast.error('Failed to parse messages');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS', minimumFractionDigits: 0 }).format(amount);
  };

  const getProviderLogo = (provider) => {
    const logos = {
      'M-Pesa': '🟢',
      'Airtel': '🔴',
      'TigoPesa': '🔵',
      'Unknown': '⚪'
    };
    return logos[provider] || '⚪';
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'received':
      case 'deposit':
        return <ArrowDownLeft className="w-4 h-4 text-green-600" />;
      case 'sent':
      case 'payment':
      case 'withdrawal':
        return <ArrowUpRight className="w-4 h-4 text-red-600" />;
      default:
        return <RefreshCw className="w-4 h-4 text-gray-600" />;
    }
  };

  const filteredTransactions = transactions.filter(tx => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        tx.merchant?.toLowerCase().includes(search) ||
        tx.reference?.toLowerCase().includes(search) ||
        tx.category?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mobile Money</h1>
          <p className="text-gray-500">Track M-Pesa, Airtel Money & Tigo Pesa transactions</p>
        </div>
        <button
          onClick={() => setShowParseModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <MessageSquare className="w-5 h-5" /> Parse SMS
        </button>
      </div>

      {/* Accounts Overview */}
      {accounts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {accounts.map(acc => (
            <div key={acc.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{getProviderLogo(acc.provider)}</span>
                <div>
                  <p className="font-medium text-gray-900">{acc.provider}</p>
                  <p className="text-sm text-gray-500">{acc.phone_number}</p>
                </div>
              </div>
              {acc.balance && (
                <p className="mt-2 text-lg font-bold text-gray-900">{formatCurrency(acc.balance)}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Insights Summary */}
      {insights && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <ArrowDownLeft className="w-5 h-5 text-green-600" />
              <span className="text-sm text-green-700">Total Received</span>
            </div>
            <p className="text-xl font-bold text-green-800">{formatCurrency(insights.totalReceived || 0)}</p>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
            <div className="flex items-center gap-2 mb-2">
              <ArrowUpRight className="w-5 h-5 text-red-600" />
              <span className="text-sm text-red-700">Total Sent</span>
            </div>
            <p className="text-xl font-bold text-red-800">{formatCurrency(insights.totalSent || 0)}</p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-blue-700">Transactions</span>
            </div>
            <p className="text-xl font-bold text-blue-800">{insights.transactionCount || 0}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
            <div className="flex items-center gap-2 mb-2">
              <Smartphone className="w-5 h-5 text-purple-600" />
              <span className="text-sm text-purple-700">Top Merchant</span>
            </div>
            <p className="text-lg font-bold text-purple-800 truncate">{insights.topMerchant || 'N/A'}</p>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <select
            value={filter.provider}
            onChange={(e) => setFilter({...filter, provider: e.target.value})}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Providers</option>
            <option value="M-Pesa">M-Pesa</option>
            <option value="Airtel">Airtel Money</option>
            <option value="TigoPesa">Tigo Pesa</option>
          </select>
          <select
            value={filter.type}
            onChange={(e) => setFilter({...filter, type: e.target.value})}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            <option value="received">Received</option>
            <option value="sent">Sent</option>
            <option value="payment">Payments</option>
            <option value="withdrawal">Withdrawals</option>
          </select>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h3 className="font-medium text-gray-900">Recent Transactions</h3>
        </div>
        
        {filteredTransactions.length === 0 ? (
          <div className="p-8 text-center">
            <Smartphone className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No transactions found</p>
            <button onClick={() => setShowParseModal(true)} className="mt-3 text-blue-600 hover:underline">
              Parse SMS to add transactions
            </button>
          </div>
        ) : (
          <div className="divide-y">
            {filteredTransactions.map(tx => (
              <div key={tx.id} className="p-4 hover:bg-gray-50 transition">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${tx.transaction_type === 'received' || tx.transaction_type === 'deposit' ? 'bg-green-100' : 'bg-red-100'}`}>
                      {getTransactionIcon(tx.transaction_type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getProviderLogo(tx.provider)}</span>
                        <p className="font-medium text-gray-900">{tx.merchant || tx.sender || tx.recipient || tx.transaction_type}</p>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="w-3 h-3" />
                        {new Date(tx.transaction_date).toLocaleString()}
                        {tx.category && (
                          <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{tx.category}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${tx.transaction_type === 'received' || tx.transaction_type === 'deposit' ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.transaction_type === 'received' || tx.transaction_type === 'deposit' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </p>
                    {tx.balance_after && (
                      <p className="text-xs text-gray-500">Bal: {formatCurrency(tx.balance_after)}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Parse SMS Modal */}
      {showParseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg p-6">
            <h2 className="text-xl font-bold mb-4">Parse Mobile Money SMS</h2>
            <p className="text-sm text-gray-500 mb-4">
              Paste your M-Pesa, Airtel Money, or Tigo Pesa SMS messages below. For multiple messages, separate them with a blank line.
            </p>
            
            <textarea
              value={smsText}
              onChange={(e) => setSmsText(e.target.value)}
              placeholder="Example: Confirmed. Ksh5,000 received from JOHN DOE 0722123456 on 15/3/24 at 2:30 PM. New M-PESA balance is Ksh12,500. Transaction code: QA12BC34DE"
              className="w-full h-40 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            />

            {parsedResult && (
              <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm font-medium text-green-800 mb-2">Parsed Successfully!</p>
                <div className="text-sm text-green-700 space-y-1">
                  <p>Provider: {parsedResult.provider}</p>
                  <p>Type: {parsedResult.type}</p>
                  <p>Amount: {formatCurrency(parsedResult.amount)}</p>
                  {parsedResult.merchant && <p>Merchant: {parsedResult.merchant}</p>}
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => { setShowParseModal(false); setSmsText(''); setParsedResult(null); }}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleParseSMS}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Parse Single
              </button>
              <button
                onClick={handleBulkParse}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Parse All
              </button>
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-700">
                <strong>Tip:</strong> Copy SMS directly from your phone's message app. We support M-Pesa (Kenya/Tanzania), Airtel Money, and Tigo Pesa formats.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MobileMoney;
