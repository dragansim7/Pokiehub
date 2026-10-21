import React, { useState } from 'react';
import { X, Plus, Upload, Download, Trash2, CheckCircle2, ShieldCheck, KeyRound, AlertCircle } from 'lucide-react';
import { AccountCredential } from '../types/bonus.ts';

interface AccountVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: AccountCredential[];
  onAddAccount: (acc: Omit<AccountCredential, 'id'>) => void;
  onDeleteAccount: (id: string) => void;
  onToggleAccount: (id: string) => void;
  onToggleAll: (enabled: boolean) => void;
  onImportCsv: (csv: string) => { imported: number; errors: string[] };
  onExportCsv: () => void;
  onResetDefaults: () => void;
}

export const AccountVaultModal: React.FC<AccountVaultModalProps> = ({
  isOpen,
  onClose,
  accounts,
  onAddAccount,
  onDeleteAccount,
  onToggleAccount,
  onToggleAll,
  onImportCsv,
  onExportCsv,
  onResetDefaults,
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'add' | 'csv'>('list');
  const [csvInput, setCsvInput] = useState('');
  const [importStatus, setImportStatus] = useState<{ message: string; isError?: boolean } | null>(null);

  // New account form state
  const [formPhone, setFormPhone] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formLabel, setFormLabel] = useState('');
  const [formFallback2Phone, setFormFallback2Phone] = useState('');
  const [formFallback2Password, setFormFallback2Password] = useState('');
  const [formFallback3Phone, setFormFallback3Phone] = useState('');
  const [formFallback3Password, setFormFallback3Password] = useState('');

  // Verification state
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPhone.trim() || !formPassword) return;

    const fallbacks = [];
    if (formFallback2Phone.trim() && formFallback2Password) {
      fallbacks.push({ phone: formFallback2Phone.trim(), password: formFallback2Password });
    }
    if (formFallback3Phone.trim() && formFallback3Password) {
      fallbacks.push({ phone: formFallback3Phone.trim(), password: formFallback3Password });
    }

    onAddAccount({
      phone: formPhone.trim(),
      password: formPassword,
      label: formLabel.trim() || `Account ${formPhone.slice(-4)}`,
      fallbacks,
      enabled: true,
      tags: ['Manual'],
      status: 'idle',
    });

    // Reset form
    setFormPhone('');
    setFormPassword('');
    setFormLabel('');
    setFormFallback2Phone('');
    setFormFallback2Password('');
    setFormFallback3Phone('');
    setFormFallback3Password('');
    setActiveTab('list');
  };

  const handleCsvSubmit = () => {
    if (!csvInput.trim()) return;
    const res = onImportCsv(csvInput);
    if (res.imported > 0) {
      setImportStatus({
        message: `Successfully imported ${res.imported} accounts! ${res.errors.length ? `(${res.errors.length} skipped)` : ''}`,
      });
      setCsvInput('');
      setActiveTab('list');
    } else {
      setImportStatus({
        message: `Failed to import: ${res.errors.join(' ')}`,
        isError: true,
      });
    }
  };

  const testVerify = async (acc: AccountCredential) => {
    setVerifyingId(acc.id);
    try {
      const res = await fetch('/api/verify-credential', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: acc.phone, password: acc.password }),
      });
      const data = await res.json();
      setVerifyResult((prev) => ({
        ...prev,
        [acc.id]: data.valid ? 'Active & Valid' : 'Invalid Credentials',
      }));
    } catch {
      setVerifyResult((prev) => ({
        ...prev,
        [acc.id]: 'Connection Error',
      }));
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#101118] border border-[#232536] rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E1F2C]">
          <div className="flex items-center gap-2.5">
            <KeyRound className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-base font-semibold text-white font-display">
                Account Credential Vault
              </h2>
              <p className="text-xs text-slate-400">
                Manage accounts, fallback chains, and bulk credentials for concurrent fetching.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-[#1A1B28] bg-[#0C0D12]">
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`pb-2.5 px-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'list'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Accounts ({accounts.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('add')}
            className={`pb-2.5 px-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'add'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            + Add Account
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('csv')}
            className={`pb-2.5 px-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'csv'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Bulk CSV Import / Export
          </button>
        </div>

        {/* Notification Status */}
        {importStatus && (
          <div
            className={`px-6 py-2 text-xs flex items-center justify-between ${
              importStatus.isError ? 'bg-rose-950/40 text-rose-300' : 'bg-emerald-950/40 text-emerald-300'
            }`}
          >
            <span>{importStatus.message}</span>
            <button
              type="button"
              onClick={() => setImportStatus(null)}
              className="text-slate-400 hover:text-slate-200"
            >
              ×
            </button>
          </div>
        )}

        {/* Tab 1: Account List */}
        {activeTab === 'list' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            <div className="flex items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onToggleAll(true)}
                  className="text-xs text-cyan-400 hover:underline"
                >
                  Enable All
                </button>
                <span className="text-slate-600">·</span>
                <button
                  type="button"
                  onClick={() => onToggleAll(false)}
                  className="text-xs text-slate-400 hover:underline"
                >
                  Disable All
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onExportCsv}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download CSV</span>
                </button>
                <button
                  type="button"
                  onClick={onResetDefaults}
                  className="text-xs text-slate-400 hover:text-amber-300"
                >
                  Reset Defaults
                </button>
              </div>
            </div>

            {accounts.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No accounts in vault. Click "+ Add Account" or "Bulk CSV Import" to load credentials.
              </div>
            ) : (
              accounts.map((acc) => (
                <div
                  key={acc.id}
                  className={`p-3.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    acc.enabled
                      ? 'bg-[#14151F] border-[#252738]'
                      : 'bg-[#0E0F16] border-[#1C1C26] opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={acc.enabled}
                      onChange={() => onToggleAccount(acc.id)}
                      className="w-4 h-4 rounded bg-[#0C0D12] border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
                    />

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-sm">{acc.label}</span>
                        <span className="text-xs text-cyan-400 font-mono">{acc.phone}</span>
                      </div>

                      {acc.fallbacks && acc.fallbacks.length > 0 && (
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span>Fallbacks:</span>
                          {acc.fallbacks.map((f, idx) => (
                            <span key={idx} className="font-mono text-slate-300">
                              #{idx + 1} {f.phone}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {verifyResult[acc.id] && (
                      <span
                        className={`text-xs font-medium ${
                          verifyResult[acc.id].includes('Active')
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {verifyResult[acc.id]}
                      </span>
                    )}

                    <button
                      type="button"
                      disabled={verifyingId === acc.id}
                      onClick={() => testVerify(acc)}
                      className="px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-[#1E202E] hover:bg-[#282B3E] rounded border border-[#2B2D40] transition-colors whitespace-nowrap"
                    >
                      {verifyingId === acc.id ? 'Testing...' : 'Test Auth'}
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteAccount(acc.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors"
                      title="Delete account"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 2: Add Account Form */}
        {activeTab === 'add' && (
          <form onSubmit={handleCreateAccount} className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Account Label / Nickname
                </label>
                <input
                  type="text"
                  required
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  placeholder="e.g. VIP Pokie Account #1"
                  className="w-full px-3 py-2 bg-[#0C0D12] border border-[#232536] rounded-md text-xs text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Primary Phone / Username
                </label>
                <input
                  type="text"
                  required
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="e.g. +61488123456"
                  className="w-full px-3 py-2 bg-[#0C0D12] border border-[#232536] rounded-md text-xs text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Primary Password
                </label>
                <input
                  type="password"
                  required
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full px-3 py-2 bg-[#0C0D12] border border-[#232536] rounded-md text-xs text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            {/* Fallback Credential Chain section */}
            <div className="pt-2 border-t border-[#1E1F2C]">
              <h3 className="text-xs font-semibold text-slate-200 mb-2">
                Fallback Credential Chain (Best Pokies List Multi-Phone Fallbacks)
              </h3>
              <p className="text-[11px] text-slate-400 mb-3">
                If the primary phone receives an auth error, the concurrent fetcher automatically retries with Fallback 2, then Fallback 3.
              </p>

              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#0C0D12] p-3 rounded-lg border border-[#1E202E]">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Fallback #2 Phone</label>
                    <input
                      type="text"
                      value={formFallback2Phone}
                      onChange={(e) => setFormFallback2Phone(e.target.value)}
                      placeholder="+61488123457"
                      className="w-full px-2.5 py-1.5 bg-[#14151F] border border-[#26283A] rounded text-xs text-slate-200 placeholder:text-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Fallback #2 Password</label>
                    <input
                      type="password"
                      value={formFallback2Password}
                      onChange={(e) => setFormFallback2Password(e.target.value)}
                      placeholder="Password"
                      className="w-full px-2.5 py-1.5 bg-[#14151F] border border-[#26283A] rounded text-xs text-slate-200 placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#0C0D12] p-3 rounded-lg border border-[#1E202E]">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Fallback #3 Phone</label>
                    <input
                      type="text"
                      value={formFallback3Phone}
                      onChange={(e) => setFormFallback3Phone(e.target.value)}
                      placeholder="+61488123458"
                      className="w-full px-2.5 py-1.5 bg-[#14151F] border border-[#26283A] rounded text-xs text-slate-200 placeholder:text-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Fallback #3 Password</label>
                    <input
                      type="password"
                      value={formFallback3Password}
                      onChange={(e) => setFormFallback3Password(e.target.value)}
                      placeholder="Password"
                      className="w-full px-2.5 py-1.5 bg-[#14151F] border border-[#26283A] rounded text-xs text-slate-200 placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-[#1E1F2C]">
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-black bg-cyan-400 hover:bg-cyan-300 rounded-md transition-colors"
              >
                Save Account to Vault
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: CSV Import */}
        {activeTab === 'csv' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Bulk CSV Import</h3>
              <p className="text-xs text-slate-400 mt-1">
                Paste CSV text below with comma-separated columns:
                <br />
                <code className="text-cyan-400 font-mono text-[11px]">
                  Phone,Password,FallbackPhone2,FallbackPassword2,FallbackPhone3,FallbackPassword3,Label
                </code>
              </p>
            </div>

            <textarea
              rows={8}
              value={csvInput}
              onChange={(e) => setCsvInput(e.target.value)}
              placeholder={`+61488000001,Pass123!,+61488000002,Pass123!,,VIP 1
+61488000003,Pass456!,,,Rebate Hunter 2`}
              className="w-full p-3 bg-[#0C0D12] border border-[#232536] rounded-md font-mono text-xs text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-cyan-400"
            />

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={onExportCsv}
                className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Current Vault as CSV</span>
              </button>

              <button
                type="button"
                onClick={handleCsvSubmit}
                disabled={!csvInput.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-black bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 rounded-md transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import Accounts</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
