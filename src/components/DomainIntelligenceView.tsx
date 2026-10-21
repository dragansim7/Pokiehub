import React, { useState, useEffect, useRef } from 'react';
import { Globe, Plus, Upload, Play, RefreshCw, Trash2, Search, Filter, AlertTriangle, CheckCircle2, Clock, ArrowUpRight } from 'lucide-react';

interface IntelDomain {
  domain: string;
  status: 'live' | 'redirect' | 'slow' | 'dead';
  responseMs: number | null;
  httpStatus: number | null;
  finalDomain: string;
  htmlSize: number | null;
  checkedAt: string;
  reason?: string;
}

interface ScanStatus {
  running: boolean;
  processed: number;
  total: number;
  finishedAt: string | null;
}

export const DomainIntelligenceView: React.FC = () => {
  const [domains, setDomains] = useState<IntelDomain[]>([]);
  const [scanStatus, setScanStatus] = useState<ScanStatus>({ running: false, processed: 0, total: 0, finishedAt: null });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Manual text input
  const [manualText, setManualText] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const pollTimerRef = useRef<any>(null);

  const fetchDomains = async () => {
    try {
      const res = await fetch('/api/intel/domains');
      const data = await res.json();
      if (data.domains) {
        setDomains(data.domains);
      }
    } catch (e) {
      console.warn('Failed to load intel domains', e);
    }
  };

  const fetchScanStatus = async () => {
    try {
      const res = await fetch('/api/intel/status');
      const data = await res.json();
      setScanStatus(data);
      if (data.running) {
        fetchDomains(); // refresh table while scanning
      }
    } catch (e) {
      console.warn('Failed to load scan status', e);
    }
  };

  useEffect(() => {
    fetchDomains();
    fetchScanStatus();
    pollTimerRef.current = setInterval(() => {
      fetchScanStatus();
    }, 2500);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  const handleRunScan = async () => {
    try {
      await fetch('/api/intel/scan', { method: 'POST' });
      fetchScanStatus();
    } catch (e) {
      console.error('Failed to trigger scan', e);
    }
  };

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualText.trim()) return;

    // Split by newlines, commas, or spaces
    const lines = manualText
      .split(/[\n,]+/)
      .map((s) => s.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, ''))
      .filter(Boolean);

    if (lines.length === 0) return;

    try {
      const res = await fetch('/api/intel/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domains: lines }),
      });
      const data = await res.json();
      setImportStatus(`Successfully added ${data.addedCount} domains (${data.total} total).`);
      setManualText('');
      fetchDomains();
      // Auto run scan after add
      handleRunScan();
    } catch (err: any) {
      setImportStatus(`Error adding domains: ${err.message}`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const content = evt.target?.result as string;
      if (!content) return;

      const lines = content
        .split(/[\r\n,]+/)
        .map((s) => s.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, ''))
        .filter(Boolean);

      if (lines.length === 0) return;

      try {
        const res = await fetch('/api/intel/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ domains: lines }),
        });
        const data = await res.json();
        setImportStatus(`Imported ${data.addedCount} domains from file (${data.total} total).`);
        fetchDomains();
        handleRunScan();
      } catch (err: any) {
        setImportStatus(`Error importing file: ${err.message}`);
      }
    };
    reader.readAsText(file);
    // Reset file input
    e.target.value = '';
  };

  const handleRemoveDomain = async (domain: string) => {
    if (!confirm(`Remove ${domain} from intelligence list?`)) return;
    try {
      await fetch('/api/intel/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      });
      fetchDomains();
    } catch (e) {
      console.warn('Failed to remove domain', e);
    }
  };

  // Filtered domains
  const filteredDomains = domains.filter((d) => {
    if (searchQuery.trim() && !d.domain.toLowerCase().includes(searchQuery.toLowerCase().trim())) {
      return false;
    }
    if (statusFilter === 'all') return true;
    if (statusFilter === 'problems') return d.status !== 'live';
    return d.status === statusFilter;
  });

  // Counts
  const counts = {
    all: domains.length,
    live: domains.filter((d) => d.status === 'live').length,
    redirect: domains.filter((d) => d.status === 'redirect').length,
    slow: domains.filter((d) => d.status === 'slow').length,
    dead: domains.filter((d) => d.status === 'dead').length,
  };

  const formatAge = (iso: string) => {
    if (!iso) return '—';
    const t = new Date(iso).getTime();
    const sec = Math.max(0, Math.floor((Date.now() - t) / 1000));
    if (sec < 60) return `${sec}s ago`;
    if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
    if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
    return `${Math.floor(sec / 86400)}d ago`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'live':
        return <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-2.5 py-0.5 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live</span>;
      case 'redirect':
        return <span className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-400 bg-cyan-950/40 border border-cyan-800/50 px-2.5 py-0.5 rounded-full">↪ Redirect</span>;
      case 'slow':
        return <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-400 bg-amber-950/40 border border-amber-800/50 px-2.5 py-0.5 rounded-full">⚠ Slow</span>;
      case 'dead':
      default:
        return <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-400 bg-rose-950/40 border border-rose-800/50 px-2.5 py-0.5 rounded-full">✕ Dead</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner & Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#12131A] border border-[#20212C] rounded-xl p-6">
        <div>
          <h2 className="text-lg font-bold text-white font-display flex items-center gap-2">
            <Globe className="w-5 h-5 text-cyan-400" />
            <span>Domain Intelligence & Uptime Radar</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Live health checking, response times, redirect tracking, and bulk domain management (inspired by intel.bestpokieslist.online).
          </p>
        </div>

        <div className="flex items-center gap-3">
          {scanStatus.running ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-950/60 border border-cyan-500/40 rounded-lg text-xs text-cyan-300 font-mono">
              <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
              <span>Scanning {scanStatus.processed} / {scanStatus.total}...</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleRunScan}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-black bg-cyan-400 hover:bg-cyan-300 rounded-md transition-colors shadow-sm"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run Live Uptime Scan Now</span>
            </button>
          )}

          <button
            type="button"
            onClick={fetchDomains}
            className="p-2 text-slate-400 hover:text-white bg-[#1A1B28] hover:bg-[#252636] border border-[#2A2B3D] rounded-md transition-colors"
            title="Refresh list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Import & Manual Add Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Manual Text Input */}
        <div className="bg-[#12131A] border border-[#20212C] rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-white">Manual Domain Text Input</h3>
          <p className="text-xs text-slate-400">
            Paste multiple domains separated by newlines or commas (e.g. <code className="text-cyan-400 font-mono">houseofjack.com, kingbillycasino.com</code>).
          </p>
          <form onSubmit={handleManualAdd} className="space-y-3">
            <textarea
              rows={3}
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="houseofjack.com&#10;kingbillycasino.com&#10;skycrown.com"
              className="w-full p-3 bg-[#0A0B10] border border-[#222332] rounded-md font-mono text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
            />
            <div className="flex items-center justify-between">
              {importStatus && <span className="text-xs text-emerald-400">{importStatus}</span>}
              <button
                type="submit"
                disabled={!manualText.trim()}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#1E202E] hover:bg-[#292D42] disabled:opacity-50 border border-[#2D3047] rounded-md transition-colors ml-auto"
              >
                <Plus className="w-3.5 h-3.5 text-cyan-400" />
                <span>Add & Scan Domains</span>
              </button>
            </div>
          </form>
        </div>

        {/* Local File Import (.txt / .csv) */}
        <div className="bg-[#12131A] border border-[#20212C] rounded-xl p-5 space-y-3 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Import Domain List from Local File</h3>
            <p className="text-xs text-slate-400 mt-1">
              Upload a plain text (<code className="text-cyan-400 font-mono">.txt</code>) or CSV file containing one domain per line.
            </p>
          </div>

          <div className="pt-2">
            <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-[#28293D] hover:border-cyan-500/50 rounded-lg bg-[#0A0B10] cursor-pointer transition-colors group">
              <Upload className="w-6 h-6 text-slate-400 group-hover:text-cyan-400 mb-2 transition-colors" />
              <span className="text-xs font-medium text-slate-300 group-hover:text-cyan-300">
                Click to upload domain list (.txt, .csv)
              </span>
              <span className="text-[11px] text-slate-400 mt-1">Automatic parsing and live scan on upload</span>
              <input type="file" accept=".txt,.csv" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      {/* Summary KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`p-3.5 rounded-lg border text-left transition-all ${
            statusFilter === 'all'
              ? 'bg-cyan-950/30 border-cyan-500/40'
              : 'bg-[#12131A] border-[#20212C] hover:border-slate-700'
          }`}
        >
          <span className="text-xs text-slate-400 font-medium">Total Domains</span>
          <p className="text-xl font-bold font-mono tabular-nums text-white mt-0.5">{counts.all}</p>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('live')}
          className={`p-3.5 rounded-lg border text-left transition-all ${
            statusFilter === 'live'
              ? 'bg-emerald-950/30 border-emerald-500/40'
              : 'bg-[#12131A] border-[#20212C] hover:border-slate-700'
          }`}
        >
          <span className="text-xs text-emerald-400 font-medium">Live Healthy</span>
          <p className="text-xl font-bold font-mono tabular-nums text-emerald-300 mt-0.5">{counts.live}</p>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('redirect')}
          className={`p-3.5 rounded-lg border text-left transition-all ${
            statusFilter === 'redirect'
              ? 'bg-cyan-950/30 border-cyan-500/40'
              : 'bg-[#12131A] border-[#20212C] hover:border-slate-700'
          }`}
        >
          <span className="text-xs text-cyan-400 font-medium">Redirects</span>
          <p className="text-xl font-bold font-mono tabular-nums text-cyan-300 mt-0.5">{counts.redirect}</p>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('slow')}
          className={`p-3.5 rounded-lg border text-left transition-all ${
            statusFilter === 'slow'
              ? 'bg-amber-950/30 border-amber-500/40'
              : 'bg-[#12131A] border-[#20212C] hover:border-slate-700'
          }`}
        >
          <span className="text-xs text-amber-400 font-medium">Slow Responding</span>
          <p className="text-xl font-bold font-mono tabular-nums text-amber-300 mt-0.5">{counts.slow}</p>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('dead')}
          className={`p-3.5 rounded-lg border text-left transition-all ${
            statusFilter === 'dead'
              ? 'bg-rose-950/30 border-rose-500/40'
              : 'bg-[#12131A] border-[#20212C] hover:border-slate-700'
          }`}
        >
          <span className="text-xs text-rose-400 font-medium">Dead / Down</span>
          <p className="text-xl font-bold font-mono tabular-nums text-rose-300 mt-0.5">{counts.dead}</p>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#12131A] border border-[#20212C] rounded-xl p-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search domain intelligence list..."
            className="w-full pl-9 pr-3 py-2 bg-[#0A0B10] border border-[#222332] rounded-md text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
          <span>Filter: <strong className="text-white capitalize">{statusFilter}</strong></span>
          <span>·</span>
          <span>Showing {filteredDomains.length} domains</span>
        </div>
      </div>

      {/* Domains Table */}
      <div className="bg-[#12131A] border border-[#20212C] rounded-xl overflow-hidden">
        {filteredDomains.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No matching domains found. Add domains above or clear filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#181924] text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-[#222334]">
                <tr>
                  <th className="px-4 py-3">Domain</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Response</th>
                  <th className="px-4 py-3">HTTP Code</th>
                  <th className="px-4 py-3">Final Destination</th>
                  <th className="px-4 py-3">Size</th>
                  <th className="px-4 py-3">Checked</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1B1C28] font-mono">
                {filteredDomains.map((d) => (
                  <tr key={d.domain} className="hover:bg-[#151622] transition-colors">
                    <td className="px-4 py-3 font-semibold text-white">
                      <a
                        href={`https://${d.domain}`}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-cyan-400 inline-flex items-center gap-1.5"
                      >
                        <span>{d.domain}</span>
                        <ArrowUpRight className="w-3 h-3 text-slate-500" />
                      </a>
                      {d.reason && <div className="text-[10px] text-slate-500 font-sans mt-0.5">{d.reason}</div>}
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(d.status)}</td>
                    <td className="px-4 py-3 text-slate-300 tabular-nums">
                      {d.responseMs != null ? `${d.responseMs} ms` : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-300 tabular-nums">
                      {d.httpStatus != null ? d.httpStatus : '—'}
                    </td>
                    <td className="px-4 py-3 text-cyan-300">
                      {d.finalDomain && d.finalDomain !== d.domain ? (
                        <a href={`https://${d.finalDomain}`} target="_blank" rel="noreferrer" className="hover:underline">
                          {d.finalDomain}
                        </a>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-400 tabular-nums">
                      {d.htmlSize != null ? `${(d.htmlSize / 1024).toFixed(1)} KB` : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-400 tabular-nums">{formatAge(d.checkedAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveDomain(d.domain)}
                        className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                        title="Remove domain"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
