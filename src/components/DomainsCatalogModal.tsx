import React from 'react';
import { X, ExternalLink, Globe } from 'lucide-react';
import { CASINO_DOMAINS } from '../data/casinoDomains.ts';

interface DomainsCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DomainsCatalogModal: React.FC<DomainsCatalogModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#101118] border border-[#232536] rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E1F2C]">
          <div className="flex items-center gap-2.5">
            <Globe className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-base font-semibold text-white font-display">
                Supported Pokies & Casino Platforms
              </h3>
              <p className="text-xs text-slate-400">
                Directly cataloged from bestpokieslist.online with active promotion scraper endpoints.
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

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CASINO_DOMAINS.map((casino) => (
            <div
              key={casino.domain}
              className="p-3 bg-[#0C0D12] border border-[#1E202E] rounded-lg flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded bg-[#161724] border border-[#222338] flex items-center justify-center font-bold text-xs text-cyan-300 font-mono shrink-0">
                  {casino.logoText}
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white">{casino.name}</h4>
                  <p className="text-[11px] text-slate-400 font-mono">{casino.domain}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 bg-[#161722] px-2 py-0.5 rounded border border-[#262738]">
                  {casino.category}
                </span>
                <a
                  href={`https://${casino.domain}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 text-slate-400 hover:text-cyan-300 transition-colors"
                  title="Open site"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#1E1F2C] bg-[#0C0D12] flex items-center justify-between text-xs text-slate-400">
          <span>Total: 22 Pokie Domains in Concurrency Pool</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-[#181924] hover:bg-[#232536] rounded border border-[#262738]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
