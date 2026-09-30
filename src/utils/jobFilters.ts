/**
 * Filter vocabularies shared by the home search and the jobs list. The backend matches
 * qualification and location with a case-insensitive "contains", so each option sends the
 * shortest stem that catches the common spellings ("Graduat" → Graduate / Graduation).
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
