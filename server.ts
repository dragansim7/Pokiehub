import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { CASINO_DOMAINS } from './src/data/casinoDomains.ts';
import { AccountBonusRow, AccountCredential, BonusPromotion, FetchJobSummary } from './src/types/bonus.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));

// Active job state store
const jobs = new Map<string, FetchJobSummary>();
const sseClients = new Map<string, Set<express.Response>>();

function broadcastJobUpdate(jobId: string, data: any) {
  const clients = sseClients.get(jobId);
  if (!clients) return;
  const message = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    try {
      client.write(message);
    } catch {
      clients.delete(client);
    }
  }
}

// Scrape / Fetch simulator matching Best Pokies List backend logic
async function scrapeAccountDomain(
  account: AccountCredential,
  domainInfo: { domain: string; name: string; promoPath: string },
  attemptIndex = 0
): Promise<AccountBonusRow> {
  const phone = attemptIndex === 0 ? account.phone : account.fallbacks[attemptIndex - 1]?.phone || account.phone;
  const hashBase = `${phone}-${domainInfo.domain}`;
  
  // Deterministic seed based on phone and domain
  let seed = 0;
  for (let i = 0; i < hashBase.length; i++) {
    seed = (seed * 31 + hashBase.charCodeAt(i)) >>> 0;
  }
  const pseudoRand = (offset: number) => {
    const x = Math.sin(seed + offset) * 10000;
    return x - Math.floor(x);
  };

  // Simulate network jitter (20ms - 150ms per query in concurrent pool)
  const networkDelay = Math.floor(30 + pseudoRand(1) * 80);
  await new Promise((resolve) => setTimeout(resolve, networkDelay));

  // Determine if primary credential has auth error and needs fallback
  const hasAuthError = pseudoRand(2) < 0.08 && attemptIndex === 0;
  if (hasAuthError && account.fallbacks && account.fallbacks.length > 0) {
    // Retry with fallback credential
    return scrapeAccountDomain(account, domainInfo, 1);
  } else if (hasAuthError) {
    return {
      id: `${account.id}-${domainInfo.domain}`,
      accountId: account.id,
      accountPhone: phone,
      accountLabel: account.label,
      domain: domainInfo.domain,
      casinoName: domainInfo.name,
      casinoIdentity: String(Math.floor(100000 + pseudoRand(3) * 900000)),
      cash: 0,
      cashMinWithdrawal: 0,
      cashMaxWithdrawal: 0,
      availableBonuses: [],
      litUpBonuses: [],
      totalLitUpAmount: 0,
      bestTurnoverRatio: 0,
      fetchState: 'error',
      errorType: 'auth_failed',
      errorReason: 'Invalid credentials. Fallback chain exhausted.',
      httpCode: 401,
      fetchedAt: new Date().toISOString(),
      usedFallbackIndex: attemptIndex,
    };
  }

  // 10% chance of Cloudflare / WAF block
  const isCloudflareBlocked = pseudoRand(4) < 0.04;
  if (isCloudflareBlocked) {
    return {
      id: `${account.id}-${domainInfo.domain}`,
      accountId: account.id,
      accountPhone: phone,
      accountLabel: account.label,
      domain: domainInfo.domain,
      casinoName: domainInfo.name,
      casinoIdentity: String(Math.floor(100000 + pseudoRand(3) * 900000)),
      cash: 0,
      cashMinWithdrawal: 0,
      cashMaxWithdrawal: 0,
      availableBonuses: [],
      litUpBonuses: [],
      totalLitUpAmount: 0,
      bestTurnoverRatio: 0,
      fetchState: 'error',
      errorType: 'cloudflare_challenge',
      errorReason: 'Cloudflare Turnstile challenge encountered on promotions endpoint',
      httpCode: 403,
      fetchedAt: new Date().toISOString(),
      usedFallbackIndex: attemptIndex,
    };
  }

  // Generate realistic balance & promotions
  const hasCash = pseudoRand(5) > 0.4;
  const cashAmount = hasCash ? Math.floor(pseudoRand(6) * 120 + 5) : 0;
  const cashMinWithdrawal = cashAmount > 0 ? 20 : 0;
  const cashMaxWithdrawal = cashAmount > 0 ? 5000 : 0;

  // Promotions generator:
  // Each promotion has an isLitUp flag (non-greyed out) and status
  const litUpBonuses: BonusPromotion[] = [];
  const allPromos: BonusPromotion[] = [];

  const makePromo = (
    type: 'commission' | 'share' | 'referral' | 'signup' | 'rebate' | 'promotion',
    label: string,
    rawAmount: number,
    minWith: number,
    isAvailable: boolean,
    offset: number
  ): BonusPromotion | undefined => {
    if (rawAmount <= 0) return undefined;
    const isLit = isAvailable;
    const turnover = rawAmount > 0 ? Number((minWith / rawAmount).toFixed(2)) : 0;
    const promo: BonusPromotion = {
      id: `${domainInfo.domain}-${type}-${offset}`,
      type,
      label,
      amount: rawAmount,
      minWithdrawal: minWith,
      maxWithdrawal: Math.max(minWith * 5, 500),
      minBet: 0.2,
      turnover,
      isLitUp: isLit,
      status: isLit ? 'active' : 'greyed_out',
      termsNote: `Turnover multiplier ${turnover}x (Min Cashout $${minWith})`,
      directPromoUrl: `https://${domainInfo.domain}${domainInfo.promoPath}`,
    };
    allPromos.push(promo);
    // Strict requirement: ONLY include in litUpBonuses if active, lit-up, non-greyed out and amount > 0
    if (isLit && rawAmount > 0) {
      litUpBonuses.push(promo);
    }
    return promo;
  };

  // Commission bonus
  const commissionVal = pseudoRand(7) > 0.5 ? Math.floor(pseudoRand(8) * 85 + 10) : 0;
  const commissionIsLit = pseudoRand(9) > 0.3; // 70% lit up if exists
  const commission = makePromo('commission', 'Affiliate / Commission Balance', commissionVal, 30, commissionIsLit, 7);

  // Share bonus
  const shareVal = pseudoRand(10) > 0.6 ? Math.floor(pseudoRand(11) * 45 + 5) : 0;
  const shareIsLit = pseudoRand(12) > 0.35;
  const share = makePromo('share', 'Daily Social Share Reward', shareVal, 20, shareIsLit, 10);

  // Referral bonus
  const referralVal = pseudoRand(13) > 0.65 ? Math.floor(pseudoRand(14) * 60 + 15) : 0;
  const referralIsLit = pseudoRand(15) > 0.4;
  const referral = makePromo('referral', 'Refer-A-Friend Bonus', referralVal, 50, referralIsLit, 13);

  // Signup bonus (New)
  const signupVal = pseudoRand(16) > 0.55 ? Math.floor(pseudoRand(17) * 150 + 25) : 0;
  const signupIsLit = pseudoRand(18) > 0.45;
  const newBonus = makePromo('signup', 'Welcome Match / Free Spin Bonus', signupVal, Math.floor(signupVal * 1.5), signupIsLit, 16);

  // Rebate bonus
  const rebateVal = pseudoRand(19) > 0.7 ? Math.floor(pseudoRand(20) * 35 + 5) : 0;
  const rebateIsLit = pseudoRand(21) > 0.3;
  const rebate = makePromo('rebate', 'Weekly Cash Rebate Promotion', rebateVal, 20, rebateIsLit, 19);

  // Event bonus
  const eventVal = pseudoRand(22) > 0.75 ? Math.floor(pseudoRand(23) * 75 + 10) : 0;
  const eventIsLit = pseudoRand(24) > 0.4;
  const availableBonuses: BonusPromotion[] = [];
  if (eventVal > 0) {
    const eventPromo = makePromo('promotion', 'Weekend Pokies Reload', eventVal, 40, eventIsLit, 22);
    if (eventPromo) availableBonuses.push(eventPromo);
  }

  const totalLitUpAmount = litUpBonuses.reduce((acc, b) => acc + b.amount, 0);
  const bestTurnoverRatio =
    litUpBonuses.length > 0 ? Math.min(...litUpBonuses.map((b) => b.turnover)) : 0;

  const fetchState = litUpBonuses.length > 0 ? 'success' : 'empty';

  return {
    id: `${account.id}-${domainInfo.domain}`,
    accountId: account.id,
    accountPhone: phone,
    accountLabel: account.label,
    domain: domainInfo.domain,
    casinoName: domainInfo.name,
    casinoIdentity: String(Math.floor(100000 + pseudoRand(25) * 900000)),
    cash: cashAmount,
    cashMinWithdrawal,
    cashMaxWithdrawal,
    commission,
    share,
    referral,
    newBonus,
    rebate,
    availableBonuses,
    litUpBonuses,
    totalLitUpAmount,
    bestTurnoverRatio,
    fetchState,
    fetchedAt: new Date().toISOString(),
    usedFallbackIndex: attemptIndex,
  };
}

// Background worker queue execution
async function runConcurrentFetchJob(
  jobId: string,
  accounts: AccountCredential[],
  concurrency: number,
  domains: { domain: string; name: string; promoPath: string }[],
  retryErrorsOnly = false,
  previousErrors: AccountBonusRow[] = []
) {
  const job = jobs.get(jobId);
  if (!job) return;

  job.state = 'running';
  broadcastJobUpdate(jobId, { type: 'job_started', job });

  // Prepare work items: list of [Account, Domain] pairs
  const tasks: { account: AccountCredential; domainInfo: { domain: string; name: string; promoPath: string } }[] = [];

  if (retryErrorsOnly && previousErrors.length > 0) {
    for (const err of previousErrors) {
      const acc = accounts.find((a) => a.id === err.accountId);
      const dom = domains.find((d) => d.domain === err.domain);
      if (acc && dom) tasks.push({ account: acc, domainInfo: dom });
    }
  } else {
    for (const acc of accounts) {
      if (!acc.enabled) continue;
      for (const dom of domains) {
        tasks.push({ account: acc, domainInfo: dom });
      }
    }
  }

  job.total = tasks.length;
  job.finished = 0;

  let taskIndex = 0;
  let activeWorkers = 0;

  const worker = async () => {
    while (taskIndex < tasks.length) {
      if (job.state === 'cancelled') break;

      const currentItem = tasks[taskIndex++];
      if (!currentItem) break;

      activeWorkers++;
      job.activeWorkers = activeWorkers;

      try {
        const result = await scrapeAccountDomain(currentItem.account, currentItem.domainInfo);
        job.finished++;
        job.progressPct = Math.round((job.finished / Math.max(job.total, 1)) * 100);

        if (result.fetchState === 'error') {
          job.errors.push(result);
          job.errorCount++;
        } else {
          job.results.push(result);
          if (result.litUpBonuses.length > 0) {
            job.totalLitUpBonuses += result.litUpBonuses.length;
            job.totalLitUpValue += result.totalLitUpAmount;
            job.accountsWithBonus++;
          }
          if (result.cash > 0) {
            job.totalCash += result.cash;
          }
        }

        // Stream periodic progress or every batch item
        broadcastJobUpdate(jobId, {
          type: 'progress',
          finished: job.finished,
          total: job.total,
          progressPct: job.progressPct,
          activeWorkers,
          latestResult: result,
          totalLitUpBonuses: job.totalLitUpBonuses,
          totalLitUpValue: job.totalLitUpValue,
          totalCash: job.totalCash,
        });
      } catch (err: any) {
        job.finished++;
        job.errorCount++;
      } finally {
        activeWorkers--;
        job.activeWorkers = activeWorkers;
      }
    }
  };

  // Launch workers up to concurrency level
  const workerPool = [];
  const poolSize = Math.min(Math.max(1, concurrency), 16);
  for (let i = 0; i < poolSize; i++) {
    workerPool.push(worker());
  }

  await Promise.all(workerPool);

  if ((job.state as string) !== 'cancelled') {
    job.state = 'completed';
    job.completedAt = new Date().toISOString();
  }
  job.activeWorkers = 0;
  broadcastJobUpdate(jobId, { type: 'job_completed', job });
}

// API Routes
app.get('/api/domains', (_req, res) => {
  res.json({ domains: CASINO_DOMAINS });
});

app.post('/api/jobs', (req, res) => {
  const { accounts, concurrency = 4, customDomains, retryErrorsOnly = false, previousErrors = [] } = req.body;

  if (!Array.isArray(accounts) || accounts.length === 0) {
    return res.status(400).json({ error: 'At least one account is required to start fetching.' });
  }

  const selectedDomains =
    Array.isArray(customDomains) && customDomains.length > 0
      ? CASINO_DOMAINS.filter((d) => customDomains.includes(d.domain))
      : CASINO_DOMAINS;

  const jobId = `fetch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const summary: FetchJobSummary = {
    jobId,
    state: 'queued',
    total: accounts.filter((a) => a.enabled).length * selectedDomains.length,
    finished: 0,
    activeWorkers: 0,
    progressPct: 0,
    startedAt: new Date().toISOString(),
    totalLitUpBonuses: 0,
    totalLitUpValue: 0,
    totalCash: 0,
    accountsWithBonus: 0,
    errorCount: 0,
    results: [],
    errors: [],
  };

  jobs.set(jobId, summary);

  // Start concurrent processing in background
  runConcurrentFetchJob(
    jobId,
    accounts,
    Number(concurrency),
    selectedDomains,
    Boolean(retryErrorsOnly),
    previousErrors
  );

  res.json({
    jobId,
    totalExpected: summary.total,
    concurrency,
    state: summary.state,
  });
});

app.get('/api/jobs/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  res.json(job);
});

app.post('/api/jobs/:jobId/cancel', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  job.state = 'cancelled';
  broadcastJobUpdate(req.params.jobId, { type: 'job_cancelled', job });
  res.json({ message: 'Fetch job cancelled', jobId: job.jobId });
});

// Server-Sent Events stream for real-time live updates
app.get('/api/jobs/:jobId/events', (req, res) => {
  const jobId = req.params.jobId;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  if (!sseClients.has(jobId)) {
    sseClients.set(jobId, new Set());
  }
  const clientSet = sseClients.get(jobId)!;
  clientSet.add(res);

  // Send initial snapshot
  const job = jobs.get(jobId);
  if (job) {
    res.write(`data: ${JSON.stringify({ type: 'snapshot', job })}\n\n`);
  }

  req.on('close', () => {
    clientSet.delete(res);
  });
});

// Quick account verification endpoint
app.post('/api/verify-credential', async (req, res) => {
  const { phone, password, domain = 'houseofjack.com' } = req.body;
  if (!phone || !password) {
    return res.status(400).json({ valid: false, error: 'Phone and password are required' });
  }
  // Simulate authentication handshake with target casino protocol
  await new Promise((r) => setTimeout(r, 200));
  const isValid = phone.length >= 8 && password.length >= 4;
  res.json({
    valid: isValid,
    domain,
    phone,
    status: isValid ? 'Authenticated' : 'Invalid login credentials',
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Pokies Bonus Radar server running on port ${PORT}`);
  });
}

startServer();
