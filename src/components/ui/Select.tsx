import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search, X } from 'lucide-react';

/**
 * Drop-in replacement for a native <select> with a designed popup menu.
 *
 * It takes the same props as the native element — `value`, `onChange(e)` reading `e.target.value`,
 * `className`, `disabled`, `required`, `aria-label` and `<option>` children — so call sites only
 * swap the tag. The menu renders in a portal (never clipped by cards or modals), flips upward
 * near the bottom of the screen, becomes a bottom sheet on phones, supports the keyboard
 * (arrows, Home/End, Enter, Escape, type-ahead) and adds a search box for long lists.
 */

interface Opt { value: string; label: string; disabled: boolean }

export interface SelectChangeEvent { target: { value: string }; currentTarget: { value: string } }

export interface SelectProps {
  value?: string | number | null;
  onChange?: (e: SelectChangeEvent) => void;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  name?: string;
  title?: string;
  placeholder?: string;
  /** Menu width never goes below this (px); the trigger can be narrower, e.g. a compact filter. */
  menuMinWidth?: number;
  'aria-label'?: string;
  children?: React.ReactNode;
}

const textOf = (node: React.ReactNode): string => {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) return textOf(node.props.children);
  return '';
};

function collectOptions(children: React.ReactNode, out: Opt[] = []): Opt[] {
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement<{ children?: React.ReactNode; value?: string | number; disabled?: boolean }>(child)) return;
    if (child.type === React.Fragment || child.type === 'optgroup') { collectOptions(child.props.children, out); return; }
    if (child.type !== 'option') return;
    const label = textOf(child.props.children);
    out.push({ value: child.props.value !== undefined ? String(child.props.value) : label, label, disabled: !!child.props.disabled });
  });
  return out;
}

/** Best-effort field name for the mobile sheet title: the wrapping/linked <label> or the label just above. */
function guessLabel(btn: HTMLElement | null): string {
  if (!btn) return '';
  const clean = (t?: string | null) => (t ?? '').replace(/\s+/g, ' ').replace(btn.textContent ?? '', '').replace(/[*:]/g, '').trim();
  const linked = btn.id ? document.querySelector(`label[for="${CSS.escape(btn.id)}"]`) : null;
  const wrap = btn.closest('label');
  let text = clean(linked?.textContent) || clean(wrap?.textContent);
  if (!text) {
    const prev = btn.parentElement?.previousElementSibling;
    if (prev && /^(LABEL|SPAN|P|H\d)$/.test(prev.tagName)) text = clean(prev.textContent);
  }
  return text.length > 0 && text.length <= 48 ? text : '';
}

const SEARCH_THRESHOLD = 10;
const MENU_MAX_H = 320;

export const Select: React.FC<SelectProps> = ({
  value, onChange, className, disabled, required, id, name, title, placeholder, menuMinWidth = 200, children, ...rest
}) => {
  const options = useMemo(() => collectOptions(children), [children]);
  const current = value === null || value === undefined ? '' : String(value);
  const selected = options.find((o) => o.value === current);
  const isPlaceholder = !selected ? true : selected.value === '' && /^(select|choose|none|no |—|-)/i.test(selected.label);
  const display = selected?.label || placeholder || options[0]?.label || 'Select…';

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(-1);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [sheet, setSheet] = useState(false);
  const [sheetTitle, setSheetTitle] = useState('');
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const typeahead = useRef({ text: '', at: 0 });
  const listId = useId();
  const searchable = options.length > SEARCH_THRESHOLD;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const close = useCallback((refocus = true) => {
    setOpen(false);
    setQuery('');
    if (refocus) btnRef.current?.focus();
  }, []);

  const openMenu = () => {
    if (disabled) return;
    setSheet(window.matchMedia('(max-width: 639px)').matches);
    setSheetTitle(rest['aria-label'] || title || guessLabel(btnRef.current) || placeholder || 'Choose an option');
    setRect(btnRef.current?.getBoundingClientRect() ?? null);
    setActive(Math.max(0, options.findIndex((o) => o.value === current)));
    setOpen(true);
  };

  const choose = (o: Opt) => {
    if (o.disabled) return;
    if (o.value !== current) onChange?.({ target: { value: o.value }, currentTarget: { value: o.value } });
    close();
  };

  // Keep the menu glued to the trigger while the page scrolls or resizes.
  useLayoutEffect(() => {
    if (!open || sheet) return;
    const update = () => setRect(btnRef.current?.getBoundingClientRect() ?? null);
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => { window.removeEventListener('scroll', update, true); window.removeEventListener('resize', update); };
  }, [open, sheet]);

  // Outside click closes; focus moves into the menu when it opens.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !btnRef.current?.contains(t)) close(false);
    };
    document.addEventListener('pointerdown', onDown);
    (searchable ? searchRef.current : listRef.current)?.focus({ preventScroll: true });
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open, searchable, close]);

  // Bottom sheet: stop the page behind it from scrolling.
  useEffect(() => {
    if (!open || !sheet) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open, sheet]);

  useEffect(() => {
    if (!open || active < 0) return;
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  useEffect(() => { if (open) setActive(visible.findIndex((o) => !o.disabled)); }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  const move = (dir: 1 | -1, from = active) => {
    for (let i = from + dir, n = 0; n < visible.length; i += dir, n++) {
      const idx = (i + visible.length) % visible.length;
      if (!visible[idx].disabled) { setActive(idx); return; }
    }
  };

  const onMenuKey = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); move(1); break;
      case 'ArrowUp': e.preventDefault(); move(-1); break;
      case 'Home': if (!searchable) { e.preventDefault(); move(1, -1); } break;
      case 'End': if (!searchable) { e.preventDefault(); move(-1, visible.length); } break;
      case 'Enter': e.preventDefault(); if (visible[active]) choose(visible[active]); break;
      case 'Escape': e.preventDefault(); close(); break;
      case 'Tab': close(false); break;
      default:
        if (!searchable && e.key.length === 1) {
          const now = Date.now();
          const ta = typeahead.current;
          ta.text = (now - ta.at > 700 ? '' : ta.text) + e.key.toLowerCase();
          ta.at = now;
          const idx = visible.findIndex((o) => !o.disabled && o.label.toLowerCase().startsWith(ta.text));
          if (idx >= 0) setActive(idx);
        }
    }
  };

  const onTriggerKey = (e: React.KeyboardEvent) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); openMenu(); }
  };

  // Desktop popover placement: below the trigger, flipped above when there is no room.
  let pop: React.CSSProperties = {};
  if (open && !sheet && rect) {
    const vw = window.innerWidth, vh = window.innerHeight;
    const width = Math.min(Math.max(rect.width, menuMinWidth), vw - 16);
    const left = Math.min(Math.max(8, rect.left), vw - width - 8);
    const below = vh - rect.bottom - 10, above = rect.top - 10;
    const want = Math.min(MENU_MAX_H, visible.length * 40 + (searchable ? 56 : 12));
    const up = below < want && above > below;
    pop = up
      ? { position: 'fixed', left, width, bottom: vh - rect.top + 6, maxHeight: Math.min(MENU_MAX_H, above) }
      : { position: 'fixed', left, width, top: rect.bottom + 6, maxHeight: Math.min(MENU_MAX_H, below) };
  }

  const menu = open && (
    <>
      {sheet && <div className="fixed inset-0 z-[80] bg-slate-950/45 animate-[fadeIn_.15s_ease-out]" aria-hidden />}
      <div
        ref={menuRef}
        onKeyDown={onMenuKey}
        style={sheet ? undefined : pop}
        className={sheet
          ? 'fixed inset-x-0 bottom-0 z-[81] max-h-[75vh] flex flex-col bg-white rounded-t-3xl shadow-[0_-20px_50px_-20px_rgba(15,23,42,0.5)] pb-[max(12px,env(safe-area-inset-bottom))] animate-[sheetUp_.2s_ease-out]'
          : 'z-[81] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-[0_24px_48px_-18px_rgba(15,23,42,0.35)] overflow-hidden animate-[popIn_.12s_ease-out]'}
      >
        {sheet && (
          <div className="flex items-center gap-3 px-5 pt-3 pb-2">
            <span className="absolute left-1/2 -translate-x-1/2 top-2 w-10 h-1 rounded-full bg-slate-200" aria-hidden />
            <p className="flex-1 min-w-0 pt-2 font-extrabold text-[16px] text-slate-900 truncate">{sheetTitle}</p>
            <button type="button" onClick={() => close()} aria-label="Close" className="mt-2 w-9 h-9 rounded-full bg-slate-100 grid place-items-center text-slate-600 cursor-pointer"><X className="w-4 h-4" /></button>
          </div>
        )}
        {searchable && (
          <div className={sheet ? 'px-4 pb-2' : 'p-2 border-b border-slate-100'}>
            <label className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 px-3 focus-within:border-blue-500 focus-within:bg-white">
              <Search className="w-4 h-4 shrink-0 text-slate-400" />
              <input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search…" aria-label="Search options"
                aria-controls={listId} aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
                className="w-full min-w-0 bg-transparent py-2 text-sm outline-none text-slate-900 placeholder:text-slate-400" />
            </label>
          </div>
        )}
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          className={`flex-1 overflow-y-auto overscroll-contain outline-none ${sheet ? 'px-3' : 'p-1.5'}`}
        >
          {visible.length === 0 && <li className="px-3 py-6 text-center text-sm text-slate-400">No matches</li>}
          {visible.map((o, i) => {
            const isSel = o.value === current;
            return (
              <li
                key={`${o.value}-${i}`}
                id={`${listId}-${i}`}
                data-idx={i}
                role="option"
                aria-selected={isSel}
                aria-disabled={o.disabled || undefined}
                onMouseMove={() => !o.disabled && active !== i && setActive(i)}
                onClick={() => choose(o)}
                className={[
                  'flex items-center gap-2.5 rounded-xl px-3 text-left select-none',
                  sheet ? 'py-3 text-[15px]' : 'py-2 text-[13.5px]',
                  o.disabled ? 'text-slate-400 cursor-default' : 'cursor-pointer',
                  !o.disabled && i === active ? 'bg-blue-50' : '',
                  isSel ? 'font-bold text-blue-700' : o.disabled ? '' : 'font-medium text-slate-800',
                ].join(' ')}
              >
                <span className="flex-1 min-w-0 break-words">{o.label || '—'}</span>
                {isSel && <Check className="w-4 h-4 shrink-0 text-blue-600" />}
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );

  return (
    <span className="relative inline-flex max-w-full align-middle min-w-0 [&:has(>button.w-full)]:flex [&:has(>button.w-full)]:w-full">
      <button
        ref={btnRef}
        type="button"
        id={id}
        title={title}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={rest['aria-label']}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={onTriggerKey}
        className={[
          'inline-flex items-center justify-between gap-2 min-w-0 max-w-full text-left cursor-pointer outline-none',
          'focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60',
          open && /(^|\s)border(\s|$)/.test(className ?? 'border') ? 'border-blue-500 ring-2 ring-blue-500/20' : '',
          className ?? 'bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-800',
        ].join(' ')}
      >
        <span className={`truncate ${isPlaceholder ? 'text-slate-400 font-normal' : ''}`}>{display}</span>
        <ChevronDown className={`w-4 h-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180 text-blue-600' : ''}`} />
      </button>
      {/* Keeps native form validation (`required`) and form posts working. */}
      <input tabIndex={-1} aria-hidden name={name} required={required} value={current} onChange={() => {}}
        className="absolute bottom-0 left-1/2 w-px h-px opacity-0 pointer-events-none" />
      {menu && createPortal(menu, document.body)}
    </span>
  );
};
