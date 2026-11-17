export type Emirate =
  | 'Dubai'
  | 'Abu Dhabi'
  | 'Sharjah'
  | 'Ajman'
  | 'Umm Al Quwain'
  | 'Ras Al Khaimah'
  | 'Fujairah';

export type LegalForm =
  | 'Mainland LLC'
  | 'DMCC Free Zone'
  | 'DIFC Entity'
  | 'ADGM SPV'
  | 'JAFZA FZCO';

export type AccountClass = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'COGS' | 'Expense';

export type AccountSubGroup =
  | 'Cash & Bank'
  | 'Current Asset'
  | 'Non-Current Asset'
  | 'Current Liability'
  | 'Non-Current Liability'
  | 'Share Capital & Reserves'
  | 'Operating Revenue'
  | 'Direct Cost'
  | 'Operating Expense'
  | 'Finance Cost';

export type VatCode = 'SR_5' | 'ZR_0' | 'EX' | 'RC_5' | 'OS';

export interface Account {
  code: string;
  name: string;
  accountClass: AccountClass;
  subGroup: AccountSubGroup;
  normalBalance: 'Debit' | 'Credit';
  openingDebit: number;
  openingCredit: number;
}

export interface JournalLine {
  accountCode: string;
  debit: number;
  credit: number;
  memo?: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  ref: string;
  description: string;
  emirate: Emirate;
  vatCode: VatCode;
  postedBy: string;
  status: 'Posted' | 'Draft';
  lines: JournalLine[];
}

export interface VatPeriodState {
  periodLabel: string;
  startDate: string;
  endDate: string;
  status: 'Draft' | 'Partner Reviewed' | 'Submitted';
  ftaReference?: string;
  submittedAt?: string;
  touristRefunds: number;
  importedGoodsVat: number;
  vatAdjustments: number;
}

export interface CtAdjustment {
  id: string;
  description: string;
  articleRef: string;
  type: 'Add-back' | 'Deduction';
  amount: number;
  enabled: boolean;
}

export interface WorkingPaper {
  id: string;
  ref: string;
  title: string;
  isaStandard: string;
  preparer: string;
  reviewer: string;
  risk: 'Low' | 'Medium' | 'High';
  status: 'Not Started' | 'In Progress' | 'Reviewed' | 'Signed Off';
  conclusion: string;
  updatedAt: string;
}

export interface AuditQuery {
  id: string;
  wpRef: string;
  title: string;
  raisedBy: string;
  assignedTo: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Open' | 'Client Responded' | 'Resolved';
  question: string;
  clientResponse: string;
  createdAt: string;
}

export interface ClientDocument {
  id: string;
  title: string;
  category: 'Statutory' | 'Tax' | 'Banking' | 'Contracts';
  requiredBy: string;
  status: 'Missing' | 'Uploaded' | 'Verified';
  fileName?: string;
  uploadedAt?: string;
}

export interface AdvisoryMemo {
  id: string;
  title: string;
  domain: 'Corporate Tax' | 'VAT Structuring' | 'Working Capital' | 'IFRS Advisory' | 'Governance';
  status: 'Proposed' | 'In Progress' | 'Delivered';
  impactSummary: string;
  memoBody: string;
  createdAt: string;
}

export interface MonthlyCashflowPoint {
  month: string;
  revenue: number;
  expenses: number;
  vatNet: number;
}

export interface ClientEntity {
  id: string;
  name: string;
  legalForm: LegalForm;
  emirate: Emirate;
  industry: string;
  trn: string;
  ctNumber: string;
  tradeLicense: string;
  fiscalYearEnd: string;
  isQualifyingFreeZone: boolean;
  smallBusinessReliefElected: boolean;
  auditPartner: string;
  auditStatus: 'Planning' | 'Fieldwork' | 'Partner Review' | 'Completed';
  nextVatDueDate: string;
  nextCtDueDate: string;
  priorYearRevenue: number;
  priorYearNetProfit: number;
  priorYearTotalAssets: number;
  priorYearTotalLiabilities: number;
  priorYearEquity: number;
  accounts: Account[];
  journals: JournalEntry[];
  vatPeriod: VatPeriodState;
  ctAdjustments: CtAdjustment[];
  workingPapers: WorkingPaper[];
  auditQueries: AuditQuery[];
  documents: ClientDocument[];
  advisories: AdvisoryMemo[];
  monthlyCashflow: MonthlyCashflowPoint[];
}

export interface TrialBalanceRow {
  code: string;
  name: string;
  accountClass: AccountClass;
  subGroup: AccountSubGroup;
  normalBalance: 'Debit' | 'Credit';
  openingDebit: number;
  openingCredit: number;
  periodDebit: number;
  periodCredit: number;
  closingDebit: number;
  closingCredit: number;
  netBalance: number;
}

export interface Vat201Summary {
  emirateSupplies: Array<{
    emirate: Emirate;
    amount: number;
    vat: number;
  }>;
  reverseChargeOutputBase: number;
  reverseChargeOutputVat: number;
  zeroRatedSupplies: number;
  exemptSupplies: number;
  totalOutputBase: number;
  totalOutputVat: number;
  standardInputBase: number;
  standardInputVat: number;
  reverseChargeInputVat: number;
  importedGoodsVat: number;
  vatAdjustments: number;
  totalRecoverableVat: number;
  netVatPayable: number;
}

export interface CorporateTaxSummary {
  accountingProfit: number;
  totalRevenue: number;
  addBacks: number;
  deductions: number;
  taxableIncome: number;
  smallBusinessReliefEligible: boolean;
  smallBusinessReliefApplied: boolean;
  zeroPercentBracket: number;
  ninePercentBracket: number;
  corporateTaxPayable: number;
  effectiveTaxRate: number;
}

export interface IfrsFinancialStatements {
  revenue: number;
  costOfSales: number;
  grossProfit: number;
  operatingExpenses: number;
  operatingProfit: number;
  financeCosts: number;
  profitBeforeTax: number;
  corporateTaxExpense: number;
  netProfit: number;
  cashAndEquivalents: number;
  otherCurrentAssets: number;
  totalCurrentAssets: number;
  nonCurrentAssets: number;
  totalAssets: number;
  currentLiabilities: number;
  nonCurrentLiabilities: number;
  totalLiabilities: number;
  shareCapitalAndReserves: number;
  retainedEarningsAndCurrentProfit: number;
  totalEquity: number;
  totalEquityAndLiabilities: number;
  isBalanced: boolean;
  operatingCashFlow: number;
  investingCashFlow: number;
  financingCashFlow: number;
  netCashMovement: number;
}

export interface MaterialityMetrics {
  benchmarkLabel: string;
  benchmarkAmount: number;
  planningMateriality: number;
  performanceMateriality: number;
  clearlyTrivial: number;
}

export type WorkspaceModule =
  | 'overview'
  | 'accounting'
  | 'tax'
  | 'auditing'
  | 'ai'
  | 'consultancy'
  | 'reports';

export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  model?: string;
}
