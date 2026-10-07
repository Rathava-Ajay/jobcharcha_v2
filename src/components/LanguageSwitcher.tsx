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
    <div role="group" aria-label="Language" className={`flex items-center gap-0.5 border border-slate-200 bg-white rounded-full p-0.5 ${className}`}>
      <Languages className="w-3.5 h-3.5 text-slate-400 mx-1" aria-hidden />
      {LANGS.map((lang) => (
        <button
          key={lang.code}
          onClick={() => i18n.changeLanguage(lang.code)}
          aria-pressed={current === lang.code}
          className={`px-2.5 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer ${
            current === lang.code ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
};
