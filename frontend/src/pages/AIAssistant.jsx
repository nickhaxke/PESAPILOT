import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  PaperAirplaneIcon,
  SparklesIcon,
  LightBulbIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  AcademicCapIcon,
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  BanknotesIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';

export default function AIAssistant() {
  const [activeTab, setActiveTab] = useState('chat');
  const [diagnosis, setDiagnosis] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [coaching, setCoaching] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  const API_URL = 'http://localhost:5000/api';

  useEffect(() => {
    fetchDiagnosis();
    fetchRecommendations();
    fetchAlerts();
    fetchCoaching();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  });

  const fetchDiagnosis = async () => {
    try {
      const res = await fetch(`${API_URL}/ai/diagnosis`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setDiagnosis(data);
    } catch (error) {
      console.error('Failed to fetch diagnosis:', error);
    }
  };

  const fetchRecommendations = async () => {
    try {
      const res = await fetch(`${API_URL}/ai/recommendations`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setRecommendations(data.recommendations);
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
    }
  };

  const fetchAlerts = async () => {
    try {
      const res = await fetch(`${API_URL}/ai/alerts`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setAlerts(data.alerts);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    }
  };

  const fetchCoaching = async () => {
    try {
      const res = await fetch(`${API_URL}/ai/coaching`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setCoaching(data);
    } catch (error) {
      console.error('Failed to fetch coaching:', error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim() || chatLoading) return;

    const userMessage = message.trim();
    setChatHistory((prev) => [...prev, { type: 'user', content: userMessage }]);
    setMessage('');
    setChatLoading(true);

    try {
      const res = await fetch(`${API_URL}/ai/chat`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ message: userMessage }),
      });
      const data = await res.json();
      if (data.success) {
        setChatHistory((prev) => [
          ...prev,
          { type: 'ai', content: data.response, responseType: data.type, data: data.data },
        ]);
      } else {
        toast.error('Failed to get response');
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Failed to send message');
    } finally {
      setChatLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
      case 'info':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getHealthScoreColor = (score) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const getHealthScoreGradient = (score) => {
    if (score >= 80) return 'from-green-500 to-emerald-500';
    if (score >= 60) return 'from-yellow-500 to-amber-500';
    if (score >= 40) return 'from-orange-500 to-red-500';
    return 'from-red-500 to-red-700';
  };

  const quickPrompts = [
    'What did I spend most on?',
    'How are my budgets doing?',
    'How much did I save this month?',
    'What\'s my debt strategy?',
    'Give me a financial tip',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <SparklesIcon className="h-8 w-8 text-purple-500" />
            AI Financial Assistant
          </h1>
          <p className="text-gray-600 mt-1">Your personal financial coach powered by AI</p>
        </div>
        <button
          onClick={() => {
            fetchDiagnosis();
            fetchRecommendations();
            fetchAlerts();
            fetchCoaching();
          }}
          className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition"
        >
          <ArrowPathIcon className="h-5 w-5" />
          Refresh Analysis
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'chat', name: 'Chat', icon: ChatBubbleLeftRightIcon },
            { id: 'diagnosis', name: 'Diagnosis', icon: ChartBarIcon },
            { id: 'recommendations', name: 'Recommendations', icon: LightBulbIcon },
            { id: 'coaching', name: 'Coaching', icon: AcademicCapIcon },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-5 w-5" />
              {tab.name}
              {tab.id === 'recommendations' && recommendations.length > 0 && (
                <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full">
                  {recommendations.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Alerts Banner */}
      {alerts.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-800">
                {alerts.length} Alert{alerts.length > 1 ? 's' : ''} Requiring Attention
              </h3>
              <div className="mt-2 space-y-2">
                {alerts.slice(0, 3).map((alert, idx) => (
                  <div key={idx} className={`text-sm px-3 py-2 rounded-lg border ${getSeverityColor(alert.severity)}`}>
                    {alert.message}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content */}
      <div>
        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chat Window */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-lg overflow-hidden flex flex-col" style={{ height: '600px' }}>
              {/* Chat Header */}
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-full">
                    <SparklesIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">PesaPilot AI</h3>
                    <p className="text-purple-200 text-sm">Ask me anything about your finances</p>
                  </div>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {chatHistory.length === 0 && (
                  <div className="text-center py-12">
                    <SparklesIcon className="h-16 w-16 text-purple-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-700">Hi! I'm your AI Financial Assistant</h3>
                    <p className="text-gray-500 mt-1">Ask me about your spending, budgets, savings, or get financial advice!</p>
                    <div className="mt-6 flex flex-wrap justify-center gap-2">
                      {quickPrompts.map((prompt, idx) => (
                        <button
                          key={idx}
                          onClick={() => setMessage(prompt)}
                          className="px-3 py-2 bg-white border border-purple-200 text-purple-700 rounded-full text-sm hover:bg-purple-50 transition"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {chatHistory.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                        msg.type === 'user'
                          ? 'bg-purple-600 text-white rounded-br-md'
                          : 'bg-white text-gray-800 shadow-md rounded-bl-md'
                      }`}
                    >
                      <p className="whitespace-pre-line">{msg.content}</p>
                      {msg.data && msg.type === 'ai' && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          {msg.responseType === 'spending_analysis' && msg.data.map((item, i) => (
                            <div key={i} className="flex justify-between text-sm py-1">
                              <span className="text-gray-600">{item.category}</span>
                              <span className="font-medium">TSh {item.amount?.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white px-4 py-3 rounded-2xl shadow-md rounded-bl-md">
                      <div className="flex items-center gap-2">
                        <div className="flex space-x-1">
                          <div className="h-2 w-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="h-2 w-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="h-2 w-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                        <span className="text-gray-500 text-sm">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <form onSubmit={sendMessage} className="p-4 bg-white border-t">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Ask about your finances..."
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <button
                    type="submit"
                    disabled={chatLoading || !message.trim()}
                    className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <PaperAirplaneIcon className="h-5 w-5" />
                  </button>
                </div>
              </form>
            </div>

            {/* Quick Stats Sidebar */}
            <div className="space-y-4">
              {/* Health Score Card */}
              {diagnosis && (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Financial Health</h3>
                  <div className="relative w-32 h-32 mx-auto mb-4">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="none"
                        className="text-gray-200"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={`${diagnosis.diagnosis.health.overall * 3.52} 352`}
                        className={getHealthScoreColor(diagnosis.diagnosis.health.overall)}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`text-3xl font-bold ${getHealthScoreColor(diagnosis.diagnosis.health.overall)}`}>
                        {diagnosis.diagnosis.health.overall}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {Object.entries(diagnosis.diagnosis.health.breakdown).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 capitalize">{key}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full bg-gradient-to-r ${getHealthScoreGradient(value)}`}
                              style={{ width: `${value}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-8">{value}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary Stats */}
              {diagnosis?.summary && (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">This Month</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Income</span>
                      <span className="font-medium text-green-600">
                        TSh {diagnosis.summary.income?.toLocaleString() || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Expenses</span>
                      <span className="font-medium text-red-600">
                        TSh {diagnosis.summary.expenses?.toLocaleString() || 0}
                      </span>
                    </div>
                    <div className="border-t pt-3 flex items-center justify-between">
                      <span className="text-gray-800 font-medium">Savings</span>
                      <span className={`font-bold ${diagnosis.summary.savings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        TSh {diagnosis.summary.savings?.toLocaleString() || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Savings Rate</span>
                      <span className="text-purple-600 font-medium">{diagnosis.summary.savingsRate}%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Diagnosis Tab */}
        {activeTab === 'diagnosis' && diagnosis && (
          <div className="space-y-6">
            {/* Health Score Overview */}
            <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl p-8 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Financial Health Score</h2>
                  <p className="text-purple-200">Based on your income, expenses, budgets, savings and debts</p>
                </div>
                <div className="text-center">
                  <div className="text-6xl font-bold">{diagnosis.diagnosis.health.overall}</div>
                  <div className="text-purple-200">out of 100</div>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-5 gap-4">
                {Object.entries(diagnosis.diagnosis.health.breakdown).map(([key, value]) => (
                  <div key={key} className="text-center">
                    <div className="text-2xl font-bold">{value}</div>
                    <div className="text-purple-200 text-sm capitalize">{key}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Issues and Positives */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Issues */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <ExclamationTriangleIcon className="h-6 w-6 text-orange-500" />
                  Areas for Improvement
                </h3>
                {diagnosis.diagnosis.issues.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-2" />
                    <p>No issues found! Keep up the great work!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {diagnosis.diagnosis.issues.map((issue, idx) => (
                      <div key={idx} className={`p-4 rounded-lg border ${getSeverityColor(issue.severity)}`}>
                        <div className="flex items-start gap-3">
                          <div className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${
                            issue.severity === 'critical' ? 'bg-red-500 text-white' :
                            issue.severity === 'high' ? 'bg-orange-500 text-white' :
                            'bg-yellow-500 text-white'
                          }`}>
                            {issue.severity}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{issue.message}</p>
                            <p className="text-sm mt-1 opacity-80">{issue.action}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Positives */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <CheckCircleIcon className="h-6 w-6 text-green-500" />
                  What You're Doing Well
                </h3>
                {diagnosis.diagnosis.positives.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <InformationCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p>Add more data to see your positive habits!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {diagnosis.diagnosis.positives.map((positive, idx) => (
                      <div key={idx} className="p-4 rounded-lg bg-green-50 border border-green-200">
                        <div className="flex items-start gap-3">
                          <StarIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                          <p className="text-green-800">{positive.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Recommendations Tab */}
        {activeTab === 'recommendations' && (
          <div className="space-y-6">
            {recommendations.length === 0 ? (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <LightBulbIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-700">No Recommendations Yet</h3>
                <p className="text-gray-500 mt-2">Add more financial data to get personalized recommendations</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {recommendations.map((rec, idx) => (
                  <div key={idx} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl ${
                        rec.type === 'budget' ? 'bg-blue-100 text-blue-600' :
                        rec.type === 'savings' ? 'bg-green-100 text-green-600' :
                        rec.type === 'debt' ? 'bg-red-100 text-red-600' :
                        rec.type === 'spending' ? 'bg-orange-100 text-orange-600' :
                        'bg-purple-100 text-purple-600'
                      }`}>
                        {rec.type === 'budget' && <ChartBarIcon className="h-6 w-6" />}
                        {rec.type === 'savings' && <BanknotesIcon className="h-6 w-6" />}
                        {rec.type === 'debt' && <ExclamationTriangleIcon className="h-6 w-6" />}
                        {rec.type === 'spending' && <ClockIcon className="h-6 w-6" />}
                        {rec.type === 'budgeting' && <ChartBarIcon className="h-6 w-6" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-800">{rec.title}</h3>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            rec.priority === 'high' ? 'bg-red-100 text-red-700' :
                            rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {rec.priority}
                          </span>
                        </div>
                        <p className="text-gray-600 text-sm">{rec.description}</p>
                        
                        {/* Show details based on type */}
                        {rec.details && Array.isArray(rec.details) && (
                          <div className="mt-3 space-y-2">
                            {rec.details.slice(0, 3).map((item, i) => (
                              <div key={i} className="flex justify-between text-sm bg-gray-50 px-3 py-2 rounded">
                                <span className="text-gray-600">{item.category}</span>
                                <span className="font-medium">
                                  TSh {(item.suggestedBudget || item.amount)?.toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {rec.strategies && (
                          <div className="mt-3 space-y-2">
                            {rec.strategies.map((strategy, i) => (
                              <div key={i} className="bg-gray-50 px-3 py-2 rounded">
                                <div className="font-medium text-sm text-gray-800">{strategy.name}</div>
                                <div className="text-xs text-gray-600">{strategy.description}</div>
                                <div className="text-xs text-purple-600 mt-1">
                                  → First target: {strategy.firstTarget}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {rec.current && (
                          <div className="mt-3 space-y-2">
                            {['needs', 'wants', 'savings'].map((key) => (
                              <div key={key} className="flex items-center justify-between text-sm">
                                <span className="capitalize text-gray-600">{key}</span>
                                <div className="flex items-center gap-2">
                                  <span className={`font-medium ${
                                    Math.abs(parseFloat(rec.current[key]?.percentage) - rec.current[key]?.target) <= 5
                                      ? 'text-green-600' : 'text-orange-600'
                                  }`}>
                                    {rec.current[key]?.percentage}%
                                  </span>
                                  <span className="text-gray-400">/ {rec.current[key]?.target}%</span>
                                </div>
                              </div>
                            ))}
                            <p className="text-xs text-purple-600 mt-2">{rec.adjustments}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Coaching Tab */}
        {activeTab === 'coaching' && coaching && (
          <div className="space-y-6">
            {/* Coaching Header */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-8 text-white">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-4 rounded-full">
                  <AcademicCapIcon className="h-10 w-10" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Personal Financial Coaching</h2>
                  <p className="text-indigo-200 mt-1">
                    Step-by-step guidance based on your health score of {coaching.healthScore}
                  </p>
                </div>
              </div>
            </div>

            {/* Coaching Tips */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {coaching.coachingTips.map((tip, idx) => (
                <div key={idx} className="bg-white rounded-xl shadow-lg overflow-hidden">
                  <div className={`px-6 py-4 ${
                    tip.area === 'savings' ? 'bg-green-500' :
                    tip.area === 'spending' ? 'bg-orange-500' :
                    tip.area === 'debt' ? 'bg-red-500' :
                    tip.area === 'budgeting' ? 'bg-blue-500' :
                    'bg-purple-500'
                  }`}>
                    <h3 className="text-lg font-semibold text-white">{tip.title}</h3>
                  </div>
                  <div className="p-6">
                    <ul className="space-y-3">
                      {tip.steps.map((step, stepIdx) => (
                        <li key={stepIdx} className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-medium">
                            {stepIdx + 1}
                          </div>
                          <span className="text-gray-700">{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
