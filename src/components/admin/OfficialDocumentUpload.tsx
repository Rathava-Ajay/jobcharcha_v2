import React, { useRef, useState } from 'react';
import { FileUp, FileCheck2, Loader2, X } from 'lucide-react';
import { uploadAdminDocument } from '../../api/uploads';
import { ApiError } from '../../api/client';
import { DocumentPreview } from '../DocumentPreview';

interface Props {
  /** Current stored file URL (e.g. /uploads/notifications/xxx.pdf), or null/empty when none. */
  value: string | null | undefined;
  /** Original file name, when known — falls back to the URL basename for display. */
  fileName?: string | null;
  /** Called with the new file URL + name after a successful upload, or (null, null) on remove. */
  onChange: (url: string | null, fileName: string | null) => void;
  label?: string;
  hint?: string;
  /** Upload transport — defaults to the admin endpoint. Pass `uploadEmployerDocument` on the employer side. */
  upload?: (file: File) => Promise<{ url: string; fileName: string }>;
}

const basename = (url: string) => {
  try { return decodeURIComponent(url.split('/').pop() || url); } catch { return url; }
};

/**
 * Shared admin control for attaching a single official-notification / official-source file
 * (PDF or image) to a record. Wraps the existing `POST /api/admin/uploads/document` endpoint.
 */
export const OfficialDocumentUpload: React.FC<Props> = ({
  value, fileName, onChange,
  label = 'Official Notification / Source (PDF or image)',
  hint = 'Attach the official notification PDF or a screenshot of the source. Optional.',
  upload = uploadAdminDocument,
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const { url } = await upload(file);
      onChange(url, file.name);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not upload this file. Please try again.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div>
      <label className="text-slate-700 block mb-1.5 text-[12.5px]">{label}</label>
      {value ? (
        <div className="flex items-start gap-2.5">
          <DocumentPreview url={value} fileName={fileName} variant="thumb" />
          <div className="flex items-center gap-2 flex-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold px-3 py-2.5 rounded-xl">
            <FileCheck2 className="w-4 h-4 shrink-0" />
            <a href={value} target="_blank" rel="noopener noreferrer" className="truncate underline decoration-emerald-300 hover:decoration-emerald-600">
              {fileName || basename(value)}
            </a>
            <button
              type="button"
              onClick={() => { setError(null); onChange(null, null); }}
              className="ml-auto text-emerald-700 hover:text-emerald-900 cursor-pointer shrink-0"
              aria-label="Remove file"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <label className="flex items-center gap-1.5 bg-white border border-dashed border-slate-300 text-slate-600 text-xs font-semibold px-3 py-2.5 rounded-xl cursor-pointer hover:border-emerald-400">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
          {uploading ? 'Uploading…' : 'Upload PDF or image'}
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
            className="hidden"
            disabled={uploading}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </label>
      )}
      {hint && !error && <p className="text-[10px] text-slate-400 font-medium mt-1">{hint}</p>}
      {error && <p className="text-[10px] text-red-600 mt-1">{error}</p>}
    </div>
  );
};
