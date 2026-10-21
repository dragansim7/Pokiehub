import { AccountBonusRow, BonusDeltaSummary, RowDeltaInfo } from '../types/bonus.ts';

const SNAPSHOT_STORAGE_KEY = 'pokies_radar_last_snapshot_v1';

export interface StoredSnapshot {
  savedAt: string;
  rows: AccountBonusRow[];
}

export function loadPreviousSnapshot(): StoredSnapshot | null {
  try {
    const raw = localStorage.getItem(SNAPSHOT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.rows)) {
      return parsed;
    }
  } catch (e) {
    console.warn('Could not read snapshot from localStorage', e);
  }
  return null;
}

export function saveCurrentSnapshot(rows: AccountBonusRow[]): void {
  try {
    const snapshot: StoredSnapshot = {
      savedAt: new Date().toISOString(),
      rows,
    };
    localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshot));
  } catch (e) {
    console.warn('Could not save snapshot to localStorage', e);
  }
}

export function computeBonusDelta(
  currentRows: AccountBonusRow[],
  previousSnapshot: StoredSnapshot | null
): BonusDeltaSummary {
  if (!previousSnapshot || !previousSnapshot.rows || previousSnapshot.rows.length === 0) {
    return {
      previousFetchAt: null,
      newLitUpCount: 0,
      newLitUpValue: 0,
      increasedCount: 0,
      expiredCount: 0,
      cashDelta: 0,
      deltasByRowId: {},
    };
  }

  const prevMap = new Map<string, AccountBonusRow>();
  for (const r of previousSnapshot.rows) {
    prevMap.set(r.id, r);
  }

  let newLitUpCount = 0;
  let newLitUpValue = 0;
  let increasedCount = 0;
  let expiredCount = 0;
  let totalCashDelta = 0;
  const deltasByRowId: Record<string, RowDeltaInfo> = {};

  for (const curr of currentRows) {
    const prev = prevMap.get(curr.id);
    const currLitUp = curr.litUpBonuses || [];
    const prevLitUp = prev?.litUpBonuses || [];

    const currBonusTotal = curr.totalLitUpAmount || 0;
    const prevBonusTotal = prev?.totalLitUpAmount || 0;
    const bonusDiff = Number((currBonusTotal - prevBonusTotal).toFixed(2));

    const currCash = curr.cash || 0;
    const prevCash = prev?.cash || 0;
    const cashDiff = Number((currCash - prevCash).toFixed(2));
    totalCashDelta += cashDiff;

    const details: string[] = [];
    let statusChange: RowDeltaInfo['statusChange'] = 'unchanged';
    let isNewBonus = false;

    // Detect new bonuses
    if (prevLitUp.length === 0 && currLitUp.length > 0) {
      statusChange = 'new';
      isNewBonus = true;
      newLitUpCount += currLitUp.length;
      newLitUpValue += currBonusTotal;
      details.push(`New lit-up bonus found (+$${currBonusTotal.toFixed(2)})`);
    } else if (currLitUp.length > 0 && currBonusTotal > prevBonusTotal) {
      statusChange = 'increased';
      increasedCount++;
      details.push(`Bonus increased by +$${bonusDiff.toFixed(2)}`);
    } else if (prevLitUp.length > 0 && currLitUp.length === 0) {
      statusChange = 'expired';
      expiredCount++;
      details.push(`Previous bonus ($${prevBonusTotal.toFixed(2)}) expired or redeemed`);
    } else if (currBonusTotal < prevBonusTotal) {
      statusChange = 'decreased';
      details.push(`Bonus decreased by -$${Math.abs(bonusDiff).toFixed(2)}`);
    }

    // Cash changes
    if (cashDiff > 0) {
      details.push(`Cash balance +$${cashDiff.toFixed(2)}`);
    } else if (cashDiff < 0) {
      details.push(`Cash balance -$${Math.abs(cashDiff).toFixed(2)}`);
    }

    if (statusChange !== 'unchanged' || cashDiff !== 0) {
      deltasByRowId[curr.id] = {
        isNewBonus,
        amountDelta: bonusDiff,
        cashDelta: cashDiff,
        statusChange,
        details,
      };
    }
  }

  return {
    previousFetchAt: previousSnapshot.savedAt,
    newLitUpCount,
    newLitUpValue: Number(newLitUpValue.toFixed(2)),
    increasedCount,
    expiredCount,
    cashDelta: Number(totalCashDelta.toFixed(2)),
    deltasByRowId,
  };
}
