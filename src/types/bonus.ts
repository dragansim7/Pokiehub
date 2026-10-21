export interface BonusPromotion {
  id: string;
  type: 'commission' | 'share' | 'referral' | 'signup' | 'rebate' | 'promotion';
  label: string;
  amount: number;
  minWithdrawal: number;
  maxWithdrawal: number;
  minBet?: number;
  turnover: number; // minWithdrawal / amount
  isLitUp: boolean; // true if available, active, non-greyed out in promotions section
  status: 'active' | 'greyed_out' | 'claimed' | 'expired';
  termsNote?: string;
  directPromoUrl?: string;
}

export interface FallbackCredential {
  phone: string;
  password: string;
}

export interface AccountCredential {
  id: string;
  label: string;
  phone: string;
  password: string;
  fallbacks: FallbackCredential[];
  enabled: boolean;
  tags?: string[];
  lastFetchedAt?: string;
  status?: 'idle' | 'fetching' | 'success' | 'error';
  errorMessage?: string;
}

export interface CasinoDomainInfo {
  domain: string;
  name: string;
  category: 'Popular' | 'High Bonus' | 'VIP' | 'New';
  logoText: string;
  promoPath: string;
}

export interface AccountBonusRow {
  id: string;
  accountId: string;
  accountPhone: string;
  accountLabel: string;
  domain: string;
  casinoName: string;
  casinoIdentity: string;
  cash: number;
  cashMinWithdrawal: number;
  cashMaxWithdrawal: number;
  commission?: BonusPromotion;
  share?: BonusPromotion;
  referral?: BonusPromotion;
  newBonus?: BonusPromotion; // Signup bonus
  rebate?: BonusPromotion;
  availableBonuses: BonusPromotion[];
  litUpBonuses: BonusPromotion[]; // Filtered: isLitUp === true && amount > 0
  totalLitUpAmount: number;
  bestTurnoverRatio: number;
  fetchState: 'success' | 'empty' | 'error';
  errorType?: string;
  errorReason?: string;
  httpCode?: number;
  fetchedAt: string;
  usedFallbackIndex?: number; // 0 for primary, 1 for fallback 1, etc.
}

export interface FetchJobSummary {
  jobId: string;
  state: 'queued' | 'running' | 'completed' | 'cancelled' | 'error';
  total: number;
  finished: number;
  activeWorkers: number;
  progressPct: number;
  startedAt: string;
  completedAt?: string;
  totalLitUpBonuses: number;
  totalLitUpValue: number;
  totalCash: number;
  accountsWithBonus: number;
  errorCount: number;
  results: AccountBonusRow[];
  errors: AccountBonusRow[];
}

export interface DomainIntelRecord {
  id: string;
  domain: string;
  status: 'live' | 'redirect' | 'slow' | 'dead' | 'checking';
  httpStatus: number | null;
  responseMs: number | null;
  finalDomain: string;
  htmlSize: number | null; // in bytes
  checkedAt: string | null;
  reason: string;
  merchantId?: string;
}

export interface IntelScanSummary {
  running: boolean;
  total: number;
  processed: number;
  startedAt?: string;
  finishedAt?: string;
  countLive: number;
  countRedirect: number;
  countSlow: number;
  countDead: number;
}

export interface RowDeltaInfo {
  isNewBonus: boolean;
  amountDelta: number;
  cashDelta: number;
  statusChange: 'new' | 'increased' | 'expired' | 'decreased' | 'unchanged';
  details: string[];
}

export interface BonusDeltaSummary {
  previousFetchAt: string | null;
  newLitUpCount: number;
  newLitUpValue: number;
  increasedCount: number;
  expiredCount: number;
  cashDelta: number;
  deltasByRowId: Record<string, RowDeltaInfo>;
}


