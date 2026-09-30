import React from 'react';
import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';

const LANGS: { code: 'en' | 'hi'; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'hi', label: 'हि' },
];

/** Sits in the nav — toggles the two supported UI languages. i18next persists the choice to
 * localStorage itself (see src/i18n/index.ts), so it survives reloads without extra plumbing. */
export const LanguageSwitcher: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { i18n } = useTranslation();
  const current = i18n.resolvedLanguage === 'hi' ? 'hi' : 'en';

  return (
    <div className={`flex items-center gap-1 bg-slate-100/80 rounded-xl p-1 ${className}`}>
      <Languages className="w-3.5 h-3.5 text-slate-500 ml-1" />
      {LANGS.map((lang) => (
        <button
          key={lang.code}
          onClick={() => i18n.changeLanguage(lang.code)}
          aria-pressed={current === lang.code}
          className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
            current === lang.code ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
};
