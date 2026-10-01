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
    <section className="bg-white rounded-2xl border border-slate-200 scroll-mt-24 overflow-hidden" id="section-resume">
      <header className="flex items-center gap-3 px-4 sm:px-5 py-3.5 border-b border-slate-100">
        <span className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 grid place-items-center shrink-0"><FileText className="w-[18px] h-[18px]" /></span>
        <div className="min-w-0">
          <h2 className="font-extrabold text-[16px] text-slate-900">Master résumé</h2>
          <p className="text-[12px] text-slate-500">Sent with every application you make</p>
        </div>
      </header>
      <div className="p-4 sm:p-5 space-y-4">

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
              className="inline-flex items-center gap-1.5 bg-white border border-slate-200 hover:border-blue-400 text-[13px] font-bold text-slate-700 px-3.5 py-2 rounded-xl">
              <Eye className="w-3.5 h-3.5" /> View
            </a>
            <a href={resumeUrl} download={fileName || 'resume'}
              className="inline-flex items-center gap-1.5 bg-white border border-slate-200 hover:border-blue-400 text-[13px] font-bold text-slate-700 px-3.5 py-2 rounded-xl">
              <Download className="w-3.5 h-3.5" /> Download
            </a>
            <label className="inline-flex items-center gap-1.5 bg-white border border-slate-200 hover:border-blue-400 text-[13px] font-bold text-slate-700 px-3.5 py-2 rounded-xl cursor-pointer">
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
        <label className="border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/40 rounded-2xl p-7 text-center block cursor-pointer transition-colors bg-slate-50/50">
          {busy === 'upload' ? <Loader2 className="w-6 h-6 text-blue-600 mx-auto mb-2 animate-spin" /> : <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />}
          <span className="text-[14px] font-bold text-slate-800 block">{busy === 'upload' ? 'Uploading…' : 'Upload your résumé (PDF / DOCX)'}</span>
          <span className="text-[12px] text-slate-500">Max 20 MB · required to apply to jobs</span>
          <input ref={fileRef} type="file" accept=".pdf,.docx" className="hidden" disabled={!!busy} onChange={handleUpload} />
        </label>
      )}

      {ok && <p className="text-[12.5px] font-semibold text-emerald-700 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> {ok}</p>}
      {error && <p className="text-[12.5px] font-semibold text-rose-600 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> {error}</p>}
      </div>
    </section>
  );
};
