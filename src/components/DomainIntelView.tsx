import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Globe,
  Upload,
  RefreshCw,
  Search,
  ExternalLink,
  Trash2,
  ArrowRightLeft,
  Plus,
  FileText,
  Clock,
  Download,
  AlertTriangle,
  CheckCircle2,
  CornerDownRight,
  ShieldAlert,
} from 'lucide-react';
import { DomainIntelRecord, IntelScanSummary } from '../types/bonus.ts';

function formatAge(iso: string | null): string {
  if (!iso) return '--';
  const t = new Date(iso).getTime();
  const sec = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

type IntelFilter = 'all' | 'live' | 'redirect' | 'slow' | 'dead' | 'problems';

export const DomainIntelView: React.FC = () => {
  const [domains, setDomains] = useState<DomainIntelRecord[]>([]);
  const [scanSummary, setScanSummary] = useState<IntelScanSummary>({
    running: false,
    total: 0,
    processed: 0,
    countLive: 0,
    countRedirect: 0,
    countSlow: 0,
    countDead: 0,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<IntelFilter>('all');
  const [manualInput, setManualInput] = useState('');
  const [merchantIdInput, setMerchantIdInput] = useState('');
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [replaceOld, setReplaceOld] = useState('');
  const [replaceNew, setReplaceNew] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'ok' | 'error' } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load domains & scan status
  const loadDomains = async () => {
    try {
      const res = await fetch('/api/intel/domains');
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.domains)) {
        setDomains(data.domains);
      }
      if (data.summary) {
        setScanSummary(data.summary);
      }
    } catch (e) {
      console.warn('Failed to load intel domains', e);
    }
  };

  const updateScanStatus = async () => {
    try {
      const res = await fetch('/api/intel/status');
      if (!res.ok) return;
      const data: IntelScanSummary = await res.json();
      setScanSummary(data);
      if (data.running) {
        // Reload domains during active scan to see live updates
        loadDomains();
      }
    } catch {}
  };

  useEffect(() => {
    loadDomains();
    const interval = setInterval(() => {
      updateScanStatus();
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // Trigger full scan
  const handleTriggerScan = async () => {
    try {
      setMessage({ text: 'Triggering live URL health scan across all domains...', type: 'ok' });
      await fetch('/api/intel/scan', { method: 'POST' });
      updateScanStatus();
    } catch (e: any) {
      setMessage({ text: `Scan error: ${e.message}`, type: 'error' });
    }
  };

  // Add domains manually
  const handleAddManualDomains = async () => {
    if (!manualInput.trim()) return;
    try {
      const res = await fetch('/api/intel/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domains: manualInput, merchantId: merchantIdInput.trim() }),
      });
      const data = await res.json();
      setMessage({
        text: `Added ${data.addedCount} new domain(s) • Total ${data.totalCount} monitored domains`,
        type: 'ok',
      });
      setManualInput('');
      setMerchantIdInput('');
      loadDomains();
    } catch (e: any) {
      setMessage({ text: `Failed to add domains: ${e.message}`, type: 'error' });
    }
  };

  // Import domains from local file (.txt, .csv, .json)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const content = String(evt.target?.result || '');
      let domainList: string[] = [];

      if (file.name.endsWith('.json')) {
        try {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) {
            domainList = parsed.map((item) => (typeof item === 'string' ? item : item?.domain || '')).filter(Boolean);
          } else if (parsed && Array.isArray(parsed.domains)) {
            domainList = parsed.domains.map((item: any) => (typeof item === 'string' ? item : item?.domain || '')).filter(Boolean);
          }
        } catch {
          setMessage({ text: 'Invalid JSON file format.', type: 'error' });
          return;
        }
      } else {
        // Plain text or CSV
        const lines = content.split(/[\r\n,]+/).map((s) => s.trim()).filter(Boolean);
        domainList = lines.filter((l) => !l.startsWith('#') && !l.toLowerCase().includes('domain'));
      }

      if (domainList.length === 0) {
        setMessage({ text: 'No valid domains found in file.', type: 'error' });
        return;
      }

      try {
        const res = await fetch('/api/intel/domains', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ domains: domainList }),
        });
        const data = await res.json();
        setMessage({
          text: `File import successful: added ${data.addedCount} new domain(s) from "${file.name}"`,
          type: 'ok',
        });
        loadDomains();
      } catch (err: any) {
        setMessage({ text: `File import error: ${err.message}`, type: 'error' });
      }
    };

    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  // Re-probe single domain
  const handleProbeSingle = async (domain: string) => {
    try {
      const res = await fetch('/api/intel/probe-single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      });
      const updated: DomainIntelRecord = await res.json();
      setDomains((prev) => prev.map((d) => (d.domain === updated.domain ? updated : d)));
    } catch {}
  };

  // Remove domain
  const handleRemoveDomain = async (domain: string) => {
    if (!confirm(`Remove ${domain} from Domain Intelligence?`)) return;
    try {
      const res = await fetch('/api/intel/domains', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      });
      const data = await res.json();
      setMessage({ text: `${data.domain} removed (${data.totalCount} remaining)`, type: 'ok' });
      loadDomains();
    } catch (e: any) {
      setMessage({ text: `Failed to remove: ${e.message}`, type: 'error' });
    }
  };

  // Replace domain
  const handleReplaceDomain = async () => {
    if (!replaceOld.trim() || !replaceNew.trim()) {
      setMessage({ text: 'Enter both old and new domains to replace.', type: 'error' });
      return;
    }
    try {
      const res = await fetch('/api/intel/replace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldDomain: replaceOld.trim(), newDomain: replaceNew.trim() }),
      });
      const data = await res.json();
      setMessage({ text: `${data.oldDomain} replaced by ${data.newDomain}`, type: 'ok' });
      setReplaceOld('');
      setReplaceNew('');
      loadDomains();
    } catch (e: any) {
      setMessage({ text: `Replace failed: ${e.message}`, type: 'error' });
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = ['Domain', 'Status', 'ResponseMs', 'HttpStatus', 'FinalDomain', 'HtmlSizeKB', 'Reason', 'LastChecked'];
    const lines = domains.map((d) => [
      d.domain,
      d.status,
      d.responseMs ?? '',
      d.httpStatus ?? '',
      d.finalDomain,
      d.htmlSize ? (d.htmlSize / 1024).toFixed(1) : '',
      `"${d.reason || ''}"`,
      d.checkedAt || '',
    ]);
    const csvContent = [headers.join(','), ...lines.map((l) => l.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', `domain_intelligence_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Filtered list
  const filteredDomains = useMemo(() => {
    let result = [...domains];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (x) =>
          x.domain.toLowerCase().includes(q) ||
          x.finalDomain.toLowerCase().includes(q) ||
          x.reason.toLowerCase().includes(q)
      );
    }
    if (filter === 'problems') {
      result = result.filter((x) => x.status !== 'live');
    } else if (filter !== 'all') {
      result = result.filter((x) => x.status === filter);
    }
    return result;
  }, [domains, searchQuery, filter]);

  const renderStatusBadge = (rec: DomainIntelRecord) => {
    switch (rec.status) {
      case 'live':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-2 py-0.5 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Live</span>
          </span>
        );
      case 'redirect':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-300 bg-cyan-950/40 border border-cyan-800/50 px-2 py-0.5 rounded">
            <CornerDownRight className="w-3 h-3" />
            <span>Redirect</span>
          </span>
        );
      case 'slow':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-300 bg-amber-950/40 border border-amber-800/50 px-2 py-0.5 rounded">
            <AlertTriangle className="w-3 h-3" />
            <span>Slow</span>
          </span>
        );
      case 'dead':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-400 bg-rose-950/40 border border-rose-800/50 px-2 py-0.5 rounded">
            <span>✕ Dead</span>
          </span>
        );
      case 'checking':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 bg-[#161722] border border-[#262738] px-2 py-0.5 rounded">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>Checking</span>
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Title & Intel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1E1F2C] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-cyan-400" />
            <h2 className="text-xl font-bold text-white font-display">
              Domain Intelligence & Live URL Prober
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time HTTP health, redirect resolution, and latency monitoring matching{' '}
            <code className="text-cyan-400 font-mono">intel.bestpokieslist.online</code>
          </p>
        </div>

        {/* Primary actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleTriggerScan}
            disabled={scanSummary.running}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-black bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 rounded-md transition-colors shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${scanSummary.running ? 'animate-spin' : ''}`} />
            <span>
              {scanSummary.running
                ? `Scanning (${scanSummary.processed}/${scanSummary.total})`
                : 'Run Full Health Scan'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsImportOpen(!isImportOpen)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-[#161722] hover:bg-[#202230] border border-[#27283A] rounded-md transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>Import / Add URLs</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-[#161722] hover:bg-[#202230] border border-[#27283A] rounded-md transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Message alert */}
      {message && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center justify-between border ${
            message.type === 'ok'
              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50'
              : 'bg-rose-950/40 text-rose-300 border-rose-800/50'
          }`}
        >
          <span>{message.text}</span>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="text-slate-400 hover:text-white font-bold ml-2"
          >
            ×
          </button>
        </div>
      )}

      {/* KPI Status Strip matching intel.bestpokieslist.online */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-[#101118] border border-[#1E1F2C] p-3 rounded-lg flex flex-col">
          <span className="text-xs text-slate-400 font-medium">All Domains</span>
          <span className="text-xl font-bold font-mono text-white mt-0.5">{domains.length}</span>
        </div>

        <div className="bg-[#101118] border border-[#1E1F2C] p-3 rounded-lg flex flex-col">
          <span className="text-xs text-slate-400 font-medium">Live (200 OK)</span>
          <span className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
            {scanSummary.countLive}
          </span>
        </div>

        <div className="bg-[#101118] border border-[#1E1F2C] p-3 rounded-lg flex flex-col">
          <span className="text-xs text-slate-400 font-medium">Redirects</span>
          <span className="text-xl font-bold font-mono text-cyan-300 mt-0.5">
            {scanSummary.countRedirect}
          </span>
        </div>

        <div className="bg-[#101118] border border-[#1E1F2C] p-3 rounded-lg flex flex-col">
          <span className="text-xs text-slate-400 font-medium">Slow (&gt;2s)</span>
          <span className="text-xl font-bold font-mono text-amber-400 mt-0.5">
            {scanSummary.countSlow}
          </span>
        </div>

        <div className="bg-[#101118] border border-[#1E1F2C] p-3 rounded-lg flex flex-col">
          <span className="text-xs text-slate-400 font-medium">Dead / Down</span>
          <span className="text-xl font-bold font-mono text-rose-400 mt-0.5">
            {scanSummary.countDead}
          </span>
        </div>

        <div className="bg-[#101118] border border-[#1E1F2C] p-3 rounded-lg flex flex-col justify-center">
          <span className="text-xs text-slate-400 font-medium">Scan Engine</span>
          <span className="text-xs font-mono text-indigo-300 mt-1 truncate">
            {scanSummary.running
              ? `Scanning ${scanSummary.processed}/${scanSummary.total}...`
              : scanSummary.finishedAt
              ? `Finished ${formatAge(scanSummary.finishedAt)}`
              : 'Idle'}
          </span>
        </div>
      </div>

      {/* URL Domain Import & Manual Text Input Box Section */}
      {isImportOpen && (
        <div className="bg-[#101118] border border-[#232536] rounded-xl p-5 space-y-5 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#1E1F2C] pb-3">
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-white">
                URL Domain Import & Manual Entry
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsImportOpen(false)}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Manual Text Input Box */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Manual Text Input Box (Paste URLs or Domains)
                </label>
                <p className="text-[11px] text-slate-400 mb-2">
                  Paste domains or full URLs (one per line, comma, or space separated). Protocols like{' '}
                  <code className="text-cyan-400 font-mono">https://</code> and paths will be normalized automatically.
                </p>
                <textarea
                  rows={5}
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder={`houseofjack.com
https://skycrown.com/bonuses
neospin.com, rollinglots.com
goldenstar-casino.com`}
                  className="w-full p-2.5 bg-[#0C0D12] border border-[#232536] rounded-md font-mono text-xs text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={merchantIdInput}
                  onChange={(e) => setMerchantIdInput(e.target.value)}
                  placeholder="Optional Merchant ID"
                  className="w-48 px-2.5 py-1.5 bg-[#0C0D12] border border-[#232536] rounded text-xs text-slate-200 placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={handleAddManualDomains}
                  disabled={!manualInput.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-black bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 rounded transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add & Probe URLs</span>
                </button>
              </div>
            </div>

            {/* 2. URL Domain Import from Local File */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Import from Local File (.txt, .csv, .json)
                </label>
                <p className="text-[11px] text-slate-400 mb-2">
                  Upload a local text list, CSV file, or JSON array containing domains.
                </p>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#26283A] hover:border-cyan-500/50 bg-[#0C0D12] rounded-lg p-6 text-center cursor-pointer transition-colors"
                >
                  <FileText className="w-8 h-8 text-cyan-400 mx-auto mb-2 opacity-80" />
                  <p className="text-xs font-medium text-slate-200">
                    Click to browse local file
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Supports .txt, .csv, and .json files
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.csv,.json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {/* 3. Replace Domain Tool matching intel.bestpokieslist.online */}
              <div className="pt-3 border-t border-[#1E1F2C]">
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Replace Existing Domain with New Domain
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={replaceOld}
                    onChange={(e) => setReplaceOld(e.target.value)}
                    placeholder="old-domain.com"
                    className="w-1/2 px-2.5 py-1.5 bg-[#0C0D12] border border-[#232536] rounded text-xs text-slate-200 placeholder:text-slate-400"
                  />
                  <ArrowRightLeft className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={replaceNew}
                    onChange={(e) => setReplaceNew(e.target.value)}
                    placeholder="new-domain.com"
                    className="w-1/2 px-2.5 py-1.5 bg-[#0C0D12] border border-[#232536] rounded text-xs text-slate-200 placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={handleReplaceDomain}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-[#1A1A24] hover:bg-[#252533] border border-[#2B2B3C] rounded whitespace-nowrap"
                  >
                    Replace
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status filter tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#12131A] rounded-lg border border-[#20212C]">
          {[
            { id: 'all', label: `All (${domains.length})` },
            { id: 'live', label: `Live (${scanSummary.countLive})` },
            { id: 'redirect', label: `Redirect (${scanSummary.countRedirect})` },
            { id: 'slow', label: `Slow (${scanSummary.countSlow})` },
            { id: 'dead', label: `Dead (${scanSummary.countDead})` },
            { id: 'problems', label: 'Problems Only' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id as IntelFilter)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                filter === tab.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search filter */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search domain or diagnostic..."
            className="pl-8 pr-3 py-1.5 text-xs bg-[#12131A] border border-[#20212C] rounded-md text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-cyan-500/50 w-64"
          />
        </div>
      </div>

      {/* High-Density Intel Table matching intel.bestpokieslist.online */}
      <div className="rounded-lg border border-[#1E1F2A] bg-[#0E0F16] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#1E1F2C] bg-[#12131D] text-slate-400 font-medium font-mono text-[11px]">
                <th className="py-3 px-4">Domain / Destination</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Latency</th>
                <th className="py-3 px-4">HTTP</th>
                <th className="py-3 px-4">Final Host</th>
                <th className="py-3 px-4">HTML Size</th>
                <th className="py-3 px-4">Checked</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#181924]">
              {filteredDomains.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No domains match the selected filter. Click "Import / Add URLs" to add domains.
                  </td>
                </tr>
              ) : (
                filteredDomains.map((rec) => {
                  const isRedirected = rec.finalDomain && rec.finalDomain !== rec.domain;
                  return (
                    <tr key={rec.id} className="hover:bg-[#131420] transition-colors">
                      {/* Domain & Diagnostic reason */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <a
                            href={`https://${rec.domain}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-slate-100 hover:text-cyan-300 transition-colors font-mono"
                          >
                            {rec.domain}
                          </a>
                        </div>
                        {rec.reason && (
                          <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-xs">
                            {rec.reason}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">{renderStatusBadge(rec)}</td>

                      {/* Response Time */}
                      <td className="py-3 px-4 font-mono tabular-nums">
                        {rec.responseMs != null ? (
                          <span
                            className={
                              rec.responseMs > 2000
                                ? 'text-amber-400'
                                : rec.responseMs < 500
                                ? 'text-emerald-400'
                                : 'text-slate-300'
                            }
                          >
                            {rec.responseMs} ms
                          </span>
                        ) : (
                          '--'
                        )}
                      </td>

                      {/* HTTP Status Code */}
                      <td className="py-3 px-4 font-mono tabular-nums">
                        {rec.httpStatus != null ? (
                          <span
                            className={
                              rec.httpStatus === 200
                                ? 'text-slate-200'
                                : [301, 302, 307, 308].includes(rec.httpStatus)
                                ? 'text-cyan-300'
                                : 'text-rose-400'
                            }
                          >
                            {rec.httpStatus}
                          </span>
                        ) : (
                          '--'
                        )}
                      </td>

                      {/* Final Destination */}
                      <td className="py-3 px-4 font-mono text-xs">
                        {isRedirected ? (
                          <a
                            href={`https://${rec.finalDomain}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-cyan-400 hover:underline inline-flex items-center gap-1"
                          >
                            <span>{rec.finalDomain}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-slate-400">{rec.domain}</span>
                        )}
                      </td>

                      {/* HTML Size */}
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-400">
                        {rec.htmlSize != null ? `${(rec.htmlSize / 1024).toFixed(1)} KB` : '--'}
                      </td>

                      {/* Age */}
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        {formatAge(rec.checkedAt)}
                      </td>

                      {/* Action buttons */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleProbeSingle(rec.domain)}
                            title="Re-probe URL immediately"
                            className="p-1 text-slate-400 hover:text-cyan-300 hover:bg-[#1A1B28] rounded border border-[#27283A] transition-colors"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>

                          <a
                            href={`https://${rec.domain}`}
                            target="_blank"
                            rel="noreferrer"
                            title="Open in new tab"
                            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-[#1A1B28] rounded border border-[#27283A] transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>

                          <button
                            type="button"
                            onClick={() => handleRemoveDomain(rec.domain)}
                            title="Remove domain"
                            className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded border border-[#27283A] transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
