import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Bot, ArrowLeft, MessageSquare, BookOpen, Database, Send, Plus, Trash2, Share2, BarChart3, Copy, Check, Rocket, Users, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api, uploadFile, uploadRagDocument } from '../api/client';

const JUST_CREATED_KEY = 'cloudbot_just_created';

type Tab = 'overview' | 'intents' | 'knowledge' | 'channels' | 'conversations' | 'leads' | 'analytics' | 'test';

interface BotData {
  _id: string;
  name: string;
  type: string;
  status: string;
  description: string;
  config?: {
    welcomeMessage?: string;
    fallbackMessages?: string[];
    features?: { humanHandoff?: boolean; leadCapture?: boolean };
    aiMode?: 'llm_first' | 'hybrid' | 'intent_only';
    aiConfig?: { primaryLLM?: string; temperature?: number; maxTokens?: number; ragEnabled?: boolean; fallbackToIntent?: boolean };
  };
}

interface IntentItem {
  _id: string;
  name: string;
  displayName: string;
  trainingPhrases: { text: string }[];
  responses: { text: string }[];
  isActive: boolean;
}

interface KBItem {
  _id: string;
  type: string;
  metadata?: { title: string };
  processing?: { status: string };
}

export default function BotDetail() {
  const { botId } = useParams<{ botId: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('overview');
  const [bot, setBot] = useState<BotData | null>(null);
  const [intents, setIntents] = useState<IntentItem[]>([]);
  const [kbItems, setKbItems] = useState<KBItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReadyBanner, setShowReadyBanner] = useState(false);

  useEffect(() => {
    if (botId && typeof window !== 'undefined' && sessionStorage.getItem(JUST_CREATED_KEY) === botId) {
      sessionStorage.removeItem(JUST_CREATED_KEY);
      setShowReadyBanner(true);
    }
  }, [botId]);

  const loadBot = useCallback(async () => {
    if (!botId || !token) return;
    try {
      const res = await api.get<BotData>(`/bots/${botId}`);
      if (res.success && res.data) setBot(res.data);
    } catch {
      setBot(null);
    }
  }, [botId, token]);

  const loadIntents = useCallback(async () => {
    if (!botId || !token) return;
    try {
      const res = await api.get<IntentItem[]>(`/bots/${botId}/intents`);
      if (res.success && res.data) setIntents(Array.isArray(res.data) ? res.data : []);
    } catch {
      setIntents([]);
    }
  }, [botId, token]);

  const loadKb = useCallback(async () => {
    if (!botId || !token) return;
    try {
      const res = await api.get<KBItem[]>(`/bots/${botId}/knowledge-base`);
      if (res.success && res.data) setKbItems(Array.isArray(res.data) ? res.data : []);
    } catch {
      setKbItems([]);
    }
  }, [botId, token]);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    (async () => {
      setLoading(true);
      await loadBot();
      await loadIntents();
      await loadKb();
      setLoading(false);
    })();
  }, [token, botId, navigate, loadBot, loadIntents, loadKb]);

  if (!botId || !token) return null;
  if (loading && !bot) return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Loading...</div>;

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'intents', label: 'Intents', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'knowledge', label: 'Knowledge Base', icon: <Database className="w-4 h-4" /> },
    { id: 'channels', label: 'Channels', icon: <Share2 className="w-4 h-4" /> },
    { id: 'conversations', label: 'Conversations', icon: <Users className="w-4 h-4" /> },
    { id: 'leads', label: 'Leads', icon: <UserPlus className="w-4 h-4" /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'test', label: 'Test', icon: <Send className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <nav className="border-b border-white/10 bg-slate-900/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold">CloudBot</span>
            </Link>
          </div>
        </div>
      </nav>

      {bot && (
        <div className="container mx-auto px-4 py-6">
          {showReadyBanner && (
            <div className="mb-6 rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-4 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-emerald-300">
                <Rocket className="w-5 h-5 flex-shrink-0" />
                <span>Your bot is trained and deployment-ready. Get the embed code in the <button type="button" onClick={() => setTab('channels')} className="underline font-medium">Channels</button> tab or try it in <button type="button" onClick={() => setTab('test')} className="underline font-medium">Test</button>.</span>
              </div>
              <button type="button" onClick={() => setShowReadyBanner(false)} className="text-emerald-400 hover:text-white p-1">×</button>
            </div>
          )}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center">
              <Bot className="w-8 h-8 text-violet-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{bot.name}</h1>
              <p className="text-slate-400 text-sm">{bot.status} · {bot.type}</p>
            </div>
          </div>

          <div className="flex gap-2 border-b border-white/10 mb-6 overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-3 rounded-t-lg font-medium transition-colors whitespace-nowrap ${tab === t.id ? 'bg-white/10 text-white border-b-2 border-violet-500' : 'text-slate-400 hover:text-white'}`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'overview' && (
            <OverviewTab bot={bot} intents={intents} kbItems={kbItems} onBotUpdate={loadBot} />
          )}
          {tab === 'intents' && (
            <IntentsTab botId={botId} intents={intents} onReload={loadIntents} />
          )}
          {tab === 'knowledge' && (
            <KnowledgeTab botId={botId} kbItems={kbItems} onReload={loadKb} />
          )}
          {tab === 'channels' && <ChannelsTab botId={botId} />}
          {tab === 'conversations' && <ConversationsTab botId={botId} />}
          {tab === 'leads' && <LeadsTab botId={botId} />}
          {tab === 'analytics' && <AnalyticsTab botId={botId} />}
          {tab === 'test' && (
            <TestTab botId={botId} welcomeMessage={bot.config?.welcomeMessage} />
          )}
        </div>
      )}

    </div>
  );
}

function OverviewTab({
  bot,
  intents,
  kbItems,
  onBotUpdate,
}: {
  bot: BotData;
  intents: IntentItem[];
  kbItems: KBItem[];
  onBotUpdate: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const humanHandoff = bot.config?.features?.humanHandoff ?? false;
  const leadCapture = bot.config?.features?.leadCapture ?? false;

  async function toggleFeature(feature: 'humanHandoff' | 'leadCapture', value: boolean) {
    setSaving(true);
    try {
      await api.put(`/bots/${bot._id}`, {
        config: {
          ...bot.config,
          features: {
            ...bot.config?.features,
            [feature]: value,
          },
        },
      });
      onBotUpdate();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="font-semibold mb-2">Welcome message</h2>
        <p className="text-slate-300">{bot.config?.welcomeMessage || 'Not set'}</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="font-semibold mb-4">AI mode</h2>
        <p className="text-slate-400 text-sm mb-3">Choose how the bot responds: LLM-first uses OpenAI + knowledge base for natural answers; hybrid tries intents first then AI; intent-only uses only predefined intents.</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {(['llm_first', 'hybrid', 'intent_only'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={async () => {
                setSaving(true);
                try {
                  await api.put(`/bots/${bot._id}`, {
                    config: { ...bot.config, aiMode: mode },
                  });
                  onBotUpdate();
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving}
              className={`px-3 py-1.5 rounded-lg text-sm ${bot.config?.aiMode === mode ? 'bg-violet-600 text-white' : 'bg-white/10 text-slate-300 hover:bg-white/15'}`}
            >
              {mode === 'llm_first' ? 'LLM-first' : mode === 'hybrid' ? 'Hybrid' : 'Intent-only'}
            </button>
          ))}
        </div>
        <p className="text-slate-500 text-sm">Current: <strong>{bot.config?.aiMode || 'intent_only'}</strong>. Set OPENAI_API_KEY in backend for LLM.</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="font-semibold mb-4">Features</h2>
        <div className="space-y-4">
          <label className="flex items-center justify-between gap-4">
            <span className="text-slate-300">Human handoff</span>
            <input
              type="checkbox"
              checked={humanHandoff}
              disabled={saving}
              onChange={(e) => toggleFeature('humanHandoff', e.target.checked)}
              className="rounded"
            />
          </label>
          <p className="text-slate-500 text-sm">Let users escalate to a human agent via chat (POST /api/chat/:botId/escalate).</p>
          <label className="flex items-center justify-between gap-4">
            <span className="text-slate-300">Lead capture</span>
            <input
              type="checkbox"
              checked={leadCapture}
              disabled={saving}
              onChange={(e) => toggleFeature('leadCapture', e.target.checked)}
              className="rounded"
            />
          </label>
          <p className="text-slate-500 text-sm">Capture name, email, phone via POST /api/chat/:botId/lead. View in Leads tab.</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-3xl font-bold text-violet-400">{intents.length}</p>
          <p className="text-slate-400 text-sm">Intents</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-3xl font-bold text-violet-400">{kbItems.length}</p>
          <p className="text-slate-400 text-sm">Knowledge base items</p>
        </div>
      </div>
    </div>
  );
}

function IntentsTab({ botId, intents, onReload }: { botId: string; intents: IntentItem[]; onReload: () => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [phrases, setPhrases] = useState('');
  const [response, setResponse] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !response.trim()) return;
    setSaving(true);
    try {
      await api.post(`/bots/${botId}/intents`, {
        name: name.trim().toLowerCase().replace(/\s+/g, '_'),
        displayName: name.trim(),
        trainingPhrases: phrases.split('\n').map((t) => t.trim()).filter(Boolean).map((text) => ({ text, language: 'en' })),
        responses: [{ text: response.trim(), language: 'en' }],
      });
      setName('');
      setPhrases('');
      setResponse('');
      setShowAdd(false);
      onReload();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(intentId: string) {
    if (!window.confirm('Delete this intent?')) return;
    try {
      await api.delete(`/bots/${botId}/intents/${intentId}`);
      onReload();
    } catch {}
  }

  return (
    <div className="max-w-3xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold">Intents</h2>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Add intent
        </button>
      </div>
      {showAdd && (
        <form onSubmit={handleAdd} className="rounded-2xl border border-white/10 bg-white/5 p-6 mb-6 space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Intent name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white"
              placeholder="e.g. greeting"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Training phrases (one per line)</label>
            <textarea
              value={phrases}
              onChange={(e) => setPhrases(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white resize-none"
              placeholder="Hello\nHi there\nHey"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Response</label>
            <input
              type="text"
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              required
              className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white"
              placeholder="Hi! How can I help?"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20">
              Cancel
            </button>
          </div>
        </form>
      )}
      <div className="space-y-3">
        {intents.length === 0 ? (
          <p className="text-slate-400">No intents yet. Add one to train your bot.</p>
        ) : (
          intents.map((intent) => (
            <div key={intent._id} className="rounded-xl border border-white/10 bg-white/5 p-4 flex justify-between items-start">
              <div>
                <p className="font-medium">{intent.displayName}</p>
                <p className="text-slate-400 text-sm mt-1">
                  {intent.trainingPhrases?.length || 0} phrases → {intent.responses?.[0]?.text?.slice(0, 50) || '—'}
                </p>
              </div>
              <button onClick={() => handleDelete(intent._id)} className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

interface VectorStats {
  totalChunks: number;
  collectionSizeMb: string;
}

function KnowledgeTab({ botId, kbItems, onReload }: { botId: string; kbItems: KBItem[]; onReload: () => void }) {
  const [showUrl, setShowUrl] = useState(false);
  const [showFaq, setShowFaq] = useState(false);
  const [url, setUrl] = useState('');
  const [faqQ, setFaqQ] = useState('');
  const [faqA, setFaqA] = useState('');
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [vectorStats, setVectorStats] = useState<VectorStats | null>(null);
  const [ragFile, setRagFile] = useState<File | null>(null);
  const [ragUrl, setRagUrl] = useState('');
  const [ragUploading, setRagUploading] = useState(false);
  const [ragResult, setRagResult] = useState<{ stats?: { totalChunks: number; documentTitle: string; processingTime: number } } | null>(null);
  const [ragError, setRagError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<VectorStats>(`/bots/${botId}/knowledge-base/vector-stats`);
        if (!cancelled) setVectorStats(res.success && res.data ? res.data : null);
      } catch {
        if (!cancelled) setVectorStats(null);
      }
    })();
    return () => { cancelled = true; };
  }, [botId, kbItems.length]);

  async function handleUrl(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    try {
      await api.post(`/bots/${botId}/knowledge-base/url`, { url: url.trim() });
      setUrl('');
      setShowUrl(false);
      onReload();
    } finally {
      setLoading(false);
    }
  }

  async function handleFaq(e: React.FormEvent) {
    e.preventDefault();
    if (!faqQ.trim() || !faqA.trim()) return;
    setLoading(true);
    try {
      await api.post(`/bots/${botId}/knowledge-base/faq`, { question: faqQ.trim(), answer: faqA.trim() });
      setFaqQ('');
      setFaqA('');
      setShowFaq(false);
      onReload();
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    try {
      await uploadFile(`/bots/${botId}/knowledge-base/upload`, file);
      setFile(null);
      onReload();
    } finally {
      setLoading(false);
    }
  }

  async function handleRagUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!ragFile && !ragUrl.trim()) return;
    setRagUploading(true);
    setRagResult(null);
    setRagError(null);
    try {
      const res = await uploadRagDocument(`/bots/${botId}/knowledge-base/upload-vector`, {
        file: ragFile || undefined,
        url: ragUrl.trim() || undefined,
      });
      setRagFile(null);
      setRagUrl('');
      setRagResult(res.data as { stats?: { totalChunks: number; documentTitle: string; processingTime: number } } || null);
      onReload();
      const statsRes = await api.get<VectorStats>(`/bots/${botId}/knowledge-base/vector-stats`);
      if (statsRes.success && statsRes.data) setVectorStats(statsRes.data);
    } catch (err) {
      setRagError(err instanceof Error ? err.message : 'Upload failed. Try again.');
    } finally {
      setRagUploading(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 mb-6">
        <h3 className="font-semibold text-emerald-400 mb-2">RAG (Vector) – 100% FREE</h3>
        <p className="text-slate-400 text-sm mb-4">
          Upload documents or URLs to train your bot with semantic search. Uses Qdrant + Gemini + Groq (free tiers).
        </p>
        {vectorStats != null && (
          <p className="text-slate-300 text-sm mb-4">
            Vector KB: <strong>{vectorStats.totalChunks}</strong> chunks · {vectorStats.collectionSizeMb}
          </p>
        )}
        {ragError && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-200 text-sm">
            {ragError}
          </div>
        )}
        <form onSubmit={handleRagUpload} className="space-y-3">
          <div>
            <label className="block text-sm text-slate-400 mb-1">File (PDF, DOCX, TXT, CSV)</label>
            <input
              type="file"
              accept=".pdf,.docx,.doc,.txt,.csv"
              onChange={(e) => setRagFile(e.target.files?.[0] || null)}
              className="text-slate-400 text-sm w-full"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Or website URL</label>
            <input
              type="url"
              value={ragUrl}
              onChange={(e) => setRagUrl(e.target.value)}
              placeholder="https://example.com/page"
              className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500"
            />
          </div>
          <button
            type="submit"
            disabled={ragUploading || (!ragFile && !ragUrl.trim())}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50"
          >
            {ragUploading ? 'Processing…' : 'Upload & train bot'}
          </button>
        </form>
        {ragResult?.stats && (
          <div className="mt-4 p-3 rounded-lg bg-white/5 text-sm text-slate-300">
            Done: {ragResult.stats.documentTitle} · {ragResult.stats.totalChunks} chunks · {ragResult.stats.processingTime}ms
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setShowUrl(!showUrl)} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 font-medium">
          Add URL
        </button>
        <button onClick={() => setShowFaq(!showFaq)} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 font-medium">
          Add FAQ
        </button>
      </div>
      {showUrl && (
        <form onSubmit={handleUrl} className="rounded-2xl border border-white/10 bg-white/5 p-6 mb-6 flex gap-2">
          <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." required className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white" />
          <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50">Add</button>
          <button type="button" onClick={() => setShowUrl(false)} className="px-4 py-2 rounded-lg bg-white/10">Cancel</button>
        </form>
      )}
      {showFaq && (
        <form onSubmit={handleFaq} className="rounded-2xl border border-white/10 bg-white/5 p-6 mb-6 space-y-4">
          <input type="text" value={faqQ} onChange={(e) => setFaqQ(e.target.value)} placeholder="Question" required className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white" />
          <input type="text" value={faqA} onChange={(e) => setFaqA(e.target.value)} placeholder="Answer" required className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white" />
          <div className="flex gap-2">
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50">Add FAQ</button>
            <button type="button" onClick={() => setShowFaq(false)} className="px-4 py-2 rounded-lg bg-white/10">Cancel</button>
          </div>
        </form>
      )}
      <form onSubmit={handleUpload} className="rounded-2xl border border-white/10 bg-white/5 p-6 mb-6 flex flex-wrap items-center gap-2">
        <input type="file" accept=".pdf,.docx,.txt,.csv" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-slate-400 text-sm" />
        <button type="submit" disabled={loading || !file} className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50">Upload</button>
      </form>
      <div className="space-y-3">
        {kbItems.length === 0 ? (
          <p className="text-slate-400">No knowledge base items. Add URLs, FAQs, or upload documents.</p>
        ) : (
          kbItems.map((item) => (
            <div key={item._id} className="rounded-xl border border-white/10 bg-white/5 p-4 flex justify-between items-center">
              <div>
                <p className="font-medium">{item.metadata?.title || item.type}</p>
                <p className="text-slate-400 text-sm">{item.type} · {item.processing?.status || '—'}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

interface ChannelStatus {
  enabled: boolean;
  configured: boolean;
}

function ChannelsTab({ botId }: { botId: string }) {
  const [channels, setChannels] = useState<Record<string, ChannelStatus>>({});
  const [embedCode, setEmbedCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [wa, setWa] = useState({ enabled: false, twilioAccountSid: '', twilioAuthToken: '', fromNumber: '' });
  const [fb, setFb] = useState({ enabled: false, pageAccessToken: '' });
  const [slack, setSlack] = useState({ enabled: false, botToken: '' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [chRes, embRes] = await Promise.all([
          api.get<Record<string, ChannelStatus>>(`/bots/${botId}/channels`),
          api.get<{ embedCode?: string }>(`/bots/${botId}/embed-code`),
        ]);
        if (cancelled) return;
        const ch = chRes.success && chRes.data ? chRes.data : {};
        setChannels(ch);
        setWa((p) => ({ ...p, enabled: ch.whatsapp?.enabled ?? p.enabled }));
        setFb((p) => ({ ...p, enabled: ch.facebook?.enabled ?? p.enabled }));
        setSlack((p) => ({ ...p, enabled: ch.slack?.enabled ?? p.enabled }));
        if (embRes.success && embRes.data?.embedCode)
          setEmbedCode(embRes.data.embedCode);
      } catch {
        if (!cancelled) setChannels({});
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [botId]);

  const copyEmbed = () => {
    if (embedCode) {
      navigator.clipboard.writeText(embedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  async function saveChannel(channel: string, body: Record<string, unknown>) {
    setSaving(channel);
    try {
      await api.put(`/bots/${botId}/channels/${channel}`, body);
      const res = await api.get<Record<string, ChannelStatus>>(`/bots/${botId}/channels`);
      if (res.success && res.data) setChannels(res.data);
    } finally {
      setSaving(null);
    }
  }

  if (loading) return <div className="text-slate-400">Loading channels...</div>;

  return (
    <div className="max-w-2xl space-y-8">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="font-semibold mb-2">Web embed</h2>
        <p className="text-slate-400 text-sm mb-3">Add the chat widget to your site. Paste this script before &lt;/body&gt;.</p>
        <pre className="rounded-lg bg-slate-900 p-4 text-sm text-slate-300 overflow-x-auto whitespace-pre-wrap break-all max-h-48 overflow-y-auto">{embedCode || '—'}</pre>
        <button type="button" onClick={copyEmbed} className="mt-2 flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500">
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied!' : 'Copy code'}
        </button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="font-semibold mb-4">WhatsApp (Twilio)</h2>
        <form onSubmit={(e) => { e.preventDefault(); saveChannel('whatsapp', { enabled: wa.enabled, twilioAccountSid: wa.twilioAccountSid || undefined, twilioAuthToken: wa.twilioAuthToken || undefined, fromNumber: wa.fromNumber || undefined }); }} className="space-y-3">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={wa.enabled} onChange={(e) => setWa((p) => ({ ...p, enabled: e.target.checked }))} className="rounded" />
            <span>Enable webhook</span>
          </label>
          <input type="text" placeholder="Twilio Account SID" value={wa.twilioAccountSid} onChange={(e) => setWa((p) => ({ ...p, twilioAccountSid: e.target.value }))} className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500" />
          <input type="password" placeholder="Twilio Auth Token" value={wa.twilioAuthToken} onChange={(e) => setWa((p) => ({ ...p, twilioAuthToken: e.target.value }))} className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500" />
          <input type="text" placeholder="WhatsApp From number (e.g. +14155238886)" value={wa.fromNumber} onChange={(e) => setWa((p) => ({ ...p, fromNumber: e.target.value }))} className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500" />
          <button type="submit" disabled={saving === 'whatsapp'} className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50">Save</button>
        </form>
        {channels.whatsapp?.configured && <p className="text-emerald-400 text-sm mt-2">Configured. Enter new values to update.</p>}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="font-semibold mb-4">Facebook Messenger</h2>
        <form onSubmit={(e) => { e.preventDefault(); saveChannel('facebook', { enabled: fb.enabled, pageAccessToken: fb.pageAccessToken || undefined }); }} className="space-y-3">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={fb.enabled} onChange={(e) => setFb((p) => ({ ...p, enabled: e.target.checked }))} className="rounded" />
            <span>Enable webhook</span>
          </label>
          <input type="password" placeholder="Page Access Token" value={fb.pageAccessToken} onChange={(e) => setFb((p) => ({ ...p, pageAccessToken: e.target.value }))} className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500" />
          <button type="submit" disabled={saving === 'facebook'} className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50">Save</button>
        </form>
        {channels.facebook?.configured && <p className="text-emerald-400 text-sm mt-2">Configured. Enter new token to update.</p>}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="font-semibold mb-4">Slack</h2>
        <form onSubmit={(e) => { e.preventDefault(); saveChannel('slack', { enabled: slack.enabled, botToken: slack.botToken || undefined }); }} className="space-y-3">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={slack.enabled} onChange={(e) => setSlack((p) => ({ ...p, enabled: e.target.checked }))} className="rounded" />
            <span>Enable webhook</span>
          </label>
          <input type="password" placeholder="Bot OAuth Token (xoxb-...)" value={slack.botToken} onChange={(e) => setSlack((p) => ({ ...p, botToken: e.target.value }))} className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500" />
          <button type="submit" disabled={saving === 'slack'} className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50">Save</button>
        </form>
        {channels.slack?.configured && <p className="text-emerald-400 text-sm mt-2">Configured. Enter new token to update.</p>}
      </div>
    </div>
  );
}

interface ConvItem {
  _id: string;
  sessionId: string;
  status: string;
  channel: string;
  messages: { sender: string; text: string }[];
  lastActivityAt: string;
  escalation?: { wasEscalated: boolean; reason?: string };
}

function ConversationsTab({ botId }: { botId: string }) {
  const [convs, setConvs] = useState<ConvItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'escalated'>('all');

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<ConvItem[]>(`/bots/${botId}/conversations${filter === 'escalated' ? '?status=escalated' : ''}`);
        if (res.success && res.data) setConvs(Array.isArray(res.data) ? res.data : []);
      } catch {
        setConvs([]);
      }
      setLoading(false);
    })();
  }, [botId, filter]);

  async function resolve(conversationId: string) {
    try {
      await api.post(`/bots/${botId}/conversations/${conversationId}/resolve`, {});
      setConvs((prev) => prev.filter((c) => c._id !== conversationId));
    } catch {}
  }

  if (loading) return <div className="text-slate-400">Loading...</div>;
  return (
    <div className="max-w-3xl">
      <div className="flex gap-2 mb-4">
        <button type="button" onClick={() => setFilter('all')} className={`px-4 py-2 rounded-xl ${filter === 'all' ? 'bg-violet-600' : 'bg-white/10'}`}>All</button>
        <button type="button" onClick={() => setFilter('escalated')} className={`px-4 py-2 rounded-xl ${filter === 'escalated' ? 'bg-violet-600' : 'bg-white/10'}`}>Escalated</button>
      </div>
      {convs.length === 0 ? (
        <p className="text-slate-400">No conversations.</p>
      ) : (
        <div className="space-y-3">
          {convs.map((c) => (
            <div key={c._id} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <p className="text-slate-400 text-sm">{c.sessionId.slice(0, 16)}... · {c.channel} · {c.status}</p>
                  <p className="text-white mt-1 line-clamp-2">{c.messages?.[c.messages.length - 1]?.text || '—'}</p>
                </div>
                {c.status === 'escalated' && (
                  <button type="button" onClick={() => resolve(c._id)} className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm">Resolve</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface LeadItem {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
  capturedAt: string;
  channel: string;
}

function LeadsTab({ botId }: { botId: string }) {
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<LeadItem[]>(`/bots/${botId}/leads`);
        if (res.success && res.data) setLeads(Array.isArray(res.data) ? res.data : []);
      } catch {
        setLeads([]);
      }
      setLoading(false);
    })();
  }, [botId]);

  if (loading) return <div className="text-slate-400">Loading...</div>;
  return (
    <div className="max-w-3xl">
      {leads.length === 0 ? (
        <p className="text-slate-400">No leads captured yet. Enable Lead capture in Overview and use POST /api/chat/:botId/lead with sessionId, name, email, phone.</p>
      ) : (
        <div className="space-y-3">
          {leads.map((l) => (
            <div key={l._id} className="rounded-xl border border-white/10 bg-white/5 p-4 flex justify-between items-center">
              <div>
                <p className="font-medium">{l.name || '—'}</p>
                <p className="text-slate-400 text-sm">{l.email || '—'} · {l.phone || '—'}</p>
                <p className="text-slate-500 text-xs">{new Date(l.capturedAt).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface AnalyticsData {
  totalConversations: number;
  totalMessages: number;
  averageRating: number;
  activeUsers: number;
  messagesByDay?: { date: string; count: number }[];
}

function AnalyticsTab({ botId }: { botId: string }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<AnalyticsData>(`/bots/${botId}/analytics`);
        if (res.success && res.data) setData(res.data);
      } catch {
        setData(null);
      }
      setLoading(false);
    })();
  }, [botId]);

  if (loading) return <div className="text-slate-400">Loading analytics...</div>;
  if (!data) return <div className="text-slate-400">No analytics data yet.</div>;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-3xl font-bold text-violet-400">{data.totalConversations}</p>
          <p className="text-slate-400 text-sm">Total conversations</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-3xl font-bold text-violet-400">{data.totalMessages}</p>
          <p className="text-slate-400 text-sm">Total messages</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-3xl font-bold text-violet-400">{data.averageRating > 0 ? data.averageRating.toFixed(1) : '—'}</p>
          <p className="text-slate-400 text-sm">Average rating</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-3xl font-bold text-violet-400">{data.activeUsers}</p>
          <p className="text-slate-400 text-sm">Active users (sessions)</p>
        </div>
      </div>
      {data.messagesByDay && data.messagesByDay.length > 0 && (() => {
        const maxCount = Math.max(1, ...data.messagesByDay.map((x) => x.count));
        return (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="font-semibold mb-4">Messages (last 7 days)</h2>
            <div className="space-y-2">
              {data.messagesByDay.map((d) => (
                <div key={d.date} className="flex items-center gap-4">
                  <span className="text-slate-400 w-24">{d.date}</span>
                  <div className="flex-1 h-6 bg-slate-800 rounded overflow-hidden">
                    <div className="h-full bg-violet-500 rounded" style={{ width: `${Math.min(100, (d.count / maxCount) * 100)}%` }} />
                  </div>
                  <span className="text-white font-medium w-10">{d.count}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function TestTab({ botId, welcomeMessage }: { botId: string; welcomeMessage?: string }) {
  const [messages, setMessages] = useState<{ role: 'user' | 'bot'; text: string }[]>(() =>
    welcomeMessage ? [{ role: 'bot' as const, text: welcomeMessage }] : [{ role: 'bot' as const, text: 'Hello! How can I help?' }]
  );
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setSending(true);
    try {
      const res = await api.post<{ response: { text: string }; intent?: string; confidence?: number; source?: string }>(`/bots/${botId}/test`, { message: text });
      const botText = res.data?.response?.text || "I didn't understand that.";
      setMessages((prev) => [...prev, { role: 'bot', text: botText }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'bot', text: 'Something went wrong. Please try again.' }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden flex flex-col" style={{ height: '480px' }}>
        <div className="p-4 border-b border-white/10 bg-white/5 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-violet-400" />
          <span className="font-medium">Test your bot</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2 ${m.role === 'user' ? 'bg-violet-600 text-white' : 'bg-white/10 text-slate-200'}`}>
                {m.text}
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-white/10 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <button
            onClick={send}
            disabled={sending || !input.trim()}
            className="px-4 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
