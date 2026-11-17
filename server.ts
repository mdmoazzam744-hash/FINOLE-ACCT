import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { SEED_CLIENTS, standardUaeChartOfAccounts } from './src/data/seedClients.ts';
import { buildClientAiContext } from './src/utils/accounting.ts';
import type {
  AdvisoryMemo,
  AuditQuery,
  ClientDocument,
  ClientEntity,
  CtAdjustment,
  Emirate,
  JournalEntry,
  LegalForm,
  WorkingPaper,
} from './src/types/finance.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '.data');
const DATA_FILE = path.join(DATA_DIR, 'workspace.json');

function loadWorkspace(): ClientEntity[] {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed as ClientEntity[];
      }
    }
  } catch {
    // Fallback to seed data if disk read fails
  }
  return structuredClone(SEED_CLIENTS);
}

function saveWorkspace(clients: ClientEntity[]): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(clients, null, 2), 'utf-8');
  } catch {
    // Non-fatal in read-only environments; in-memory state remains authoritative
  }
}

let clientsState: ClientEntity[] = loadWorkspace();

function findClient(id: string): ClientEntity | undefined {
  return clientsState.find((c) => c.id === id);
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY_MISSING');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', clientsCount: clientsState.length });
  });

  app.get('/api/workspace', (_req, res) => {
    res.json({ clients: clientsState });
  });

  app.post('/api/workspace/reset', (_req, res) => {
    clientsState = structuredClone(SEED_CLIENTS);
    saveWorkspace(clientsState);
    res.json({ clients: clientsState });
  });

  app.post('/api/clients', (req, res) => {
    const body = req.body as {
      name?: string;
      legalForm?: LegalForm;
      emirate?: Emirate;
      industry?: string;
      trn?: string;
      ctNumber?: string;
      tradeLicense?: string;
      shareCapital?: number;
      isQualifyingFreeZone?: boolean;
    };

    if (!body.name || !body.trn) {
      res.status(400).json({ error: 'Client name and 15-digit UAE VAT TRN are required.' });
      return;
    }

    const shareCapital = Math.max(50_000, Number(body.shareCapital ?? 300_000));
    const id = `${body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Date.now().toString().slice(-4)}`;

    const newClient: ClientEntity = {
      id,
      name: body.name.trim(),
      legalForm: body.legalForm ?? 'Mainland LLC',
      emirate: body.emirate ?? 'Dubai',
      industry: body.industry?.trim() || 'Commercial Trading & Services',
      trn: body.trn.trim(),
      ctNumber: body.ctNumber?.trim() || `CT-2026-${Math.floor(100000 + Math.random() * 900000)}`,
      tradeLicense: body.tradeLicense?.trim() || `DED-${Math.floor(100000 + Math.random() * 900000)}`,
      fiscalYearEnd: '31 Dec 2026',
      isQualifyingFreeZone: Boolean(body.isQualifyingFreeZone),
      smallBusinessReliefElected: false,
      auditPartner: 'Tariq Al Mansoori, CPA',
      auditStatus: 'Planning',
      nextVatDueDate: '2026-11-28',
      nextCtDueDate: '2027-09-30',
      priorYearRevenue: 0,
      priorYearNetProfit: 0,
      priorYearTotalAssets: shareCapital,
      priorYearTotalLiabilities: 0,
      priorYearEquity: shareCapital,
      accounts: standardUaeChartOfAccounts({
        '1010': { openingDebit: shareCapital },
        '3010': { openingCredit: shareCapital },
      }),
      journals: [],
      vatPeriod: {
        periodLabel: 'Q3 2026 (Aug – Oct)',
        startDate: '2026-08-01',
        endDate: '2026-10-31',
        status: 'Draft',
        touristRefunds: 0,
        importedGoodsVat: 0,
        vatAdjustments: 0,
      },
      ctAdjustments: [],
      workingPapers: [
        {
          id: `wp-${Date.now()}`,
          ref: 'WP-A10',
          title: 'Client Acceptance & Statutory Engagement Letter',
          isaStandard: 'ISA 210 / 220',
          preparer: 'Rami Haddad',
          reviewer: 'Tariq Al Mansoori',
          risk: 'Low',
          status: 'In Progress',
          conclusion: 'Onboarding KYC and UBO verification initiated.',
          updatedAt: new Date().toISOString().slice(0, 10),
        },
      ],
      auditQueries: [],
      documents: [
        {
          id: `doc-${Date.now()}-1`,
          title: 'UAE Commercial Trade License',
          category: 'Statutory',
          requiredBy: '2026-11-25',
          status: 'Missing',
        },
        {
          id: `doc-${Date.now()}-2`,
          title: 'FTA VAT TRN & Corporate Tax Registration Certificate',
          category: 'Tax',
          requiredBy: '2026-11-25',
          status: 'Missing',
        },
      ],
      advisories: [],
      monthlyCashflow: [
        { month: 'May', revenue: 0, expenses: 0, vatNet: 0 },
        { month: 'Jun', revenue: 0, expenses: 0, vatNet: 0 },
        { month: 'Jul', revenue: 0, expenses: 0, vatNet: 0 },
        { month: 'Aug', revenue: 0, expenses: 0, vatNet: 0 },
        { month: 'Sep', revenue: 0, expenses: 0, vatNet: 0 },
        { month: 'Oct', revenue: 0, expenses: 0, vatNet: 0 },
      ],
    };

    clientsState = [newClient, ...clientsState];
    saveWorkspace(clientsState);
    res.status(201).json({ client: newClient });
  });

  app.patch('/api/clients/:id/settings', (req, res) => {
    const client = findClient(req.params.id);
    if (!client) {
      res.status(404).json({ error: 'Client entity not found.' });
      return;
    }

    const { isQualifyingFreeZone, smallBusinessReliefElected, auditStatus } = req.body as Partial<ClientEntity>;
    if (typeof isQualifyingFreeZone === 'boolean') client.isQualifyingFreeZone = isQualifyingFreeZone;
    if (typeof smallBusinessReliefElected === 'boolean') client.smallBusinessReliefElected = smallBusinessReliefElected;
    if (auditStatus) client.auditStatus = auditStatus;

    saveWorkspace(clientsState);
    res.json({ client });
  });

  app.post('/api/clients/:id/journals', (req, res) => {
    const client = findClient(req.params.id);
    if (!client) {
      res.status(404).json({ error: 'Client entity not found.' });
      return;
    }

    const entry = req.body as Omit<JournalEntry, 'id'>;
    if (!entry.description || !Array.isArray(entry.lines) || entry.lines.length < 2) {
      res.status(400).json({ error: 'Journal entry requires a description and at least two lines.' });
      return;
    }

    const totalDebit = entry.lines.reduce((s, l) => s + Number(l.debit || 0), 0);
    const totalCredit = entry.lines.reduce((s, l) => s + Number(l.credit || 0), 0);

    if (totalDebit <= 0 || Math.abs(totalDebit - totalCredit) > 0.01) {
      res.status(400).json({ error: 'Journal entry is out of balance (Total Debits must equal Total Credits).' });
      return;
    }

    const created: JournalEntry = {
      id: `jn-${Date.now()}`,
      date: entry.date || new Date().toISOString().slice(0, 10),
      ref: entry.ref || `JV-${Math.floor(1000 + Math.random() * 9000)}`,
      description: entry.description.trim(),
      emirate: entry.emirate || client.emirate,
      vatCode: entry.vatCode || 'OS',
      postedBy: entry.postedBy || 'Tariq Al Mansoori',
      status: 'Posted',
      lines: entry.lines.map((l) => ({
        accountCode: l.accountCode,
        debit: Number(l.debit || 0),
        credit: Number(l.credit || 0),
        memo: l.memo,
      })),
    };

    client.journals.push(created);

    // Reflect revenue/expense activity in latest monthly cashflow bar
    const accountMap = new Map(client.accounts.map((a) => [a.code, a]));
    let revDelta = 0;
    let expDelta = 0;
    for (const line of created.lines) {
      const acc = accountMap.get(line.accountCode);
      if (!acc) continue;
      if (acc.accountClass === 'Revenue') revDelta += line.credit - line.debit;
      if (acc.accountClass === 'COGS' || acc.accountClass === 'Expense') expDelta += line.debit - line.credit;
    }
    const lastPoint = client.monthlyCashflow[client.monthlyCashflow.length - 1];
    if (lastPoint) {
      lastPoint.revenue += revDelta;
      lastPoint.expenses += expDelta;
    }

    saveWorkspace(clientsState);
    res.status(201).json({ client, journal: created });
  });

  app.patch('/api/clients/:id/vat', (req, res) => {
    const client = findClient(req.params.id);
    if (!client) {
      res.status(404).json({ error: 'Client entity not found.' });
      return;
    }

    const body = req.body as Partial<ClientEntity['vatPeriod']>;
    if (body.status) {
      client.vatPeriod.status = body.status;
      if (body.status === 'Submitted') {
        client.vatPeriod.ftaReference = body.ftaReference || `FTA-201-${Math.floor(10000000 + Math.random() * 90000000)}`;
        client.vatPeriod.submittedAt = new Date().toISOString().slice(0, 10);
      }
    }
    if (typeof body.importedGoodsVat === 'number') client.vatPeriod.importedGoodsVat = Math.max(0, body.importedGoodsVat);
    if (typeof body.vatAdjustments === 'number') client.vatPeriod.vatAdjustments = body.vatAdjustments;
    if (typeof body.touristRefunds === 'number') client.vatPeriod.touristRefunds = Math.max(0, body.touristRefunds);

    saveWorkspace(clientsState);
    res.json({ client });
  });

  app.post('/api/clients/:id/ct-adjustments', (req, res) => {
    const client = findClient(req.params.id);
    if (!client) {
      res.status(404).json({ error: 'Client entity not found.' });
      return;
    }
    const body = req.body as Partial<CtAdjustment>;
    if (!body.description || !body.amount) {
      res.status(400).json({ error: 'Adjustment description and amount are required.' });
      return;
    }
    const adj: CtAdjustment = {
      id: `ct-${Date.now()}`,
      description: body.description.trim(),
      articleRef: body.articleRef?.trim() || 'Art. 33',
      type: body.type === 'Deduction' ? 'Deduction' : 'Add-back',
      amount: Math.max(0, Number(body.amount)),
      enabled: true,
    };
    client.ctAdjustments.push(adj);
    saveWorkspace(clientsState);
    res.status(201).json({ client, adjustment: adj });
  });

  app.patch('/api/clients/:id/ct-adjustments/:adjId', (req, res) => {
    const client = findClient(req.params.id);
    if (!client) {
      res.status(404).json({ error: 'Client entity not found.' });
      return;
    }
    const adj = client.ctAdjustments.find((a) => a.id === req.params.adjId);
    if (!adj) {
      res.status(404).json({ error: 'Corporate tax adjustment not found.' });
      return;
    }
    const { enabled } = req.body as { enabled?: boolean };
    if (typeof enabled === 'boolean') adj.enabled = enabled;
    saveWorkspace(clientsState);
    res.json({ client });
  });

  app.patch('/api/clients/:id/working-papers/:wpId', (req, res) => {
    const client = findClient(req.params.id);
    if (!client) {
      res.status(404).json({ error: 'Client entity not found.' });
      return;
    }
    const wp = client.workingPapers.find((w) => w.id === req.params.wpId);
    if (!wp) {
      res.status(404).json({ error: 'Working paper not found.' });
      return;
    }
    const body = req.body as Partial<WorkingPaper>;
    if (body.status) wp.status = body.status;
    if (typeof body.conclusion === 'string') wp.conclusion = body.conclusion;
    if (body.risk) wp.risk = body.risk;
    wp.updatedAt = new Date().toISOString().slice(0, 10);

    saveWorkspace(clientsState);
    res.json({ client });
  });

  app.post('/api/clients/:id/queries', (req, res) => {
    const client = findClient(req.params.id);
    if (!client) {
      res.status(404).json({ error: 'Client entity not found.' });
      return;
    }
    const body = req.body as Partial<AuditQuery>;
    if (!body.title || !body.question) {
      res.status(400).json({ error: 'Query title and question are required.' });
      return;
    }
    const query: AuditQuery = {
      id: `aq-${Date.now()}`,
      wpRef: body.wpRef || 'WP-B10',
      title: body.title.trim(),
      raisedBy: body.raisedBy || client.auditPartner,
      assignedTo: body.assignedTo || 'Client CFO',
      priority: body.priority || 'Medium',
      status: 'Open',
      question: body.question.trim(),
      clientResponse: '',
      createdAt: new Date().toISOString().slice(0, 10),
    };
    client.auditQueries.unshift(query);
    saveWorkspace(clientsState);
    res.status(201).json({ client, query });
  });

  app.patch('/api/clients/:id/queries/:queryId', (req, res) => {
    const client = findClient(req.params.id);
    if (!client) {
      res.status(404).json({ error: 'Client entity not found.' });
      return;
    }
    const q = client.auditQueries.find((item) => item.id === req.params.queryId);
    if (!q) {
      res.status(404).json({ error: 'Audit query not found.' });
      return;
    }
    const body = req.body as Partial<AuditQuery>;
    if (body.status) q.status = body.status;
    if (typeof body.clientResponse === 'string') q.clientResponse = body.clientResponse;
    saveWorkspace(clientsState);
    res.json({ client });
  });

  app.post('/api/clients/:id/documents', (req, res) => {
    const client = findClient(req.params.id);
    if (!client) {
      res.status(404).json({ error: 'Client entity not found.' });
      return;
    }
    const body = req.body as Partial<ClientDocument>;
    if (!body.title) {
      res.status(400).json({ error: 'Document title is required.' });
      return;
    }
    const doc: ClientDocument = {
      id: `doc-${Date.now()}`,
      title: body.title.trim(),
      category: body.category || 'Statutory',
      requiredBy: body.requiredBy || '2026-11-30',
      status: body.status || 'Missing',
      fileName: body.fileName,
      uploadedAt: body.status && body.status !== 'Missing' ? new Date().toISOString().slice(0, 10) : undefined,
    };
    client.documents.push(doc);
    saveWorkspace(clientsState);
    res.status(201).json({ client, document: doc });
  });

  app.patch('/api/clients/:id/documents/:docId', (req, res) => {
    const client = findClient(req.params.id);
    if (!client) {
      res.status(404).json({ error: 'Client entity not found.' });
      return;
    }
    const doc = client.documents.find((d) => d.id === req.params.docId);
    if (!doc) {
      res.status(404).json({ error: 'Document not found.' });
      return;
    }
    const body = req.body as Partial<ClientDocument>;
    if (body.status) {
      doc.status = body.status;
      if (body.status !== 'Missing' && !doc.uploadedAt) {
        doc.uploadedAt = new Date().toISOString().slice(0, 10);
      }
    }
    if (body.fileName) doc.fileName = body.fileName;
    saveWorkspace(clientsState);
    res.json({ client });
  });

  app.post('/api/clients/:id/advisories', (req, res) => {
    const client = findClient(req.params.id);
    if (!client) {
      res.status(404).json({ error: 'Client entity not found.' });
      return;
    }
    const body = req.body as Partial<AdvisoryMemo>;
    if (!body.title || !body.memoBody) {
      res.status(400).json({ error: 'Advisory title and memo content are required.' });
      return;
    }
    const memo: AdvisoryMemo = {
      id: `adv-${Date.now()}`,
      title: body.title.trim(),
      domain: body.domain || 'Corporate Tax',
      status: body.status || 'Proposed',
      impactSummary: body.impactSummary?.trim() || 'Advisory review documented for client board.',
      memoBody: body.memoBody.trim(),
      createdAt: new Date().toISOString().slice(0, 10),
    };
    client.advisories.unshift(memo);
    saveWorkspace(clientsState);
    res.status(201).json({ client, advisory: memo });
  });

  app.post('/api/ai/chat', async (req, res) => {
    const { clientId, prompt, history } = req.body as {
      clientId?: string;
      prompt?: string;
      history?: Array<{ role: 'user' | 'assistant'; content: string }>;
    };

    if (!prompt || !prompt.trim()) {
      res.status(400).json({ error: 'A prompt is required for AI financial analysis.' });
      return;
    }

    const client = clientId ? findClient(clientId) : clientsState[0];
    if (!client) {
      res.status(404).json({ error: 'Client entity not found.' });
      return;
    }

    try {
      const ai = getGeminiClient();
      const contextBlock = buildClientAiContext(client);

      const historyText = Array.isArray(history) && history.length > 0
        ? `\n\nPRIOR CONVERSATION:\n${history
            .slice(-6)
            .map((m) => `${m.role === 'user' ? 'Partner' : 'AI Analyst'}: ${m.content}`)
            .join('\n')}`
        : '';

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `${contextBlock}${historyText}\n\nPARTNER REQUEST:\n${prompt.trim()}`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
          systemInstruction:
            'You are a Senior UAE Chartered Accountant, FTA Registered Tax Agent, and ISA External Auditor advising an accounting & audit firm partner in Dubai/Abu Dhabi. ' +
            'Analyze the provided live client financial data accurately in AED. Cite applicable UAE Federal Decree-Law No. 47 (Corporate Tax 9% / AED 375,000 threshold / Art. 21 Small Business Relief / Art. 18 QFZP), UAE VAT Decree-Law No. 8 (Form VAT 201, Reverse Charge Mechanism, Emirate-wise reporting), and IFRS / ISA standards where relevant. ' +
            'Structure your answer with crisp headings, bullet points, exact AED numbers from the client context, and concrete next actions for the audit or tax team. Never invent figures not supported by the context.',
        },
      });

      const text = response.text;
      if (!text) {
        res.status(502).json({ error: 'Gemini returned an empty response. Please retry.' });
        return;
      }

      res.json({
        text,
        model: 'gemini-4-hydrogen',
        clientName: client.name,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error calling Gemini API';
      if (message === 'GEMINI_API_KEY_MISSING') {
        res.status(400).json({
          error:
            'GEMINI_API_KEY is not configured. Open Settings > Secrets in AI Studio to attach your Gemini API key.',
        });
        return;
      }
      console.error('Gemini API error:', err);
      res.status(500).json({
        error: `AI analysis request failed: ${message}`,
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT || 3000);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`UAE Finance & Audit Pro server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
