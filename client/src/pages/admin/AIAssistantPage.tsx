import { useState, useRef, useEffect } from 'react';
import { Bot, Send, User, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

const SUGGESTED_QUESTIONS = [
  'Show overdue items',
  "Today's summary",
  'Most borrowed items',
  'Should we buy more speakers?',
];

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      sender: 'ai',
      text: 'Hello! I am your AI Inventory Assistant. Ask me about equipment statuses, active loans, overdue items, or inventory recommendations.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (questionText?: string) => {
    const query = (questionText || inputQuestion).trim();
    if (!query || isLoading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    if (!questionText) setInputQuestion('');
    setIsLoading(true);

    try {
      const { data } = await api.post('/ai/query', { question: query });
      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: data.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to fetch AI response');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-6rem)] flex flex-col font-sans space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-teal-600 flex items-center justify-center text-white shrink-0 font-semibold">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white">AI Inventory Assistant</h1>
            <p className="text-xs text-slate-500">Ask natural language questions grounded in live inventory data</p>
          </div>
        </div>
        <button
          onClick={() => setMessages([messages[0]])}
          className="flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <RefreshCw className="w-3 h-3" /> Clear Chat
        </button>
      </div>

      {/* Suggested Questions Chips */}
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mr-1">
          <Sparkles className="w-3 h-3 text-teal-600" /> Suggested:
        </span>
        {SUGGESTED_QUESTIONS.map(q => (
          <button
            key={q}
            onClick={() => handleSend(q)}
            disabled={isLoading}
            className="px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] hover:border-teal-600 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-teal-600 transition-colors disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Chat Messages Log */}
      <div className="flex-1 overflow-y-auto p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] space-y-4">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex items-start gap-2.5 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div
              className={`w-7 h-7 rounded flex items-center justify-center text-xs shrink-0 font-bold ${
                msg.sender === 'user'
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                  : 'bg-teal-600 text-white'
              }`}
            >
              {msg.sender === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
            </div>
            <div className={`max-w-[80%] space-y-1 ${msg.sender === 'user' ? 'text-right' : ''}`}>
              <div
                className={`p-3 rounded-lg text-xs leading-relaxed inline-block ${
                  msg.sender === 'user'
                    ? 'bg-teal-600 text-white font-medium'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 border border-slate-200/60 dark:border-slate-700/60'
                }`}
              >
                {msg.text}
              </div>
              <p className="text-[10px] text-slate-400 px-1">{msg.timestamp}</p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 p-2">
            <div className="w-6 h-6 rounded bg-teal-600/20 flex items-center justify-center">
              <Loader2 className="w-3.5 h-3.5 text-teal-600 animate-spin" />
            </div>
            <span>Analyzing inventory data...</span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Message Input Box */}
      <form
        onSubmit={e => { e.preventDefault(); handleSend(); }}
        className="flex items-center gap-2 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] shrink-0"
      >
        <input
          type="text"
          value={inputQuestion}
          onChange={e => setInputQuestion(e.target.value)}
          placeholder="Ask anything about inventory, overdue items, or stock status..."
          className="flex-1 px-3 py-2 bg-transparent text-xs text-slate-900 dark:text-white placeholder:text-slate-400 outline-none"
        />
        <button
          type="submit"
          disabled={isLoading || !inputQuestion.trim()}
          className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
        >
          <span>Send</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
