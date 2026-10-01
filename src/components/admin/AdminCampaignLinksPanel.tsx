import React, { useState, useEffect, useMemo, useCallback } from 'react';
import QRCode from 'qrcode';
import { QrCode, Copy, Check, Download, Link2 } from 'lucide-react';

function defaultCampaign(): string {
  const d = new Date();
  return `ig-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function buildUrl(base: string, path: string, params: Record<string, string | undefined>): string {
  const trimmedBase = base.replace(/\/+$/, '');
  const trimmedPath = path.startsWith('http') ? path : `/${path.replace(/^\/+/, '')}`;
  let full = path.startsWith('http') ? path : `${trimmedBase}${trimmedPath}`;
  const qs = Object.entries(params)
    .filter(([, v]) => v && v.trim())
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v!.trim())}`)
    .join('&');
  if (qs) full += (full.includes('?') ? '&' : '?') + qs;
  return full;
}

const QrCard: React.FC<{ title: string; url: string; filename: string }> = ({ title, url, filename }) => {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(url, { width: 320, margin: 1, errorCorrectionLevel: 'M' })
      .then((d) => { if (alive) setDataUrl(d); })
      .catch(() => { if (alive) setDataUrl(''); });
    return () => { alive = false; };
  }, [url]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard blocked */ }
  };

  const download = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row gap-4">
      <div className="shrink-0 self-center sm:self-start">
        {dataUrl
          ? <img src={dataUrl} alt={`QR for ${title}`} className="w-32 h-32 rounded-xl border border-slate-200 bg-white" />
          : <div className="w-32 h-32 rounded-xl border border-slate-200 bg-white animate-pulse" />}
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        <div className="text-xs font-extrabold text-slate-900">{title}</div>
        <div className="text-[11px] text-slate-500 break-all bg-white border border-slate-200 rounded-lg px-2.5 py-2 font-mono">
          {url}
        </div>
        <div className="flex gap-2">
          <button onClick={copy}
            className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 font-bold text-[11px] px-3 py-1.5 rounded-lg cursor-pointer hover:bg-slate-100">
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy link'}
          </button>
          <button onClick={download} disabled={!dataUrl}
            className="flex items-center gap-1.5 bg-slate-900 text-white font-bold text-[11px] px-3 py-1.5 rounded-lg cursor-pointer disabled:opacity-40 hover:bg-slate-800">
            <Download className="w-3.5 h-3.5" /> Download PNG
          </button>
        </div>
      </div>
    </div>
  );
};

export const AdminCampaignLinksPanel: React.FC = () => {
  const [baseUrl, setBaseUrl] = useState<string>(typeof window !== 'undefined' ? window.location.origin : '');
  const [campaign, setCampaign] = useState<string>(defaultCampaign());

  const utm = useCallback((path: string) => buildUrl(baseUrl, path, {
    utm_source: 'instagram', utm_medium: 'social', utm_campaign: campaign,
  }), [baseUrl, campaign]);

  const prebuilt = useMemo(() => [
    { title: 'Join landing (both audiences)', url: utm('/join'), filename: `jobcharcha-join-${campaign}.png` },
    { title: 'Aspirants — straight to sign up', url: utm('/join/aspirant'), filename: `jobcharcha-join-aspirant-${campaign}.png` },
    { title: 'Employers — straight to sign up', url: utm('/join/employer'), filename: `jobcharcha-join-employer-${campaign}.png` },
  ], [utm, campaign]);

  // Custom link builder
  const [customPath, setCustomPath] = useState('/jobs');
  const [cSource, setCSource] = useState('instagram');
  const [cMedium, setCMedium] = useState('social');
  const [cCampaign, setCCampaign] = useState('');
  const customUrl = buildUrl(baseUrl, customPath, {
    utm_source: cSource, utm_medium: cMedium, utm_campaign: cCampaign || campaign,
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 space-y-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-center gap-2">
        <QrCode className="w-5 h-5 text-indigo-600" />
        <h2 className="text-[19px] font-extrabold tracking-tight text-slate-900">Campaign Links / QR</h2>
      </div>
      <p className="text-xs text-slate-500 -mt-3">
        Share these links or QR codes on Instagram. Every scan is tagged so new signups show up by
        source in <span className="font-semibold">Activity Audit</span>.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="text-xs font-bold text-slate-600 space-y-1 block">
          Site URL
          <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://jobcharcha.com"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-500" />
        </label>
        <label className="text-xs font-bold text-slate-600 space-y-1 block">
          Campaign name (utm_campaign)
          <input value={campaign} onChange={(e) => setCampaign(e.target.value)}
            placeholder="ig-2026-10"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-500" />
        </label>
      </div>

      <div className="space-y-3">
        {prebuilt.map((row) => <QrCard key={row.title} {...row} />)}
      </div>

      <div className="pt-4 border-t border-slate-100 space-y-3">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-extrabold text-slate-900">Custom link</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <input value={customPath} onChange={(e) => setCustomPath(e.target.value)} placeholder="/jobs or full URL"
            className="bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-[13px] font-medium outline-none hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" />
          <input value={cSource} onChange={(e) => setCSource(e.target.value)} placeholder="utm_source"
            className="bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-[13px] font-medium outline-none hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" />
          <input value={cMedium} onChange={(e) => setCMedium(e.target.value)} placeholder="utm_medium"
            className="bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-[13px] font-medium outline-none hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" />
          <input value={cCampaign} onChange={(e) => setCCampaign(e.target.value)} placeholder={`utm_campaign (${campaign})`}
            className="bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-[13px] font-medium outline-none hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" />
        </div>
        <QrCard title="Custom link" url={customUrl} filename={`jobcharcha-custom-${cCampaign || campaign}.png`} />
      </div>
    </div>
  );
};
