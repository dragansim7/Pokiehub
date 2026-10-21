import React from 'react';
import { KeyRound, Sparkles, Layers, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  onOpenVault: () => void;
  onOpenDomains: () => void;
  totalLitUpBonuses: number;
  totalLitUpValue: number;
  totalCash: number;
  accountsWithBonus: number;
  bestTurnoverRatio: number;
  activeAccountsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenVault,
  onOpenDomains,
  totalLitUpBonuses,
  totalLitUpValue,
  totalCash,
  accountsWithBonus,
  bestTurnoverRatio,
  activeAccountsCount,
}) => {
  return (
    <header className="border-b border-[#1C1C26] bg-[#0C0D12]">
      {/* Zone 1, 2, 3: Strict Top Bar Contract */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-lg font-bold tracking-tight text-white font-display whitespace-nowrap">
              Pokies Bonus Radar
            </span>
          </div>

          {/* Zone 2: Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
            <a
              href="#radar"
              className="text-white border-b-2 border-cyan-400 pb-0.5 whitespace-nowrap"
            >
              Bonus Radar
            </a>
            <button
              type="button"
              onClick={onOpenVault}
              className="hover:text-slate-200 transition-colors whitespace-nowrap text-left"
            >
              Account Vault ({activeAccountsCount})
            </button>
            <button
              type="button"
              onClick={onOpenDomains}
              className="hover:text-slate-200 transition-colors whitespace-nowrap text-left"
            >
              Supported Pokies (22)
            </button>
          </nav>

          {/* Zone 3: Primary Action */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onOpenVault}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-slate-100 bg-[#1A1A24] hover:bg-[#252533] border border-[#2A2A38] rounded-md transition-colors whitespace-nowrap"
            >
              <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
              <span>Manage Accounts</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Summary Strip */}
      <div className="border-t border-[#181822] bg-[#0E0F16]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="flex flex-col">
              <span className="text-xs text-slate-400 font-medium">Lit-Up Bonuses (&gt;$0)</span>
              <span className="text-xl font-bold font-mono tabular-nums text-emerald-400 mt-0.5">
                {totalLitUpBonuses}
              </span>
            </div>

            <div className="flex flex-col">
              <span className="text-xs text-slate-400 font-medium">Active Promotional Value</span>
              <span className="text-xl font-bold font-mono tabular-nums text-cyan-400 mt-0.5">
                ${totalLitUpValue.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex flex-col">
              <span className="text-xs text-slate-400 font-medium">Withdrawable Cash</span>
              <span className="text-xl font-bold font-mono tabular-nums text-slate-100 mt-0.5">
                ${totalCash.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex flex-col">
              <span className="text-xs text-slate-400 font-medium">Accounts With Promo</span>
              <span className="text-xl font-bold font-mono tabular-nums text-amber-400 mt-0.5">
                {accountsWithBonus} / {activeAccountsCount}
              </span>
            </div>

            <div className="flex flex-col">
              <span className="text-xs text-slate-400 font-medium">Easiest Cashout Ratio</span>
              <span className="text-xl font-bold font-mono tabular-nums text-indigo-300 mt-0.5">
                {bestTurnoverRatio > 0 ? `${bestTurnoverRatio.toFixed(2)}x turnover` : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
