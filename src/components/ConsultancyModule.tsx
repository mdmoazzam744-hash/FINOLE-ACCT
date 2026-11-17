import React, { useMemo, useState } from 'react';
import { Briefcase, Plus, SlidersHorizontal } from 'lucide-react';
import type { AdvisoryMemo, ClientEntity } from '../types/finance';
import { computeCorporateTax, computeIfrsStatements, formatAED } from '../utils/accounting';

interface ConsultancyModuleProps {
  client: ClientEntity;
  onAddAdvisory: (memo: Omit<AdvisoryMemo, 'id' | 'createdAt'>) => Promise<void>;
}

export const ConsultancyModule: React.FC<ConsultancyModuleProps> = ({
  client,
  onAddAdvisory,
}) => {
  const ifrs = useMemo(() => computeIfrsStatements(client), [client]);
  const ct = useMemo(() => computeCorporateTax(client), [client]);

  // What-If Scenario Sliders
  const [revGrowthPct, setRevGrowthPct] = useState(12);
  const [cogsDeltaPct, setCogsDeltaPct] = useState(-2);
  const [opexDeltaPct, setOpexDeltaPct] = useState(5);

  // New Advisory Memo Form
  const [title, setTitle] = useState('');
  const [domain, setDomain] = useState<AdvisoryMemo['domain']>('Corporate Tax');
  const [impactSummary, setImpactSummary] = useState('');
  const [memoBody, setMemoBody] = useState('');
  const [saving, setSaving] = useState(false);

  const currentRatio =
    ifrs.currentLiabilities > 0 ? ifrs.totalCurrentAssets / ifrs.currentLiabilities : 0;
  const grossMarginPct = ifrs.revenue > 0 ? (ifrs.grossProfit / ifrs.revenue) * 100 : 0;
  const netMarginPct = ifrs.revenue > 0 ? (ifrs.netProfit / ifrs.revenue) * 100 : 0;
  const debtToEquity = ifrs.totalEquity > 0 ? ifrs.totalLiabilities / ifrs.totalEquity : 0;

  // Projected Scenario
  const projRevenue = ifrs.revenue * (1 + revGrowthPct / 100);
  const projCogs = ifrs.costOfSales * (1 + revGrowthPct / 100) * (1 + cogsDeltaPct / 100);
  const projOpex = ifrs.operatingExpenses * (1 + opexDeltaPct / 100);
  const projPbt = projRevenue - projCogs - projOpex - ifrs.financeCosts;
  const projCt =
    client.isQualifyingFreeZone || (projRevenue <= 3_000_000 && client.smallBusinessReliefElected)
      ? 0
      : Math.max(0, projPbt - 375_000) * 0.09;
  const projNetProfit = projPbt - projCt;

  const handleCreateMemo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !memoBody.trim()) return;
    setSaving(true);
    try {
      await onAddAdvisory({
        title: title.trim(),
        domain,
        status: 'Proposed',
        impactSummary: impactSummary.trim() || 'Strategic financial & tax recommendation.',
        memoBody: memoBody.trim(),
      });
      setTitle('');
      setImpactSummary('');
      setMemoBody('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Client Advisory &amp; Consultancy</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          CFO ratio diagnostics, 12-month UAE Corporate Tax scenario modeling, and board advisory memos.
        </p>
      </div>

      {/* Ratio Benchmarks Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border border-slate-200 bg-white rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
        <div className="p-4">
          <div className="text-xs font-medium text-slate-500">Current Ratio</div>
          <div className="mt-1 text-xl font-semibold text-slate-900 font-mono tabular-nums">
            {currentRatio.toFixed(2)}x
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {currentRatio >= 1.5 ? 'Healthy liquidity' : 'Tight working capital'}
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs font-medium text-slate-500">Gross Profit Margin</div>
          <div className="mt-1 text-xl font-semibold text-slate-900 font-mono tabular-nums">
            {grossMarginPct.toFixed(1)}%
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Gross Profit {formatAED(ifrs.grossProfit)}
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs font-medium text-slate-500">Net Margin (After CT)</div>
          <div className="mt-1 text-xl font-semibold text-slate-900 font-mono tabular-nums">
            {netMarginPct.toFixed(1)}%
          </div>
          <div className="mt-1 text-xs text-slate-500">
            CT Eff. Rate {ct.effectiveTaxRate.toFixed(1)}%
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs font-medium text-slate-500">Debt-to-Equity</div>
          <div className="mt-1 text-xl font-semibold text-slate-900 font-mono tabular-nums">
            {debtToEquity.toFixed(2)}x
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Total Liabilities {formatAED(ifrs.totalLiabilities)}
          </div>
        </div>
      </div>

      {/* Interactive Scenario Modeler */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <SlidersHorizontal className="w-4 h-4 text-slate-500" />
          <h2 className="text-base font-semibold text-slate-900">
            FY 2027 Strategic &amp; Corporate Tax Scenario Modeler
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5 space-y-5">
            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 mb-1.5">
                <span>Projected Revenue Growth</span>
                <span className="font-mono tabular-nums">
                  {revGrowthPct > 0 ? `+${revGrowthPct}%` : `${revGrowthPct}%`}
                </span>
              </div>
              <input
                type="range"
                min={-20}
                max={40}
                value={revGrowthPct}
                onChange={(e) => setRevGrowthPct(Number(e.target.value))}
                className="w-full accent-slate-900 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 mb-1.5">
                <span>Direct Cost / Procurement Efficiency</span>
                <span className="font-mono tabular-nums">
                  {cogsDeltaPct > 0 ? `+${cogsDeltaPct}%` : `${cogsDeltaPct}%`}
                </span>
              </div>
              <input
                type="range"
                min={-10}
                max={10}
                value={cogsDeltaPct}
                onChange={(e) => setCogsDeltaPct(Number(e.target.value))}
                className="w-full accent-slate-900 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 mb-1.5">
                <span>Operating Overhead Adjustment</span>
                <span className="font-mono tabular-nums">
                  {opexDeltaPct > 0 ? `+${opexDeltaPct}%` : `${opexDeltaPct}%`}
                </span>
              </div>
              <input
                type="range"
                min={-15}
                max={20}
                value={opexDeltaPct}
                onChange={(e) => setOpexDeltaPct(Number(e.target.value))}
                className="w-full accent-slate-900 cursor-pointer"
              />
            </div>
          </div>

          <div className="lg:col-span-7 overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                  <th className="py-2.5 px-4">Metric (AED)</th>
                  <th className="py-2.5 px-4 text-right">FY 2026 Baseline</th>
                  <th className="py-2.5 px-4 text-right">Projected Scenario</th>
                  <th className="py-2.5 px-4 text-right">Variance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono tabular-nums text-xs">
                <tr>
                  <td className="py-2.5 px-4 font-sans font-medium text-slate-800">Revenue</td>
                  <td className="py-2.5 px-4 text-right">{formatAED(ifrs.revenue)}</td>
                  <td className="py-2.5 px-4 text-right font-semibold">{formatAED(projRevenue)}</td>
                  <td className="py-2.5 px-4 text-right text-slate-600">
                    {formatAED(projRevenue - ifrs.revenue)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-sans font-medium text-slate-800">
                    Profit Before Tax
                  </td>
                  <td className="py-2.5 px-4 text-right">{formatAED(ifrs.profitBeforeTax)}</td>
                  <td className="py-2.5 px-4 text-right font-semibold">{formatAED(projPbt)}</td>
                  <td className="py-2.5 px-4 text-right text-slate-600">
                    {formatAED(projPbt - ifrs.profitBeforeTax)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-sans font-medium text-slate-800">
                    Est. UAE Corporate Tax (9%)
                  </td>
                  <td className="py-2.5 px-4 text-right">{formatAED(ifrs.corporateTaxExpense)}</td>
                  <td className="py-2.5 px-4 text-right font-semibold">{formatAED(projCt)}</td>
                  <td className="py-2.5 px-4 text-right text-slate-600">
                    {formatAED(projCt - ifrs.corporateTaxExpense)}
                  </td>
                </tr>
                <tr className="bg-slate-50 font-semibold text-slate-900">
                  <td className="py-2.5 px-4 font-sans">Net Profit After CT</td>
                  <td className="py-2.5 px-4 text-right">{formatAED(ifrs.netProfit)}</td>
                  <td className="py-2.5 px-4 text-right">{formatAED(projNetProfit)}</td>
                  <td className="py-2.5 px-4 text-right text-emerald-700">
                    {formatAED(projNetProfit - ifrs.netProfit)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Advisory Memos + Draft Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-slate-500" />
            <h2 className="text-base font-semibold text-slate-900">
              Client Advisory Engagements ({client.advisories.length})
            </h2>
          </div>

          {client.advisories.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
              No consultancy memos drafted yet for {client.name}. Create a board advisory memo on the right or save an insight from the AI Assistant.
            </div>
          ) : (
            client.advisories.map((memo) => (
              <article
                key={memo.id}
                className="bg-white border border-slate-200 rounded-xl p-5 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs text-slate-500">
                      {memo.domain} · {memo.createdAt} · {memo.status}
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 mt-0.5">{memo.title}</h3>
                  </div>
                </div>
                <div className="text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                  Impact: {memo.impactSummary}
                </div>
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {memo.memoBody}
                </p>
              </article>
            ))
          )}
        </div>

        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 h-fit">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Draft Advisory Memo</h2>
          <form onSubmit={handleCreateMemo} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Domain</label>
              <select
                value={domain}
                onChange={(e) => setDomain(e.target.value as AdvisoryMemo['domain'])}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value="Corporate Tax">Corporate Tax</option>
                <option value="VAT Structuring">VAT Structuring</option>
                <option value="Working Capital">Working Capital</option>
                <option value="IFRS Advisory">IFRS Advisory</option>
                <option value="Governance">Governance</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Memo Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Transfer Pricing Benchmarking & Related Party Policy"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Quantified Impact Summary
              </label>
              <input
                type="text"
                value={impactSummary}
                onChange={(e) => setImpactSummary(e.target.value)}
                placeholder="e.g., Mitigates Art. 34 arm's-length penalty exposure"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Executive Recommendation
              </label>
              <textarea
                rows={4}
                value={memoBody}
                onChange={(e) => setMemoBody(e.target.value)}
                placeholder="Outline technical UAE statutory basis and action plan..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                required
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              {saving ? 'Saving Memo...' : 'Publish Advisory Memo'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
