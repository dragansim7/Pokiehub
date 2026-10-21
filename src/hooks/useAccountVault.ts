import { useState, useEffect } from 'react';
import { AccountCredential } from '../types/bonus.ts';

const VAULT_STORAGE_KEY = 'pokies_radar_vault_v1';

const DEFAULT_ACCOUNTS: AccountCredential[] = [
  {
    id: 'acc_01',
    label: 'VIP Primary 01',
    phone: '+61488123456',
    password: 'Password99!',
    fallbacks: [
      { phone: '+61488123457', password: 'Password99!' },
      { phone: '+61488123458', password: 'AltPass99!' }
    ],
    enabled: true,
    tags: ['High Roller', 'Active'],
    status: 'idle',
  },
  {
    id: 'acc_02',
    label: 'Rebate Hunter 02',
    phone: '+61491570001',
    password: 'SafePass2026!',
    fallbacks: [
      { phone: '+61491570002', password: 'SafePass2026!' }
    ],
    enabled: true,
    tags: ['Rebates'],
    status: 'idle',
  },
  {
    id: 'acc_03',
    label: 'Affiliate Share 03',
    phone: '+61491570888',
    password: 'Commission77*',
    fallbacks: [],
    enabled: true,
    tags: ['Commission'],
    status: 'idle',
  },
  {
    id: 'acc_04',
    label: 'Pokies Multi 04',
    phone: '+61491570999',
    password: 'MasterPokie!',
    fallbacks: [
      { phone: '+61491570990', password: 'MasterPokie!' }
    ],
    enabled: true,
    tags: ['Weekly'],
    status: 'idle',
  }
];

export function useAccountVault() {
  const [accounts, setAccounts] = useState<AccountCredential[]>(() => {
    try {
      const stored = localStorage.getItem(VAULT_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Could not read vault from localStorage', e);
    }
    return DEFAULT_ACCOUNTS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(accounts));
    } catch (e) {
      console.warn('Could not save vault to localStorage', e);
    }
  }, [accounts]);

  const addAccount = (newAccount: Omit<AccountCredential, 'id'>) => {
    const id = `acc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setAccounts((prev) => [...prev, { ...newAccount, id }]);
  };

  const updateAccount = (id: string, updates: Partial<AccountCredential>) => {
    setAccounts((prev) =>
      prev.map((acc) => (acc.id === id ? { ...acc, ...updates } : acc))
    );
  };

  const deleteAccount = (id: string) => {
    setAccounts((prev) => prev.filter((acc) => acc.id !== id));
  };

  const toggleAccount = (id: string) => {
    setAccounts((prev) =>
      prev.map((acc) => (acc.id === id ? { ...acc, enabled: !acc.enabled } : acc))
    );
  };

  const toggleAll = (enabled: boolean) => {
    setAccounts((prev) => prev.map((acc) => ({ ...acc, enabled })));
  };

  const importFromCsv = (csvText: string): { imported: number; errors: string[] } => {
    const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const errors: string[] = [];
    const newAccounts: AccountCredential[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip header if present
      if (i === 0 && line.toLowerCase().includes('phone')) continue;

      const parts = line.split(',').map((p) => p.trim());
      const phone = parts[0];
      const password = parts[1];
      if (!phone || !password) {
        errors.push(`Line ${i + 1}: Missing phone or password.`);
        continue;
      }

      const fallbacks = [];
      if (parts[2] && parts[3]) fallbacks.push({ phone: parts[2], password: parts[3] });
      if (parts[4] && parts[5]) fallbacks.push({ phone: parts[4], password: parts[5] });

      const label = parts[6] || `Imported ${phone.slice(-4)}`;
      const sessionToken = parts[9] || undefined;

      newAccounts.push({
        id: `acc_csv_${Date.now()}_${i}`,
        label,
        phone,
        password,
        sessionToken,
        fallbacks,
        enabled: true,
        tags: ['CSV Import'],
        status: 'idle',
      });
    }

    if (newAccounts.length > 0) {
      setAccounts((prev) => [...prev, ...newAccounts]);
    }

    return { imported: newAccounts.length, errors };
  };

  const exportToCsv = () => {
    const headers = ['Phone', 'Password', 'FallbackPhone2', 'FallbackPassword2', 'FallbackPhone3', 'FallbackPassword3', 'Label', 'Tags', 'Enabled', 'SessionToken'];
    const rows = accounts.map((acc) => [
      acc.phone,
      acc.password,
      acc.fallbacks[0]?.phone || '',
      acc.fallbacks[0]?.password || '',
      acc.fallbacks[1]?.phone || '',
      acc.fallbacks[1]?.password || '',
      acc.label,
      (acc.tags || []).join(';'),
      acc.enabled ? 'true' : 'false',
      acc.sessionToken || '',
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `pokies_bonus_accounts_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetToDefaults = () => {
    setAccounts(DEFAULT_ACCOUNTS);
  };

  return {
    accounts,
    addAccount,
    updateAccount,
    deleteAccount,
    toggleAccount,
    toggleAll,
    importFromCsv,
    exportToCsv,
    resetToDefaults,
  };
}
