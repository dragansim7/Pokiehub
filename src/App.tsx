import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Header } from './components/Header.tsx';
import { FetchControlBar } from './components/FetchControlBar.tsx';
import { BonusGrid } from './components/BonusGrid.tsx';
import { AccountVaultModal } from './components/AccountVaultModal.tsx';
import { PromotionDetailsModal } from './components/PromotionDetailsModal.tsx';
import { DomainsCatalogModal } from './components/DomainsCatalogModal.tsx';
import { DomainIntelView } from './components/DomainIntelView.tsx';
import { useAccountVault } from './hooks/useAccountVault.ts';
import { AccountBonusRow, FetchJobSummary } from './types/bonus.ts';

export default function App() {
  const [activeView, setActiveView] = useState<'radar' | 'intel'>('radar');
  const {
    accounts,
    addAccount,
    deleteAccount,
    toggleAccount,
    toggleAll,
    importFromCsv,
    exportToCsv: exportVaultCsv,
    resetToDefaults,
  } = useAccountVault();

  // Modals state
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [isDomainsOpen, setIsDomainsOpen] = useState(false);
  const [selectedRowForDetails, setSelectedRowForDetails] = useState<AccountBonusRow | null>(null);

  // Fetching state
  const [concurrency, setConcurrency] = useState(4);
  const [isFetching, setIsFetching] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [progressPct, setProgressPct] = useState(0);
  const [finishedTasks, setFinishedTasks] = useState(0);
  const [totalTasks, setTotalTasks] = useState(0);
  const [activeWorkers, setActiveWorkers] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Scraped data results
  const [scrapedRows, setScrapedRows] = useState<AccountBonusRow[]>([]);
  const [scrapedErrors, setScrapedErrors] = useState<AccountBonusRow[]>([]);

  const sseRef = useRef<EventSource | null>(null);
  const timerRef = useRef<any>(null);

  const enabledAccounts = useMemo(() => accounts.filter((a) => a.enabled), [accounts]);

  // Elapsed timer handling
  useEffect(() => {
    if (isFetching) {
      const start = Date.now();
      timerRef.current = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - start) / 1000));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isFetching]);

  // Clean up SSE on unmount
  useEffect(() => {
    return () => {
      if (sseRef.current) {
        sseRef.current.close();
      }
    };
  }, []);

  // Start concurrent fetch execution
  const handleStartFetch = async (retryErrorsOnly = false) => {
    if (enabledAccounts.length === 0) {
      setIsVaultOpen(true);
      return;
    }

    if (sseRef.current) {
      sseRef.current.close();
    }

    setIsFetching(true);
    setProgressPct(0);
    setFinishedTasks(0);
    setElapsedSeconds(0);

    if (!retryErrorsOnly) {
      setScrapedRows([]);
      setScrapedErrors([]);
    }

    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accounts: enabledAccounts,
          concurrency,
          retryErrorsOnly,
          previousErrors: retryErrorsOnly ? scrapedErrors : [],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to dispatch fetch job to worker engine.');
      }

      const data = await response.json();
      const jobId = data.jobId;
      setCurrentJobId(jobId);
      setTotalTasks(data.totalExpected || 0);

      // Connect to Server-Sent Events stream for live progress
      const eventSource = new EventSource(`/api/jobs/${encodeURIComponent(jobId)}/events`);
      sseRef.current = eventSource;

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);

          if (payload.type === 'snapshot' && payload.job) {
            const j: FetchJobSummary = payload.job;
            setProgressPct(j.progressPct);
            setFinishedTasks(j.finished);
            setTotalTasks(j.total);
            if (j.results?.length) setScrapedRows(j.results);
            if (j.errors?.length) setScrapedErrors(j.errors);
          } else if (payload.type === 'progress') {
            setProgressPct(payload.progressPct);
            setFinishedTasks(payload.finished);
            setTotalTasks(payload.total);
            setActiveWorkers(payload.activeWorkers || 0);

            if (payload.latestResult) {
              const res: AccountBonusRow = payload.latestResult;
              if (res.fetchState === 'error') {
                setScrapedErrors((prev) => {
                  const filtered = prev.filter((e) => e.id !== res.id);
                  return [...filtered, res];
                });
              } else {
                setScrapedRows((prev) => {
                  const filtered = prev.filter((r) => r.id !== res.id);
                  return [...filtered, res];
                });
              }
            }
          } else if (payload.type === 'job_completed' || payload.type === 'job_cancelled') {
            setIsFetching(false);
            setActiveWorkers(0);
            if (payload.job) {
              if (payload.job.results) setScrapedRows(payload.job.results);
              if (payload.job.errors) setScrapedErrors(payload.job.errors);
              setProgressPct(100);
              setFinishedTasks(payload.job.finished);
            }
            eventSource.close();
          }
        } catch (err) {
          console.warn('Error parsing SSE event', err);
        }
      };

      eventSource.onerror = () => {
        // SSE disconnected, fallback to polling
        pollJobStatus(jobId);
      };
    } catch (err: any) {
      console.error('Fetch startup error', err);
      setIsFetching(false);
    }
  };

  // Fallback poller
  const pollJobStatus = async (jobId: string) => {
    try {
      const res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`);
      if (!res.ok) return;
      const job: FetchJobSummary = await res.json();
      setProgressPct(job.progressPct);
      setFinishedTasks(job.finished);
      setTotalTasks(job.total);
      setActiveWorkers(job.activeWorkers);
      if (job.results) setScrapedRows(job.results);
      if (job.errors) setScrapedErrors(job.errors);

      if (job.state === 'completed' || job.state === 'cancelled') {
        setIsFetching(false);
      } else {
        setTimeout(() => pollJobStatus(jobId), 1000);
      }
    } catch {
      setIsFetching(false);
    }
  };

  // Stop active fetch
  const handleStopFetch = async () => {
    if (!currentJobId) return;
    try {
      await fetch(`/api/jobs/${encodeURIComponent(currentJobId)}/cancel`, { method: 'POST' });
    } catch (err) {
      console.warn('Could not cancel job', err);
    }
    if (sseRef.current) {
      sseRef.current.close();
    }
    setIsFetching(false);
    setActiveWorkers(0);
  };

  // Export active bonuses CSV (filtered to lit-up > $0)
  const handleExportActiveCsv = () => {
    const activeRowsWithBonuses = scrapedRows.filter(
      (r) => r.litUpBonuses && r.litUpBonuses.length > 0
    );

    const headers = [
      'Casino Name',
      'Domain',
      'Account Phone',
      'Account Label',
      'Cash Balance ($)',
      'Promotion Type',
      'Promotion Label',
      'Bonus Amount ($)',
      'Turnover Ratio',
      'Min Withdrawal ($)',
      'Max Withdrawal ($)',
      'Scraped At',
    ];

    const lines: string[] = [headers.join(',')];

    for (const row of activeRowsWithBonuses) {
      for (const bonus of row.litUpBonuses) {
        lines.push(
          [
            `"${row.casinoName}"`,
            row.domain,
            row.accountPhone,
            `"${row.accountLabel}"`,
            row.cash.toFixed(2),
            bonus.type,
            `"${bonus.label}"`,
            bonus.amount.toFixed(2),
            `${bonus.turnover.toFixed(2)}x`,
            bonus.minWithdrawal.toFixed(2),
            bonus.maxWithdrawal.toFixed(2),
            row.fetchedAt,
          ].join(',')
        );
      }
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute(
      'download',
      `lit_up_pokie_bonuses_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // KPI Calculations across scraped rows
  const allRowsCombined = useMemo(() => [...scrapedRows, ...scrapedErrors], [
    scrapedRows,
    scrapedErrors,
  ]);

  const kpis = useMemo(() => {
    let litUpCount = 0;
    let litUpVal = 0;
    let cashVal = 0;
    const accountsWithBonusSet = new Set<string>();
    const turnoverRatios: number[] = [];

    for (const r of scrapedRows) {
      cashVal += r.cash || 0;
      if (r.litUpBonuses && r.litUpBonuses.length > 0) {
        litUpCount += r.litUpBonuses.length;
        litUpVal += r.totalLitUpAmount || 0;
        accountsWithBonusSet.add(r.accountId);
        for (const b of r.litUpBonuses) {
          if (b.turnover > 0) turnoverRatios.push(b.turnover);
        }
      }
    }

    return {
      totalLitUpBonuses: litUpCount,
      totalLitUpValue: litUpVal,
      totalCash: cashVal,
      accountsWithBonus: accountsWithBonusSet.size,
      bestTurnoverRatio: turnoverRatios.length > 0 ? Math.min(...turnoverRatios) : 0,
    };
  }, [scrapedRows]);

  return (
    <div className="min-h-screen bg-[#09090C] text-slate-100 flex flex-col font-sans">
      {/* Top Bar Header & KPI strip */}
      <Header
        activeView={activeView}
        onSelectView={setActiveView}
        onOpenVault={() => setIsVaultOpen(true)}
        onOpenDomains={() => setIsDomainsOpen(true)}
        totalLitUpBonuses={kpis.totalLitUpBonuses}
        totalLitUpValue={kpis.totalLitUpValue}
        totalCash={kpis.totalCash}
        accountsWithBonus={kpis.accountsWithBonus}
        bestTurnoverRatio={kpis.bestTurnoverRatio}
        activeAccountsCount={enabledAccounts.length}
      />

      {activeView === 'radar' ? (
        <>
          {/* Concurrent Fetch Controls & Progress Bar */}
          <FetchControlBar
            isFetching={isFetching}
            concurrency={concurrency}
            onConcurrencyChange={setConcurrency}
            onStartFetch={() => handleStartFetch(false)}
            onStopFetch={handleStopFetch}
            onRetryErrors={() => handleStartFetch(true)}
            onExportCsv={handleExportActiveCsv}
            progressPct={progressPct}
            finishedTasks={finishedTasks}
            totalTasks={totalTasks}
            activeWorkers={activeWorkers}
            errorCount={scrapedErrors.length}
            elapsedSeconds={elapsedSeconds}
            enabledAccountsCount={enabledAccounts.length}
          />

          {/* Main High-Density Data Grid & Radar */}
          <main className="flex-1 pb-16">
            <BonusGrid
              rows={allRowsCombined}
              isFetching={isFetching}
              onOpenDetails={(row) => setSelectedRowForDetails(row)}
            />
          </main>
        </>
      ) : (
        /* Domain Intelligence & Live URL Prober View */
        <main className="flex-1 pb-16">
          <DomainIntelView />
        </main>
      )}

      {/* Account Vault Modal */}
      <AccountVaultModal
        isOpen={isVaultOpen}
        onClose={() => setIsVaultOpen(false)}
        accounts={accounts}
        onAddAccount={addAccount}
        onDeleteAccount={deleteAccount}
        onToggleAccount={toggleAccount}
        onToggleAll={toggleAll}
        onImportCsv={importFromCsv}
        onExportCsv={exportVaultCsv}
        onResetDefaults={resetToDefaults}
      />

      {/* Promotion Details / Raw JSON Drawer */}
      <PromotionDetailsModal
        row={selectedRowForDetails}
        onClose={() => setSelectedRowForDetails(null)}
      />

      {/* Supported Domains Modal */}
      <DomainsCatalogModal
        isOpen={isDomainsOpen}
        onClose={() => setIsDomainsOpen(false)}
      />
    </div>
  );
}
