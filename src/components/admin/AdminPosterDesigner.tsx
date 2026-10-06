import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, GripVertical, ImageIcon, Loader2, RotateCcw, Save, Wand2 } from 'lucide-react';
import { ApiError } from '../../api/client';
import {
  ApiPosterDataPoint, ApiPosterTemplate, getDefaultPosterHtml, getPosterTemplates, renderPosterTemplate, resetPosterTemplate, savePosterTemplate,
} from '../../api/socialShare';

const btn = 'inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-xl font-bold text-[13px] cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed';
const btnPrimary = `${btn} bg-gradient-to-r from-blue-700 to-indigo-600 hover:from-blue-800 hover:to-indigo-700 text-white`;
const btnGhost = `${btn} bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-700 text-slate-700`;

const errText = (err: unknown, fallback: string) => (err instanceof ApiError ? err.message : fallback);
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const RAW = new Set(['cards', 'watermark', 'logo']);

/** Same {{token}} / {{#token}}…{{/token}} / {{^token}}…{{/token}} rules as the server, so the live preview matches the real poster. */
function fillTemplate(html: string, values: Record<string, string>): string {
  const get = (k: string) => values[k.toLowerCase()] ?? '';
  let out = html;
  for (let pass = 0; pass < 3; pass++) {
    const next = out.replace(/\{\{([#^])\s*(\w+)\s*\}\}([\s\S]*?)\{\{\/\s*\2\s*\}\}/g, (_m, kind: string, key: string, body: string) =>
      (kind === '#') === (get(key).length > 0) ? body : '');
    if (next === out) break;
    out = next;
  }
  return out.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, key: string) => (RAW.has(key.toLowerCase()) ? get(key) : esc(get(key))));
}

const CARD_SAMPLES: [string, string][] = [
  ['Vacancies', '6843'], ['Post', 'Junior Clerk, Multipurpose Health Worker'], ['Qualification', 'Graduate in any stream with CCC computer certificate'],
  ['Age limit', '18 - 35 years'], ['Salary', 'Rs 19,900 - 63,200 (Level 2)'], ['Location', 'Gujarat (All districts)'],
];

/** Moves blocks the admin dropped on the preview: they carry data-dp="id" and can be dragged around inside the preview. */
const PREVIEW_SCRIPT = `<script>(function(){var d=null;
document.addEventListener('mousedown',function(e){var el=e.target.closest&&e.target.closest('[data-dp]');if(!el)return;
d={el:el,sx:e.clientX,sy:e.clientY,l:el.offsetLeft,t:el.offsetTop};e.preventDefault();});
document.addEventListener('mousemove',function(e){if(!d)return;d.el.style.left=Math.round(d.l+e.clientX-d.sx)+'px';d.el.style.top=Math.round(d.t+e.clientY-d.sy)+'px';});
document.addEventListener('mouseup',function(){if(!d)return;parent.postMessage({poster:1,id:d.el.getAttribute('data-dp'),left:parseInt(d.el.style.left,10),top:parseInt(d.el.style.top,10)},'*');d=null;});
})();</script><style>[data-dp]{cursor:move;outline:2px dashed rgba(37,99,235,.55);outline-offset:2px}</style>`;

/** Rewrites left/top of the element carrying data-dp="id" inside the template source. */
function moveBlock(html: string, id: string, left: number, top: number): string {
  const re = new RegExp(`(<[^>]*data-dp="${id}"[^>]*?style=")([^"]*)(")`);
  return html.replace(re, (_m, a: string, style: string, c: string) => {
    const rest = style.split(';').map((s) => s.trim()).filter((s) => s && !/^(left|top)\s*:/i.test(s));
    return `${a}position:absolute;left:${left}px;top:${top}px;${rest.filter((s) => !/^position\s*:/i.test(s)).join(';')}${c}`;
  });
}

function blockFor(token: string, id: string, x: number, y: number): string {
  const pos = `position:absolute;left:${x}px;top:${y}px;`;
  if (token === 'logo' || token === 'watermark')
    return `\n<img data-dp="${id}" src="{{${token}}}" alt="" style="${pos}width:200px">`;
  return `\n<div data-dp="${id}" style="${pos}font-size:38px;font-weight:700;color:#0F2E66;max-width:700px">{{${token}}}</div>`;
}

export const AdminPosterDesigner: React.FC = () => {
  const [templates, setTemplates] = useState<ApiPosterTemplate[]>([]);
  const [points, setPoints] = useState<ApiPosterDataPoint[]>([]);
  const [browserPath, setBrowserPath] = useState<string | null | undefined>(undefined);
  const [slot, setSlot] = useState(0);
  const [html, setHtml] = useState('');
  const [saved, setSaved] = useState('');
  const [size, setSize] = useState<'portrait' | 'square'>('portrait');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [serverImg, setServerImg] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [previewDoc, setPreviewDoc] = useState('');
  const [boxW, setBoxW] = useState(520);

  const area = useRef<HTMLTextAreaElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const counter = useRef(1);

  const height = size === 'portrait' ? 1350 : 1080;
  const scale = Math.min(1, boxW / 1080);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getPosterTemplates();
      setTemplates(r.templates); setPoints(r.dataPoints); setBrowserPath(r.browserPath ?? null);
      const t = r.templates[slot] ?? r.templates[0];
      setHtml(t.html); setSaved(t.html);
    } catch (e) { setMsg({ ok: false, text: errText(e, 'Could not load the templates.') }); }
    finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!box.current) return;
    const ro = new ResizeObserver(() => setBoxW(box.current?.clientWidth ?? 520));
    ro.observe(box.current);
    return () => ro.disconnect();
  }, [loading]);

  // Live preview, rebuilt shortly after each edit.
  const values = useMemo(() => {
    const v: Record<string, string> = {};
    points.forEach((p) => { v[p.token.toLowerCase()] = p.sample; });
    v.height = String(height);
    v.watermark = `${window.location.origin}/icons/jobcharcha_logo_transparent.png`;
    v.logo = '';
    v.cards = CARD_SAMPLES.slice(0, size === 'portrait' ? 6 : 4)
      .map(([l, val]) => `<div class="card"><div class="card-h">${esc(l.toUpperCase())}</div><div class="card-v">${esc(val)}</div></div>`).join('');
    return v;
  }, [points, height, size]);

  useEffect(() => {
    const t = setTimeout(() => {
      const body = fillTemplate(html, values);
      setPreviewDoc(/<\/body>/i.test(body) ? body.replace(/<\/body>/i, `${PREVIEW_SCRIPT}</body>`) : body + PREVIEW_SCRIPT);
    }, 250);
    return () => clearTimeout(t);
  }, [html, values]);

  // The preview reports blocks the admin moved with the mouse.
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d = e.data;
      if (d && d.poster === 1 && typeof d.id === 'string') setHtml((h) => moveBlock(h, d.id, d.left, d.top));
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const pick = (i: number) => {
    if (i === slot) return;
    if (html !== saved && !window.confirm('Discard the unsaved changes to this template?')) return;
    const t = templates[i];
    setSlot(i); setHtml(t.html); setSaved(t.html); setMsg(null); setServerImg(null);
  };

  const insertAtCaret = (token: string) => {
    const el = area.current;
    const text = `{{${token}}}`;
    if (!el) { setHtml((h) => h + text); return; }
    const s = el.selectionStart ?? html.length; const e = el.selectionEnd ?? s;
    setHtml(html.slice(0, s) + text + html.slice(e));
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + text.length, s + text.length); });
  };

  const dropOnPreview = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const token = e.dataTransfer.getData('text/plain');
    if (!token || !box.current) return;
    const r = box.current.getBoundingClientRect();
    const x = Math.max(0, Math.round((e.clientX - r.left) / scale)); const y = Math.max(0, Math.round((e.clientY - r.top) / scale));
    const id = `dp${Date.now().toString(36)}${counter.current++}`;
    const block = blockFor(token, id, x, y);
    setHtml((h) => (/<\/body>/i.test(h) ? h.replace(/<\/body>/i, `${block}\n</body>`) : h + block));
  };

  const dropOnCode = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const token = e.dataTransfer.getData('text/plain');
    if (token) insertAtCaret(token);
  };

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label); setMsg(null);
    try { await fn(); } catch (e) { setMsg({ ok: false, text: errText(e, 'Something went wrong.') }); } finally { setBusy(null); }
  };

  const save = () => run('save', async () => {
    await savePosterTemplate(slot, html);
    setSaved(html);
    setTemplates((ts) => ts.map((t) => (t.slot === slot ? { ...t, html, custom: true } : t)));
    setMsg({ ok: true, text: 'Saved. New shares that use this template will be drawn from your HTML.' });
  });

  const reset = () => run('reset', async () => {
    if (!window.confirm('Go back to the built-in poster for this template? Your HTML will be removed.')) return;
    await resetPosterTemplate(slot);
    const d = await getDefaultPosterHtml(slot);
    setHtml(d.html); setSaved(d.html);
    setTemplates((ts) => ts.map((t) => (t.slot === slot ? { ...t, html: d.html, custom: false } : t)));
    setMsg({ ok: true, text: 'This template uses the built-in poster again.' });
  });

  const loadDefault = () => run('default', async () => {
    const d = await getDefaultPosterHtml(slot);
    setHtml(d.html); setMsg({ ok: true, text: 'Built-in design loaded as HTML. Edit it, then Save.' });
  });

  const renderOnServer = () => run('render', async () => {
    const url = await renderPosterTemplate(html, slot, size);
    setServerImg((old) => { if (old) URL.revokeObjectURL(old); return url; });
  });

  if (loading) return <div className="py-10 grid place-items-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  const tpl = templates[slot];
  const dirty = html !== saved;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-1.5">
        <h3 className="text-[16px] font-extrabold text-slate-900">Poster designer</h3>
        <p className="text-[13px] text-slate-500 font-medium">
          Each share uses one of six templates in rotation. Edit the HTML/CSS, or <b>drag a data point</b> from the list onto the preview (it becomes a movable block) or into the code.
          Blocks you drop on the preview can be dragged to a new position. Until you save your own HTML, a template keeps the built-in poster.
        </p>
        {browserPath === null && (
          <p className="flex items-start gap-2 text-[13px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            This server has no Chrome/Chromium, so saved HTML templates cannot be drawn yet and the built-in poster is used instead. On Ubuntu run:
            <code className="font-mono">sudo apt install -y chromium-browser fonts-noto-core</code>, then restart the API.
          </p>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Template">
        {templates.map((t) => (
          <button key={t.slot} type="button" role="tab" aria-selected={slot === t.slot} onClick={() => pick(t.slot)}
            className={`shrink-0 min-h-[44px] px-4 rounded-xl text-[13px] font-extrabold cursor-pointer border ${slot === t.slot ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}>
            {t.slot + 1}. {t.name}{t.custom && <span className="ml-1.5 text-emerald-500">●</span>}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4">
        {/* Left: data points + code */}
        <div className="space-y-3 min-w-0">
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
            <div className="text-[12px] font-bold text-slate-600 mb-2">Data points — drag onto the preview or the code (or click to insert at the cursor)</div>
            <div className="flex flex-wrap gap-1.5">
              {points.map((p) => (
                <button key={p.token} type="button" draggable title={`${p.label}\nExample: ${p.sample || '(generated)'}`}
                  onDragStart={(e) => { e.dataTransfer.setData('text/plain', p.token); e.dataTransfer.effectAllowed = 'copy'; setDragging(true); }}
                  onDragEnd={() => setDragging(false)} onClick={() => insertAtCaret(p.token)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-800 text-[12px] font-bold cursor-grab active:cursor-grabbing hover:bg-blue-100">
                  <GripVertical className="w-3 h-3 opacity-60" />{p.token}
                </button>
              ))}
            </div>
            <p className="text-[11.5px] text-slate-500 font-medium mt-2">
              Show a block only when a value exists: <code className="font-mono">{'{{#age}}…{{age}}…{{/age}}'}</code>. Scripts, iframes and links to other sites are not allowed; images must be <code className="font-mono">https://</code> or <code className="font-mono">data:</code>.
            </p>
          </div>

          <textarea ref={area} value={html} onChange={(e) => setHtml(e.target.value)} spellCheck={false} aria-label="Template HTML"
            onDragOver={(e) => e.preventDefault()} onDrop={dropOnCode}
            className="w-full h-[460px] bg-slate-950 text-slate-100 rounded-2xl p-4 font-mono text-[12.5px] leading-relaxed outline-none focus:ring-4 focus:ring-blue-600/20 resize-y" />
        </div>

        {/* Right: preview */}
        <div className="space-y-3 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-slate-200 bg-white overflow-hidden">
              {(['portrait', 'square'] as const).map((s) => (
                <button key={s} type="button" onClick={() => setSize(s)}
                  className={`px-3.5 min-h-[40px] text-[12.5px] font-bold cursor-pointer ${size === s ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                  {s === 'portrait' ? 'Portrait 4:5' : 'Square 1:1'}
                </button>
              ))}
            </div>
            <span className="text-[12px] font-semibold text-slate-500">Live preview (sample data)</span>
          </div>

          <div ref={box} className="relative w-full rounded-2xl border border-slate-200 bg-slate-100 overflow-hidden" style={{ height: height * scale }}>
            <iframe title="Poster preview" srcDoc={previewDoc} sandbox="allow-scripts"
              style={{ width: 1080, height, border: 0, transform: `scale(${scale})`, transformOrigin: 'top left', background: '#fff' }} />
            {dragging && (
              <div onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }} onDrop={dropOnPreview}
                className="absolute inset-0 bg-blue-600/10 border-2 border-dashed border-blue-500 grid place-items-center text-blue-800 text-[13px] font-extrabold">
                Drop here to place it
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" className={btnPrimary} disabled={!dirty || busy !== null} onClick={save}>
              {busy === 'save' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Save template {slot + 1}
            </button>
            <button type="button" className={btnGhost} disabled={busy !== null || !browserPath} onClick={renderOnServer} title={browserPath ? undefined : 'No Chrome on this server'}>
              {busy === 'render' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}Test on server
            </button>
            <button type="button" className={btnGhost} disabled={busy !== null} onClick={loadDefault}><Wand2 className="w-4 h-4" />Load built-in design</button>
            {tpl?.custom && <button type="button" className={btnGhost} disabled={busy !== null} onClick={reset}><RotateCcw className="w-4 h-4" />Use built-in poster</button>}
          </div>

          {msg && (
            <p className={`flex items-start gap-2 text-[13px] font-semibold ${msg.ok ? 'text-emerald-700' : 'text-rose-600'}`}>
              {msg.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}{msg.text}
            </p>
          )}

          {serverImg && (
            <div className="space-y-1.5">
              <div className="text-[12px] font-bold text-slate-600">Exactly how the server draws it (what Instagram and Telegram receive)</div>
              <a href={serverImg} target="_blank" rel="noreferrer"><img src={serverImg} alt="Server render" className="w-full max-w-[420px] rounded-xl border border-slate-200" /></a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
