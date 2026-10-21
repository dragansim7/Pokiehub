import React from 'react';
import { Play, Square, RefreshCw, Download, Zap, AlertCircle } from 'lucide-react';

interface FetchControlBarProps {
  isFetching: boolean;
  concurrency: number;
  onConcurrencyChange: (value: number) => void;
  onStartFetch: () => void;
  onStopFetch: () => void;
  onRetryErrors: () => void;
  onExportCsv: () => void;
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
  concurrency,
  onConcurrencyChange,
  onStartFetch,
  onStopFetch,
  onRetryErrors,
  onExportCsv,
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
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-black bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 disabled:pointer-events-none rounded-md transition-all shadow-sm"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start Concurrent Fetch ({enabledAccountsCount} accounts)</span>
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
