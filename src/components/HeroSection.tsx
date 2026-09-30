import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search,
  MapPin,
  GraduationCap,
  Briefcase,
  Sparkles,
  TrendingUp,
  Award,
  ArrowRight,
  Zap,
  Calculator,
  Download,
  FileText
} from 'lucide-react';
import { getFeaturedCategories, ApiCategory } from '../api/categories';

interface HeroSectionProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  selectedQualification: string;
  setSelectedQualification: (qual: string) => void;
  selectedLocation: string;
  setSelectedLocation: (loc: string) => void;
  onOpenCutoffPredictor: () => void;
  onOpenQuickQuiz: () => void;
  onSelectTab: (tabId: string) => void;
  onSwitchTo3D?: () => void;
  totalJobCount: number;
  totalOldPapersCount: number;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  selectedQualification,
  setSelectedQualification,
  selectedLocation,
  setSelectedLocation,
  onOpenCutoffPredictor,
  onOpenQuickQuiz,
  onSelectTab,
  totalJobCount,
  totalOldPapersCount,
}) => {
  const { t } = useTranslation();
  const [dbCategories, setDbCategories] = useState<ApiCategory[]>([]);

  useEffect(() => {
    getFeaturedCategories().then(setDbCategories).catch(() => setDbCategories([]));
  }, []);

  const categories = [
    { id: 'All', label: t('hero.allPortals') },
    ...dbCategories.map((c) => ({ id: c.slug, label: c.name })),
  ];

  // Option *values* stay the fixed English strings LandingPage.tsx compares against and sends
  // to the search API (job records are stored in English) — only the on-screen label is
  // localized, via this value -> translated-label lookup.
  const qualifications: [value: string, labelKey: string][] = [
    ['All Qualifications', 'hero.qualifications.all'],
    ['Graduate in Any Stream', 'hero.qualifications.graduate'],
    ['12th Pass / Intermediate', 'hero.qualifications.12th'],
    ['10th Pass / Matriculation', 'hero.qualifications.10th'],
    ['B.Tech / BE / Engineering', 'hero.qualifications.btech'],
    ['Post Graduate / Master', 'hero.qualifications.postGraduate'],
  ];

  const locations: [value: string, labelKey: string][] = [
    ['All India / Central', 'hero.locations.allIndia'],
    ['New Delhi', 'hero.locations.delhi'],
    ['Maharashtra / Mumbai', 'hero.locations.maharashtra'],
    ['Uttar Pradesh / Lucknow', 'hero.locations.up'],
    ['Bihar / Patna', 'hero.locations.bihar'],
    ['Rajasthan / Jaipur', 'hero.locations.rajasthan'],
    ['Gujarat / Ahmedabad', 'hero.locations.gujarat'],
    ['Karnataka / Bengaluru', 'hero.locations.karnataka'],
  ];

  // --- Live-alert ticker: the hero widget auto-rotates through job-related alerts,
  //     fading/sliding each one out and the next one in (plain CSS transitions on one
  //     stable node — no keyframe remounts, so it can't churn under StrictMode). ---
  type HeroAlert = {
    kind: string; tag: string; portal: string; title: string; body: string;
    metaLabel: string; metaValue: string; dateLabel: string; dateValue: string; cta: string;
  };
  const ROTATE_MS = 5600;
  const SWAP_MS = 420;

  const rawAlerts = t('hero.alerts', { returnObjects: true }) as unknown;
  const legacyAlert: HeroAlert = {
    kind: 'admit-card', tag: t('hero.liveAlert'), portal: t('hero.sscPortal'),
    title: t('hero.widgetTitle'), body: t('hero.widgetBody'),
    metaLabel: t('hero.downloadsToday'), metaValue: t('hero.downloadsTodayValue'),
    dateLabel: t('hero.examDate'), dateValue: t('hero.examDateValue'), cta: t('hero.downloadAdmitCard'),
  };
  const alertList: HeroAlert[] = Array.isArray(rawAlerts) && rawAlerts.length ? (rawAlerts as HeroAlert[]) : [legacyAlert];
  const alertCount = alertList.length;

  const [alertIdx, setAlertIdx] = useState(0);
  const [alertShown, setAlertShown] = useState(true); // false = mid-swap (faded out)
  const swapRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const tickRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const advanceTo = React.useCallback((next: number | ((i: number) => number)) => {
    setAlertShown(false); // slide/fade the current alert out
    if (swapRef.current) clearTimeout(swapRef.current);
    swapRef.current = setTimeout(() => {
      setAlertIdx((i) => (typeof next === 'function' ? next(i) : next));
      setAlertShown(true); // the new alert slides/fades in
    }, SWAP_MS);
  }, []);

  useEffect(() => {
    // Guard against a second interval (React StrictMode double-invokes effects in dev).
    if (tickRef.current) clearInterval(tickRef.current);
    if (alertCount < 2) return;
    tickRef.current = setInterval(() => advanceTo((i) => (i + 1) % alertCount), ROTATE_MS);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      tickRef.current = undefined;
      if (swapRef.current) clearTimeout(swapRef.current);
    };
  }, [alertCount, advanceTo]);

  const goToAlert = (i: number) => {
    if (i === alertIdx || !alertShown) return;
    advanceTo(i);
  };

  const alertAccent: Record<string, { badge: string; icon: string; dot: string; glow: string; bar: string }> = {
    'admit-card': { badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', icon: 'text-emerald-400', dot: 'bg-emerald-400', glow: 'bg-emerald-500/10 group-hover:bg-emerald-500/20', bar: 'bg-emerald-400' },
    result:       { badge: 'bg-sky-500/20 text-sky-300 border-sky-500/30',             icon: 'text-sky-400',     dot: 'bg-sky-400',     glow: 'bg-sky-500/10 group-hover:bg-sky-500/20',         bar: 'bg-sky-400' },
    vacancy:      { badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',       icon: 'text-amber-400',   dot: 'bg-amber-400',   glow: 'bg-amber-500/10 group-hover:bg-amber-500/20',     bar: 'bg-amber-400' },
    'answer-key': { badge: 'bg-violet-500/20 text-violet-300 border-violet-500/30',    icon: 'text-violet-400',  dot: 'bg-violet-400',  glow: 'bg-violet-500/10 group-hover:bg-violet-500/20',   bar: 'bg-violet-400' },
  };
  const alertIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    'admit-card': Download, result: Award, vacancy: Briefcase, 'answer-key': FileText,
  };
  const currentAlert = alertList[alertIdx] ?? legacyAlert;
  const accent = alertAccent[currentAlert.kind] ?? alertAccent['admit-card'];
  const AlertIcon = alertIcons[currentAlert.kind] ?? Download;

  return (
    <section className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white pt-10 pb-16 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
      <div className="max-w-7xl mx-auto">
        
        {/* Top Hero Headline Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-10 items-center">
          
          {/* Left Column (7 cols): Main Title & CTA */}
          <div className="lg:col-span-7 flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-semibold mb-4">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{t('hero.badge')}</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-extrabold tracking-tight mb-5 text-white leading-tight">
                {t('hero.titleLine1')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">{t('hero.titleLine2')}</span>
              </h1>
              <p className="text-sm sm:text-base text-slate-300 max-w-xl mb-8 leading-relaxed font-normal">
                {t('hero.subtitle')}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => onSelectTab('jobs')}
                className="btn-3d btn-3d-emerald bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-6 py-3.5 rounded-2xl text-xs font-extrabold transition-colors cursor-pointer flex items-center gap-2"
              >
                <span>{t('hero.exploreVacancies')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => onSelectTab('exams')}
                className="btn-3d btn-3d-dark bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 px-6 py-3.5 rounded-2xl text-xs font-bold cursor-pointer flex items-center gap-2"
              >
                <Award className="w-4 h-4 text-emerald-400" />
                <span>{t('hero.admitCardsCta')}</span>
              </button>
            </div>
          </div>

          {/* Right Column (5 cols): live recruitment-alert ticker (auto-rotating) */}
          <div className="lg:col-span-5 tilt-3d-wrap">
          <div className="tilt-3d card-3d-dark card-3d-hoverable border border-slate-700/60 rounded-3xl p-6 sm:p-7 pb-5 relative overflow-hidden group">
            <div className={`absolute -top-12 -right-12 w-40 h-40 rounded-full blur-2xl transition-all duration-500 ${accent.glow}`}></div>

            {/* the alert body — one stable node, CSS-transitioned between alerts */}
            <div
              className={`relative z-10 transition-[opacity,transform,filter] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                alertShown ? 'opacity-100 translate-y-0 blur-0' : 'opacity-0 -translate-y-3 blur-[2px]'
              }`}
            >
              <div className="flex justify-between items-center mb-4">
                <span className={`px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${accent.badge}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ja-alert-pulse ${accent.dot}`} />
                  {currentAlert.tag}
                </span>
                <span className="text-[11px] font-mono text-slate-400 font-semibold flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-slate-500" /> {currentAlert.portal}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-heading font-bold text-white mb-2 leading-snug min-h-[3.5rem]">
                {currentAlert.title}
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed mb-6 font-normal min-h-[3rem]">
                {currentAlert.body}
              </p>

              <div className="chip-3d-inset-dark bg-slate-900/80 p-3.5 rounded-2xl border border-slate-700/60 flex items-center justify-between mb-5">
                <div className="text-xs">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">{currentAlert.metaLabel}</span>
                  <span className={`font-bold font-mono ${accent.icon}`}>{currentAlert.metaValue}</span>
                </div>
                <div className="text-xs text-right">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">{currentAlert.dateLabel}</span>
                  <span className="font-bold text-amber-400 font-mono">{currentAlert.dateValue}</span>
                </div>
              </div>

              <button
                onClick={() => onSelectTab('exams')}
                className="btn-3d btn-3d-emerald w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer"
              >
                <AlertIcon className="w-4 h-4" />
                <span>{currentAlert.cta}</span>
              </button>
            </div>

            {/* rotation dots + auto-advance progress bar */}
            {alertList.length > 1 && (
              <div className="relative z-10 mt-4 flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  {alertList.map((a, i) => (
                    <button
                      key={i}
                      onClick={() => goToAlert(i)}
                      aria-label={`Show alert ${i + 1}`}
                      className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                        i === alertIdx ? `w-5 ${(alertAccent[a.kind] ?? accent).bar}` : 'w-1.5 bg-slate-600 hover:bg-slate-500'
                      }`}
                    />
                  ))}
                </div>
                <div className="flex-1 h-0.5 rounded-full bg-slate-700/70 overflow-hidden">
                  <div
                    key={alertIdx}
                    className={`ja-alert-progress-bar h-full ${accent.bar}`}
                    style={{ ['--ja-rotate' as string]: `${ROTATE_MS}ms` }}
                  />
                </div>
              </div>
            )}
          </div>
          </div>

        </div>

        {/* Modern Unified Job Filter Bar */}
        <div className="card-3d-static bg-white text-slate-900 rounded-3xl p-6 border border-slate-200/80 mb-10">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-5">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">{t('hero.quickFilterJobs')}</span>
            </div>
            <div className="w-full sm:w-56">
              <select
                aria-label="Filter jobs by category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-slate-100 text-slate-800 text-xs font-semibold pl-3 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 focus:bg-white cursor-pointer"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">{t('hero.keywordsLabel')}</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  aria-label="Search jobs by keyword or post name"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('hero.keywordsPlaceholder')}
                  className="w-full bg-slate-50 text-xs font-medium pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">{t('hero.qualificationLabel')}</label>
              <div className="relative">
                <GraduationCap className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  aria-label="Filter jobs by qualification"
                  value={selectedQualification}
                  onChange={(e) => setSelectedQualification(e.target.value)}
                  className="w-full bg-slate-50 text-xs font-medium pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 focus:bg-white cursor-pointer"
                >
                  {qualifications.map(([value, labelKey]) => (
                    <option key={value} value={value}>{t(labelKey)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">{t('hero.locationLabel')}</label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  aria-label="Filter jobs by location"
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full bg-slate-50 text-xs font-medium pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 focus:bg-white cursor-pointer"
                >
                  {locations.map(([value, labelKey]) => (
                    <option key={value} value={value}>{t(labelKey)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => onSelectTab('jobs')}
                className="btn-3d btn-3d-dark w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{t('hero.findMatchingJobs')}</span>
                <ArrowRight className="w-4 h-4 text-emerald-400" />
              </button>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold text-emerald-700 uppercase">{t('hero.popularAiTools')}</span>
              <button
                onClick={onOpenCutoffPredictor}
                className="text-xs font-bold text-slate-800 hover:text-emerald-600 underline decoration-emerald-500 cursor-pointer"
              >
                <Calculator className="w-3.5 h-3.5 inline mr-1 text-emerald-600" />
                {t('hero.cutoffPredictor')}
              </button>
              <span className="text-slate-300">•</span>
              <button
                onClick={onOpenQuickQuiz}
                className="text-xs font-bold text-slate-800 hover:text-emerald-600 underline decoration-emerald-500 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 inline mr-1 text-amber-500" />
                {t('hero.dailySpeedTest')}
              </button>
            </div>
            <div className="text-[11px] font-medium text-slate-500">
              {t('hero.syncNotice')}
            </div>
          </div>
        </div>

        {/* Bottom Modern Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="chip-3d-inset-dark bg-slate-800/50 border border-slate-700/60 rounded-2xl p-4 flex items-center gap-3 hover:-translate-y-1 transition-transform duration-300">
            <div className="icon-badge-3d-dark w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <div className="text-lg font-heading font-extrabold text-white">
                {totalJobCount > 0 ? `${totalJobCount.toLocaleString()}+` : '—'}
              </div>
              <div className="text-xs text-slate-400">{t('hero.stats.openings')}</div>
            </div>
          </div>

          <div className="chip-3d-inset-dark bg-slate-800/50 border border-slate-700/60 rounded-2xl p-4 flex items-center gap-3 hover:-translate-y-1 transition-transform duration-300">
            <div className="icon-badge-3d-dark w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="text-lg font-heading font-extrabold text-white">
                {totalOldPapersCount > 0 ? `${totalOldPapersCount.toLocaleString()}+` : '—'}
              </div>
              <div className="text-xs text-slate-400">{t('hero.stats.solvedPapers')}</div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
