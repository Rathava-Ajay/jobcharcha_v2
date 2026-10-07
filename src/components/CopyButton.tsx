import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export const CopyButton: React.FC<{ text: string; label?: string; full?: boolean }> = ({ text, label = 'Copy', full }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className={`${full ? 'w-full' : ''} inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-[14px] font-extrabold cursor-pointer transition-colors ${copied ? 'bg-emerald-600 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}
    >
      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      {copied ? 'Copied!' : label}
    </button>
  );
};
