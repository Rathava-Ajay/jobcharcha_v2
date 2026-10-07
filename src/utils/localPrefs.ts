import { useCallback, useEffect, useState } from 'react';

/**
 * Small per-device preferences for visitors who haven't logged in (and for govt jobs, which the
 * backend's saved-jobs API doesn't cover — it only bookmarks employer postings). Everything is
 * wrapped in try/catch: storage can be unavailable in private mode or blocked by the browser, and
 * the UI must keep working without it.
 */

const read = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent('jc-prefs', { detail: key }));
  } catch {
    /* storage full or blocked — preference simply isn't remembered */
  }
};

/** Re-renders when the key changes in this tab (custom event) or another tab (storage event). */
function useStored<T>(key: string, fallback: T): [T, (next: T) => void] {
  const [value, setValue] = useState<T>(() => read(key, fallback));
  useEffect(() => {
    const sync = (e: Event) => {
      const changed = e instanceof StorageEvent ? e.key : (e as CustomEvent<string>).detail;
      if (changed === key) setValue(read(key, fallback));
    };
    window.addEventListener('storage', sync);
    window.addEventListener('jc-prefs', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('jc-prefs', sync);
    };
    // fallback is a literal at every call site; re-subscribing on identity change isn't needed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const set = useCallback((next: T) => { setValue(next); write(key, next); }, [key]);
  return [value, set];
}

// ---- Saved government jobs ---------------------------------------------------------------

export interface SavedGovtJob {
  slug: string;
  title: string;
  org: string;
  lastDate: string;
  savedAt: string;
}

const SAVED_KEY = 'jc_saved_govt_jobs';

export function useSavedGovtJobs() {
  const [saved, setSaved] = useStored<SavedGovtJob[]>(SAVED_KEY, []);
  const isSaved = useCallback((slug?: string) => !!slug && saved.some((s) => s.slug === slug), [saved]);
  const toggle = useCallback((job: Omit<SavedGovtJob, 'savedAt'>) => {
    if (!job.slug) return;
    setSaved(saved.some((s) => s.slug === job.slug)
      ? saved.filter((s) => s.slug !== job.slug)
      : [{ ...job, savedAt: new Date().toISOString() }, ...saved].slice(0, 200));
  }, [saved, setSaved]);
  const remove = useCallback((slug: string) => setSaved(saved.filter((s) => s.slug !== slug)), [saved, setSaved]);
  return { saved, isSaved, toggle, remove };
}

// ---- Last-date reminders -------------------------------------------------------------------

export interface Reminder {
  slug: string;
  title: string;
  lastDate: string;
}

const REMIND_KEY = 'jc_deadline_reminders';

export function useReminders() {
  const [reminders, setReminders] = useStored<Reminder[]>(REMIND_KEY, []);
  const hasReminder = useCallback((slug?: string) => !!slug && reminders.some((r) => r.slug === slug), [reminders]);
  const toggle = useCallback((r: Reminder) => {
    setReminders(reminders.some((x) => x.slug === r.slug)
      ? reminders.filter((x) => x.slug !== r.slug)
      : [...reminders, r].slice(-100));
  }, [reminders, setReminders]);
  return { reminders, hasReminder, toggle };
}

// ---- Job detail layout preference ------------------------------------------------------------

export type DetailView = 'modern' | 'classic';

export function useDetailView(): [DetailView, (v: DetailView) => void] {
  return useStored<DetailView>('jc_detail_view', 'modern');
}

// ---- Quick eligibility profile ----------------------------------------------------------------

export interface EligibilityProfile {
  age?: number;
  /** Highest qualification level, see QUALIFICATION_LEVELS. */
  level?: number;
}

export const QUALIFICATION_LEVELS: { level: number; label: string; match: RegExp }[] = [
  { level: 1, label: '10th Pass', match: /\b(10th|ssc|matric|sslc)\b/i },
  { level: 2, label: '12th Pass', match: /\b(12th|hsc|intermediate|higher secondary)\b/i },
  { level: 3, label: 'ITI / Diploma', match: /\b(iti|diploma|polytechnic)\b/i },
  { level: 4, label: 'Graduate', match: /\b(graduat\w*|bachelor|b\.?\s?a|b\.?\s?sc|b\.?\s?com|b\.?\s?e|b\.?\s?tech|bca|bba|degree|llb|mbbs|b\.?\s?ed|ptc)\b/i },
  { level: 5, label: 'Post Graduate', match: /\b(post\s?graduat\w*|master|m\.?\s?a|m\.?\s?sc|m\.?\s?com|m\.?\s?tech|mba|mca|m\.?\s?ed|ph\.?\s?d)\b/i },
];

/** Lowest qualification level a job's qualification text accepts (null when unrecognised). */
export function requiredLevel(qualificationText?: string): number | null {
  if (!qualificationText) return null;
  const hits = QUALIFICATION_LEVELS.filter((q) => q.match.test(qualificationText)).map((q) => q.level);
  return hits.length ? Math.min(...hits) : null;
}

export function useEligibilityProfile(): [EligibilityProfile, (p: EligibilityProfile) => void] {
  return useStored<EligibilityProfile>('jc_elig_profile', {});
}
