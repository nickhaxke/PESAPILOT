import { useState, useEffect } from 'react';
import { Activity, TrendingUp, Shield, PiggyBank, CreditCard, Wallet, Target, Users, Lightbulb, Award } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import api from '../services/api';
import toast from 'react-hot-toast';

function FinancialHealth() {
  const [healthData, setHealthData] = useState(null);
  const [history, setHistory] = useState([]);
  const [insights, setInsights] = useState([]);
  const [community, setCommunity] = useState(null);
  const [tips, setTips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const [scoreRes, historyRes, insightsRes, communityRes, tipsRes] = await Promise.all([
        api.get('/financial-health/score'),
        api.get('/financial-health/history'),
        api.get('/financial-health/insights'),
        api.get('/financial-health/community'),
        api.get('/financial-health/tips')
      ]);
      
      setHealthData(scoreRes.data);
      setHistory(historyRes.data.history);
      setInsights(insightsRes.data.insights);
      setCommunity(communityRes.data);
      setTips(tipsRes.data.tips);
    } catch (error) {
      toast.error('Failed to load financial health data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS', minimumFractionDigits: 0 }).format(amount);
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBackground = (score) => {
    if (score >= 80) return 'from-green-500 to-green-600';
    if (score >= 60) return 'from-yellow-500 to-yellow-600';
    if (score >= 40) return 'from-orange-500 to-orange-600';
    return 'from-red-500 to-red-600';
  };

  const getInsightTypeColor = (type) => {
    const colors = {
      success: 'bg-green-100 border-green-300 text-green-800',
      warning: 'bg-yellow-100 border-yellow-300 text-yellow-800',
      danger: 'bg-red-100 border-red-300 text-red-800',
      info: 'bg-blue-100 border-blue-300 text-blue-800',
      tip: 'bg-purple-100 border-purple-300 text-purple-800'
    };
    return colors[type] || colors.info;
  };

  const radarData = healthData ? [
    { subject: 'Savings', A: healthData.breakdown.savings, fullMark: 100 },
    { subject: 'Spending', A: healthData.breakdown.spending, fullMark: 100 },
    { subject: 'Debt', A: healthData.breakdown.debt, fullMark: 100 },
    { subject: 'Budget', A: healthData.breakdown.budget, fullMark: 100 },
    { subject: 'Stability', A: healthData.breakdown.income_stability, fullMark: 100 }
  ] : [];

  const historyData = history.map(h => ({
    month: `${h.month}/${h.year}`,
    score: h.score
  })).reverse();

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Financial Health</h1>
        <p className="text-gray-500">Your comprehensive financial wellness score</p>
      </div>

      {/* Main Score Card */}
      {healthData && (
        <div className={`bg-gradient-to-r ${getScoreBackground(healthData.score)} rounded-2xl p-6 text-white`}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-white/80 text-sm mb-1">Your Financial Health Score</p>
              <div className="flex items-baseline gap-3">
                <span className="text-6xl font-bold">{healthData.score}</span>
                <span className="text-2xl">/100</span>
              </div>
              <p className="text-xl mt-2 flex items-center gap-2">
                <Award className="w-5 h-5" />
                Grade: {healthData.grade} - {healthData.status}
              </p>
            </div>
            <div className="bg-white/20 backdrop-blur rounded-xl p-4 min-w-[200px]">
              <p className="text-white/80 text-sm mb-2">Score Breakdown</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Savings</span>
                  <span className="font-medium">{healthData.breakdown.savings}/100</span>
                </div>
                <div className="flex justify-between">
                  <span>Spending</span>
                  <span className="font-medium">{healthData.breakdown.spending}/100</span>
                </div>
                <div className="flex justify-between">
                  <span>Debt</span>
                  <span className="font-medium">{healthData.breakdown.debt}/100</span>
                </div>
                <div className="flex justify-between">
                  <span>Budget</span>
                  <span className="font-medium">{healthData.breakdown.budget}/100</span>
                </div>
                <div className="flex justify-between">
                  <span>Stability</span>
                  <span className="font-medium">{healthData.breakdown.income_stability}/100</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {['overview', 'insights', 'community', 'tips'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium capitalize transition ${
              activeTab === tab 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Radar Chart */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4">Score Breakdown</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} />
                  <Radar name="Score" dataKey="A" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.5} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Score History */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4">Score History</h3>
            {historyData.length > 1 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="score" stroke="#3B82F6" strokeWidth={2} dot={{ fill: '#3B82F6' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center text-gray-500">
                <p>Keep using PesaPilot to see your score history over time!</p>
              </div>
            )}
          </div>

          {/* Key Metrics */}
          {healthData?.metrics && (
            <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-gray-600">Monthly Income</span>
                </div>
                <p className="text-xl font-bold">{formatCurrency(healthData.metrics.monthlyIncome)}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-red-600" />
                  <span className="text-sm text-gray-600">Monthly Expenses</span>
                </div>
                <p className="text-xl font-bold">{formatCurrency(healthData.metrics.monthlyExpenses)}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="w-5 h-5 text-orange-600" />
                  <span className="text-sm text-gray-600">Total Debt</span>
                </div>
                <p className="text-xl font-bold">{formatCurrency(healthData.metrics.totalDebt)}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <PiggyBank className="w-5 h-5 text-blue-600" />
                  <span className="text-sm text-gray-600">Savings Rate</span>
                </div>
                <p className="text-xl font-bold">{healthData.metrics.savingsRate}%</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Insights Tab */}
      {activeTab === 'insights' && (
        <div className="space-y-4">
          {insights.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center">
              <Lightbulb className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Add more financial data to receive personalized insights</p>
            </div>
          ) : (
            insights.map((insight, idx) => (
              <div key={idx} className={`rounded-xl p-4 border ${getInsightTypeColor(insight.type)}`}>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {insight.type === 'success' && <Shield className="w-5 h-5" />}
                    {insight.type === 'warning' && <Activity className="w-5 h-5" />}
                    {insight.type === 'danger' && <CreditCard className="w-5 h-5" />}
                    {insight.type === 'info' && <TrendingUp className="w-5 h-5" />}
                    {insight.type === 'tip' && <Lightbulb className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold">{insight.title}</h4>
                    <p className="text-sm mt-1 opacity-90">{insight.message}</p>
                    {insight.action && (
                      <button className="mt-2 text-sm font-medium underline">{insight.action}</button>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${insight.priority === 'high' ? 'bg-red-200 text-red-800' : insight.priority === 'medium' ? 'bg-yellow-200 text-yellow-800' : 'bg-gray-200 text-gray-700'}`}>
                    {insight.priority}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Community Tab */}
      {activeTab === 'community' && community && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Community Comparison ({community.country})</h3>
            </div>
            
            <div className="space-y-4">
              {community.comparison.map((cat, idx) => (
                <div key={idx} className="flex items-center gap-4">
                  <div className="w-32 text-sm font-medium text-gray-700">{cat.category}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex-1 bg-gray-200 rounded-full h-3 relative">
                        <div 
                          className="absolute top-0 left-0 h-3 bg-blue-500 rounded-full"
                          style={{ width: `${Math.min(cat.communityAverage, 100)}%` }}
                        ></div>
                        <div 
                          className={`absolute top-0 left-0 h-3 rounded-full ${cat.status === 'warning' ? 'bg-red-500' : 'bg-green-500'}`}
                          style={{ width: `${Math.min(cat.yourPercentage, 100)}%`, opacity: 0.8 }}
                        ></div>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Community: {cat.communityAverage}%</span>
                      <span className={cat.status === 'warning' ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                        You: {cat.yourPercentage}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <p className="text-xs text-gray-400 mt-4">
              * Based on anonymized data from PesaPilot users in {community.country}
            </p>
          </div>
        </div>
      )}

      {/* Tips Tab */}
      {activeTab === 'tips' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tips.map((tip, idx) => (
            <div key={idx} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Target className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{tip.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{tip.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default FinancialHealth;
