import React from 'react';
import { X, ExternalLink, ShieldCheck, CheckCircle2, Clock } from 'lucide-react';
import { AccountBonusRow } from '../types/bonus.ts';

interface PromotionDetailsModalProps {
  row: AccountBonusRow | null;
  onClose: () => void;
}

export const PromotionDetailsModal: React.FC<PromotionDetailsModalProps> = ({
  row,
  onClose,
}) => {
  if (!row) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#101118] border border-[#232536] rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E1F2C]">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-white font-display">
                {row.casinoName} Promotion Audit
              </h3>
              <span className="text-xs text-slate-400 font-mono">({row.domain})</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Account: <strong className="text-slate-200 font-mono">{row.accountPhone}</strong> ({row.accountLabel})
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Summary metrics */}
          <div className="grid grid-cols-3 gap-3 p-3 bg-[#0C0D12] rounded-lg border border-[#1E202E]">
            <div>
              <span className="text-[11px] text-slate-400">Cash Balance</span>
              <p className="text-sm font-bold font-mono text-white mt-0.5">${row.cash.toFixed(2)}</p>
              <p className="text-[10px] text-slate-400">Min: ${row.cashMinWithdrawal} · Max: ${row.cashMaxWithdrawal}</p>
            </div>
            <div>
              <span className="text-[11px] text-slate-400">Lit-Up Bonuses (&gt;$0)</span>
              <p className="text-sm font-bold font-mono text-emerald-400 mt-0.5">${row.totalLitUpAmount.toFixed(2)}</p>
              <p className="text-[10px] text-slate-400">{row.litUpBonuses.length} promotions available</p>
            </div>
            <div>
              <span className="text-[11px] text-slate-400">Lowest Turnover Ratio</span>
              <p className="text-sm font-bold font-mono text-indigo-300 mt-0.5">
                {row.bestTurnoverRatio > 0 ? `${row.bestTurnoverRatio.toFixed(2)}x` : '—'}
              </p>
              <p className="text-[10px] text-slate-400">minWithdrawal / amount</p>
            </div>
          </div>

          {/* Active Lit-up promotions */}
          <div>
            <h4 className="text-xs font-semibold text-slate-300 mb-2">Available Lit-Up Promotions (&gt;0)</h4>
            {row.litUpBonuses.length === 0 ? (
              <p className="text-xs text-slate-400 bg-[#0C0D12] p-3 rounded border border-[#1E202E]">
                No active non-greyed out promotions found for this casino account.
              </p>
            ) : (
              <div className="space-y-2">
                {row.litUpBonuses.map((promo) => (
                  <div
                    key={promo.id}
                    className="p-3 bg-[#0E1513] border border-emerald-500/30 rounded-lg flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white capitalize">{promo.label}</span>
                        <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-1.5 py-0.5 rounded">
                          Lit-Up / Active
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Min Withdrawal: ${promo.minWithdrawal} · Max: ${promo.maxWithdrawal} · Min Bet: ${promo.minBet || 0.2}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-base font-bold font-mono text-emerald-300">
                        ${promo.amount.toFixed(2)}
                      </span>
                      <p className="text-[11px] font-mono text-indigo-300">
                        {promo.turnover.toFixed(2)}x turnover
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Raw JSON payload */}
          <div>
            <h4 className="text-xs font-semibold text-slate-300 mb-2">Raw Scraped Backend Payload</h4>
            <pre className="p-3 bg-[#0C0D12] border border-[#1E202E] rounded-md text-[11px] font-mono text-slate-300 overflow-x-auto max-h-48">
              {JSON.stringify(row, null, 2)}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#1E1F2C] bg-[#0C0D12] flex items-center justify-between">
          <span className="text-xs text-slate-400 font-mono">
            Scraped: {new Date(row.fetchedAt).toLocaleString()}
          </span>

          <a
            href={`https://${row.domain}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-800/60 rounded transition-colors"
          >
            <span>Open Casino Site</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
