import React, { useMemo, useState } from 'react';
import { BookmarkPlus, Send, Sparkles, AlertCircle, Check } from 'lucide-react';
import type { AdvisoryMemo, AiChatMessage, ClientEntity } from '../types/finance';
import {
  computeCorporateTax,
  computeIfrsStatements,
  computeMateriality,
  computeVat201,
  formatAED,
} from '../utils/accounting';

interface AiAssistantModuleProps {
  client: ClientEntity;
  onSaveAdvisory: (memo: Omit<AdvisoryMemo, 'id' | 'createdAt'>) => Promise<void>;
}

const DIAGNOSTIC_PROMPTS = [
  {
    id: 'audit-risk',
    label: 'Audit Risk & Anomaly Scan',
    prompt:
      'Perform an ISA 315 / 240 audit risk & anomaly scan on the active client financials. Highlight key audit areas relative to planning materiality, open audit queries, and missing PBC evidence.',
  },
  {
    id: 'vat-check',
    label: 'FTA VAT 201 Reconciliation',
    prompt:
      'Review our FTA Form VAT 201 return for the current period. Verify Emirate-wise output supplies, zero-rated vs standard supplies, reverse charge treatment, and flag any FTA audit exposure.',
  },
  {
    id: 'ct-opt',
    label: 'Corporate Tax Advisory (Law 47)',
    prompt:
      'Analyze our UAE Corporate Tax position under Federal Decree-Law No. 47. Evaluate our effective tax rate, Article 33 add-backs, Article 21 Small Business Relief or Article 18 QFZP eligibility, and lawful optimization actions.',
  },
  {
    id: 'ifrs-memo',
    label: 'IFRS Liquidity & Ratio Memo',
    prompt:
      'Draft an executive financial health memo covering gross margin, net profitability, liquidity ratios, working capital pressure, and strategic board recommendations in AED.',
  },
];

export const AiAssistantModule: React.FC<AiAssistantModuleProps> = ({
  client,
  onSaveAdvisory,
}) => {
  const [messagesByClient, setMessagesByClient] = useState<Record<string, AiChatMessage[]>>({});
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Record<string, boolean>>({});

  const ifrs = useMemo(() => computeIfrsStatements(client), [client]);
  const vat = useMemo(() => computeVat201(client), [client]);
  const ct = useMemo(() => computeCorporateTax(client), [client]);
  const mat = useMemo(() => computeMateriality(client), [client]);

  const messages = messagesByClient[client.id] ?? [];

  const sendPrompt = async (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed || loading) return;

    setErrorMsg(null);
    const userMessage: AiChatMessage = {
      id: `msg-u-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const nextHistory = [...messages, userMessage];
    setMessagesByClient((prev) => ({ ...prev, [client.id]: nextHistory }));
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          prompt: trimmed,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = (await res.json()) as { text?: string; model?: string; error?: string };

      if (!res.ok || !data.text) {
        throw new Error(data.error || `Request failed with status ${res.status}`);
      }

      const aiMessage: AiChatMessage = {
        id: `msg-a-${Date.now()}`,
        role: 'assistant',
        content: data.text,
        model: data.model,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessagesByClient((prev) => ({
        ...prev,
        [client.id]: [...nextHistory, aiMessage],
      }));
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to complete AI analysis.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToAdvisory = async (msg: AiChatMessage) => {
    const firstLine = msg.content.split('\n').find((l) => l.trim().length > 0) ?? 'AI Advisory Insight';
    const cleanTitle = firstLine.replace(/^[#*\s]+/, '').slice(0, 80);

    await onSaveAdvisory({
      title: cleanTitle || `AI Financial Review — ${client.name}`,
      domain: 'Corporate Tax',
      status: 'Proposed',
      impactSummary: `Generated from live ledger & FTA context (${client.vatPeriod.periodLabel}).`,
      memoBody: msg.content,
    });
    setSavedIds((prev) => ({ ...prev, [msg.id]: true }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">
          AI Financial &amp; Audit Analyst
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Live UAE tax, IFRS &amp; ISA analysis grounded directly in {client.name}&apos;s trial balance and FTA filings.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Context & Quick Prompts */}
        <aside className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <h2 className="text-xs font-semibold text-slate-900">
              Live Context Supplied to AI
            </h2>
            <div className="divide-y divide-slate-200 text-xs">
              <div className="py-2 flex justify-between">
                <span className="text-slate-500">YTD Revenue</span>
                <span className="font-mono tabular-nums font-medium text-slate-900">
                  {formatAED(ifrs.revenue)}
                </span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-500">Profit Before Tax</span>
                <span className="font-mono tabular-nums font-medium text-slate-900">
                  {formatAED(ifrs.profitBeforeTax)}
                </span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-500">Net VAT 201</span>
                <span className="font-mono tabular-nums font-medium text-slate-900">
                  {formatAED(vat.netVatPayable)}
                </span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-500">Corporate Tax (9%)</span>
                <span className="font-mono tabular-nums font-medium text-slate-900">
                  {formatAED(ct.corporateTaxPayable)}
                </span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-500">ISA Materiality</span>
                <span className="font-mono tabular-nums font-medium text-slate-900">
                  {formatAED(mat.planningMateriality)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2.5">
            <h2 className="text-xs font-semibold text-slate-900 mb-1">
              Partner Diagnostic Workflows
            </h2>
            {DIAGNOSTIC_PROMPTS.map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={loading}
                onClick={() => sendPrompt(item.prompt)}
                className="w-full text-left px-3.5 py-2.5 text-xs font-medium text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center justify-between gap-2 disabled:opacity-50 cursor-pointer"
              >
                <span>{item.label}</span>
                <Sparkles className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              </button>
            ))}
          </div>
        </aside>

        {/* Right Conversation Workspace */}
        <section className="lg:col-span-8 bg-white border border-slate-200 rounded-xl flex flex-col min-h-[560px]">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900">
                Advisory Session · {client.name}
              </div>
              <div className="text-xs text-slate-500">
                TRN {client.trn} · {client.legalForm}
              </div>
            </div>
          </div>

          <div className="flex-1 p-6 space-y-5 overflow-y-auto max-h-[560px]">
            {messages.length === 0 ? (
              <div className="py-16 text-center max-w-md mx-auto space-y-3">
                <Sparkles className="w-6 h-6 text-slate-400 mx-auto" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Ready for UAE Audit &amp; Tax Analysis
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Select a diagnostic workflow on the left or ask any question regarding{' '}
                  {client.name}&apos;s Trial Balance, FTA VAT 201 boxes, Corporate Tax adjustments, or IFRS disclosures.
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[90%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-50 border border-slate-200 text-slate-900'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                  <div className="mt-1.5 flex items-center gap-3 text-xs text-slate-500">
                    <span>
                      {msg.role === 'user' ? 'Partner' : 'AI Analyst'} · {msg.timestamp}
                    </span>
                    {msg.role === 'assistant' && (
                      <button
                        type="button"
                        disabled={savedIds[msg.id]}
                        onClick={() => handleSaveToAdvisory(msg)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-slate-900 cursor-pointer disabled:text-emerald-700"
                      >
                        {savedIds[msg.id] ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            Saved to Consultancy
                          </>
                        ) : (
                          <>
                            <BookmarkPlus className="w-3.5 h-3.5" />
                            Save to Client Advisory
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}

            {loading && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-600 max-w-md">
                Analyzing {client.name}&apos;s trial balance, VAT 201 schedule, and Corporate Tax position...
              </div>
            )}

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">AI Analysis Unavailable</div>
                  <div className="mt-0.5">{errorMsg}</div>
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendPrompt(input);
            }}
            className="p-4 border-t border-slate-200 flex items-center gap-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask about ${client.name}'s VAT 201, 9% Corporate Tax, or audit risks...`}
              className="flex-1 px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/15"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              Analyze
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};
