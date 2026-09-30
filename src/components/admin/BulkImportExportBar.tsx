import React, { useRef, useState } from 'react';
import { Download, Upload, Loader2 } from 'lucide-react';
import { apiFetch, downloadAuthenticatedFile, ApiError } from '../../api/client';

interface BulkImportRowError {
  rowNumber: number;
  error: string;
}

interface BulkImportResult {
  totalRows: number;
  successCount: number;
  failureCount: number;
  errors: BulkImportRowError[];
}

interface Props {
  /** Human label used in the export filename and button copy, e.g. "Jobs". */
  entityLabel: string;
  exportPath: string;
  importPath: string;
  /** Called after an import with at least one success, so the caller's list can refresh. */
  onImported?: () => void;
}

/** Shared CSV bulk import/export UI for the highest-volume CMS tabs (Jobs, Results, Admit Cards,
 * Old Papers) — every row goes through the same validation as the single-record create form,
 * since the backend's BulkImportAsync is literally CreateAsync in a loop. */
export const BulkImportExportBar: React.FC<Props> = ({ entityLabel, exportPath, importPath, onImported }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    try {
      const filename = `${entityLabel.toLowerCase().replace(/\s+/g, '-')}-export-${new Date().toISOString().slice(0, 10)}.csv`;
      await downloadAuthenticatedFile(exportPath, filename);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImporting(true);
    setError(null);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiFetch<BulkImportResult>(importPath, { method: 'POST', auth: true, isFormData: true, body: formData });
      setResult(res);
      if (res.successCount > 0) onImported?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Import failed.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-xs font-bold text-slate-700">Bulk {entityLabel} — CSV import / export</span>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="bg-white border border-slate-200 text-slate-700 font-bold text-xs px-3.5 py-2 rounded-xl cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
          >
            {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Export CSV
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="bg-slate-900 text-white font-bold text-xs px-3.5 py-2 rounded-xl cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
          >
            {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} Import CSV
          </button>
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileSelected} className="hidden" />
        </div>
      </div>

      {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-3 py-2 text-xs font-semibold">{error}</div>}

      {result && (
        <div className="bg-white border border-slate-200 rounded-xl p-3 text-xs space-y-1.5">
          <div className="font-bold text-slate-800">
            {result.successCount} of {result.totalRows} row{result.totalRows === 1 ? '' : 's'} imported
            {result.failureCount > 0 && <span className="text-red-600"> · {result.failureCount} failed</span>}
          </div>
          {result.errors.length > 0 && (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {result.errors.map((e, idx) => (
                <div key={idx} className="text-red-600">Row {e.rowNumber}: {e.error}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
