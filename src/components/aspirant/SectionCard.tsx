import React from 'react';
import { Pencil, Loader2 } from 'lucide-react';

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
}

export const SectionCard: React.FC<Props> = ({
  id, icon: Icon, title, editing, saving, onEdit, onCancel, onSave, children, summary,
}) => (
  <div id={id} className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 scroll-mt-24">
    <div className="flex items-center justify-between gap-3 mb-4">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4" />
        </div>
        <h2 className="font-heading font-extrabold text-base text-slate-900">{title}</h2>
      </div>
      {!editing && (
        <button
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-700 cursor-pointer"
        >
          <Pencil className="w-3.5 h-3.5" /> Edit
        </button>
      )}
    </div>

    {editing ? (
      <div className="space-y-4">
        {children}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={onSave}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl cursor-pointer inline-flex items-center gap-2"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={onCancel}
            disabled={saving}
            className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    ) : (
      <div className="text-xs sm:text-sm text-slate-600">{summary}</div>
    )}
  </div>
);

export const fieldClass =
  'w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-medium';
export const labelClass = 'text-xs font-bold text-slate-700 block mb-1';
