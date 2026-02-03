import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bot,
  Plus,
  MessageSquare,
  LogOut,
  Sparkles,
  LayoutDashboard,
  BarChart3,
  BookOpen,
  Settings,
  Plug,
  HelpCircle,
  Search,
  Bell,
  Menu,
  X,
  Activity,
  FileText,
  Globe,
  Key,
  User,
  Zap,
} from 'lucide-react';
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

const SIDEBAR_NAV: { id: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'bots', label: 'Bots', icon: Bot },
  { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'integrations', label: 'Integrations', icon: Plug },
  { id: 'settings', label: 'Settings', icon: Settings },
];

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
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState('overview');

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

  const filteredBots = bots.filter(
    (b) =>
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user) return null;

  const activeBots = bots.filter((b) => b.status === 'active').length;

  return (
    <div className="min-h-screen bg-[#0f172a] text-white flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}
      {/* Fixed Sidebar - toggled by menu button; hidden when closed on all screens */}
      <aside
        className={`fixed left-0 top-0 bottom-0 w-64 bg-slate-900/95 backdrop-blur-xl border-r border-white/5 flex flex-col z-40 transform transition-transform duration-300 ease-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <Link to="/" className="flex items-center gap-2.5" onClick={() => setSidebarOpen(false)}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <span className="font-display font-bold text-lg text-white">CloudBot</span>
          </Link>
          <button type="button" className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5" onClick={() => setSidebarOpen(false)} aria-label="Close menu">
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-0.5">
          {SIDEBAR_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => { setActiveSection(item.id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 text-left ${
                  isActive
                    ? 'bg-indigo-500/20 text-white border border-indigo-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-white/5">
          <a
            href="https://github.com/notshakti/Cloudbot"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <HelpCircle className="w-5 h-5" />
            Help
          </a>
        </div>
      </aside>

      {/* Main content - leave space for sidebar when it's open (desktop: always open unless toggled) */}
      <div className={`flex-1 min-h-screen flex flex-col transition-[padding] duration-300 pl-0 ${sidebarOpen ? 'lg:pl-64' : 'lg:pl-0'}`}>
        {/* Top bar */}
        <header className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur-xl border-b border-white/5">
          <div className="px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
            <button
              type="button"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5"
              onClick={() => setSidebarOpen((o) => !o)}
              aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex-1 max-w-md ml-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="search"
                  placeholder="Search bots..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button type="button" className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors" aria-label="Notifications">
                <Bell className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3 pl-3 border-l border-white/10">
                <span className="text-sm text-slate-400 hidden sm:block">{user.name} · {user.organizationName}</span>
                <div className="w-9 h-9 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                  {user.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <button
                  type="button"
                  onClick={() => { logout(); navigate('/'); }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Sign out</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6">
          {/* ========== OVERVIEW: Welcome + quick stats + quick actions ========== */}
          {activeSection === 'overview' && (
            <>
              <div className="mb-8">
                <h1 className="font-display text-2xl md:text-3xl font-bold text-white">Overview</h1>
                <p className="text-slate-400 mt-1">Welcome back, {user.name}. Here&apos;s your workspace at a glance.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 backdrop-blur-[20px] p-6 mb-8">
                <h2 className="font-display text-lg font-semibold text-white mb-4">Quick stats</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                    <p className="text-slate-400 text-sm">Active Bots</p>
                    <p className="font-display text-2xl font-bold text-white mt-1">{activeBots}</p>
                  </div>
                  <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                    <p className="text-slate-400 text-sm">Total Bots</p>
                    <p className="font-display text-2xl font-bold text-white mt-1">{bots.length}</p>
                  </div>
                  <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                    <p className="text-slate-400 text-sm">Workspace</p>
                    <p className="font-display text-lg font-bold text-white mt-1 truncate">{user.organizationName}</p>
                  </div>
                  <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                    <p className="text-slate-400 text-sm">Status</p>
                    <p className="font-display text-lg font-bold text-emerald-400 mt-1">Active</p>
                  </div>
                </div>
              </div>
              <h2 className="font-display text-lg font-semibold text-white mb-4">Quick actions</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => { setActiveSection('bots'); setShowCreateWizard(true); }}
                  className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-[20px] p-6 text-left hover:bg-white/10 hover:border-indigo-500/30 transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <Plus className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">Create a chatbot</p>
                    <p className="text-slate-400 text-sm">Describe what it should do and we&apos;ll train it.</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('bots')}
                  className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-[20px] p-6 text-left hover:bg-white/10 hover:border-indigo-500/30 transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                    <Bot className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">View all bots</p>
                    <p className="text-slate-400 text-sm">{bots.length} chatbot{bots.length !== 1 ? 's' : ''} in your workspace.</p>
                  </div>
                </button>
              </div>
            </>
          )}

          {/* ========== BOTS: Full bot management ========== */}
          {activeSection === 'bots' && (
          <>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-white">Your chatbots</h1>
              <p className="text-slate-400 mt-1">Create, train, and manage your bots in one place.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateWizard(!showCreateWizard)}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 font-semibold hover:from-indigo-400 hover:to-purple-500 shadow-lg shadow-indigo-500/30 transition-all duration-300"
            >
              <Plus className="w-5 h-5" /> Create chatbot
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="rounded-2xl bg-white/5 backdrop-blur-[20px] border border-white/10 p-5 hover:bg-white/10 hover:border-indigo-500/20 transition-all duration-300">
              <p className="text-slate-400 text-sm font-medium">Active Bots</p>
              <p className="font-display text-2xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent mt-1">{activeBots}</p>
            </div>
            <div className="rounded-2xl bg-white/5 backdrop-blur-[20px] border border-white/10 p-5 hover:bg-white/10 hover:border-indigo-500/20 transition-all duration-300">
              <p className="text-slate-400 text-sm font-medium">Total Bots</p>
              <p className="font-display text-2xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent mt-1">{bots.length}</p>
            </div>
            <div className="rounded-2xl bg-white/5 backdrop-blur-[20px] border border-white/10 p-5 hover:bg-white/10 hover:border-indigo-500/20 transition-all duration-300">
              <p className="text-slate-400 text-sm font-medium">Status</p>
              <p className="font-display text-2xl font-bold text-white mt-1">{activeBots === bots.length && bots.length > 0 ? 'All active' : 'Mixed'}</p>
            </div>
            <div className="rounded-2xl bg-white/5 backdrop-blur-[20px] border border-white/10 p-5 hover:bg-white/10 hover:border-indigo-500/20 transition-all duration-300">
              <p className="text-slate-400 text-sm font-medium">Workspace</p>
              <p className="font-display text-lg font-bold text-white mt-1 truncate">{user.organizationName}</p>
            </div>
          </div>

          {/* Create wizard */}
          {showCreateWizard && (
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-[20px] p-6 mb-8 max-w-2xl">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <h2 className="text-lg font-semibold text-white">What should this chatbot do?</h2>
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
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Bot name (optional)</label>
                  <input
                    type="text"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="e.g. Support Bot"
                    className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={creating || !purpose.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 font-medium hover:from-indigo-400 hover:to-purple-500 disabled:opacity-50 transition-all"
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
            <div className="mb-4 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 max-w-md">
              {error}
            </div>
          )}

          {/* Bot grid */}
          {loading ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
              <p className="text-slate-400">Loading bots...</p>
            </div>
          ) : filteredBots.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-[20px] p-12 text-center max-w-lg mx-auto">
              <MessageSquare className="w-14 h-14 text-slate-500 mx-auto mb-4" />
              <p className="text-slate-400 mb-6">
                {bots.length === 0
                  ? 'No chatbots yet. Click "Create chatbot" and describe what it should do — we\'ll train it and make it ready to deploy.'
                  : 'No bots match your search.'}
              </p>
              <button
                type="button"
                onClick={() => { setShowCreateWizard(true); setSearchQuery(''); }}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 font-medium hover:from-indigo-400 hover:to-purple-500 shadow-lg shadow-indigo-500/30 transition-all"
              >
                Create chatbot
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredBots.map((bot) => (
                <Link
                  key={bot._id}
                  to={`/dashboard/bots/${bot._id}`}
                  className="group block rounded-2xl border border-white/10 bg-white/5 backdrop-blur-[20px] p-6 hover:bg-white/10 hover:border-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 hover:-translate-y-0.5"
                >
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Bot className="w-6 h-6 text-indigo-400" />
                    </div>
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        bot.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'
                      }`}
                    >
                      {bot.status}
                    </span>
                  </div>
                  <h2 className="font-display font-semibold text-lg text-white mt-4 mb-1">{bot.name}</h2>
                  <p className="text-slate-400 text-sm">{bot.description || 'No description'}</p>
                </Link>
              ))}
            </div>
          )}
          </>
          )}

          {/* ========== KNOWLEDGE BASE: Documents & FAQs ========== */}
          {activeSection === 'knowledge' && (
            <>
              <div className="mb-8">
                <h1 className="font-display text-2xl md:text-3xl font-bold text-white">Knowledge Base</h1>
                <p className="text-slate-400 mt-1">Upload documents, FAQs, and URLs so your bots can answer from your content.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-[20px] p-6">
                  <FileText className="w-10 h-10 text-indigo-400 mb-4" />
                  <h3 className="font-semibold text-white mb-2">Documents</h3>
                  <p className="text-slate-400 text-sm">Upload PDFs, DOCX, or TXT. Each bot has its own document library.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-[20px] p-6">
                  <BookOpen className="w-10 h-10 text-purple-400 mb-4" />
                  <h3 className="font-semibold text-white mb-2">FAQs</h3>
                  <p className="text-slate-400 text-sm">Add question–answer pairs for consistent, accurate replies.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-[20px] p-6">
                  <Globe className="w-10 h-10 text-cyan-400 mb-4" />
                  <h3 className="font-semibold text-white mb-2">Web URLs</h3>
                  <p className="text-slate-400 text-sm">Scrape websites to train bots on your live content.</p>
                </div>
              </div>
              <p className="text-slate-500 text-sm">Open a bot from the <button type="button" className="text-indigo-400 hover:underline" onClick={() => setActiveSection('bots')}>Bots</button> tab to manage its knowledge base.</p>
            </>
          )}

          {/* ========== ANALYTICS: Charts & metrics ========== */}
          {activeSection === 'analytics' && (
            <>
              <div className="mb-8">
                <h1 className="font-display text-2xl md:text-3xl font-bold text-white">Analytics</h1>
                <p className="text-slate-400 mt-1">Track conversations, satisfaction, and bot performance.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-[20px] p-5">
                  <Activity className="w-8 h-8 text-indigo-400 mb-3" />
                  <p className="text-slate-400 text-sm">Conversations</p>
                  <p className="font-display text-2xl font-bold text-white mt-1">—</p>
                  <p className="text-slate-500 text-xs mt-1">Total across all bots</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-[20px] p-5">
                  <BarChart3 className="w-8 h-8 text-purple-400 mb-3" />
                  <p className="text-slate-400 text-sm">Satisfaction</p>
                  <p className="font-display text-2xl font-bold text-white mt-1">—</p>
                  <p className="text-slate-500 text-xs mt-1">Average rating</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-[20px] p-5">
                  <Zap className="w-8 h-8 text-cyan-400 mb-3" />
                  <p className="text-slate-400 text-sm">Response time</p>
                  <p className="font-display text-2xl font-bold text-white mt-1">—</p>
                  <p className="text-slate-500 text-xs mt-1">Avg. response (ms)</p>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-[20px] p-12 text-center">
                <BarChart3 className="w-16 h-16 text-slate-500 mx-auto mb-4 opacity-50" />
                <p className="text-slate-400">Charts and time-series data will appear here. Connect your bots and run conversations to see analytics.</p>
              </div>
            </>
          )}

          {/* ========== INTEGRATIONS: Channels & API ========== */}
          {activeSection === 'integrations' && (
            <>
              <div className="mb-8">
                <h1 className="font-display text-2xl md:text-3xl font-bold text-white">Integrations</h1>
                <p className="text-slate-400 mt-1">Connect your bots to web, WhatsApp, Slack, and more.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-[20px] p-6 flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                    <Globe className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Website embed</h3>
                    <p className="text-slate-400 text-sm mt-1">Add a chat widget to your site. Get the code in each bot&apos;s Channels tab.</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-[20px] p-6 flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">WhatsApp</h3>
                    <p className="text-slate-400 text-sm mt-1">Optional. Configure in bot settings when you add Twilio credentials.</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-[20px] p-6 flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <Plug className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Slack</h3>
                    <p className="text-slate-400 text-sm mt-1">Optional. Install the Slack app and connect in each bot&apos;s Channels tab.</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-[20px] p-6 flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <Key className="w-6 h-6 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">API & Webhooks</h3>
                    <p className="text-slate-400 text-sm mt-1">Use the chat API and optional webhooks for custom integrations.</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ========== SETTINGS: Workspace & profile ========== */}
          {activeSection === 'settings' && (
            <>
              <div className="mb-8">
                <h1 className="font-display text-2xl md:text-3xl font-bold text-white">Settings</h1>
                <p className="text-slate-400 mt-1">Workspace and account preferences.</p>
              </div>
              <div className="max-w-2xl space-y-6">
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-[20px] p-6">
                  <h2 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-indigo-400" /> Profile
                  </h2>
                  <dl className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-slate-400">Name</dt>
                      <dd className="text-white font-medium">{user.name}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-400">Workspace</dt>
                      <dd className="text-white font-medium">{user.organizationName}</dd>
                    </div>
                  </dl>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-[20px] p-6">
                  <h2 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
                    <Key className="w-5 h-5 text-indigo-400" /> API keys
                  </h2>
                  <p className="text-slate-400 text-sm">Generate and manage API keys for your organization. Coming soon.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-[20px] p-6">
                  <h2 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-indigo-400" /> Preferences
                  </h2>
                  <p className="text-slate-400 text-sm">Notifications, theme, and language. Coming soon.</p>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
