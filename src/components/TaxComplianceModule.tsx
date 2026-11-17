import React, { useMemo, useState } from 'react';
import { CheckCircle2, FileCheck, Plus, ShieldCheck } from 'lucide-react';
import type { ClientEntity, CtAdjustment, VatPeriodState } from '../types/finance';
import { computeCorporateTax, computeVat201, formatAED } from '../utils/accounting';

interface TaxComplianceModuleProps {
  client: ClientEntity;
  onUpdateVat: (patch: Partial<VatPeriodState>) => Promise<void>;
  onUpdateClientSettings: (patch: Partial<ClientEntity>) => Promise<void>;
  onAddCtAdjustment: (adj: Omit<CtAdjustment, 'id' | 'enabled'>) => Promise<void>;
  onToggleCtAdjustment: (adjId: string, enabled: boolean) => Promise<void>;
}

export const TaxComplianceModule: React.FC<TaxComplianceModuleProps> = ({
  client,
  onUpdateVat,
  onUpdateClientSettings,
  onAddCtAdjustment,
  onToggleCtAdjustment,
}) => {
  const [activeTab, setActiveTab] = useState<'vat' | 'ct'>('vat');
  const [importedGoodsInput, setImportedGoodsInput] = useState(
    String(client.vatPeriod.importedGoodsVat)
  );
  const [vatAdjInput, setVatAdjInput] = useState(String(client.vatPeriod.vatAdjustments));
  const [savingVat, setSavingVat] = useState(false);

  // New CT Adjustment form
  const [adjDesc, setAdjDesc] = useState('');
  const [adjArticle, setAdjArticle] = useState('Art. 33(1)');
  const [adjType, setAdjType] = useState<'Add-back' | 'Deduction'>('Add-back');
  const [adjAmount, setAdjAmount] = useState('');
  const [addingAdj, setAddingAdj] = useState(false);

  const vat = useMemo(() => computeVat201(client), [client]);
  const ct = useMemo(() => computeCorporateTax(client), [client]);

  const handleSaveVatInputs = async () => {
    setSavingVat(true);
    try {
      await onUpdateVat({
        importedGoodsVat: Number(importedGoodsInput) || 0,
        vatAdjustments: Number(vatAdjInput) || 0,
      });
    } finally {
      setSavingVat(false);
    }
  };

  const handleVatStatusChange = async (status: VatPeriodState['status']) => {
    setSavingVat(true);
    try {
      await onUpdateVat({ status });
    } finally {
      setSavingVat(false);
    }
  };

  const handleCreateAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjDesc.trim() || !adjAmount) return;
    setAddingAdj(true);
    try {
      await onAddCtAdjustment({
        description: adjDesc.trim(),
        articleRef: adjArticle.trim() || 'Art. 33',
        type: adjType,
        amount: Math.max(0, Number(adjAmount)),
      });
      setAdjDesc('');
      setAdjAmount('');
    } finally {
      setAddingAdj(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header + Segmented Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">FTA Tax Compliance</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            TRN {client.trn} · CT Reg {client.ctNumber} · {client.legalForm} ({client.emirate})
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg self-start">
          <button
            type="button"
            onClick={() => setActiveTab('vat')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'vat'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            VAT Return (Form 201 · 5%)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ct')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'ct'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Corporate Tax (9% Decree-Law 47)
          </button>
        </div>
      </div>

      {activeTab === 'vat' ? (
        <div className="space-y-6">
          {/* VAT Return Status & Filing Controls */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-medium text-slate-500">
                Return Period: {client.vatPeriod.periodLabel} · Due {client.nextVatDueDate}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-semibold text-slate-900 font-mono tabular-nums">
                  {vat.netVatPayable >= 0 ? 'Net VAT Payable: ' : 'Net VAT Refundable: '}
                  {formatAED(Math.abs(vat.netVatPayable), true)}
                </span>
                <span className="text-slate-300" aria-hidden="true">·</span>
                <span
                  className={`text-xs font-medium ${
                    client.vatPeriod.status === 'Submitted'
                      ? 'text-emerald-700'
                      : client.vatPeriod.status === 'Partner Reviewed'
                      ? 'text-sky-700'
                      : 'text-amber-700'
                  }`}
                >
                  {client.vatPeriod.status}
                  {client.vatPeriod.ftaReference ? ` (${client.vatPeriod.ftaReference})` : ''}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {client.vatPeriod.status !== 'Partner Reviewed' &&
                client.vatPeriod.status !== 'Submitted' && (
                  <button
                    type="button"
                    disabled={savingVat}
                    onClick={() => handleVatStatusChange('Partner Reviewed')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    Mark Partner Reviewed
                  </button>
                )}
              {client.vatPeriod.status !== 'Submitted' && (
                <button
                  type="button"
                  disabled={savingVat}
                  onClick={() => handleVatStatusChange('Submitted')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Submit Form 201 to EmaraTax
                </button>
              )}
              {client.vatPeriod.status === 'Submitted' && (
                <button
                  type="button"
                  disabled={savingVat}
                  onClick={() => handleVatStatusChange('Draft')}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 cursor-pointer"
                >
                  Reopen Return Draft
                </button>
              )}
            </div>
          </div>

          {/* Form VAT 201 Box-by-Box Schedule */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  FTA Form VAT 201 — Box-by-Box Reconciliation
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Computed directly from posted Emirate-tagged General Ledger journals.
                </p>
              </div>
              <span className="text-xs font-mono text-slate-500">Federal Decree-Law No. 8</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                    <th className="py-2.5 px-6 w-24">Box</th>
                    <th className="py-2.5 px-4">FTA Description</th>
                    <th className="py-2.5 px-4 text-right">Amount (AED)</th>
                    <th className="py-2.5 px-6 text-right">VAT Amount (AED)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  <tr className="bg-slate-50/50">
                    <td colSpan={4} className="py-2 px-6 text-xs font-semibold text-slate-700">
                      VAT on Sales &amp; All Other Outputs
                    </td>
                  </tr>
                  {vat.emirateSupplies.map((em, i) => (
                    <tr key={em.emirate} className="hover:bg-slate-50">
                      <td className="py-2 px-6 font-mono text-xs text-slate-500">
                        Box 1{String.fromCharCode(97 + i)}
                      </td>
                      <td className="py-2 px-4 text-slate-800">
                        Standard Rated Supplies — {em.emirate} (5%)
                      </td>
                      <td className="py-2 px-4 text-right font-mono tabular-nums text-xs text-slate-900">
                        {formatAED(em.amount, true)}
                      </td>
                      <td className="py-2 px-6 text-right font-mono tabular-nums text-xs text-slate-900">
                        {formatAED(em.vat, true)}
                      </td>
                    </tr>
                  ))}
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-6 font-mono text-xs text-slate-500">Box 3</td>
                    <td className="py-2 px-4 text-slate-800">
                      Supplies Subject to Reverse Charge Provisions (Imported Services)
                    </td>
                    <td className="py-2 px-4 text-right font-mono tabular-nums text-xs text-slate-900">
                      {formatAED(vat.reverseChargeOutputBase, true)}
                    </td>
                    <td className="py-2 px-6 text-right font-mono tabular-nums text-xs text-slate-900">
                      {formatAED(vat.reverseChargeOutputVat, true)}
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-6 font-mono text-xs text-slate-500">Box 4</td>
                    <td className="py-2 px-4 text-slate-800">Zero-Rated Supplies (Exports &amp; Qualifying)</td>
                    <td className="py-2 px-4 text-right font-mono tabular-nums text-xs text-slate-900">
                      {formatAED(vat.zeroRatedSupplies, true)}
                    </td>
                    <td className="py-2 px-6 text-right font-mono tabular-nums text-xs text-slate-400">
                      AED 0.00
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-6 font-mono text-xs text-slate-500">Box 5</td>
                    <td className="py-2 px-4 text-slate-800">Exempt Supplies</td>
                    <td className="py-2 px-4 text-right font-mono tabular-nums text-xs text-slate-900">
                      {formatAED(vat.exemptSupplies, true)}
                    </td>
                    <td className="py-2 px-6 text-right font-mono tabular-nums text-xs text-slate-400">
                      AED 0.00
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-6 font-mono text-xs text-slate-500">Box 6</td>
                    <td className="py-2 px-4 text-slate-800">
                      Goods Imported into the UAE (Customs Decl. Base)
                    </td>
                    <td className="py-2 px-4 text-right font-mono tabular-nums text-xs text-slate-900">
                      {formatAED(vat.importedGoodsVat, true)}
                    </td>
                    <td className="py-2 px-6 text-right font-mono tabular-nums text-xs text-slate-900">
                      {formatAED(vat.importedGoodsVat * 0.05, true)}
                    </td>
                  </tr>
                  <tr className="bg-slate-50 font-semibold text-xs text-slate-900">
                    <td className="py-2.5 px-6 font-mono">Box 8</td>
                    <td className="py-2.5 px-4">Total Output Tax Due for Period</td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                      {formatAED(vat.totalOutputBase + vat.importedGoodsVat, true)}
                    </td>
                    <td className="py-2.5 px-6 text-right font-mono tabular-nums">
                      {formatAED(vat.totalOutputVat, true)}
                    </td>
                  </tr>

                  <tr className="bg-slate-50/50">
                    <td colSpan={4} className="py-2 px-6 text-xs font-semibold text-slate-700">
                      VAT on Expenses &amp; Recoverable Input Tax
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-6 font-mono text-xs text-slate-500">Box 9</td>
                    <td className="py-2 px-4 text-slate-800">Standard Rated Expenses (5%)</td>
                    <td className="py-2 px-4 text-right font-mono tabular-nums text-xs text-slate-900">
                      {formatAED(vat.standardInputBase, true)}
                    </td>
                    <td className="py-2 px-6 text-right font-mono tabular-nums text-xs text-slate-900">
                      {formatAED(vat.standardInputVat, true)}
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-6 font-mono text-xs text-slate-500">Box 10</td>
                    <td className="py-2 px-4 text-slate-800">
                      Supplies Subject to Reverse Charge &amp; Customs Import Recoverable
                    </td>
                    <td className="py-2 px-4 text-right font-mono tabular-nums text-xs text-slate-900">
                      {formatAED(vat.reverseChargeOutputBase + vat.importedGoodsVat, true)}
                    </td>
                    <td className="py-2 px-6 text-right font-mono tabular-nums text-xs text-slate-900">
                      {formatAED(vat.reverseChargeInputVat + vat.importedGoodsVat * 0.05, true)}
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-6 font-mono text-xs text-slate-500">Box 11</td>
                    <td className="py-2 px-4 text-slate-800">Adjustments / Bad Debt Relief</td>
                    <td className="py-2 px-4 text-right font-mono tabular-nums text-xs text-slate-400">
                      —
                    </td>
                    <td className="py-2 px-6 text-right font-mono tabular-nums text-xs text-slate-900">
                      {formatAED(vat.vatAdjustments, true)}
                    </td>
                  </tr>
                  <tr className="bg-slate-50 font-semibold text-xs text-slate-900">
                    <td className="py-2.5 px-6 font-mono">Box 13</td>
                    <td className="py-2.5 px-4">Total Recoverable Input Tax</td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums">—</td>
                    <td className="py-2.5 px-6 text-right font-mono tabular-nums">
                      {formatAED(vat.totalRecoverableVat, true)}
                    </td>
                  </tr>
                  <tr className="bg-slate-900 text-white font-semibold text-sm">
                    <td className="py-3 px-6 font-mono text-xs">Box 14</td>
                    <td className="py-3 px-4">
                      {vat.netVatPayable >= 0 ? 'Net VAT Payable to FTA' : 'Net VAT Refundable from FTA'}
                    </td>
                    <td className="py-3 px-4" />
                    <td className="py-3 px-6 text-right font-mono tabular-nums">
                      {formatAED(vat.netVatPayable, true)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Editable Customs Import & Adjustments Strip */}
            <div className="p-5 border-t border-slate-200 bg-slate-50 flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Box 6 UAE Customs Import Base (AED)
                </label>
                <input
                  type="number"
                  min="0"
                  value={importedGoodsInput}
                  onChange={(e) => setImportedGoodsInput(e.target.value)}
                  className="px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg bg-white w-48"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Box 11 Input Adjustments (AED)
                </label>
                <input
                  type="number"
                  value={vatAdjInput}
                  onChange={(e) => setVatAdjInput(e.target.value)}
                  className="px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg bg-white w-48"
                />
              </div>
              <button
                type="button"
                disabled={savingVat}
                onClick={handleSaveVatInputs}
                className="px-4 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                {savingVat ? 'Updating...' : 'Recalculate VAT 201'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* UAE Corporate Tax Elections & Regime Controls */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={client.isQualifyingFreeZone}
                onChange={(e) =>
                  onUpdateClientSettings({ isQualifyingFreeZone: e.target.checked })
                }
                className="mt-1 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  Qualifying Free Zone Person (QFZP · 0% Rate)
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Article 18 of Federal Decree-Law No. 47 · Applies 0% Corporate Tax on Qualifying Income if substance &amp; de minimis criteria are met.
                </div>
              </div>
            </label>

            <label
              className={`flex items-start gap-3 ${
                ct.smallBusinessReliefEligible ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'
              }`}
            >
              <input
                type="checkbox"
                disabled={!ct.smallBusinessReliefEligible}
                checked={client.smallBusinessReliefElected && ct.smallBusinessReliefEligible}
                onChange={(e) =>
                  onUpdateClientSettings({ smallBusinessReliefElected: e.target.checked })
                }
                className="mt-1 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  Small Business Relief Election (Art. 21 · 0% Rate)
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Available when revenue &le; AED 3,000,000. Current revenue:{' '}
                  <span className="font-mono">{formatAED(ct.totalRevenue)}</span> (
                  {ct.smallBusinessReliefEligible ? 'Eligible' : 'Exceeds AED 3M threshold'}).
                </div>
              </div>
            </label>
          </div>

          {/* 2-Column CT Computation + Adjustments */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-slate-500" />
                  <h2 className="text-base font-semibold text-slate-900">
                    UAE Corporate Tax Computation (FY 2026)
                  </h2>
                </div>
                <span className="text-xs font-mono text-slate-500">Due {client.nextCtDueDate}</span>
              </div>

              <div className="divide-y divide-slate-200 text-sm">
                <div className="px-6 py-3 flex items-center justify-between">
                  <span className="text-slate-700">Accounting Net Profit (Per IFRS P&amp;L)</span>
                  <span className="font-mono tabular-nums font-medium text-slate-900">
                    {formatAED(ct.accountingProfit, true)}
                  </span>
                </div>
                <div className="px-6 py-3 flex items-center justify-between">
                  <span className="text-slate-700">Add: Non-Deductible Expenses (Art. 33)</span>
                  <span className="font-mono tabular-nums text-slate-900">
                    +{formatAED(ct.addBacks, true)}
                  </span>
                </div>
                <div className="px-6 py-3 flex items-center justify-between">
                  <span className="text-slate-700">Less: Exempt Income &amp; Reliefs (Art. 22)</span>
                  <span className="font-mono tabular-nums text-slate-900">
                    -{formatAED(ct.deductions, true)}
                  </span>
                </div>
                <div className="px-6 py-3.5 bg-slate-50 flex items-center justify-between font-semibold text-slate-900">
                  <span>Net Taxable Income</span>
                  <span className="font-mono tabular-nums">{formatAED(ct.taxableIncome, true)}</span>
                </div>
                <div className="px-6 py-3 flex items-center justify-between">
                  <span className="text-slate-600">
                    0% Tax Band (First AED 375,000
                    {ct.smallBusinessReliefApplied
                      ? ' · SBR Applied'
                      : client.isQualifyingFreeZone
                      ? ' · QFZP Applied'
                      : ''}
                    )
                  </span>
                  <span className="font-mono tabular-nums text-slate-700">
                    {formatAED(ct.zeroPercentBracket, true)} × 0% = AED 0.00
                  </span>
                </div>
                <div className="px-6 py-3 flex items-center justify-between">
                  <span className="text-slate-600">9% Tax Band (Excess over AED 375,000)</span>
                  <span className="font-mono tabular-nums text-slate-900">
                    {formatAED(ct.ninePercentBracket, true)} × 9%
                  </span>
                </div>
                <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between font-semibold">
                  <div>
                    <div>Corporate Tax Payable (FY 2026)</div>
                    <div className="text-xs font-normal text-slate-300 mt-0.5">
                      Effective Tax Rate: {ct.effectiveTaxRate.toFixed(2)}%
                    </div>
                  </div>
                  <span className="text-lg font-mono tabular-nums">
                    {formatAED(ct.corporateTaxPayable, true)}
                  </span>
                </div>
              </div>
            </div>

            {/* CT Adjustments Panel */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Taxable Income Adjustments
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Toggle statutory add-backs or add permanent/temporary tax adjustments.
                </p>
              </div>

              <div className="divide-y divide-slate-200">
                {client.ctAdjustments.length === 0 ? (
                  <p className="py-4 text-xs text-slate-500">
                    No statutory tax adjustments recorded yet.
                  </p>
                ) : (
                  client.ctAdjustments.map((adj) => (
                    <label
                      key={adj.id}
                      className="py-3 flex items-start justify-between gap-3 cursor-pointer"
                    >
                      <div className="flex items-start gap-2.5">
                        <input
                          type="checkbox"
                          checked={adj.enabled}
                          onChange={(e) => onToggleCtAdjustment(adj.id, e.target.checked)}
                          className="mt-0.5 rounded border-slate-300 text-slate-900"
                        />
                        <div>
                          <div className="text-xs font-medium text-slate-900">
                            {adj.description}
                          </div>
                          <div className="text-xs text-slate-500">
                            {adj.articleRef} · {adj.type}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs font-mono tabular-nums font-medium text-slate-900 shrink-0">
                        {adj.type === 'Add-back' ? '+' : '-'}
                        {formatAED(adj.amount)}
                      </div>
                    </label>
                  ))
                )}
              </div>

              <form onSubmit={handleCreateAdjustment} className="pt-4 border-t border-slate-200 space-y-3">
                <div className="text-xs font-semibold text-slate-800">Add Statutory Adjustment</div>
                <input
                  type="text"
                  value={adjDesc}
                  onChange={(e) => setAdjDesc(e.target.value)}
                  placeholder="e.g., 50% Client Entertainment or Disallowed Fine"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                  required
                />
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={adjArticle}
                    onChange={(e) => setAdjArticle(e.target.value)}
                    placeholder="Art. 33"
                    className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg font-mono"
                  />
                  <select
                    value={adjType}
                    onChange={(e) => setAdjType(e.target.value as 'Add-back' | 'Deduction')}
                    className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Add-back">Add-back</option>
                    <option value="Deduction">Deduction</option>
                  </select>
                  <input
                    type="number"
                    min="0"
                    value={adjAmount}
                    onChange={(e) => setAdjAmount(e.target.value)}
                    placeholder="AED"
                    className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg font-mono text-right"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={addingAdj}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {addingAdj ? 'Adding...' : 'Add Tax Adjustment'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
