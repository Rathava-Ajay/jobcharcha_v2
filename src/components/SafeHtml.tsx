import React from 'react';
import DOMPurify from 'dompurify';

interface SafeHtmlProps {
  html: string;
  className?: string;
}

const HTML_TAG_RE = /<\/?[a-z][\s\S]*>/i;

/**
 * Typographic rules for admin/CMS-authored HTML. Tailwind's preflight strips the
 * browser default margins and list styles off every element, so pasted
 * <p>/<ul>/<ol>/<h*>/<table> markup otherwise renders as one dense, unreadable
 * block (headings jammed against lists, list items with no gaps, nested lists
 * collapsed). These arbitrary variants restore a readable vertical rhythm.
 */
const HTML_PROSE = [
  // paragraphs
  '[&_p]:my-2.5 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0',
  // a standalone bold line used as an inline sub-heading, e.g.
  // "<p><strong>Academic Documents</strong></p>" — give it real separation
  '[&_strong]:font-bold [&_strong]:text-slate-900',
  '[&_p:has(>strong:only-child)]:mt-5 [&_p:has(>strong:only-child)]:mb-1.5 [&_p:first-child:has(>strong:only-child)]:mt-0',
  // real headings
  '[&_h1]:text-base [&_h2]:text-base [&_h3]:text-sm [&_h4]:text-sm',
  '[&_h1]:font-extrabold [&_h2]:font-extrabold [&_h3]:font-bold [&_h4]:font-bold',
  '[&_h1]:text-slate-900 [&_h2]:text-slate-900 [&_h3]:text-slate-900 [&_h4]:text-slate-900',
  '[&_h1]:mt-5 [&_h2]:mt-5 [&_h3]:mt-4 [&_h4]:mt-4',
  '[&_h1]:mb-2 [&_h2]:mb-2 [&_h3]:mb-1.5 [&_h4]:mb-1.5',
  '[&_h1:first-child]:mt-0 [&_h2:first-child]:mt-0 [&_h3:first-child]:mt-0 [&_h4:first-child]:mt-0',
  // lists
  '[&_ul]:my-2.5 [&_ul]:pl-5 [&_ul]:list-disc',
  '[&_ol]:my-2.5 [&_ol]:pl-5 [&_ol]:list-decimal',
  '[&_li]:mb-1.5 [&_li]:pl-1 [&_li:last-child]:mb-0 [&_li]:marker:text-slate-400',
  // nested lists tighten up against their parent item
  '[&_li>ul]:mt-1.5 [&_li>ol]:mt-1.5 [&_li>ul]:mb-0 [&_li>ol]:mb-0',
  '[&_ul_ul]:list-[circle]',
  // links
  '[&_a]:text-emerald-700 [&_a]:font-semibold [&_a]:underline [&_a]:underline-offset-2',
  // tables (category-wise marks / age tables in eligibility blocks)
  '[&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_table]:text-xs',
  '[&_th]:border [&_td]:border [&_th]:border-slate-200 [&_td]:border-slate-200',
  '[&_th]:bg-slate-50 [&_th]:p-2 [&_td]:p-2 [&_th]:text-left [&_th]:font-bold [&_th]:text-slate-600',
  '[&_hr]:my-4 [&_hr]:border-slate-200',
].join(' ');

/** Plain text with \n breaks — keep newlines meaningful, style any bare links. */
const PLAIN_TEXT = 'whitespace-pre-line [&_a]:text-emerald-700 [&_a]:underline';

/**
 * Renders admin/CMS-authored text fields that sometimes contain raw HTML
 * (pasted from rich text editors / AI import) and sometimes plain text with \n
 * breaks. Sanitized via DOMPurify either way. HTML gets a full prose stylesheet
 * so block elements lay themselves out; plain text keeps its literal line breaks.
 */
export const SafeHtml: React.FC<SafeHtmlProps> = ({ html, className }) => {
  const isHtml = HTML_TAG_RE.test(html);
  return (
    <div
      className={`${isHtml ? HTML_PROSE : PLAIN_TEXT} ${className || ''}`}
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
    />
  );
};
