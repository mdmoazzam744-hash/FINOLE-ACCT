/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  Receipt,
  ClipboardCheck,
  Sparkles,
  Briefcase,
  FileSpreadsheet,
  Plus,
  Menu,
  X,
  RotateCcw,
} from 'lucide-react';
import type {
  AdvisoryMemo,
  AuditQuery,
  ClientDocument,
  ClientEntity,
  CtAdjustment,
  Emirate,
  JournalEntry,
  LegalForm,
  VatPeriodState,
  WorkingPaper,
  WorkspaceModule,
} from './types/finance';
import { OverviewModule } from './components/OverviewModule';
import { AccountingModule } from './components/AccountingModule';
import { TaxComplianceModule } from './components/TaxComplianceModule';
import { AuditingModule } from './components/AuditingModule';
import { AiAssistantModule } from './components/AiAssistantModule';
import { ConsultancyModule } from './components/ConsultancyModule';
import { ReportsModule } from './components/ReportsModule';
import { AddClientModal } from './components/AddClientModal';

const NAV_ITEMS: Array<{
  id: WorkspaceModule;
  label: string;
  subtitle: string;
  icon: React.FC<{ className?: string }>;
}> = [
  { id: 'overview', label: 'Dashboard', subtitle: 'Practice Overview', icon: LayoutDashboard },
  { id: 'accounting', label: 'Accounting', subtitle: 'Ledgers & Trial Balance', icon: BookOpen },
  { id: 'tax', label: 'VAT & Tax', subtitle: 'FTA Compliance', icon: Receipt },
  { id: 'auditing', label: 'Auditing', subtitle: 'Audit Working Papers', icon: ClipboardCheck },
  { id: 'ai', label: 'AI Assistant', subtitle: 'Financial Analysis', icon: Sparkles },
  { id: 'consultancy', label: 'Consultancy', subtitle: 'Client Advisory', icon: Briefcase },
  { id: 'reports', label: 'Reports', subtitle: 'IFRS Financial Statements', icon: FileSpreadsheet },
];

export default function App() {
  const [clients, setClients] = useState<ClientEntity[]>([]);
  const [activeClientId, setActiveClientId] = useState<string>('');
  const [activeModule, setActiveModule] = useState<WorkspaceModule>('overview');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);

  const fetchWorkspace = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/workspace');
      if (!res.ok) throw new Error(`Failed to load workspace (${res.status})`);
      const data = (await res.json()) as { clients: ClientEntity[] };
      setClients(data.clients);
      if (data.clients.length > 0 && !activeClientId) {
        setActiveClientId(data.clients[0].id);
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Unable to connect to workspace API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspace();
  }, []);

  const activeClient =
    clients.find((c) => c.id === activeClientId) ?? clients[0] ?? null;

  const replaceClientInState = (updated: ClientEntity) => {
    setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  const handleResetDemo = async () => {
    const res = await fetch('/api/workspace/reset', { method: 'POST' });
    if (res.ok) {
      const data = (await res.json()) as { clients: ClientEntity[] };
      setClients(data.clients);
      if (data.clients[0]) setActiveClientId(data.clients[0].id);
    }
  };

  const handleCreateClient = async (payload: {
    name: string;
    legalForm: LegalForm;
    emirate: Emirate;
    industry: string;
    trn: string;
    tradeLicense: string;
    shareCapital: number;
    isQualifyingFreeZone: boolean;
  }) => {
    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { client?: ClientEntity; error?: string };
    if (!res.ok || !data.client) throw new Error(data.error || 'Failed to create client');
    setClients((prev) => [data.client!, ...prev]);
    setActiveClientId(data.client.id);
  };

  const handlePostJournal = async (entry: Omit<JournalEntry, 'id'>) => {
    if (!activeClient) return;
    const res = await fetch(`/api/clients/${activeClient.id}/journals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
    const data = (await res.json()) as { client?: ClientEntity; error?: string };
    if (!res.ok || !data.client) throw new Error(data.error || 'Failed to post journal');
    replaceClientInState(data.client);
  };

  const handleUpdateVat = async (patch: Partial<VatPeriodState>) => {
    if (!activeClient) return;
    const res = await fetch(`/api/clients/${activeClient.id}/vat`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const data = (await res.json()) as { client?: ClientEntity };
    if (res.ok && data.client) replaceClientInState(data.client);
  };

  const handleUpdateClientSettings = async (patch: Partial<ClientEntity>) => {
    if (!activeClient) return;
    const res = await fetch(`/api/clients/${activeClient.id}/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const data = (await res.json()) as { client?: ClientEntity };
    if (res.ok && data.client) replaceClientInState(data.client);
  };

  const handleAddCtAdjustment = async (adj: Omit<CtAdjustment, 'id' | 'enabled'>) => {
    if (!activeClient) return;
    const res = await fetch(`/api/clients/${activeClient.id}/ct-adjustments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(adj),
    });
    const data = (await res.json()) as { client?: ClientEntity };
    if (res.ok && data.client) replaceClientInState(data.client);
  };

  const handleToggleCtAdjustment = async (adjId: string, enabled: boolean) => {
    if (!activeClient) return;
    const res = await fetch(`/api/clients/${activeClient.id}/ct-adjustments/${adjId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
    const data = (await res.json()) as { client?: ClientEntity };
    if (res.ok && data.client) replaceClientInState(data.client);
  };

  const handleUpdateWorkingPaper = async (wpId: string, patch: Partial<WorkingPaper>) => {
    if (!activeClient) return;
    const res = await fetch(`/api/clients/${activeClient.id}/working-papers/${wpId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const data = (await res.json()) as { client?: ClientEntity };
    if (res.ok && data.client) replaceClientInState(data.client);
  };

  const handleCreateQuery = async (query: {
    wpRef: string;
    title: string;
    priority: 'High' | 'Medium' | 'Low';
    assignedTo: string;
    question: string;
  }) => {
    if (!activeClient) return;
    const res = await fetch(`/api/clients/${activeClient.id}/queries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query),
    });
    const data = (await res.json()) as { client?: ClientEntity };
    if (res.ok && data.client) replaceClientInState(data.client);
  };

  const handleUpdateQuery = async (queryId: string, patch: Partial<AuditQuery>) => {
    if (!activeClient) return;
    const res = await fetch(`/api/clients/${activeClient.id}/queries/${queryId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const data = (await res.json()) as { client?: ClientEntity };
    if (res.ok && data.client) replaceClientInState(data.client);
  };

  const handleAddDocument = async (doc: {
    title: string;
    category: ClientDocument['category'];
    requiredBy: string;
  }) => {
    if (!activeClient) return;
    const res = await fetch(`/api/clients/${activeClient.id}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doc),
    });
    const data = (await res.json()) as { client?: ClientEntity };
    if (res.ok && data.client) replaceClientInState(data.client);
  };

  const handleUpdateDocument = async (docId: string, patch: Partial<ClientDocument>) => {
    if (!activeClient) return;
    const res = await fetch(`/api/clients/${activeClient.id}/documents/${docId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const data = (await res.json()) as { client?: ClientEntity };
    if (res.ok && data.client) replaceClientInState(data.client);
  };

  const handleAddAdvisory = async (memo: Omit<AdvisoryMemo, 'id' | 'createdAt'>) => {
    if (!activeClient) return;
    const res = await fetch(`/api/clients/${activeClient.id}/advisories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(memo),
    });
    const data = (await res.json()) as { client?: ClientEntity };
    if (res.ok && data.client) replaceClientInState(data.client);
  };

  const currentNav = NAV_ITEMS.find((n) => n.id === activeModule) ?? NAV_ITEMS[0];

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Mobile Sidebar Backdrop */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* Left Sidebar Navigation (260px) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-100 flex flex-col justify-between transition-transform duration-200 lg:static lg:translate-x-0 no-print ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Brand Wordmark */}
          <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800">
            <a
              href="#overview"
              onClick={(e) => {
                e.preventDefault();
                setActiveModule('overview');
                setMobileNavOpen(false);
              }}
              className="flex items-center gap-2.5 text-sm font-semibold tracking-tight text-white whitespace-nowrap shrink-0"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                className="shrink-0 text-emerald-400"
                aria-hidden="true"
              >
                <rect x="2" y="2" width="20" height="20" rx="4" stroke="currentColor" strokeWidth="1.75" />
                <path d="M7 15L10.5 11.5L13.5 14L17 9" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>UAE Finance &amp; Audit Pro</span>
            </a>
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              className="lg:hidden p-1 text-slate-400 hover:text-white cursor-pointer"
              aria-label="Close navigation"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Primary Navigation */}
          <nav className="p-3 space-y-1" aria-label="Workspace modules">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeModule === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveModule(item.id);
                    setMobileNavOpen(false);
                  }}
                  className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 mt-0.5 shrink-0 ${
                      isActive ? 'text-emerald-400' : 'text-slate-400'
                    }`}
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-medium leading-tight whitespace-nowrap">
                      {item.label}
                    </div>
                    <div className="text-xs text-slate-400 truncate mt-0.5">{item.subtitle}</div>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Managing Partner Profile Footer */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3">
            {avatarFailed ? (
              <div className="w-9 h-9 rounded-lg bg-slate-700 text-white text-xs font-semibold flex items-center justify-center shrink-0">
                TA
              </div>
            ) : (
              <img
                src="/src/assets/images/avatar_audit_partner_1794929532198.jpg"
                alt="Tariq Al Mansoori, CPA"
                referrerPolicy="no-referrer"
                onError={() => setAvatarFailed(true)}
                className="w-9 h-9 rounded-lg object-cover shrink-0 border border-slate-700"
              />
            )}
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white truncate">
                Tariq Al Mansoori, CPA
              </div>
              <div className="text-xs text-slate-400 truncate">Managing Partner · FTA Agent</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Header Bar (3 Zones: Breadcrumb, Client Switcher, Primary CTA) */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-8 sticky top-0 z-30 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 cursor-pointer"
              aria-label="Open navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-slate-400 hidden sm:inline whitespace-nowrap">
                UAE Practice
              </span>
              <span className="text-slate-300 hidden sm:inline" aria-hidden="true">
                /
              </span>
              <span className="font-semibold text-slate-900 truncate whitespace-nowrap">
                {currentNav.label}
              </span>
              <span className="text-slate-400 hidden md:inline whitespace-nowrap">
                · {currentNav.subtitle}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {clients.length > 0 && (
              <select
                aria-label="Select UAE client entity"
                value={activeClient?.id ?? ''}
                onChange={(e) => setActiveClientId(e.target.value)}
                className="px-3 py-1.5 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-300 rounded-lg max-w-[230px] sm:max-w-[280px] truncate cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-900/15"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              onClick={() => setAddClientOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Client
            </button>
          </div>
        </header>

        {/* Unboxed Active Client Metadata Bar */}
        {activeClient && (
          <div className="bg-white border-b border-slate-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 no-print">
            <div className="flex flex-wrap items-center gap-2 font-mono tabular-nums">
              <span className="font-sans font-medium text-slate-800">{activeClient.name}</span>
              <span aria-hidden="true">·</span>
              <span>TRN {activeClient.trn}</span>
              <span aria-hidden="true">·</span>
              <span>{activeClient.ctNumber}</span>
              <span aria-hidden="true">·</span>
              <span className="font-sans">FY Ending {activeClient.fiscalYearEnd}</span>
            </div>
            <button
              type="button"
              onClick={handleResetDemo}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Practice Data
            </button>
          </div>
        )}

        {/* Main Viewport */}
        <main className="flex-1 p-6 lg:p-8 max-w-[1400px] w-full mx-auto">
          {loading ? (
            <div className="space-y-6">
              <div className="h-8 w-72 bg-slate-200 rounded animate-pulse" />
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="h-28 bg-white border border-slate-200 rounded-xl" />
                ))}
              </div>
              <div className="h-72 bg-white border border-slate-200 rounded-xl" />
            </div>
          ) : loadError ? (
            <div className="bg-white border border-red-200 rounded-xl p-8 text-center max-w-md mx-auto">
              <h2 className="text-base font-semibold text-slate-900">Unable to Load Practice Data</h2>
              <p className="text-xs text-slate-600 mt-1">{loadError}</p>
              <button
                type="button"
                onClick={fetchWorkspace}
                className="mt-4 px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                Retry Connection
              </button>
            </div>
          ) : !activeClient ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
              <h2 className="text-base font-semibold text-slate-900">No Client Entities Found</h2>
              <p className="text-xs text-slate-500 mt-1">
                Onboard your first UAE company to begin accounting, VAT 201, and audit work.
              </p>
              <button
                type="button"
                onClick={() => setAddClientOpen(true)}
                className="mt-4 px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg cursor-pointer"
              >
                Add First UAE Client
              </button>
            </div>
          ) : (
            <>
              {activeModule === 'overview' && (
                <OverviewModule
                  clients={clients}
                  activeClient={activeClient}
                  onSelectClient={setActiveClientId}
                  onNavigate={setActiveModule}
                />
              )}
              {activeModule === 'accounting' && (
                <AccountingModule client={activeClient} onPostJournal={handlePostJournal} />
              )}
              {activeModule === 'tax' && (
                <TaxComplianceModule
                  client={activeClient}
                  onUpdateVat={handleUpdateVat}
                  onUpdateClientSettings={handleUpdateClientSettings}
                  onAddCtAdjustment={handleAddCtAdjustment}
                  onToggleCtAdjustment={handleToggleCtAdjustment}
                />
              )}
              {activeModule === 'auditing' && (
                <AuditingModule
                  client={activeClient}
                  onUpdateWorkingPaper={handleUpdateWorkingPaper}
                  onCreateQuery={handleCreateQuery}
                  onUpdateQuery={handleUpdateQuery}
                  onAddDocument={handleAddDocument}
                  onUpdateDocument={handleUpdateDocument}
                />
              )}
              {activeModule === 'ai' && (
                <AiAssistantModule client={activeClient} onSaveAdvisory={handleAddAdvisory} />
              )}
              {activeModule === 'consultancy' && (
                <ConsultancyModule client={activeClient} onAddAdvisory={handleAddAdvisory} />
              )}
              {activeModule === 'reports' && <ReportsModule client={activeClient} />}
            </>
          )}
        </main>
      </div>

      <AddClientModal
        isOpen={addClientOpen}
        onClose={() => setAddClientOpen(false)}
        onCreateClient={handleCreateClient}
      />
    </div>
  );
}
