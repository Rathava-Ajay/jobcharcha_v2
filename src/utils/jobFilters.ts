/**
 * Filter vocabularies shared by the home search and the jobs list. The backend matches
 * qualification and location with a case-insensitive "contains", so each option sends the
 * shortest stem that catches the common spellings ("Graduat" → Graduate / Graduation); the API also
 * expands the 10th / 12th / Graduat / Post Grad stems to synonyms (Matric, Class 12, Bachelor, Master…).
 */

export const QUALIFICATION_OPTIONS: { label: string; value: string }[] = [
  { label: '10th Pass', value: '10th' },
  { label: '12th Pass', value: '12th' },
  { label: 'ITI', value: 'ITI' },
  { label: 'Diploma', value: 'Diploma' },
  { label: 'Graduate', value: 'Graduat' },
  { label: 'Post Graduate', value: 'Post Grad' },
  { label: 'B.Ed / PTC', value: 'B.Ed' },
];

/** Homepage shows a department card / chip only when it has at least this many open jobs.
 * Smaller categories stay reachable from the /jobs category filter. */
export const HOMEPAGE_MIN_CATEGORY_JOBS = 5;

export const LOCATION_OPTIONS: { label: string; value: string }[] = [
  { label: 'Gujarat', value: 'Gujarat' },
  { label: 'All India', value: 'All India' },
  { label: 'Ahmedabad', value: 'Ahmedabad' },
  { label: 'Gandhinagar', value: 'Gandhinagar' },
  { label: 'Surat', value: 'Surat' },
  { label: 'Vadodara', value: 'Vadodara' },
  { label: 'Rajkot', value: 'Rajkot' },
];

export const SORT_OPTIONS: { label: string; value: 'newest' | 'deadline' | 'popular' | 'posts' }[] = [
  { label: 'Newest first', value: 'newest' },
  { label: 'Last date (soonest)', value: 'deadline' },
  { label: 'Most posts', value: 'posts' },
  { label: 'Most viewed', value: 'popular' },
];

export const qualificationLabel = (value?: string | null) =>
  QUALIFICATION_OPTIONS.find((o) => o.value === value)?.label ?? value ?? '';
