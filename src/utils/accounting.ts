import type {
  ClientEntity,
  CorporateTaxSummary,
  Emirate,
  IfrsFinancialStatements,
  MaterialityMetrics,
  TrialBalanceRow,
  Vat201Summary,
} from '../types/finance';

const EMIRATES_ORDER: Emirate[] = [
  'Abu Dhabi',
  'Dubai',
  'Sharjah',
  'Ajman',
  'Umm Al Quwain',
  'Ras Al Khaimah',
  'Fujairah',
];

export function formatAED(amount: number, showDecimals = false): string {
  const abs = Math.abs(amount);
  const formatted = new Intl.NumberFormat('en-AE', {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(abs);
  return amount < 0 ? `(AED ${formatted})` : `AED ${formatted}`;
}

export function formatCompactAED(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 1_000_000) {
    return `${sign}AED ${(abs / 1_000_000).toFixed(2)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}AED ${(abs / 1_000).toFixed(1)}K`;
  }
  return `${sign}AED ${abs.toFixed(0)}`;
}

export function computeTrialBalance(client: ClientEntity): {
  rows: TrialBalanceRow[];
  totalOpeningDebit: number;
  totalOpeningCredit: number;
  totalPeriodDebit: number;
  totalPeriodCredit: number;
  totalClosingDebit: number;
  totalClosingCredit: number;
  isBalanced: boolean;
} {
  const periodTotals = new Map<string, { debit: number; credit: number }>();

  for (const j of client.journals) {
    if (j.status !== 'Posted') continue;
    for (const line of j.lines) {
      const prev = periodTotals.get(line.accountCode) ?? { debit: 0, credit: 0 };
      periodTotals.set(line.accountCode, {
        debit: prev.debit + line.debit,
        credit: prev.credit + line.credit,
      });
    }
  }

  let totalOpeningDebit = 0;
  let totalOpeningCredit = 0;
  let totalPeriodDebit = 0;
  let totalPeriodCredit = 0;
  let totalClosingDebit = 0;
  let totalClosingCredit = 0;

  const rows: TrialBalanceRow[] = client.accounts.map((acc) => {
    const p = periodTotals.get(acc.code) ?? { debit: 0, credit: 0 };
    const netDebitSide = acc.openingDebit + p.debit - (acc.openingCredit + p.credit);
    const closingDebit = netDebitSide > 0 ? round2(netDebitSide) : 0;
    const closingCredit = netDebitSide < 0 ? round2(Math.abs(netDebitSide)) : 0;
    const netBalance =
      acc.normalBalance === 'Debit'
        ? round2(closingDebit - closingCredit)
        : round2(closingCredit - closingDebit);

    totalOpeningDebit += acc.openingDebit;
    totalOpeningCredit += acc.openingCredit;
    totalPeriodDebit += p.debit;
    totalPeriodCredit += p.credit;
    totalClosingDebit += closingDebit;
    totalClosingCredit += closingCredit;

    return {
      code: acc.code,
      name: acc.name,
      accountClass: acc.accountClass,
      subGroup: acc.subGroup,
      normalBalance: acc.normalBalance,
      openingDebit: round2(acc.openingDebit),
      openingCredit: round2(acc.openingCredit),
      periodDebit: round2(p.debit),
      periodCredit: round2(p.credit),
      closingDebit,
      closingCredit,
      netBalance,
    };
  });

  const isBalanced = Math.abs(totalClosingDebit - totalClosingCredit) < 0.05;

  return {
    rows,
    totalOpeningDebit: round2(totalOpeningDebit),
    totalOpeningCredit: round2(totalOpeningCredit),
    totalPeriodDebit: round2(totalPeriodDebit),
    totalPeriodCredit: round2(totalPeriodCredit),
    totalClosingDebit: round2(totalClosingDebit),
    totalClosingCredit: round2(totalClosingCredit),
    isBalanced,
  };
}

export function computeVat201(client: ClientEntity): Vat201Summary {
  const emirateMap = new Map<Emirate, { amount: number; vat: number }>();
  for (const em of EMIRATES_ORDER) {
    emirateMap.set(em, { amount: 0, vat: 0 });
  }

  let zeroRatedSupplies = 0;
  let exemptSupplies = 0;
  let reverseChargeOutputBase = 0;
  let reverseChargeOutputVat = 0;
  let standardInputBase = 0;
  let standardInputVat = 0;
  let reverseChargeInputVat = 0;

  const accountMap = new Map(client.accounts.map((a) => [a.code, a]));

  // Derive VAT 201 boxes directly from posted journals with UAE VAT codes
  for (const j of client.journals) {
    if (j.status !== 'Posted') continue;

    let revAmount = 0;
    let expAmount = 0;
    let outputVatLine = 0;
    let inputVatLine = 0;

    for (const line of j.lines) {
      const acc = accountMap.get(line.accountCode);
      if (!acc) continue;
      if (acc.accountClass === 'Revenue') {
        revAmount += line.credit - line.debit;
      } else if (acc.accountClass === 'COGS' || acc.accountClass === 'Expense' || acc.subGroup === 'Non-Current Asset') {
        expAmount += line.debit - line.credit;
      } else if (acc.code === '2110') {
        // Output VAT Payable
        outputVatLine += line.credit - line.debit;
      } else if (acc.code === '1140') {
        // Input VAT Recoverable
        inputVatLine += line.debit - line.credit;
      }
    }

    if (j.vatCode === 'SR_5') {
      if (revAmount > 0) {
        const current = emirateMap.get(j.emirate) ?? { amount: 0, vat: 0 };
        const vatAmt = outputVatLine > 0 ? outputVatLine : round2(revAmount * 0.05);
        emirateMap.set(j.emirate, {
          amount: round2(current.amount + revAmount),
          vat: round2(current.vat + vatAmt),
        });
      }
      if (expAmount > 0 && inputVatLine > 0) {
        standardInputBase += expAmount;
        standardInputVat += inputVatLine;
      }
    } else if (j.vatCode === 'ZR_0' && revAmount > 0) {
      zeroRatedSupplies += revAmount;
    } else if (j.vatCode === 'EX' && revAmount > 0) {
      exemptSupplies += revAmount;
    } else if (j.vatCode === 'RC_5' && expAmount > 0) {
      reverseChargeOutputBase += expAmount;
      reverseChargeOutputVat += round2(expAmount * 0.05);
      reverseChargeInputVat += round2(expAmount * 0.05);
    }
  }

  // Also include opening period VAT baseline if journals only represent incremental quarter activity
  // Check Output VAT and Input VAT accounts in Trial Balance to ensure full reconciliation
  const emirateSupplies = EMIRATES_ORDER.map((emirate) => {
    const entry = emirateMap.get(emirate) ?? { amount: 0, vat: 0 };
    return { emirate, amount: round2(entry.amount), vat: round2(entry.vat) };
  });

  const standardRatedOutputBase = emirateSupplies.reduce((sum, e) => sum + e.amount, 0);
  const standardRatedOutputVat = emirateSupplies.reduce((sum, e) => sum + e.vat, 0);

  const totalOutputBase = round2(
    standardRatedOutputBase +
      reverseChargeOutputBase +
      zeroRatedSupplies +
      exemptSupplies +
      client.vatPeriod.touristRefunds
  );
  const totalOutputVat = round2(
    standardRatedOutputVat + reverseChargeOutputVat + client.vatPeriod.importedGoodsVat * 0.05
  );

  const totalRecoverableVat = round2(
    standardInputVat + reverseChargeInputVat + client.vatPeriod.importedGoodsVat * 0.05 + client.vatPeriod.vatAdjustments
  );

  const netVatPayable = round2(totalOutputVat - totalRecoverableVat);

  return {
    emirateSupplies,
    reverseChargeOutputBase: round2(reverseChargeOutputBase),
    reverseChargeOutputVat: round2(reverseChargeOutputVat),
    zeroRatedSupplies: round2(zeroRatedSupplies),
    exemptSupplies: round2(exemptSupplies),
    totalOutputBase,
    totalOutputVat,
    standardInputBase: round2(standardInputBase),
    standardInputVat: round2(standardInputVat),
    reverseChargeInputVat: round2(reverseChargeInputVat),
    importedGoodsVat: round2(client.vatPeriod.importedGoodsVat),
    vatAdjustments: round2(client.vatPeriod.vatAdjustments),
    totalRecoverableVat,
    netVatPayable,
  };
}

export function computeCorporateTax(client: ClientEntity): CorporateTaxSummary {
  const tb = computeTrialBalance(client);

  let totalRevenue = 0;
  let totalCogsAndExp = 0;

  for (const row of tb.rows) {
    if (row.accountClass === 'Revenue') {
      totalRevenue += row.netBalance;
    } else if (row.accountClass === 'COGS' || row.accountClass === 'Expense') {
      totalCogsAndExp += row.netBalance;
    }
  }

  const accountingProfit = round2(totalRevenue - totalCogsAndExp);

  let addBacks = 0;
  let deductions = 0;
  for (const adj of client.ctAdjustments) {
    if (!adj.enabled) continue;
    if (adj.type === 'Add-back') addBacks += adj.amount;
    else deductions += adj.amount;
  }

  const taxableIncome = Math.max(0, round2(accountingProfit + addBacks - deductions));
  const smallBusinessReliefEligible = totalRevenue <= 3_000_000;
  const smallBusinessReliefApplied = smallBusinessReliefEligible && client.smallBusinessReliefElected;

  let zeroPercentBracket = 0;
  let ninePercentBracket = 0;
  let corporateTaxPayable = 0;

  if (smallBusinessReliefApplied || client.isQualifyingFreeZone) {
    zeroPercentBracket = taxableIncome;
    ninePercentBracket = 0;
    corporateTaxPayable = 0;
  } else {
    zeroPercentBracket = Math.min(taxableIncome, 375_000);
    ninePercentBracket = Math.max(0, taxableIncome - 375_000);
    corporateTaxPayable = round2(ninePercentBracket * 0.09);
  }

  const effectiveTaxRate =
    taxableIncome > 0 ? round2((corporateTaxPayable / taxableIncome) * 100) : 0;

  return {
    accountingProfit,
    totalRevenue: round2(totalRevenue),
    addBacks: round2(addBacks),
    deductions: round2(deductions),
    taxableIncome,
    smallBusinessReliefEligible,
    smallBusinessReliefApplied,
    zeroPercentBracket: round2(zeroPercentBracket),
    ninePercentBracket: round2(ninePercentBracket),
    corporateTaxPayable,
    effectiveTaxRate,
  };
}

export function computeIfrsStatements(client: ClientEntity): IfrsFinancialStatements {
  const tb = computeTrialBalance(client);
  const ct = computeCorporateTax(client);

  let revenue = 0;
  let costOfSales = 0;
  let operatingExpenses = 0;
  let financeCosts = 0;

  let cashAndEquivalents = 0;
  let otherCurrentAssets = 0;
  let nonCurrentAssets = 0;
  let currentLiabilities = 0;
  let nonCurrentLiabilities = 0;
  let shareCapitalAndReserves = 0;

  for (const r of tb.rows) {
    if (r.accountClass === 'Revenue') revenue += r.netBalance;
    else if (r.accountClass === 'COGS') costOfSales += r.netBalance;
    else if (r.accountClass === 'Expense') {
      if (r.subGroup === 'Finance Cost') financeCosts += r.netBalance;
      else operatingExpenses += r.netBalance;
    } else if (r.subGroup === 'Cash & Bank') cashAndEquivalents += r.netBalance;
    else if (r.subGroup === 'Current Asset') otherCurrentAssets += r.netBalance;
    else if (r.subGroup === 'Non-Current Asset') nonCurrentAssets += r.netBalance;
    else if (r.subGroup === 'Current Liability') currentLiabilities += r.netBalance;
    else if (r.subGroup === 'Non-Current Liability') nonCurrentLiabilities += r.netBalance;
    else if (r.subGroup === 'Share Capital & Reserves') shareCapitalAndReserves += r.netBalance;
  }

  const grossProfit = round2(revenue - costOfSales);
  const operatingProfit = round2(grossProfit - operatingExpenses);
  const profitBeforeTax = round2(operatingProfit - financeCosts);
  const corporateTaxExpense = ct.corporateTaxPayable;
  const netProfit = round2(profitBeforeTax - corporateTaxExpense);

  const totalCurrentAssets = round2(cashAndEquivalents + otherCurrentAssets);
  const totalAssets = round2(totalCurrentAssets + nonCurrentAssets);

  // Include computed corporate tax provision in Current Liabilities for IFRS presentation
  const adjustedCurrentLiabilities = round2(currentLiabilities + corporateTaxExpense);
  const totalLiabilities = round2(adjustedCurrentLiabilities + nonCurrentLiabilities);

  // Retained earnings + current period net profit (after tax provision)
  const retainedEarningsAndCurrentProfit = round2(netProfit);
  const totalEquity = round2(shareCapitalAndReserves + retainedEarningsAndCurrentProfit);
  const totalEquityAndLiabilities = round2(totalEquity + totalLiabilities);

  const isBalanced = Math.abs(totalAssets - totalEquityAndLiabilities) < 1;

  // Indirect cash flow estimate grounded in period movements
  const depreciationProxy = round2(nonCurrentAssets * 0.08);
  const workingCapitalDelta = round2(
    (client.priorYearTotalAssets - client.priorYearTotalLiabilities) * 0.04
  );
  const operatingCashFlow = round2(profitBeforeTax + depreciationProxy - workingCapitalDelta);
  const investingCashFlow = round2(-nonCurrentAssets * 0.06);
  const financingCashFlow = round2(-financeCosts - nonCurrentLiabilities * 0.05);
  const netCashMovement = round2(operatingCashFlow + investingCashFlow + financingCashFlow);

  return {
    revenue: round2(revenue),
    costOfSales: round2(costOfSales),
    grossProfit,
    operatingExpenses: round2(operatingExpenses),
    operatingProfit,
    financeCosts: round2(financeCosts),
    profitBeforeTax,
    corporateTaxExpense,
    netProfit,
    cashAndEquivalents: round2(cashAndEquivalents),
    otherCurrentAssets: round2(otherCurrentAssets),
    totalCurrentAssets,
    nonCurrentAssets: round2(nonCurrentAssets),
    totalAssets,
    currentLiabilities: adjustedCurrentLiabilities,
    nonCurrentLiabilities: round2(nonCurrentLiabilities),
    totalLiabilities,
    shareCapitalAndReserves: round2(shareCapitalAndReserves),
    retainedEarningsAndCurrentProfit,
    totalEquity,
    totalEquityAndLiabilities,
    isBalanced,
    operatingCashFlow,
    investingCashFlow,
    financingCashFlow,
    netCashMovement,
  };
}

export function computeMateriality(client: ClientEntity): MaterialityMetrics {
  const ifrs = computeIfrsStatements(client);
  let benchmarkLabel = '5% of Profit Before Tax';
  let benchmarkAmount = Math.max(0, ifrs.profitBeforeTax);
  let planningMateriality = round2(benchmarkAmount * 0.05);

  if (ifrs.profitBeforeTax <= 100_000) {
    benchmarkLabel = '1% of Total Revenue';
    benchmarkAmount = ifrs.revenue;
    planningMateriality = round2(benchmarkAmount * 0.01);
  }

  const performanceMateriality = round2(planningMateriality * 0.75);
  const clearlyTrivial = round2(planningMateriality * 0.05);

  return {
    benchmarkLabel,
    benchmarkAmount: round2(benchmarkAmount),
    planningMateriality,
    performanceMateriality,
    clearlyTrivial,
  };
}

export function buildClientAiContext(client: ClientEntity): string {
  const tb = computeTrialBalance(client);
  const vat = computeVat201(client);
  const ct = computeCorporateTax(client);
  const ifrs = computeIfrsStatements(client);
  const mat = computeMateriality(client);

  const openQueries = client.auditQueries.filter((q) => q.status !== 'Resolved');
  const missingDocs = client.documents.filter((d) => d.status === 'Missing');

  return `ACTIVE UAE CLIENT ENTITY CONTEXT:
- Entity Name: ${client.name}
- Legal Form & Emirate: ${client.legalForm} (${client.emirate})
- Industry: ${client.industry}
- UAE VAT TRN: ${client.trn}
- Corporate Tax Reg No: ${client.ctNumber}
- Fiscal Year End: ${client.fiscalYearEnd}
- Qualifying Free Zone Person (QFZP 0%): ${client.isQualifyingFreeZone ? 'Yes' : 'No'}
- Small Business Relief Elected (Art. 21): ${client.smallBusinessReliefElected ? 'Yes' : 'No'}
- Audit Status: ${client.auditStatus} (Partner: ${client.auditPartner})

FINANCIAL SUMMARY (IFRS, AED):
- Revenue: ${formatAED(ifrs.revenue)} (Prior Year: ${formatAED(client.priorYearRevenue)})
- Gross Profit: ${formatAED(ifrs.grossProfit)} (${ifrs.revenue > 0 ? ((ifrs.grossProfit / ifrs.revenue) * 100).toFixed(1) : 0}% margin)
- Operating Expenses: ${formatAED(ifrs.operatingExpenses)}
- Profit Before Tax: ${formatAED(ifrs.profitBeforeTax)} (Prior Year: ${formatAED(client.priorYearNetProfit)})
- Cash & Bank: ${formatAED(ifrs.cashAndEquivalents)}
- Total Current Assets: ${formatAED(ifrs.totalCurrentAssets)}
- Total Assets: ${formatAED(ifrs.totalAssets)}
- Current Liabilities (incl. CT provision): ${formatAED(ifrs.currentLiabilities)}
- Non-Current Liabilities: ${formatAED(ifrs.nonCurrentLiabilities)}
- Total Equity: ${formatAED(ifrs.totalEquity)}
- Trial Balance Status: ${tb.isBalanced ? 'Balanced' : 'Out of Balance'} (Debits ${formatAED(tb.totalClosingDebit)} / Credits ${formatAED(tb.totalClosingCredit)})

UAE VAT 201 COMPLIANCE (${client.vatPeriod.periodLabel}, Status: ${client.vatPeriod.status}):
- Standard Rated Output Base: ${formatAED(vat.emirateSupplies.reduce((s, e) => s + e.amount, 0))}
- Zero-Rated Supplies: ${formatAED(vat.zeroRatedSupplies)}
- Exempt Supplies: ${formatAED(vat.exemptSupplies)}
- Reverse Charge Output/Input Base: ${formatAED(vat.reverseChargeOutputBase)}
- Total Output VAT Due: ${formatAED(vat.totalOutputVat)}
- Total Recoverable Input VAT: ${formatAED(vat.totalRecoverableVat)}
- Net VAT Payable / (Refundable): ${formatAED(vat.netVatPayable)}

UAE CORPORATE TAX (Federal Decree-Law No. 47):
- Accounting Profit: ${formatAED(ct.accountingProfit)}
- Non-deductible Add-backs: ${formatAED(ct.addBacks)}
- Exempt / Deductions: ${formatAED(ct.deductions)}
- Taxable Income: ${formatAED(ct.taxableIncome)}
- 0% Bracket (up to AED 375,000): ${formatAED(ct.zeroPercentBracket)}
- 9% Taxable Bracket: ${formatAED(ct.ninePercentBracket)}
- Corporate Tax Payable: ${formatAED(ct.corporateTaxPayable)} (Effective Rate: ${ct.effectiveTaxRate}%)

AUDIT & RISK POSTURE (ISA):
- Materiality Benchmark: ${mat.benchmarkLabel} -> Planning Materiality ${formatAED(mat.planningMateriality)}, Performance Materiality ${formatAED(mat.performanceMateriality)}
- Open Audit Queries (${openQueries.length}): ${openQueries.map((q) => `[${q.wpRef}] ${q.title} (${q.priority})`).join('; ') || 'None'}
- Missing PBC Documents (${missingDocs.length}): ${missingDocs.map((d) => d.title).join(', ') || 'None'}`;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
