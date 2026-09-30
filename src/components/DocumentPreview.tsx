import React, { useState } from 'react';
import { Eye, EyeOff, ExternalLink, FileText } from 'lucide-react';

type Kind = 'image' | 'pdf' | 'other';

const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'svg'];

function kindOf(url: string): Kind {
  const clean = url.split(/[?#]/)[0].toLowerCase();
  const ext = clean.slice(clean.lastIndexOf('.') + 1);
  if (ext === 'pdf') return 'pdf';
  if (IMAGE_EXT.includes(ext)) return 'image';
  return 'other';
}

/** Only preview files we can actually embed: same-origin uploads (relative `/uploads/...`),
 * same-origin absolute URLs, or data: URLs. External links (govt portals, news sources) can't be
 * framed (X-Frame-Options) so the caller's plain link stays as-is. */
function isEmbeddable(url: string): boolean {
  if (url.startsWith('data:')) return true;
  if (url.startsWith('/')) return true;
  try {
    return new URL(url, window.location.origin).origin === window.location.origin;
  } catch {
    return false;
  }
}

interface Props {
  url: string | null | undefined;
  fileName?: string | null;
  /** `thumb` — small tile for admin forms. `inline` — collapsible preview for public pages. */
  variant?: 'thumb' | 'inline';
  className?: string;
}

export const DocumentPreview: React.FC<Props> = ({ url, fileName, variant = 'inline', className = '' }) => {
  const [open, setOpen] = useState(false);

  if (!url) return null;
  const kind = kindOf(url);
  if (kind === 'other' || !isEmbeddable(url)) return null;

  if (variant === 'thumb') {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title={fileName || 'Open file'}
        className={`relative block w-20 h-20 rounded-xl border border-slate-200 overflow-hidden bg-slate-50 hover:border-emerald-400 shrink-0 ${className}`}
      >
        {kind === 'image' ? (
          <img src={url} alt={fileName || 'preview'} className="w-full h-full object-cover" />
        ) : (
          <>
            <object data={`${url}#toolbar=0&navpanes=0&view=FitH`} type="application/pdf" className="w-full h-full pointer-events-none" aria-label="PDF preview">
              <div className="w-full h-full flex items-center justify-center"><FileText className="w-6 h-6 text-slate-400" /></div>
            </object>
            <span className="absolute bottom-0 inset-x-0 bg-slate-900/70 text-white text-[9px] font-bold text-center py-0.5">PDF</span>
          </>
        )}
      </a>
    );
  }

  // variant === 'inline'
  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 cursor-pointer"
      >
        {open ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        {open ? 'Hide preview' : 'Preview'}
      </button>

      {open && (
        <div className="mt-2 space-y-1.5">
          {kind === 'image' ? (
            <img
              src={url}
              alt={fileName || 'Document preview'}
              className="w-full rounded-xl border border-slate-200 max-h-[70vh] object-contain bg-slate-50"
            />
          ) : (
            <object data={url} type="application/pdf" className="w-full h-[600px] rounded-xl border border-slate-200 bg-slate-50">
              <div className="p-4 text-xs text-slate-500">
                Your browser can't display this PDF inline.{' '}
                <a href={url} target="_blank" rel="noopener noreferrer" className="font-bold text-emerald-700 underline">Open it in a new tab</a>.
              </div>
            </object>
          )}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:underline"
          >
            Open in new tab <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}
    </div>
  );
};
