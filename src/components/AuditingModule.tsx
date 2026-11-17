import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ClipboardCheck,
  FileText,
  MessageSquare,
  Plus,
  Upload,
} from 'lucide-react';
import type {
  AuditQuery,
  ClientDocument,
  ClientEntity,
  WorkingPaper,
} from '../types/finance';
import { computeMateriality, formatAED } from '../utils/accounting';

interface AuditingModuleProps {
  client: ClientEntity;
  onUpdateWorkingPaper: (wpId: string, patch: Partial<WorkingPaper>) => Promise<void>;
  onCreateQuery: (query: {
    wpRef: string;
    title: string;
    priority: 'High' | 'Medium' | 'Low';
    assignedTo: string;
    question: string;
  }) => Promise<void>;
  onUpdateQuery: (queryId: string, patch: Partial<AuditQuery>) => Promise<void>;
  onAddDocument: (doc: {
    title: string;
    category: ClientDocument['category'];
    requiredBy: string;
  }) => Promise<void>;
  onUpdateDocument: (docId: string, patch: Partial<ClientDocument>) => Promise<void>;
}

export const AuditingModule: React.FC<AuditingModuleProps> = ({
  client,
  onUpdateWorkingPaper,
  onCreateQuery,
  onUpdateQuery,
  onAddDocument,
  onUpdateDocument,
}) => {
  const [subTab, setSubTab] = useState<'wps' | 'queries' | 'pbc'>('wps');
  const [selectedWpId, setSelectedWpId] = useState<string>(
    client.workingPapers[0]?.id ?? ''
  );
  const [wpConclusionDraft, setWpConclusionDraft] = useState<string>('');
  const [savingWp, setSavingWp] = useState(false);

  // Query form
  const [queryWpRef, setQueryWpRef] = useState(client.workingPapers[0]?.ref ?? 'WP-A10');
  const [queryTitle, setQueryTitle] = useState('');
  const [queryPriority, setQueryPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [queryAssignedTo, setQueryAssignedTo] = useState('Client CFO');
  const [queryQuestion, setQueryQuestion] = useState('');
  const [responseDrafts, setResponseDrafts] = useState<Record<string, string>>({});

  // Document form
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState<ClientDocument['category']>('Statutory');
  const [docDue, setDocDue] = useState('2026-11-30');

  const materiality = useMemo(() => computeMateriality(client), [client]);
  const openQueriesCount = client.auditQueries.filter((q) => q.status !== 'Resolved').length;
  const missingDocsCount = client.documents.filter((d) => d.status === 'Missing').length;

  const activeWp =
    client.workingPapers.find((w) => w.id === selectedWpId) ?? client.workingPapers[0];

  const handleSelectWp = (wp: WorkingPaper) => {
    setSelectedWpId(wp.id);
    setWpConclusionDraft(wp.conclusion);
  };

  const handleSaveWp = async (status?: WorkingPaper['status']) => {
    if (!activeWp) return;
    setSavingWp(true);
    try {
      await onUpdateWorkingPaper(activeWp.id, {
        conclusion: wpConclusionDraft || activeWp.conclusion,
        status: status ?? activeWp.status,
      });
    } finally {
      setSavingWp(false);
    }
  };

  const handleRaiseQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryTitle.trim() || !queryQuestion.trim()) return;
    await onCreateQuery({
      wpRef: queryWpRef,
      title: queryTitle.trim(),
      priority: queryPriority,
      assignedTo: queryAssignedTo.trim() || 'Client CFO',
      question: queryQuestion.trim(),
    });
    setQueryTitle('');
    setQueryQuestion('');
  };

  const handleRequestDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim()) return;
    await onAddDocument({
      title: docTitle.trim(),
      category: docCategory,
      requiredBy: docDue,
    });
    setDocTitle('');
  };

  return (
    <div className="space-y-6">
      {/* Header + Sub-tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Audit Working Papers &amp; Client PBC
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            ISA-compliant fieldwork file · Engagement Partner: {client.auditPartner} · Stage: {client.auditStatus}
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg self-start overflow-x-auto">
          <button
            type="button"
            onClick={() => setSubTab('wps')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              subTab === 'wps' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Working Papers ({client.workingPapers.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('queries')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              subTab === 'queries' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Audit Queries ({openQueriesCount} Open)
          </button>
          <button
            type="button"
            onClick={() => setSubTab('pbc')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              subTab === 'pbc' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Client PBC Documents ({missingDocsCount} Missing)
          </button>
        </div>
      </div>

      {/* ISA 320 Materiality Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border border-slate-200 bg-white rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
        <div className="p-4">
          <div className="text-xs font-medium text-slate-500">ISA 320 Benchmark</div>
          <div className="mt-1 text-sm font-semibold text-slate-900">{materiality.benchmarkLabel}</div>
          <div className="mt-1 text-xs font-mono tabular-nums text-slate-500">
            Base: {formatAED(materiality.benchmarkAmount)}
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs font-medium text-slate-500">Planning Materiality</div>
          <div className="mt-1 text-lg font-semibold text-slate-900 font-mono tabular-nums">
            {formatAED(materiality.planningMateriality)}
          </div>
          <div className="mt-1 text-xs text-slate-500">Overall FS threshold</div>
        </div>
        <div className="p-4">
          <div className="text-xs font-medium text-slate-500">Performance Materiality (75%)</div>
          <div className="mt-1 text-lg font-semibold text-slate-900 font-mono tabular-nums">
            {formatAED(materiality.performanceMateriality)}
          </div>
          <div className="mt-1 text-xs text-slate-500">Substantive testing limit</div>
        </div>
        <div className="p-4">
          <div className="text-xs font-medium text-slate-500">Clearly Trivial (5%)</div>
          <div className="mt-1 text-lg font-semibold text-slate-900 font-mono tabular-nums">
            {formatAED(materiality.clearlyTrivial)}
          </div>
          <div className="mt-1 text-xs text-slate-500">SUM posting threshold</div>
        </div>
      </div>

      {subTab === 'wps' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-slate-500" />
              <h2 className="text-base font-semibold text-slate-900">Audit Working Paper Index</h2>
            </div>
            <div className="divide-y divide-slate-200">
              {client.workingPapers.map((wp) => {
                const isSelected = activeWp?.id === wp.id;
                return (
                  <div
                    key={wp.id}
                    onClick={() => handleSelectWp(wp)}
                    className={`px-6 py-3.5 cursor-pointer transition-colors flex items-start justify-between gap-4 ${
                      isSelected ? 'bg-slate-100/80' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-slate-700">
                          {wp.ref}
                        </span>
                        <span className="text-slate-300" aria-hidden="true">·</span>
                        <span className="text-sm font-medium text-slate-900 truncate">
                          {wp.title}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {wp.isaStandard} · Prep: {wp.preparer} · Rev: {wp.reviewer}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div
                        className={`text-xs font-medium ${
                          wp.status === 'Signed Off'
                            ? 'text-emerald-700'
                            : wp.status === 'Reviewed'
                            ? 'text-sky-700'
                            : wp.status === 'In Progress'
                            ? 'text-amber-700'
                            : 'text-slate-500'
                        }`}
                      >
                        {wp.status}
                      </div>
                      <div
                        className={`text-xs mt-0.5 ${
                          wp.risk === 'High'
                            ? 'text-red-700'
                            : wp.risk === 'Medium'
                            ? 'text-amber-700'
                            : 'text-slate-500'
                        }`}
                      >
                        {wp.risk} Risk
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Inspector / Sign-off Panel */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            {activeWp ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-slate-600">
                    {activeWp.ref} · {activeWp.isaStandard}
                  </span>
                  <span className="text-xs font-mono text-slate-500">Updated {activeWp.updatedAt}</span>
                </div>
                <h3 className="text-base font-semibold text-slate-900">{activeWp.title}</h3>
                <div className="text-xs text-slate-600">
                  Preparer: <strong>{activeWp.preparer}</strong> · Reviewer:{' '}
                  <strong>{activeWp.reviewer}</strong>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Audit Procedures &amp; Partner Conclusion
                  </label>
                  <textarea
                    rows={5}
                    value={wpConclusionDraft || activeWp.conclusion}
                    onChange={(e) => setWpConclusionDraft(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/15"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <button
                    type="button"
                    disabled={savingWp}
                    onClick={() => handleSaveWp('Reviewed')}
                    className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                  >
                    Mark Reviewed
                  </button>
                  <button
                    type="button"
                    disabled={savingWp}
                    onClick={() => handleSaveWp('Signed Off')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Partner Sign-Off
                  </button>
                </div>
              </>
            ) : (
              <p className="text-xs text-slate-500">Select a working paper to inspect.</p>
            )}
          </div>
        </div>
      )}

      {subTab === 'queries' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            {client.auditQueries.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
                No audit queries logged for {client.name}. Raise a query on the right if evidence is pending.
              </div>
            ) : (
              client.auditQueries.map((q) => (
                <div key={q.id} className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-mono text-slate-500">
                        {q.wpRef} · Raised {q.createdAt} · {q.priority} Priority
                      </div>
                      <h3 className="text-sm font-semibold text-slate-900 mt-0.5">{q.title}</h3>
                    </div>
                    <span
                      className={`text-xs font-medium shrink-0 ${
                        q.status === 'Resolved'
                          ? 'text-emerald-700'
                          : q.status === 'Client Responded'
                          ? 'text-sky-700'
                          : 'text-red-700'
                      }`}
                    >
                      {q.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed">{q.question}</p>

                  {q.clientResponse ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-800">
                      <span className="font-semibold text-slate-900">Client Response: </span>
                      {q.clientResponse}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={responseDrafts[q.id] ?? ''}
                        onChange={(e) =>
                          setResponseDrafts({ ...responseDrafts, [q.id]: e.target.value })
                        }
                        placeholder="Record client management response..."
                        className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateQuery(q.id, {
                            clientResponse: responseDrafts[q.id] || 'Response logged by audit team.',
                            status: 'Client Responded',
                          })
                        }
                        className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                      >
                        Log Response
                      </button>
                    </div>
                  )}

                  {q.status !== 'Resolved' && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => onUpdateQuery(q.id, { status: 'Resolved' })}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Resolve Query
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 h-fit">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-4 h-4 text-slate-500" />
              <h2 className="text-base font-semibold text-slate-900">Raise New Audit Query</h2>
            </div>
            <form onSubmit={handleRaiseQuery} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Working Paper</label>
                  <select
                    value={queryWpRef}
                    onChange={(e) => setQueryWpRef(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg bg-white font-mono"
                  >
                    {client.workingPapers.map((wp) => (
                      <option key={wp.id} value={wp.ref}>
                        {wp.ref}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Priority</label>
                  <select
                    value={queryPriority}
                    onChange={(e) => setQueryPriority(e.target.value as 'High' | 'Medium' | 'Low')}
                    className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Assigned To</label>
                <input
                  type="text"
                  value={queryAssignedTo}
                  onChange={(e) => setQueryAssignedTo(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Query Title</label>
                <input
                  type="text"
                  value={queryTitle}
                  onChange={(e) => setQueryTitle(e.target.value)}
                  placeholder="e.g., Unreconciled Subcontractor Accrual"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Question / Evidence Needed</label>
                <textarea
                  rows={3}
                  value={queryQuestion}
                  onChange={(e) => setQueryQuestion(e.target.value)}
                  placeholder="Specify invoice numbers, bank confirmation, or IFRS disclosure needed..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Log Audit Query
              </button>
            </form>
          </div>
        </div>
      )}

      {subTab === 'pbc' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-500" />
              <h2 className="text-base font-semibold text-slate-900">
                Client Document Checklist (Prepared By Client)
              </h2>
            </div>
            <div className="divide-y divide-slate-200">
              {client.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="px-6 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div>
                    <div className="text-sm font-medium text-slate-900">{doc.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {doc.category} · Due {doc.requiredBy}
                      {doc.fileName ? ` · File: ${doc.fileName}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-xs font-medium mr-2 ${
                        doc.status === 'Verified'
                          ? 'text-emerald-700'
                          : doc.status === 'Uploaded'
                          ? 'text-sky-700'
                          : 'text-red-700'
                      }`}
                    >
                      {doc.status}
                    </span>
                    {doc.status === 'Missing' && (
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateDocument(doc.id, {
                            status: 'Uploaded',
                            fileName: `${doc.title.slice(0, 18).replace(/\s+/g, '_')}.pdf`,
                          })
                        }
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                      >
                        <Upload className="w-3 h-3" />
                        Mark Uploaded
                      </button>
                    )}
                    {doc.status === 'Uploaded' && (
                      <button
                        type="button"
                        onClick={() => onUpdateDocument(doc.id, { status: 'Verified' })}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        Verify
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6 h-fit">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Request PBC Document</h2>
            <form onSubmit={handleRequestDoc} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Document Title</label>
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="e.g., Signed Related Party Schedule"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
                <select
                  value={docCategory}
                  onChange={(e) => setDocCategory(e.target.value as ClientDocument['category'])}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Statutory">Statutory</option>
                  <option value="Tax">Tax</option>
                  <option value="Banking">Banking</option>
                  <option value="Contracts">Contracts</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Required By</label>
                <input
                  type="date"
                  value={docDue}
                  onChange={(e) => setDocDue(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono"
                />
              </div>
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add PBC Request
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
