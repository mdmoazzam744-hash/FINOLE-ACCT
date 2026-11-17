import React, { useMemo, useState } from 'react';
import { Download, Plus, Search, CheckCircle2, AlertCircle, X, Calculator } from 'lucide-react';
import type {
  AccountClass,
  ClientEntity,
  Emirate,
  JournalEntry,
  VatCode,
} from '../types/finance';
import { computeTrialBalance, formatAED } from '../utils/accounting';

interface AccountingModuleProps {
  client: ClientEntity;
  onPostJournal: (entry: Omit<JournalEntry, 'id'>) => Promise<void>;
}

const VAT_CODE_LABELS: Record<VatCode, string> = {
  SR_5: 'SR 5% Standard',
  ZR_0: 'ZR 0% Zero-Rated',
  EX: 'EX Exempt',
  RC_5: 'RC 5% Reverse Charge',
  OS: 'OS Out of Scope',
};

const EMIRATES: Emirate[] = [
  'Dubai',
  'Abu Dhabi',
  'Sharjah',
  'Ajman',
  'Umm Al Quwain',
  'Ras Al Khaimah',
  'Fujairah',
];

export const AccountingModule: React.FC<AccountingModuleProps> = ({ client, onPostJournal }) => {
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState<'All' | AccountClass>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Journal entry form state
  const [date, setDate] = useState('2026-11-16');
  const [ref, setRef] = useState(`JV-2026-${Math.floor(500 + Math.random() * 400)}`);
  const [description, setDescription] = useState('');
  const [emirate, setEmirate] = useState<Emirate>(client.emirate);
  const [vatCode, setVatCode] = useState<VatCode>('SR_5');
  const [lines, setLines] = useState<Array<{ accountCode: string; debit: string; credit: string }>>([
    { accountCode: '1110', debit: '105000', credit: '0' },
    { accountCode: '4010', debit: '0', credit: '100000' },
    { accountCode: '2110', debit: '0', credit: '5000' },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const tb = useMemo(() => computeTrialBalance(client), [client]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tb.rows.filter((r) => {
      const matchesClass = classFilter === 'All' || r.accountClass === classFilter;
      const matchesSearch =
        !q || r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q);
      return matchesClass && matchesSearch;
    });
  }, [tb.rows, search, classFilter]);

  const draftDebit = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const draftCredit = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  const draftBalanced = draftDebit > 0 && Math.abs(draftDebit - draftCredit) < 0.01;

  const handleExportCsv = () => {
    const headers = [
      'Code',
      'Account Name',
      'Class',
      'Opening Debit (AED)',
      'Opening Credit (AED)',
      'Period Debit (AED)',
      'Period Credit (AED)',
      'Closing Debit (AED)',
      'Closing Credit (AED)',
    ];
    const rows = tb.rows.map((r) => [
      r.code,
      `"${r.name.replace(/"/g, '""')}"`,
      r.accountClass,
      r.openingDebit.toFixed(2),
      r.openingCredit.toFixed(2),
      r.periodDebit.toFixed(2),
      r.periodCredit.toFixed(2),
      r.closingDebit.toFixed(2),
      r.closingCredit.toFixed(2),
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${client.id}-trial-balance.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const applyStandardVatTemplate = (kind: 'sale' | 'expense') => {
    if (kind === 'sale') {
      setVatCode('SR_5');
      setDescription('UAE Standard Rated Consulting / Supply Invoice (5% VAT)');
      setLines([
        { accountCode: '1110', debit: '105000', credit: '0' },
        { accountCode: '4010', debit: '0', credit: '100000' },
        { accountCode: '2110', debit: '0', credit: '5000' },
      ]);
    } else {
      setVatCode('SR_5');
      setDescription('UAE Supplier Operating Expense (5% Recoverable Input VAT)');
      setLines([
        { accountCode: '5010', debit: '50000', credit: '0' },
        { accountCode: '1140', debit: '2500', credit: '0' },
        { accountCode: '2010', debit: '0', credit: '52500' },
      ]);
    }
  };

  const handleSubmitJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!description.trim()) {
      setFormError('Please provide a journal narration.');
      return;
    }
    if (!draftBalanced) {
      setFormError('Total Debits must equal Total Credits before posting.');
      return;
    }

    setSubmitting(true);
    try {
      await onPostJournal({
        date,
        ref,
        description: description.trim(),
        emirate,
        vatCode,
        postedBy: client.auditPartner,
        status: 'Posted',
        lines: lines.map((l) => ({
          accountCode: l.accountCode,
          debit: parseFloat(l.debit) || 0,
          credit: parseFloat(l.credit) || 0,
        })),
      });
      setIsModalOpen(false);
      setDescription('');
      setRef(`JV-2026-${Math.floor(500 + Math.random() * 400)}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to post journal entry');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Ledgers &amp; Trial Balance</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            IFRS Chart of Accounts · Double-entry general ledger · Automatically syncs with VAT 201 &amp; Corporate Tax
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => {
              setEmirate(client.emirate);
              setFormError(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Post Journal Entry
          </button>
        </div>
      </div>

      {/* Filters + Proof Summary */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search GL code or account..."
              className="pl-9 pr-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/15 w-64"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
            {(['All', 'Asset', 'Liability', 'Equity', 'Revenue', 'COGS', 'Expense'] as const).map(
              (cls) => (
                <button
                  key={cls}
                  type="button"
                  onClick={() => setClassFilter(cls)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    classFilter === cls
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {cls}
                </button>
              )
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="font-mono tabular-nums text-slate-600">
            Closing Debits: <span className="font-semibold text-slate-900">{formatAED(tb.totalClosingDebit)}</span>
          </div>
          <span className="text-slate-300" aria-hidden="true">·</span>
          <div className="font-mono tabular-nums text-slate-600">
            Closing Credits: <span className="font-semibold text-slate-900">{formatAED(tb.totalClosingCredit)}</span>
          </div>
          <span className="text-slate-300" aria-hidden="true">·</span>
          {tb.isBalanced ? (
            <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Balanced
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-red-700 font-medium">
              <AlertCircle className="w-3.5 h-3.5" />
              Out of Balance
            </span>
          )}
        </div>
      </div>

      {/* Trial Balance Grid */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                <th className="py-2.5 px-4">GL Code</th>
                <th className="py-2.5 px-4">Account Name</th>
                <th className="py-2.5 px-4">Class</th>
                <th className="py-2.5 px-4 text-right">Opening Bal</th>
                <th className="py-2.5 px-4 text-right">Period Debit</th>
                <th className="py-2.5 px-4 text-right">Period Credit</th>
                <th className="py-2.5 px-4 text-right">Closing Debit</th>
                <th className="py-2.5 px-4 text-right">Closing Credit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-sm text-slate-500">
                    No accounts match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const openingNet = row.openingDebit - row.openingCredit;
                  return (
                    <tr key={row.code} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-4 font-mono tabular-nums text-xs font-medium text-slate-600">
                        {row.code}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-slate-900">{row.name}</td>
                      <td className="py-2.5 px-4 text-xs text-slate-500">{row.accountClass}</td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-600 text-xs">
                        {openingNet !== 0 ? formatAED(openingNet) : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-700 text-xs">
                        {row.periodDebit > 0 ? formatAED(row.periodDebit) : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-700 text-xs">
                        {row.periodCredit > 0 ? formatAED(row.periodCredit) : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-900 font-medium text-xs">
                        {row.closingDebit > 0 ? formatAED(row.closingDebit) : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-900 font-medium text-xs">
                        {row.closingCredit > 0 ? formatAED(row.closingCredit) : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold text-xs text-slate-900">
                <td colSpan={4} className="py-3 px-4">
                  Trial Balance Totals ({filteredRows.length} accounts shown)
                </td>
                <td className="py-3 px-4 text-right font-mono tabular-nums">
                  {formatAED(tb.totalPeriodDebit)}
                </td>
                <td className="py-3 px-4 text-right font-mono tabular-nums">
                  {formatAED(tb.totalPeriodCredit)}
                </td>
                <td className="py-3 px-4 text-right font-mono tabular-nums">
                  {formatAED(tb.totalClosingDebit)}
                </td>
                <td className="py-3 px-4 text-right font-mono tabular-nums">
                  {formatAED(tb.totalClosingCredit)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Posted Journal Ledger */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">General Journal Entries</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Chronological double-entry vouchers tagged with Emirate place-of-supply and UAE VAT codes.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500 tabular-nums">
            {client.journals.length} Posted
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Reference</th>
                <th className="py-2.5 px-4">Narration</th>
                <th className="py-2.5 px-4">Emirate</th>
                <th className="py-2.5 px-4">VAT Code</th>
                <th className="py-2.5 px-4">Posted By</th>
                <th className="py-2.5 px-4 text-right">Voucher Total (AED)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {client.journals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-slate-500">
                    No journal entries posted yet for this entity. Post your first entry above.
                  </td>
                </tr>
              ) : (
                [...client.journals].reverse().map((j) => {
                  const total = j.lines.reduce((s, l) => s + l.debit, 0);
                  return (
                    <tr key={j.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-mono tabular-nums text-xs text-slate-600 whitespace-nowrap">
                        {j.date}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-xs font-medium text-slate-900 whitespace-nowrap">
                        {j.ref}
                      </td>
                      <td className="py-2.5 px-4 text-slate-900">{j.description}</td>
                      <td className="py-2.5 px-4 text-xs text-slate-600 whitespace-nowrap">
                        {j.emirate}
                      </td>
                      <td className="py-2.5 px-4 text-xs font-mono text-slate-700 whitespace-nowrap">
                        {VAT_CODE_LABELS[j.vatCode]}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                        {j.postedBy}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums font-medium text-slate-900 text-xs">
                        {formatAED(total)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Post Journal Entry Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Post Double-Entry Journal</h3>
                <p className="text-xs text-slate-500">{client.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitJournal} className="p-6 space-y-5">
              <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-slate-200">
                <span className="text-xs font-medium text-slate-500 mr-1">Quick Templates:</span>
                <button
                  type="button"
                  onClick={() => applyStandardVatTemplate('sale')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
                >
                  <Calculator className="w-3.5 h-3.5" />
                  5% Output VAT Sale
                </button>
                <button
                  type="button"
                  onClick={() => applyStandardVatTemplate('expense')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
                >
                  <Calculator className="w-3.5 h-3.5" />
                  5% Input VAT Purchase
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Reference</label>
                  <input
                    type="text"
                    value={ref}
                    onChange={(e) => setRef(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Emirate</label>
                  <select
                    value={emirate}
                    onChange={(e) => setEmirate(e.target.value as Emirate)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    {EMIRATES.map((em) => (
                      <option key={em} value={em}>
                        {em}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">UAE VAT Code</label>
                  <select
                    value={vatCode}
                    onChange={(e) => setVatCode(e.target.value as VatCode)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    {(Object.keys(VAT_CODE_LABELS) as VatCode[]).map((code) => (
                      <option key={code} value={code}>
                        {VAT_CODE_LABELS[code]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Description / Audit Narration
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., DIFC Advisory Invoice #2026-88 with 5% VAT"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-700">Journal Lines (AED)</span>
                  <button
                    type="button"
                    onClick={() =>
                      setLines([...lines, { accountCode: '1010', debit: '0', credit: '0' }])
                    }
                    className="text-xs font-medium text-slate-900 hover:underline cursor-pointer"
                  >
                    + Add Line
                  </button>
                </div>
                <div className="space-y-2">
                  {lines.map((line, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-6">
                        <select
                          value={line.accountCode}
                          onChange={(e) => {
                            const next = [...lines];
                            next[idx].accountCode = e.target.value;
                            setLines(next);
                          }}
                          className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                        >
                          {client.accounts.map((acc) => (
                            <option key={acc.code} value={acc.code}>
                              {acc.code} · {acc.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.debit}
                          onChange={(e) => {
                            const next = [...lines];
                            next[idx].debit = e.target.value;
                            setLines(next);
                          }}
                          placeholder="Debit"
                          className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg font-mono text-right"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.credit}
                          onChange={(e) => {
                            const next = [...lines];
                            next[idx].credit = e.target.value;
                            setLines(next);
                          }}
                          placeholder="Credit"
                          className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg font-mono text-right"
                        />
                      </div>
                      <div className="col-span-2 text-right">
                        {lines.length > 2 && (
                          <button
                            type="button"
                            onClick={() => setLines(lines.filter((_, i) => i !== idx))}
                            className="text-xs text-red-600 hover:underline cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between text-xs font-mono tabular-nums">
                  <span>
                    Debits: <strong>{formatAED(draftDebit, true)}</strong> · Credits:{' '}
                    <strong>{formatAED(draftCredit, true)}</strong>
                  </span>
                  <span className={draftBalanced ? 'text-emerald-700 font-semibold' : 'text-red-700 font-semibold'}>
                    {draftBalanced
                      ? 'Balanced (Diff AED 0.00)'
                      : `Difference: ${formatAED(Math.abs(draftDebit - draftCredit), true)}`}
                  </span>
                </div>
              </div>

              {formError && (
                <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {formError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !draftBalanced}
                  className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Posting...' : 'Post to General Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
