import React, { useMemo, useState } from 'react';
import { CheckCircle2, Download, Printer } from 'lucide-react';
import type { ClientEntity } from '../types/finance';
import { computeCorporateTax, computeIfrsStatements, formatAED } from '../utils/accounting';

interface ReportsModuleProps {
  client: ClientEntity;
}

export const ReportsModule: React.FC<ReportsModuleProps> = ({ client }) => {
  const [tab, setTab] = useState<'sofp' | 'pl' | 'cf' | 'notes'>('sofp');

  const ifrs = useMemo(() => computeIfrsStatements(client), [client]);
  const ct = useMemo(() => computeCorporateTax(client), [client]);

  const priorAssets = client.priorYearTotalAssets;
  const priorLiabilities = client.priorYearTotalLiabilities;
  const priorEquity = client.priorYearEquity;

  const handleExportStatementsCsv = () => {
    const lines = [
      ['Statement', 'Line Item', 'FY 2026 (AED)', 'FY 2025 (AED)'],
      ['Balance Sheet', 'Cash and Cash Equivalents', ifrs.cashAndEquivalents.toFixed(2), '—'],
      ['Balance Sheet', 'Other Current Assets', ifrs.otherCurrentAssets.toFixed(2), '—'],
      ['Balance Sheet', 'Total Current Assets', ifrs.totalCurrentAssets.toFixed(2), '—'],
      ['Balance Sheet', 'Non-Current Assets', ifrs.nonCurrentAssets.toFixed(2), '—'],
      ['Balance Sheet', 'Total Assets', ifrs.totalAssets.toFixed(2), priorAssets.toFixed(2)],
      ['Balance Sheet', 'Total Liabilities', ifrs.totalLiabilities.toFixed(2), priorLiabilities.toFixed(2)],
      ['Balance Sheet', 'Total Equity', ifrs.totalEquity.toFixed(2), priorEquity.toFixed(2)],
      ['Profit or Loss', 'Revenue', ifrs.revenue.toFixed(2), client.priorYearRevenue.toFixed(2)],
      ['Profit or Loss', 'Cost of Sales', (-ifrs.costOfSales).toFixed(2), '—'],
      ['Profit or Loss', 'Gross Profit', ifrs.grossProfit.toFixed(2), '—'],
      ['Profit or Loss', 'Operating Expenses', (-ifrs.operatingExpenses).toFixed(2), '—'],
      ['Profit or Loss', 'Profit Before Tax', ifrs.profitBeforeTax.toFixed(2), '—'],
      ['Profit or Loss', 'UAE Corporate Tax Expense', (-ifrs.corporateTaxExpense).toFixed(2), '—'],
      ['Profit or Loss', 'Net Profit for the Period', ifrs.netProfit.toFixed(2), client.priorYearNetProfit.toFixed(2)],
    ];
    const csv = lines.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${client.id}-ifrs-financial-statements.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 no-print">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">IFRS Financial Statements</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Prepared in accordance with International Financial Reporting Standards (IFRS) · Reporting Currency: AED
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleExportStatementsCsv}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Print / Save PDF
          </button>
        </div>
      </div>

      {/* Statement Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg w-fit overflow-x-auto no-print">
        {[
          { id: 'sofp', label: 'Statement of Financial Position' },
          { id: 'pl', label: 'Statement of Profit or Loss' },
          { id: 'cf', label: 'Statement of Cash Flows' },
          { id: 'notes', label: 'IFRS & UAE Tax Notes' },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id as typeof tab)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              tab === item.id
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Formal Financial Statement Sheet */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-200 bg-slate-50/50">
          <div className="text-xs font-mono text-slate-500">
            {client.name} · {client.legalForm} · License {client.tradeLicense}
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mt-1">
            {tab === 'sofp' && 'Statement of Financial Position (Balance Sheet)'}
            {tab === 'pl' && 'Statement of Profit or Loss and Other Comprehensive Income'}
            {tab === 'cf' && 'Statement of Cash Flows (Indirect Method)'}
            {tab === 'notes' && 'Notes to the Financial Statements'}
          </h2>
          <div className="flex items-center justify-between mt-1 text-xs text-slate-500">
            <span>For the period ending {client.fiscalYearEnd} · Expressed in UAE Dirhams (AED)</span>
            {ifrs.isBalanced && (
              <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Balance Sheet Reconciled
              </span>
            )}
          </div>
        </div>

        {tab === 'sofp' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-medium text-slate-500">
                  <th className="py-3 px-8">Assets, Equity &amp; Liabilities</th>
                  <th className="py-3 px-4 text-right">FY 2026 (AED)</th>
                  <th className="py-3 px-8 text-right">FY 2025 Comp. (AED)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="bg-slate-50/70">
                  <td colSpan={3} className="py-2 px-8 text-xs font-semibold text-slate-700">
                    Assets
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-8 text-slate-700">Non-Current Assets (PPE &amp; Right-of-Use)</td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                    {formatAED(ifrs.nonCurrentAssets, true)}
                  </td>
                  <td className="py-2.5 px-8 text-right font-mono tabular-nums text-slate-500">—</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-8 text-slate-700">Cash and Bank Balances</td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                    {formatAED(ifrs.cashAndEquivalents, true)}
                  </td>
                  <td className="py-2.5 px-8 text-right font-mono tabular-nums text-slate-500">—</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-8 text-slate-700">
                    Trade Receivables, Contract Assets &amp; Input VAT
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                    {formatAED(ifrs.otherCurrentAssets, true)}
                  </td>
                  <td className="py-2.5 px-8 text-right font-mono tabular-nums text-slate-500">—</td>
                </tr>
                <tr className="bg-slate-50 font-medium text-slate-900">
                  <td className="py-2.5 px-8">Total Current Assets</td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                    {formatAED(ifrs.totalCurrentAssets, true)}
                  </td>
                  <td className="py-2.5 px-8 text-right font-mono tabular-nums text-slate-500">—</td>
                </tr>
                <tr className="border-t-2 border-b-2 border-slate-900 font-semibold text-slate-900 bg-slate-50">
                  <td className="py-3 px-8">Total Assets</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">
                    {formatAED(ifrs.totalAssets, true)}
                  </td>
                  <td className="py-3 px-8 text-right font-mono tabular-nums text-slate-700">
                    {priorAssets > 0 ? formatAED(priorAssets, true) : '—'}
                  </td>
                </tr>

                <tr className="bg-slate-50/70">
                  <td colSpan={3} className="py-2 px-8 text-xs font-semibold text-slate-700">
                    Equity &amp; Liabilities
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-8 text-slate-700">Share Capital &amp; Brought-Forward Reserves</td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                    {formatAED(ifrs.shareCapitalAndReserves, true)}
                  </td>
                  <td className="py-2.5 px-8 text-right font-mono tabular-nums text-slate-500">—</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-8 text-slate-700">Current Period Profit After Corporate Tax</td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                    {formatAED(ifrs.retainedEarningsAndCurrentProfit, true)}
                  </td>
                  <td className="py-2.5 px-8 text-right font-mono tabular-nums text-slate-500">—</td>
                </tr>
                <tr className="bg-slate-50 font-medium text-slate-900">
                  <td className="py-2.5 px-8">Total Equity</td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                    {formatAED(ifrs.totalEquity, true)}
                  </td>
                  <td className="py-2.5 px-8 text-right font-mono tabular-nums text-slate-700">
                    {priorEquity > 0 ? formatAED(priorEquity, true) : '—'}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-8 text-slate-700">Non-Current Liabilities (EOSB &amp; Bank Debt)</td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                    {formatAED(ifrs.nonCurrentLiabilities, true)}
                  </td>
                  <td className="py-2.5 px-8 text-right font-mono tabular-nums text-slate-500">—</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-8 text-slate-700">
                    Current Liabilities (Payables, Output VAT &amp; UAE CT Provision)
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                    {formatAED(ifrs.currentLiabilities, true)}
                  </td>
                  <td className="py-2.5 px-8 text-right font-mono tabular-nums text-slate-500">—</td>
                </tr>
                <tr className="bg-slate-50 font-medium text-slate-900">
                  <td className="py-2.5 px-8">Total Liabilities</td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                    {formatAED(ifrs.totalLiabilities, true)}
                  </td>
                  <td className="py-2.5 px-8 text-right font-mono tabular-nums text-slate-700">
                    {priorLiabilities > 0 ? formatAED(priorLiabilities, true) : '—'}
                  </td>
                </tr>
                <tr className="border-t-2 border-b-2 border-slate-900 font-semibold text-slate-900 bg-slate-50">
                  <td className="py-3 px-8">Total Equity &amp; Liabilities</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">
                    {formatAED(ifrs.totalEquityAndLiabilities, true)}
                  </td>
                  <td className="py-3 px-8 text-right font-mono tabular-nums text-slate-700">
                    {priorAssets > 0 ? formatAED(priorEquity + priorLiabilities, true) : '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {tab === 'pl' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-medium text-slate-500">
                  <th className="py-3 px-8">Line Item</th>
                  <th className="py-3 px-4 text-right">FY 2026 (AED)</th>
                  <th className="py-3 px-8 text-right">FY 2025 Comp. (AED)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-2.5 px-8 font-medium text-slate-900">Revenue (IFRS 15)</td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums font-medium">
                    {formatAED(ifrs.revenue, true)}
                  </td>
                  <td className="py-2.5 px-8 text-right font-mono tabular-nums text-slate-600">
                    {client.priorYearRevenue > 0 ? formatAED(client.priorYearRevenue, true) : '—'}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-8 text-slate-700">Cost of Sales</td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-red-700">
                    {formatAED(-ifrs.costOfSales, true)}
                  </td>
                  <td className="py-2.5 px-8 text-right font-mono tabular-nums text-slate-500">—</td>
                </tr>
                <tr className="bg-slate-50 font-semibold text-slate-900">
                  <td className="py-2.5 px-8">Gross Profit</td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                    {formatAED(ifrs.grossProfit, true)}
                  </td>
                  <td className="py-2.5 px-8 text-right font-mono tabular-nums text-slate-500">—</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-8 text-slate-700">General, Administrative &amp; Staff Expenses</td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-red-700">
                    {formatAED(-ifrs.operatingExpenses, true)}
                  </td>
                  <td className="py-2.5 px-8 text-right font-mono tabular-nums text-slate-500">—</td>
                </tr>
                <tr className="bg-slate-50 font-medium text-slate-900">
                  <td className="py-2.5 px-8">Operating Profit (EBIT)</td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                    {formatAED(ifrs.operatingProfit, true)}
                  </td>
                  <td className="py-2.5 px-8 text-right font-mono tabular-nums text-slate-500">—</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-8 text-slate-700">Finance Costs</td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-red-700">
                    {formatAED(-ifrs.financeCosts, true)}
                  </td>
                  <td className="py-2.5 px-8 text-right font-mono tabular-nums text-slate-500">—</td>
                </tr>
                <tr className="font-medium text-slate-900">
                  <td className="py-2.5 px-8">Profit Before Corporate Tax</td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                    {formatAED(ifrs.profitBeforeTax, true)}
                  </td>
                  <td className="py-2.5 px-8 text-right font-mono tabular-nums text-slate-500">—</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-8 text-slate-700">
                    UAE Corporate Tax Expense (IAS 12 · Decree-Law No. 47)
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-red-700">
                    {formatAED(-ifrs.corporateTaxExpense, true)}
                  </td>
                  <td className="py-2.5 px-8 text-right font-mono tabular-nums text-slate-500">—</td>
                </tr>
                <tr className="border-t-2 border-b-2 border-slate-900 font-semibold text-slate-900 bg-slate-50">
                  <td className="py-3 px-8">Net Profit for the Period</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">
                    {formatAED(ifrs.netProfit, true)}
                  </td>
                  <td className="py-3 px-8 text-right font-mono tabular-nums text-slate-700">
                    {client.priorYearNetProfit > 0 ? formatAED(client.priorYearNetProfit, true) : '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {tab === 'cf' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-medium text-slate-500">
                  <th className="py-3 px-8">Cash Flow Activity (IAS 7)</th>
                  <th className="py-3 px-8 text-right">FY 2026 (AED)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-3 px-8 font-medium text-slate-900">
                    Net Cash Generated from Operating Activities
                  </td>
                  <td className="py-3 px-8 text-right font-mono tabular-nums font-medium">
                    {formatAED(ifrs.operatingCashFlow, true)}
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-8 text-slate-700">
                    Net Cash Used in Investing Activities (Capex &amp; Equipment)
                  </td>
                  <td className="py-3 px-8 text-right font-mono tabular-nums text-red-700">
                    {formatAED(ifrs.investingCashFlow, true)}
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-8 text-slate-700">
                    Net Cash Used in Financing Activities (Facilities &amp; Finance Costs)
                  </td>
                  <td className="py-3 px-8 text-right font-mono tabular-nums text-red-700">
                    {formatAED(ifrs.financingCashFlow, true)}
                  </td>
                </tr>
                <tr className="border-t-2 border-b-2 border-slate-900 bg-slate-50 font-semibold text-slate-900">
                  <td className="py-3 px-8">Net Increase / (Decrease) in Cash &amp; Equivalents</td>
                  <td className="py-3 px-8 text-right font-mono tabular-nums">
                    {formatAED(ifrs.netCashMovement, true)}
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-8 text-slate-700">Closing Cash and Bank Balances (GL 1010)</td>
                  <td className="py-3 px-8 text-right font-mono tabular-nums font-semibold">
                    {formatAED(ifrs.cashAndEquivalents, true)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {tab === 'notes' && (
          <div className="p-8 space-y-6 text-sm text-slate-700 leading-relaxed">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1.5">
                Note 1. Corporate Information &amp; Basis of Preparation
              </h3>
              <p className="text-xs leading-relaxed">
                {client.name} is registered as a {client.legalForm} in {client.emirate}, United Arab Emirates
                under Commercial License {client.tradeLicense} (VAT TRN {client.trn}). These financial
                statements are prepared in accordance with International Financial Reporting Standards (IFRS)
                and presented in UAE Dirhams (AED), the functional currency of the entity.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1.5">
                Note 2. UAE Corporate Tax (Federal Decree-Law No. 47 of 2022)
              </h3>
              <p className="text-xs leading-relaxed">
                Pursuant to UAE Federal Decree-Law No. 47, Corporate Tax is levied at 0% on taxable income up
                to AED 375,000 and 9% on taxable income exceeding AED 375,000. For FY 2026, accounting net
                profit of {formatAED(ct.accountingProfit, true)} was adjusted for statutory add-backs of{' '}
                {formatAED(ct.addBacks, true)} and exemptions of {formatAED(ct.deductions, true)}, resulting
                in taxable income of {formatAED(ct.taxableIncome, true)} and a Corporate Tax provision of{' '}
                {formatAED(ct.corporateTaxPayable, true)} (effective rate {ct.effectiveTaxRate.toFixed(2)}%).
                {client.isQualifyingFreeZone &&
                  ' The entity applies the 0% Qualifying Free Zone Person regime under Article 18.'}
                {ct.smallBusinessReliefApplied &&
                  ' The entity elected Article 21 Small Business Relief as gross revenue is below AED 3,000,000.'}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1.5">
                Note 3. End of Service Benefits (UAE Labour Law)
              </h3>
              <p className="text-xs leading-relaxed">
                Provision for employees&apos; end-of-service gratuity is accrued in accordance with UAE Federal
                Decree-Law No. 33 of 2021 (Regulation of Employment Relations) based on basic salary and years
                of continuous service.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
