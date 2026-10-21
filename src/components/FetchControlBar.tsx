import React from 'react';
import { Play, Square, RefreshCw, Download, Zap, AlertCircle } from 'lucide-react';

interface FetchControlBarProps {
  isFetching: boolean;
  fetchMode: 'live' | 'simulated';
  onFetchModeChange: (mode: 'live' | 'simulated') => void;
  concurrency: number;
  onConcurrencyChange: (value: number) => void;
  onStartFetch: () => void;
  onStopFetch: () => void;
  onRetryErrors: () => void;
  onExportCsv: () => void;
  skipDeadDomains: boolean;
  onToggleSkipDeadDomains: () => void;
  deadDomainsCount: number;
  onOpenIntel?: () => void;
  progressPct: number;
  finishedTasks: number;
  totalTasks: number;
  activeWorkers: number;
  errorCount: number;
  elapsedSeconds: number;
  enabledAccountsCount: number;
}

export const FetchControlBar: React.FC<FetchControlBarProps> = ({
  isFetching,
  fetchMode,
  onFetchModeChange,
  concurrency,
  onConcurrencyChange,
  onStartFetch,
  onStopFetch,
  onRetryErrors,
  onExportCsv,
  skipDeadDomains,
  onToggleSkipDeadDomains,
  deadDomainsCount,
  onOpenIntel,
  progressPct,
  finishedTasks,
  totalTasks,
  activeWorkers,
  errorCount,
  elapsedSeconds,
  enabledAccountsCount,
}) => {
  return (
    <div className="bg-[#12131A] border-y border-[#1E1F2A] px-4 sm:px-6 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Controls zone */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Mode Switcher: Live API vs Simulation */}
          <div className="flex items-center p-0.5 bg-[#0C0D12] border border-[#232533] rounded-md text-xs">
            <button
              type="button"
              disabled={isFetching}
              onClick={() => onFetchModeChange('live')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                fetchMode === 'live'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Real outbound HTTP requests with direct casino credentials"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${fetchMode === 'live' ? 'bg-emerald-400' : 'bg-slate-600'}`} />
              <span>Live HTTP Mode</span>
            </button>
            <button
              type="button"
              disabled={isFetching}
              onClick={() => onFetchModeChange('simulated')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                fetchMode === 'simulated'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Deterministic testing sandbox for offline development"
            >
              <span>Sandbox Demo</span>
            </button>
          </div>

          {/* Concurrency Selector */}
          <div className="flex items-center gap-1.5 bg-[#0C0D12] border border-[#232533] rounded-md px-2.5 py-1 text-xs">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400 font-medium">Workers:</span>
            <div className="flex items-center gap-1 ml-1">
              {[2, 4, 8, 16].map((num) => (
                <button
                  key={num}
                  type="button"
                  disabled={isFetching}
                  onClick={() => onConcurrencyChange(num)}
                  className={`px-2 py-0.5 rounded text-xs font-mono font-medium transition-colors ${
                    concurrency === num
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {num}x
                </button>
              ))}
            </div>
          </div>

          {/* Start / Stop Trigger */}
          {!isFetching ? (
            <button
              type="button"
              onClick={onStartFetch}
              disabled={enabledAccountsCount === 0}
              className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition-all shadow-sm ${
                fetchMode === 'live'
                  ? 'text-black bg-emerald-400 hover:bg-emerald-300'
                  : 'text-black bg-cyan-400 hover:bg-cyan-300'
              } disabled:opacity-50 disabled:pointer-events-none`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>
                {fetchMode === 'live' ? 'Fetch Real Accounts' : 'Start Simulation'} ({enabledAccountsCount})
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onStopFetch}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-md transition-all"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop Fetch ({activeWorkers} active)</span>
            </button>
          )}

          {/* Retry errors button */}
          {errorCount > 0 && !isFetching && (
            <button
              type="button"
              onClick={onRetryErrors}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-amber-300 bg-amber-950/40 hover:bg-amber-900/50 border border-amber-800/60 rounded-md transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry {errorCount} Errors</span>
            </button>
          )}

          {/* Option 1: Skip Dead Domains Toggle */}
          <button
            type="button"
            onClick={onToggleSkipDeadDomains}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border transition-colors ${
              skipDeadDomains
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60'
                : 'bg-[#1A1A24] text-slate-400 border-[#2B2B3C] hover:text-slate-200'
            }`}
            title="Auto-skip domains flagged as dead in Domain Intelligence"
          >
            <span>{skipDeadDomains ? '✓ Skipping' : 'Include'} Dead ({deadDomainsCount})</span>
          </button>

          {/* Direct jump to Domain Intelligence */}
          {onOpenIntel && (
            <button
              type="button"
              onClick={onOpenIntel}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 bg-[#1A1A24] hover:bg-[#252533] border border-[#2B2B3C] rounded-md transition-colors"
              title="Open Domain Intelligence & Live URL Prober"
            >
              <span>Domain Intel &amp; Prober →</span>
            </button>
          )}

          {/* Export CSV button */}
          <button
            type="button"
            onClick={onExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 bg-[#1A1A24] hover:bg-[#252533] border border-[#2B2B3C] rounded-md transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Export Active CSV</span>
          </button>
        </div>

        {/* Live telemetry & progress zone */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {isFetching && (
            <div className="w-40 sm:w-48 bg-[#1A1A24] rounded-full h-2 overflow-hidden border border-[#2B2B3C]">
              <div
                className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-full transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            {isFetching ? (
              <>
                <span className="text-cyan-300 font-medium tabular-nums">{progressPct}%</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{finishedTasks}/{totalTasks} tasks</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{elapsedSeconds}s</span>
              </>
            ) : totalTasks > 0 ? (
              <>
                <span className="text-emerald-400 font-medium">Fetch complete</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{finishedTasks} tasks completed</span>
                {errorCount > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-rose-400 tabular-nums">{errorCount} errors</span>
                  </>
                )}
              </>
            ) : (
              <span>Ready · Click Start to fetch promotions concurrently</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
