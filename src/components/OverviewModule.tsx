import React, { useState } from 'react';
import {
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  FileWarning,
  Sparkles,
} from 'lucide-react';
import type { ClientEntity, WorkspaceModule } from '../types/finance';
import {
  computeCorporateTax,
  computeIfrsStatements,
  computeVat201,
  formatAED,
  formatCompactAED,
} from '../utils/accounting';

interface OverviewModuleProps {
  clients: ClientEntity[];
  activeClient: ClientEntity;
  onSelectClient: (clientId: string) => void;
  onNavigate: (module: WorkspaceModule) => void;
}

export const OverviewModule: React.FC<OverviewModuleProps> = ({
  clients,
  activeClient,
  onSelectClient,
  onNavigate,
}) => {
  const [calendarFilter, setCalendarFilter] = useState<'all' | 'vat' | 'ct' | 'audit'>('all');
  const [hoveredMonthIndex, setHoveredMonthIndex] = useState<number | null>(null);

  const ifrs = computeIfrsStatements(activeClient);
  const vat = computeVat201(activeClient);
  const ct = computeCorporateTax(activeClient);

  const revGrowth =
    activeClient.priorYearRevenue > 0
      ? ((ifrs.revenue - activeClient.priorYearRevenue) / activeClient.priorYearRevenue) * 100
      : 0;

  const profitGrowth =
    activeClient.priorYearNetProfit > 0
      ? ((ifrs.netProfit - activeClient.priorYearNetProfit) / activeClient.priorYearNetProfit) * 100
      : 0;

  const completedWps = activeClient.workingPapers.filter(
    (w) => w.status === 'Signed Off' || w.status === 'Reviewed'
  ).length;
  const wpCompletionPct =
    activeClient.workingPapers.length > 0
      ? Math.round((completedWps / activeClient.workingPapers.length) * 100)
      : 0;

  const chartPoints = activeClient.monthlyCashflow;
  const maxChartValue = Math.max(
    1,
    ...chartPoints.map((p) => Math.max(p.revenue, p.expenses))
  );

  // Build compliance calendar across all managed UAE clients
  const calendarItems = clients.flatMap((c) => [
    {
      id: `cal-vat-${c.id}`,
      type: 'vat' as const,
      date: c.nextVatDueDate,
      clientId: c.id,
      clientName: c.name,
      title: `FTA Form VAT 201 (${c.vatPeriod.periodLabel})`,
      status: c.vatPeriod.status,
    },
    {
      id: `cal-ct-${c.id}`,
      type: 'ct' as const,
      date: c.nextCtDueDate,
      clientId: c.id,
      clientName: c.name,
      title: 'UAE Corporate Tax Return (Decree-Law 47)',
      status: c.isQualifyingFreeZone ? 'QFZP 0%' : c.smallBusinessReliefElected ? 'SBR Art. 21' : '9% Standard',
    },
    {
      id: `cal-aud-${c.id}`,
      type: 'audit' as const,
      date: '2027-03-31',
      clientId: c.id,
      clientName: c.name,
      title: `Statutory IFRS Audit (${c.legalForm})`,
      status: c.auditStatus,
    },
  ]);

  const filteredCalendar = calendarItems
    .filter((item) => calendarFilter === 'all' || item.type === calendarFilter)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8);

  return (
    <div className="space-y-8">
      {/* 4-Column Active Client KPI Strip */}
      <section aria-label="Active client financial summary">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-4">
          <div>
            <p className="text-xs font-medium text-slate-500">
              Active Engagement · {activeClient.legalForm} · {activeClient.emirate}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 mt-0.5">
              {activeClient.name}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('ai')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Run AI Risk Analysis
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 border border-slate-200 bg-white rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
          <div className="p-5">
            <div className="text-xs font-medium text-slate-500">YTD Operating Revenue</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900 font-mono tabular-nums tracking-tight">
              {formatAED(ifrs.revenue)}
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 tabular-nums">
              {revGrowth >= 0 ? (
                <span className="inline-flex items-center gap-0.5 text-emerald-700 font-medium">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  +{revGrowth.toFixed(1)}%
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 text-red-700 font-medium">
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  {revGrowth.toFixed(1)}%
                </span>
              )}
              <span>vs FY 2025 ({formatCompactAED(activeClient.priorYearRevenue)})</span>
            </div>
          </div>

          <div className="p-5">
            <div className="text-xs font-medium text-slate-500">Net Profit (After 9% CT)</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900 font-mono tabular-nums tracking-tight">
              {formatAED(ifrs.netProfit)}
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 tabular-nums">
              {profitGrowth >= 0 ? (
                <span className="inline-flex items-center gap-0.5 text-emerald-700 font-medium">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  +{profitGrowth.toFixed(1)}%
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 text-red-700 font-medium">
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  {profitGrowth.toFixed(1)}%
                </span>
              )}
              <span>Net margin {ifrs.revenue > 0 ? ((ifrs.netProfit / ifrs.revenue) * 100).toFixed(1) : '0.0'}%</span>
            </div>
          </div>

          <div className="p-5">
            <div className="text-xs font-medium text-slate-500">
              FTA VAT 201 ({activeClient.vatPeriod.periodLabel})
            </div>
            <div className="mt-2 text-2xl font-semibold text-slate-900 font-mono tabular-nums tracking-tight">
              {formatAED(Math.abs(vat.netVatPayable))}
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="font-medium text-slate-700">
                {vat.netVatPayable >= 0 ? 'Payable to FTA' : 'Refundable from FTA'}
              </span>
              <span className="text-slate-300" aria-hidden="true">·</span>
              <span
                className={
                  activeClient.vatPeriod.status === 'Submitted'
                    ? 'text-emerald-700 font-medium'
                    : activeClient.vatPeriod.status === 'Partner Reviewed'
                    ? 'text-sky-700 font-medium'
                    : 'text-amber-700 font-medium'
                }
              >
                {activeClient.vatPeriod.status}
              </span>
            </div>
          </div>

          <div className="p-5">
            <div className="text-xs font-medium text-slate-500">UAE Corporate Tax &amp; Audit</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900 font-mono tabular-nums tracking-tight">
              {formatAED(ct.corporateTaxPayable)}
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 tabular-nums">
              <span>Eff. Rate {ct.effectiveTaxRate.toFixed(1)}%</span>
              <span className="text-slate-300" aria-hidden="true">·</span>
              <span>Working Papers {wpCompletionPct}%</span>
            </div>
          </div>
        </div>
      </section>

      {/* Multi-Client Portfolio Matrix */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Multi-Client Practice Portfolio
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select any UAE client entity to switch ledgers, VAT 201 returns, and audit working papers.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500 tabular-nums">
            {clients.length} Active Entities
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                <th className="py-2.5 px-6">Client Entity</th>
                <th className="py-2.5 px-4">Jurisdiction &amp; TRN</th>
                <th className="py-2.5 px-4 text-right">Revenue (AED)</th>
                <th className="py-2.5 px-4 text-right">CT Provision</th>
                <th className="py-2.5 px-4">VAT 201 Status</th>
                <th className="py-2.5 px-4">Audit Stage</th>
                <th className="py-2.5 px-6 text-right">Open Queries</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {clients.map((c) => {
                const cIfrs = computeIfrsStatements(c);
                const cCt = computeCorporateTax(c);
                const openQ = c.auditQueries.filter((q) => q.status !== 'Resolved').length;
                const isSelected = c.id === activeClient.id;

                return (
                  <tr
                    key={c.id}
                    onClick={() => onSelectClient(c.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-slate-100/80' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-3 px-6">
                      <div className="flex items-center gap-2.5">
                        <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                        <div>
                          <div className="font-medium text-slate-900">
                            {c.name}
                            {isSelected && (
                              <span className="ml-2 text-xs font-normal text-slate-500">
                                (Active)
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500">{c.industry}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-xs font-medium text-slate-800">
                        {c.legalForm} · {c.emirate}
                      </div>
                      <div className="text-xs font-mono text-slate-500 tabular-nums">
                        TRN {c.trn}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-900 font-medium">
                      {formatAED(cIfrs.revenue)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                      {c.isQualifyingFreeZone
                        ? 'AED 0 (QFZP)'
                        : c.smallBusinessReliefElected && cCt.smallBusinessReliefEligible
                        ? 'AED 0 (SBR)'
                        : formatAED(cCt.corporateTaxPayable)}
                    </td>
                    <td className="py-3 px-4 text-xs">
                      {c.vatPeriod.status === 'Submitted' ? (
                        <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Submitted
                        </span>
                      ) : c.vatPeriod.status === 'Partner Reviewed' ? (
                        <span className="inline-flex items-center gap-1.5 font-medium text-sky-700">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Partner Reviewed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 font-medium text-amber-700">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Draft · Due {c.nextVatDueDate}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs font-medium text-slate-700">
                      {c.auditStatus}
                    </td>
                    <td className="py-3 px-6 text-right font-mono tabular-nums text-xs">
                      {openQ > 0 ? (
                        <span className="inline-flex items-center gap-1 text-red-700 font-medium">
                          <FileWarning className="w-3.5 h-3.5" />
                          {openQ} Open
                        </span>
                      ) : (
                        <span className="text-slate-500">0</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 2-Column Analytics & Compliance Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Cashflow & Revenue SVG Chart */}
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                6-Month Revenue &amp; Operating Expense Trajectory
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {activeClient.name} · Amounts in UAE Dirhams (AED)
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-slate-900 inline-block rounded-xs" />
                Revenue
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-slate-300 inline-block rounded-xs" />
                Expenses
              </span>
            </div>
          </div>

          <div className="relative h-60 flex items-end gap-3 pt-6 pb-2 border-b border-slate-200">
            {chartPoints.map((pt, idx) => {
              const revHeightPct = Math.max(4, Math.round((pt.revenue / maxChartValue) * 100));
              const expHeightPct = Math.max(4, Math.round((pt.expenses / maxChartValue) * 100));
              const isHovered = hoveredMonthIndex === idx;

              return (
                <div
                  key={pt.month}
                  onMouseEnter={() => setHoveredMonthIndex(idx)}
                  onMouseLeave={() => setHoveredMonthIndex(null)}
                  className="flex-1 h-full flex flex-col justify-end items-center relative group cursor-pointer"
                >
                  {isHovered && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full z-10 bg-slate-900 text-white text-xs rounded-lg px-3 py-2 shadow-md whitespace-nowrap pointer-events-none">
                      <div className="font-semibold mb-1">{pt.month} 2026</div>
                      <div className="font-mono tabular-nums text-slate-200">
                        Rev: {formatCompactAED(pt.revenue)}
                      </div>
                      <div className="font-mono tabular-nums text-slate-300">
                        Exp: {formatCompactAED(pt.expenses)}
                      </div>
                      <div className="font-mono tabular-nums text-emerald-300 mt-0.5">
                        Net: {formatCompactAED(pt.revenue - pt.expenses)}
                      </div>
                    </div>
                  )}
                  <div className="w-full h-full flex items-end justify-center gap-1.5 px-1">
                    <div
                      style={{ height: `${revHeightPct}%` }}
                      className={`w-1/2 max-w-[26px] rounded-t transition-colors ${
                        isHovered ? 'bg-slate-700' : 'bg-slate-900'
                      }`}
                    />
                    <div
                      style={{ height: `${expHeightPct}%` }}
                      className={`w-1/2 max-w-[26px] rounded-t transition-colors ${
                        isHovered ? 'bg-slate-400' : 'bg-slate-300'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between pt-2.5 text-xs font-mono text-slate-500">
            {chartPoints.map((pt) => (
              <div key={pt.month} className="flex-1 text-center">
                {pt.month}
              </div>
            ))}
          </div>
        </section>

        {/* FTA Compliance & Audit Calendar */}
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-500" />
              <h2 className="text-base font-semibold text-slate-900">FTA &amp; Audit Calendar</h2>
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(['all', 'vat', 'ct', 'audit'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setCalendarFilter(tab)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    calendarFilter === tab
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab === 'all' ? 'All' : tab === 'vat' ? 'VAT 201' : tab === 'ct' ? 'Corp Tax' : 'Audit'}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-slate-200 flex-1">
            {filteredCalendar.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectClient(item.clientId)}
                className="py-3 flex items-start justify-between gap-3 cursor-pointer hover:bg-slate-50 -mx-2 px-2 rounded-md transition-colors"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900 truncate">{item.title}</div>
                  <div className="text-xs text-slate-500 truncate mt-0.5">
                    {item.clientName} · {item.status}
                  </div>
                </div>
                <div className="text-xs font-mono tabular-nums text-slate-700 shrink-0 pt-0.5">
                  {item.date}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 mt-2 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={() => onNavigate('tax')}
              className="text-xs font-medium text-slate-900 hover:underline cursor-pointer"
            >
              Open FTA Tax Workspace →
            </button>
            <button
              type="button"
              onClick={() => onNavigate('auditing')}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              Working Papers →
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
