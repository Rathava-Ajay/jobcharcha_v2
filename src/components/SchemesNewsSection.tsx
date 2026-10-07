import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Landmark, Newspaper, ExternalLink, ChevronRight, UserCheck, Gift, GraduationCap, HandCoins, Briefcase } from 'lucide-react';
import { getGovtSchemes, ApiGovtSchemeListItem } from '../api/govtSchemes';
import { getNews, ApiNewsListItem } from '../api/news';
import { fmtShortDate } from '../utils/dates';

/**
 * Compact "Schemes & News" panel: government schemes as ticket rows (who can apply, what you
 * get, apply link) beside a numbered list of exam-news headlines. Either column hides itself
 * when it has no data, and the whole section disappears when both are empty.
 */
export const SchemesNewsSection: React.FC = () => {
  const [schemes, setSchemes] = useState<ApiGovtSchemeListItem[]>([]);
  const [newsPosts, setNewsPosts] = useState<ApiNewsListItem[]>([]);

  useEffect(() => {
    getGovtSchemes().then((data) => setSchemes(data.slice(0, 3))).catch(() => setSchemes([]));
    getNews().then((data) => setNewsPosts(data.slice(0, 5))).catch(() => setNewsPosts([]));
  }, []);

  if (schemes.length === 0 && newsPosts.length === 0) return null;
  const both = schemes.length > 0 && newsPosts.length > 0;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 mt-8 sm:mt-10">
      <div className={`grid gap-4 lg:gap-5 items-stretch ${both ? 'lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]' : ''}`}>
        {schemes.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden min-w-0 flex flex-col">
            <PanelHeader icon={Landmark} tone="bg-emerald-50 text-emerald-700" title="Government schemes" sub="Stipends, scholarships & welfare you can apply for" to="/schemes" />
            <div className="p-3 sm:p-4 space-y-2.5">
              {schemes.map((s) => (
                <article key={s.id} className="relative flex gap-3 rounded-xl border border-slate-200 bg-white p-3 pl-4 hover:border-emerald-400 transition-colors overflow-hidden min-w-0">
                  <span aria-hidden className="absolute left-0 inset-y-0 w-1.5 bg-gradient-to-b from-emerald-500 to-teal-400" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      {s.category && <span className="shrink-0 max-w-[45%] truncate rounded-md bg-emerald-50 text-emerald-700 text-[10.5px] font-extrabold uppercase tracking-wide px-2 py-0.5">{s.category}</span>}
                      {s.ministry && <span className="text-xs text-slate-500 truncate">{s.ministry}</span>}
                    </div>
                    <Link to={`/schemes/${s.slug}`} className="mt-1 block font-bold text-[15px] leading-snug text-slate-900 hover:text-emerald-700 line-clamp-2 break-words">{s.title}</Link>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[12.5px]">
                      {s.eligibility && (
                        <p className="flex gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-slate-700 min-w-0">
                          <UserCheck className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-500" /><span className="line-clamp-2 break-words">{s.eligibility}</span>
                        </p>
                      )}
                      {s.benefits && (
                        <p className="flex gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 font-semibold text-emerald-900 min-w-0">
                          <Gift className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-600" /><span className="line-clamp-2 break-words">{s.benefits}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  {s.applyLink && (
                    <a href={s.applyLink} target="_blank" rel="noopener noreferrer" aria-label={`Apply for ${s.title} on the official portal`}
                      className="self-start shrink-0 inline-flex items-center gap-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-2.5 sm:px-3 py-2">
                      <span className="hidden sm:inline">Apply</span><ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </article>
              ))}
            </div>
            {/* Few schemes listed: fill the panel with a pointer to the full directory instead of empty space */}
            {schemes.length < 3 && (
              <Link to="/schemes" className="mt-auto mx-3 sm:mx-4 mb-3 sm:mb-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 p-3.5 flex flex-col sm:flex-row sm:items-center gap-3 hover:border-emerald-300 group">
                <span className="flex-1 min-w-0">
                  <span className="block font-extrabold text-[14px] text-slate-900">Find schemes you qualify for</span>
                  <span className="mt-1.5 flex flex-wrap gap-1.5">
                    {[['Scholarships', GraduationCap], ['Loans & subsidy', HandCoins], ['Employment & stipend', Briefcase]].map(([label, Icon]) => {
                      const I = Icon as React.ElementType;
                      return <span key={label as string} className="inline-flex items-center gap-1 rounded-full bg-white border border-emerald-100 px-2.5 py-1 text-[12px] font-semibold text-emerald-800"><I className="w-3.5 h-3.5" />{label as string}</span>;
                    })}
                  </span>
                </span>
                <span className="shrink-0 inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-600 group-hover:bg-emerald-700 text-white text-[13px] font-bold px-3.5 py-2">
                  Browse all schemes <ChevronRight className="w-4 h-4" />
                </span>
              </Link>
            )}
          </div>
        )}

        {newsPosts.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden min-w-0">
            <PanelHeader icon={Newspaper} tone="bg-blue-50 text-blue-700" title="Exam news & articles" sub="Notifications, salary updates & preparation tips" to="/news" />
            <ol className="px-4 py-1">
              {newsPosts.map((n, i) => (
                <li key={n.id} className="border-t border-slate-100 first:border-t-0">
                  <Link to={`/news/${n.slug}`} className="flex gap-3 py-3 group min-w-0">
                    <span aria-hidden className="w-8 shrink-0 text-[22px] leading-none font-black text-blue-100 group-hover:text-blue-300 tabular-nums pt-0.5">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center gap-1.5 text-[11px] font-bold min-w-0">
                        {n.isBreaking && <span className="shrink-0 rounded bg-red-600 text-white px-1.5 py-px uppercase">Breaking</span>}
                        {n.categoryName && <span className="text-blue-700 uppercase tracking-wide truncate">{n.categoryName}</span>}
                        {n.publishedDate && <span className="shrink-0 text-slate-400 font-semibold">· {fmtShortDate(n.publishedDate)}</span>}
                      </span>
                      <span className="mt-0.5 block text-[14px] font-bold leading-snug text-slate-900 group-hover:text-blue-700 line-clamp-2 break-words">{n.title}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </section>
  );
};

const PanelHeader: React.FC<{ icon: React.ElementType; tone: string; title: string; sub: string; to: string }> = ({ icon: Icon, tone, title, sub, to }) => (
  <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 min-w-0">
    <span className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${tone}`}><Icon className="w-[18px] h-[18px]" /></span>
    <span className="min-w-0">
      <h2 className="font-extrabold text-[16px] text-slate-900 truncate">{title}</h2>
      <p className="text-xs text-slate-500 truncate">{sub}</p>
    </span>
    <Link to={to} className="ml-auto shrink-0 inline-flex items-center text-[13px] font-bold text-blue-700 hover:text-blue-800">
      View all <ChevronRight className="w-4 h-4" />
    </Link>
  </div>
);
