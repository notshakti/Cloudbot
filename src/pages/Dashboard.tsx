import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bot, Plus, MessageSquare, LogOut, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

const JUST_CREATED_KEY = 'cloudbot_just_created';

interface BotItem {
  _id: string;
  name: string;
  type: string;
  status: string;
  description: string;
  createdAt: string;
}

export default function Dashboard() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [bots, setBots] = useState<BotItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [purpose, setPurpose] = useState('');
  const [createName, setCreateName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    (async () => {
      try {
        const res = await api.get<BotItem[]>('/bots');
        if (res.success && res.data) setBots(Array.isArray(res.data) ? res.data : []);
      } catch {
        setBots([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [token, navigate]);

  async function handleCreateFromPurpose(e: React.FormEvent) {
    e.preventDefault();
    const purposeTrim = purpose.trim();
    if (!purposeTrim) return;
    setError('');
    setCreating(true);
    try {
      const res = await api.post<{ _id: string; name?: string }>('/bots/from-description', {
        purpose: purposeTrim,
        name: createName.trim() || undefined,
      });
      if (res.success && res.data) {
        const botId = res.data._id;
        const name = res.data.name || 'Chatbot';
        setBots((prev) => [...prev, { _id: botId, name, type: 'custom', status: 'active', description: '', createdAt: new Date().toISOString() }]);
        setPurpose('');
        setCreateName('');
        setShowCreateWizard(false);
        sessionStorage.setItem(JUST_CREATED_KEY, botId);
        navigate(`/dashboard/bots/${botId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create bot');
    } finally {
      setCreating(false);
    }
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <nav className="border-b border-white/10 bg-slate-900/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold">CloudBot</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-slate-400 text-sm">{user.name} · {user.organizationName}</span>
            <button
              onClick={() => { logout(); navigate('/'); }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <h1 className="text-2xl font-bold">Your chatbots</h1>
          <button
            type="button"
            onClick={() => setShowCreateWizard(!showCreateWizard)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 font-medium hover:from-blue-400 hover:to-violet-500 transition-all"
          >
            <Plus className="w-4 h-4" /> Create chatbot
          </button>
        </div>

        {showCreateWizard && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 mb-8 max-w-2xl">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-violet-400" />
              <h2 className="text-lg font-semibold">What should this chatbot do?</h2>
            </div>
            <p className="text-slate-400 text-sm mb-4">
              Describe the purpose in a sentence. We&apos;ll auto-train it and make it deployment-ready (e.g. customer queries, admission chatbot, IT helpdesk).
            </p>
            <form onSubmit={handleCreateFromPurpose} className="space-y-4">
              <textarea
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="e.g. Handle customer support queries for my store / Answer admission and course questions for our university / IT helpdesk for employee tickets"
                rows={4}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
              />
              <div>
                <label className="block text-sm text-slate-400 mb-1">Bot name (optional — we'll suggest one from your description)</label>
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g. Support Bot"
                  className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={creating || !purpose.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 font-medium hover:from-blue-400 hover:to-violet-500 disabled:opacity-50 transition-all"
                >
                  <Sparkles className="w-4 h-4" /> Create & train
                </button>
                <button
                  type="button"
                  onClick={() => { setShowCreateWizard(false); setError(''); setPurpose(''); setCreateName(''); }}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {error && (
          <div className="mb-4 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 max-w-md">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-slate-400">Loading bots...</div>
        ) : bots.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center max-w-lg mx-auto">
            <MessageSquare className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-400 mb-6">No chatbots yet. Click &quot;Create chatbot&quot; and describe what it should do — we&apos;ll train it and make it ready to deploy.</p>
            <button
              type="button"
              onClick={() => setShowCreateWizard(true)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 font-medium hover:from-blue-400 hover:to-violet-500"
            >
              Create chatbot
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {bots.map((bot) => (
              <Link
                key={bot._id}
                to={`/dashboard/bots/${bot._id}`}
                className="block rounded-2xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 hover:border-white/20 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center mb-3">
                    <Bot className="w-6 h-6 text-violet-400" />
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${bot.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-400'}`}>
                    {bot.status}
                  </span>
                </div>
                <h2 className="font-semibold text-lg mb-1">{bot.name}</h2>
                <p className="text-slate-400 text-sm">{bot.description || 'No description'}</p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
