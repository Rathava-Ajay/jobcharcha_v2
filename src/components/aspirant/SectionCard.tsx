import React from 'react';
import { Pencil, Loader2, CheckCircle2, CircleAlert, Check } from 'lucide-react';

interface Props {
  id?: string;
  icon: React.ElementType;
  title: string;
  editing: boolean;
  saving?: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  children: React.ReactNode;
  /** Hidden while editing — a compact read-only summary. */
  summary?: React.ReactNode;
  /** Shows a "Complete" / "Needs info" badge next to the title. */
  status?: 'done' | 'todo';
}

export const SectionCard: React.FC<Props> = ({
  id, icon: Icon, title, editing, saving, onEdit, onCancel, onSave, children, summary, status,
}) => (
  <section
    id={id}
    className={`bg-white rounded-2xl border scroll-mt-24 overflow-hidden transition-shadow ${editing ? 'border-blue-300 ring-4 ring-blue-500/10' : 'border-slate-200'}`}
  >
    <header className="flex items-center gap-3 px-4 sm:px-5 py-3.5 border-b border-slate-100">
      <span className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 grid place-items-center shrink-0"><Icon className="w-[18px] h-[18px]" /></span>
      <div className="flex-1 min-w-0">
        <h2 className="font-extrabold text-[16px] text-slate-900 truncate">{title}</h2>
        {status && (
          <p className={`flex items-center gap-1 text-[12px] font-bold ${status === 'done' ? 'text-emerald-600' : 'text-amber-600'}`}>
            {status === 'done' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <CircleAlert className="w-3.5 h-3.5" />}
            {status === 'done' ? 'Complete' : 'Needs info'}
          </p>
        )}
      </div>
      {!editing && (
        <button
          type="button"
          onClick={onEdit}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:text-blue-700 px-3 py-2 text-[13px] font-bold text-slate-600 cursor-pointer"
        >
          <Pencil className="w-3.5 h-3.5" /> Edit
        </button>
      )}
    </header>

    {editing ? (
      <>
        <div className="p-4 sm:p-5 space-y-4">{children}</div>
        <footer className="flex items-center justify-end gap-2 px-4 sm:px-5 py-3 bg-slate-50 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-[13px] px-4 py-2.5 rounded-xl cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-extrabold text-[13px] px-5 py-2.5 rounded-xl cursor-pointer inline-flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </footer>
      </>
    ) : (
      <div className="p-4 sm:p-5 text-[14px] text-slate-600">{summary}</div>
    )}
  </section>
);

export const fieldClass =
  'w-full bg-slate-50/70 border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] text-slate-900 font-medium placeholder:text-slate-400 placeholder:font-normal outline-none transition-colors hover:border-slate-300 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10';
export const labelClass = 'text-[13px] font-bold text-slate-700 block mb-1.5';
