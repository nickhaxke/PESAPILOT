import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { 
  MessageCircle, 
  X, 
  Send, 
  Sparkles, 
  Minimize2,
  BookOpen,
  TrendingUp,
  PiggyBank,
  CreditCard,
  HelpCircle
} from 'lucide-react';

export default function FloatingAIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([
    {
      type: 'ai',
      content: 'Habari! 👋 Mimi ni Msaidizi wako wa Fedha na Biashara.\n\n🎯 Ninaweza kukusaidia na:\n• Kuanza na kukuza biashara\n• Uwekezaji na akiba\n• Mikopo na madeni\n• Marketing na wateja\n• Kazi za ziada (side hustles)\n• Kodi na TRA\n\nUliza swali lolote kwa Kiswahili au Kiingereza!'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  const API_URL = 'http://localhost:5000/api';

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  });

  const quickQuestions = [
    { icon: PiggyBank, text: 'Kulingana na mapato yangu niweke kiasi gani kufikia lengo?', category: 'target' },
    { icon: TrendingUp, text: 'Nifundishe kuanza biashara', category: 'business' },
    { icon: CreditCard, text: 'Matumizi yangu yakoje?', category: 'spending' },
    { icon: BookOpen, text: 'Nifundishe kuhusu uwekezaji', category: 'investment' },
  ];

  const sendMessage = async (text = input) => {
    if (!text.trim() || loading) return;

    const userMessage = text.trim();
    setMessages(prev => [...prev, { type: 'user', content: userMessage }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/ai/chat`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ message: userMessage }),
      });
      const data = await res.json();
      
      if (data.success) {
        setMessages(prev => [...prev, { 
          type: 'ai', 
          content: data.response,
          data: data.data 
        }]);
      } else {
        setMessages(prev => [...prev, { 
          type: 'ai', 
          content: 'Samahani, kumekuwa na tatizo. Tafadhali jaribu tena.' 
        }]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { 
        type: 'ai', 
        content: 'Samahani, siwezi kuwasiliana na seva. Tafadhali angalia mtandao wako.' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full shadow-2xl flex items-center justify-center text-white hover:scale-110 transition-all duration-300 z-50 group"
      >
        <Sparkles className="w-8 h-8 group-hover:animate-pulse" />
        <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold animate-bounce">
          AI
        </span>
      </button>
    );
  }

  if (isMinimized) {
    return (
      <div 
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full px-6 py-3 shadow-2xl flex items-center gap-3 text-white cursor-pointer hover:scale-105 transition-all z-50"
      >
        <Sparkles className="w-5 h-5" />
        <span className="font-medium">Msaidizi wa AI</span>
        <X 
          className="w-5 h-5 hover:bg-white/20 rounded-full p-0.5" 
          onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
        />
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 border border-gray-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold">Msaidizi wa Fedha</h3>
            <p className="text-purple-200 text-xs">Tayari kukusaidia 24/7</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setIsMinimized(true)}
            className="p-2 hover:bg-white/20 rounded-lg transition"
          >
            <Minimize2 className="w-5 h-5 text-white" />
          </button>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-white/20 rounded-lg transition"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-4 py-3 rounded-2xl ${
              msg.type === 'user' 
                ? 'bg-purple-600 text-white rounded-br-md' 
                : 'bg-white text-gray-800 shadow-md rounded-bl-md border border-gray-100'
            }`}>
              <p className="whitespace-pre-line text-sm">{msg.content}</p>
              {msg.data && Array.isArray(msg.data) && (
                <div className="mt-2 pt-2 border-t border-gray-200 space-y-1">
                  {msg.data.slice(0, 5).map((item, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="text-gray-600">{item.category}</span>
                      <span className="font-medium">TSh {item.amount?.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white px-4 py-3 rounded-2xl shadow-md rounded-bl-md border border-gray-100">
              <div className="flex items-center gap-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span className="text-gray-500 text-xs">Nafikiri...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Quick Questions */}
      {messages.length <= 2 && (
        <div className="px-4 py-2 bg-white border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-2">Maswali ya haraka:</p>
          <div className="flex flex-wrap gap-2">
            {quickQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => sendMessage(q.text)}
                className="flex items-center gap-1 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full text-xs hover:bg-purple-100 transition"
              >
                <q.icon className="w-3 h-3" />
                {q.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-3 bg-white border-t border-gray-200">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Andika swali lako hapa..."
            className="flex-1 px-4 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition"
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="p-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
