import React, { useState, useMemo } from 'react';
import { Search, ExternalLink, ChevronDown, ChevronUp, AlertTriangle, ArrowUpDown, Filter } from 'lucide-react';
import { AccountBonusRow, BonusPromotion } from '../types/bonus.ts';

interface BonusGridProps {
  rows: AccountBonusRow[];
  isFetching: boolean;
  onOpenDetails: (row: AccountBonusRow) => void;
}

type FilterCategory =
  | 'lit-up'
  | 'all'
  | 'signup'
  | 'commission'
  | 'share'
  | 'referral'
  | 'rebate'
  | 'cash'
  | 'errors';

type SortOption =
  | 'turnover-asc'
  | 'bonus-desc'
  | 'cash-desc'
  | 'domain-asc'
  | 'account-asc';

export const BonusGrid: React.FC<BonusGridProps> = ({
  rows,
  isFetching,
  onOpenDetails,
}) => {
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('lit-up');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('turnover-asc');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Filter logic
  const filteredRows = useMemo(() => {
    let result = [...rows];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (r) =>
          r.domain.toLowerCase().includes(q) ||
          r.casinoName.toLowerCase().includes(q) ||
          r.accountPhone.toLowerCase().includes(q) ||
          r.accountLabel.toLowerCase().includes(q)
      );
    }

    // Category filter
    switch (filterCategory) {
      case 'lit-up':
        // Strictly filter to active, lit-up bonuses > $0
        result = result.filter((r) => r.litUpBonuses && r.litUpBonuses.length > 0);
        break;
      case 'signup':
        result = result.filter(
          (r) => r.newBonus && r.newBonus.isLitUp && r.newBonus.amount > 0
        );
        break;
      case 'commission':
        result = result.filter(
          (r) => r.commission && r.commission.isLitUp && r.commission.amount > 0
        );
        break;
      case 'share':
        result = result.filter(
          (r) => r.share && r.share.isLitUp && r.share.amount > 0
        );
        break;
      case 'referral':
        result = result.filter(
          (r) => r.referral && r.referral.isLitUp && r.referral.amount > 0
        );
        break;
      case 'rebate':
        result = result.filter(
          (r) => r.rebate && r.rebate.isLitUp && r.rebate.amount > 0
        );
        break;
      case 'cash':
        result = result.filter((r) => r.cash > 0);
        break;
      case 'errors':
        result = result.filter((r) => r.fetchState === 'error');
        break;
      case 'all':
      default:
        // Shows all scraped
        break;
    }

    // Sort logic
    result.sort((a, b) => {
      switch (sortOption) {
        case 'turnover-asc': {
          const aTurn = a.bestTurnoverRatio || 999;
          const bTurn = b.bestTurnoverRatio || 999;
          return aTurn - bTurn;
        }
        case 'bonus-desc':
          return (b.totalLitUpAmount || 0) - (a.totalLitUpAmount || 0);
        case 'cash-desc':
          return (b.cash || 0) - (a.cash || 0);
        case 'domain-asc':
          return a.domain.localeCompare(b.domain);
        case 'account-asc':
          return a.accountPhone.localeCompare(b.accountPhone);
        default:
          return 0;
      }
    });

    return result;
  }, [rows, searchQuery, filterCategory, sortOption]);

  const toggleExpand = (id: string) => {
    setExpandedRowId((prev) => (prev === id ? null : id));
  };

  const getBonusBadge = (b: BonusPromotion) => {
    return (
      <div
        key={b.id}
        className={`flex flex-col p-2.5 rounded border ${
          b.isLitUp
            ? 'bg-[#101F18] border-emerald-500/30 text-emerald-100'
            : 'bg-[#15151B] border-[#252530] text-slate-400 opacity-60'
        }`}
      >
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-slate-200 capitalize">{b.type} Bonus</span>
          {b.isLitUp ? (
            <span className="text-[11px] font-medium text-emerald-400">Available</span>
          ) : (
            <span className="text-[11px] text-slate-400">Greyed Out</span>
          )}
        </div>
        <div className="flex items-baseline gap-2 mt-1.5">
          <span className="text-base font-bold font-mono tabular-nums text-emerald-300">
            ${b.amount.toFixed(2)}
          </span>
          <span className="text-xs text-slate-400 font-mono tabular-nums">
            {b.turnover.toFixed(2)}x turnover
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
          <span>Min cashout: ${b.minWithdrawal}</span>
          <span aria-hidden="true">·</span>
          <span>Max: ${b.maxWithdrawal}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Category filter tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
        {/* Interactive filter tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#12131A] rounded-lg border border-[#20212C]">
          {[
            { id: 'lit-up', label: 'Lit-Up Promos (>0)' },
            { id: 'all', label: 'All Scraped' },
            { id: 'signup', label: 'Signup / Match' },
            { id: 'commission', label: 'Commission' },
            { id: 'share', label: 'Share' },
            { id: 'referral', label: 'Referral' },
            { id: 'rebate', label: 'Rebate' },
            { id: 'cash', label: 'Cash Balance' },
            { id: 'errors', label: 'Errors' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterCategory(tab.id as FilterCategory)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                filterCategory === tab.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Sort controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by domain or phone..."
              className="pl-8 pr-3 py-1.5 text-xs bg-[#12131A] border border-[#20212C] rounded-md text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-cyan-500/50 w-52"
            />
          </div>

          {/* Sort selector */}
          <div className="flex items-center gap-1.5 bg-[#12131A] border border-[#20212C] rounded-md px-2.5 py-1.5 text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">Sort:</span>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
            >
              <option value="turnover-asc" className="bg-[#12131A] text-slate-200">
                Lowest Turnover Ratio (Easiest Cashout)
              </option>
              <option value="bonus-desc" className="bg-[#12131A] text-slate-200">
                Highest Bonus Amount ($)
              </option>
              <option value="cash-desc" className="bg-[#12131A] text-slate-200">
                Highest Cash Balance ($)
              </option>
              <option value="domain-asc" className="bg-[#12131A] text-slate-200">
                Casino Domain (A-Z)
              </option>
              <option value="account-asc" className="bg-[#12131A] text-slate-200">
                Account Phone Number
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Count Banner */}
      <div className="flex items-center justify-between text-xs text-slate-400 pb-3">
        <span>
          Showing <strong className="text-slate-200 font-mono">{filteredRows.length}</strong> matching casino-account records
        </span>
        {filterCategory === 'lit-up' && (
          <span className="text-emerald-400">
            Strict Filter: Available, active, non-greyed out promotions only (&gt;$0)
          </span>
        )}
      </div>

      {/* Main Data Grid */}
      {filteredRows.length === 0 ? (
        <div className="p-12 text-center rounded-lg border border-[#1E1F2A] bg-[#0E0F16]">
          <Filter className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-200">No matching casino bonuses found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            {rows.length === 0
              ? 'Click "Start Concurrent Fetch" above to scan your accounts across all supported pokie sites.'
              : 'Try selecting "All Scraped" tab or clearing the search query to view all accounts.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRows.map((row) => {
            const isExpanded = expandedRowId === row.id;
            const hasLitUp = row.litUpBonuses && row.litUpBonuses.length > 0;

            return (
              <div
                key={row.id}
                className={`rounded-lg border transition-all ${
                  row.fetchState === 'error'
                    ? 'bg-[#150F11] border-rose-900/40'
                    : hasLitUp
                    ? 'bg-[#101118] border-[#222433] hover:border-cyan-500/30'
                    : 'bg-[#0E0F16] border-[#1C1C26]'
                }`}
              >
                {/* Main Row summary */}
                <div className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Casino & Account identification */}
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-[#181924] border border-[#252738] flex items-center justify-center font-bold text-xs font-mono text-cyan-400 shrink-0">
                      {row.casinoName.slice(0, 3).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-sm">{row.casinoName}</span>
                        <span className="text-xs text-slate-400 font-mono">({row.domain})</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                        <span className="font-mono text-slate-300">{row.accountPhone}</span>
                        <span aria-hidden="true">·</span>
                        <span>{row.accountLabel}</span>
                        {row.usedFallbackIndex && row.usedFallbackIndex > 0 ? (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-amber-400 text-[11px]">
                              Fallback #{row.usedFallbackIndex}
                            </span>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Financial Metrics Strip */}
                  <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                    {/* Withdrawable cash */}
                    <div className="flex flex-col">
                      <span className="text-[11px] text-slate-400 font-medium">Cash Balance</span>
                      <span className="text-sm font-bold font-mono tabular-nums text-slate-200">
                        ${row.cash.toFixed(2)}
                      </span>
                    </div>

                    {/* Total Lit-up active bonus */}
                    <div className="flex flex-col">
                      <span className="text-[11px] text-slate-400 font-medium">Lit-Up Bonus</span>
                      <span
                        className={`text-sm font-bold font-mono tabular-nums ${
                          hasLitUp ? 'text-emerald-400' : 'text-slate-400'
                        }`}
                      >
                        ${row.totalLitUpAmount.toFixed(2)}
                      </span>
                    </div>

                    {/* Best turnover */}
                    <div className="flex flex-col">
                      <span className="text-[11px] text-slate-400 font-medium">Turnover Req</span>
                      <span className="text-sm font-bold font-mono tabular-nums text-indigo-300">
                        {row.bestTurnoverRatio > 0 ? `${row.bestTurnoverRatio.toFixed(2)}x` : '—'}
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2">
                      {/* Direct Casino Link (no claiming, direct link to casino promo page) */}
                      <a
                        href={`https://${row.domain}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-800/60 rounded transition-colors whitespace-nowrap"
                      >
                        <span>Open Casino</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>

                      {/* Expand / Details toggle */}
                      <button
                        type="button"
                        onClick={() => toggleExpand(row.id)}
                        className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-[#1A1B28] rounded border border-[#27283A] transition-colors"
                        aria-label="Toggle details"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Error Banner if failed */}
                {row.fetchState === 'error' && (
                  <div className="px-4 py-2.5 bg-rose-950/20 border-t border-rose-900/30 flex items-center gap-2 text-xs text-rose-300">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>
                      {row.errorType?.toUpperCase()}: {row.errorReason || 'Authentication or scraping error.'}
                    </span>
                  </div>
                )}

                {/* Lit-Up Bonuses horizontal chips preview (when not expanded) */}
                {!isExpanded && hasLitUp && (
                  <div className="px-4 py-2.5 bg-[#0A0B10] border-t border-[#1A1B28] flex flex-wrap items-center gap-2">
                    <span className="text-[11px] text-slate-400 font-medium mr-1">Active Promotions:</span>
                    {row.litUpBonuses.map((b) => (
                      <span
                        key={b.id}
                        className="inline-flex items-center gap-1.5 text-xs font-mono text-emerald-300 bg-emerald-950/30 border border-emerald-800/40 px-2 py-0.5 rounded"
                      >
                        <span className="capitalize">{b.type}:</span>
                        <strong>${b.amount.toFixed(2)}</strong>
                        <span className="text-slate-400 text-[11px]">({b.turnover.toFixed(1)}x)</span>
                      </span>
                    ))}
                  </div>
                )}

                {/* Expanded Details section */}
                {isExpanded && (
                  <div className="px-4 py-4 bg-[#0A0B10] border-t border-[#1C1D2A] space-y-4">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-300 mb-2">
                        Promotions Status for {row.accountPhone}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {row.commission && getBonusBadge(row.commission)}
                        {row.share && getBonusBadge(row.share)}
                        {row.referral && getBonusBadge(row.referral)}
                        {row.newBonus && getBonusBadge(row.newBonus)}
                        {row.rebate && getBonusBadge(row.rebate)}
                        {row.availableBonuses &&
                          row.availableBonuses.map((b) => getBonusBadge(b))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#181924] text-xs">
                      <span className="text-slate-400 font-mono">
                        Identity: #{row.casinoIdentity} · Scraped at {new Date(row.fetchedAt).toLocaleTimeString()}
                      </span>
                      <button
                        type="button"
                        onClick={() => onOpenDetails(row)}
                        className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                      >
                        View Full Raw Payload
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
