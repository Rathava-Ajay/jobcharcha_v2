import React, { useRef, useState } from 'react';
import { FileText, Upload, Download, Eye, Trash2, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { uploadResume } from '../../api/auth';
import { deleteResume } from '../../api/aspirantProfile';

interface Props {
  resumeUrl?: string;
  resumeFileName?: string;
  resumeUploadedAt?: string;
  onChanged: () => void | Promise<void>;
}

export const MasterResumePanel: React.FC<Props> = ({ resumeUrl, resumeFileName, resumeUploadedAt, onChanged }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<'upload' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy('upload'); setError(null); setOk(null);
    try {
      await uploadResume(file);
      setOk('Résumé uploaded.');
      await onChanged();
    } catch {
      setError('Upload failed. Use a PDF or DOCX under 20 MB.');
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    setBusy('delete'); setError(null); setOk(null);
    try {
      await deleteResume();
      await onChanged();
    } catch {
      setError('Could not delete the résumé. Try again.');
    } finally {
      setBusy(null);
    }
  };

  const fileName = resumeFileName || (resumeUrl ? decodeURIComponent(resumeUrl.split('/').pop() || 'resume') : null);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 space-y-4 scroll-mt-24" id="section-resume">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
          <FileText className="w-4 h-4" />
        </div>
        <h2 className="font-heading font-extrabold text-base text-slate-900">Master Résumé</h2>
      </div>

      {resumeUrl ? (
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="truncate">{fileName}</span>
          </div>
          {resumeUploadedAt && (
            <p className="text-[11px] text-slate-500 font-medium">
              Uploaded {new Date(resumeUploadedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
              {' · '}<span className="text-emerald-700 font-bold">Active</span>
            </p>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <a href={resumeUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 bg-white border border-slate-200 hover:border-emerald-400 text-xs font-bold text-slate-700 px-3 py-2 rounded-xl">
              <Eye className="w-3.5 h-3.5" /> View
            </a>
            <a href={resumeUrl} download={fileName || 'resume'}
              className="inline-flex items-center gap-1.5 bg-white border border-slate-200 hover:border-emerald-400 text-xs font-bold text-slate-700 px-3 py-2 rounded-xl">
              <Download className="w-3.5 h-3.5" /> Download
            </a>
            <label className="inline-flex items-center gap-1.5 bg-white border border-slate-200 hover:border-emerald-400 text-xs font-bold text-slate-700 px-3 py-2 rounded-xl cursor-pointer">
              {busy === 'upload' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} Replace
              <input ref={fileRef} type="file" accept=".pdf,.docx" className="hidden" disabled={!!busy} onChange={handleUpload} />
            </label>
            <button onClick={handleDelete} disabled={!!busy}
              className="inline-flex items-center gap-1.5 bg-white border border-slate-200 hover:border-rose-300 text-xs font-bold text-rose-600 px-3 py-2 rounded-xl cursor-pointer disabled:opacity-60">
              {busy === 'delete' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Delete
            </button>
          </div>
        </div>
      ) : (
        <label className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-6 text-center block cursor-pointer transition-colors bg-slate-50/50">
          {busy === 'upload' ? <Loader2 className="w-6 h-6 text-emerald-500 mx-auto mb-2 animate-spin" /> : <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />}
          <span className="text-xs font-bold text-slate-700 block">{busy === 'upload' ? 'Uploading…' : 'Upload your résumé (PDF / DOCX)'}</span>
          <span className="text-[10px] text-slate-400">Max 20 MB · required to apply to jobs</span>
          <input ref={fileRef} type="file" accept=".pdf,.docx" className="hidden" disabled={!!busy} onChange={handleUpload} />
        </label>
      )}

      {ok && <p className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> {ok}</p>}
      {error && <p className="text-[11px] font-semibold text-rose-600 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> {error}</p>}
    </div>
  );
};
