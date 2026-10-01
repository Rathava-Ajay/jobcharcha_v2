import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Menu, X, ExternalLink } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export interface DashNavItem { id: string; label: string; icon: React.ElementType; badge?: string | number | null }
export interface DashNavGroup { title?: string; items: DashNavItem[] }

const ROLE_LABEL: Record<string, string> = {
  aspirant: 'Job seeker', employer: 'Employer', admin: 'Admin', superadmin: 'Super admin', user: 'Member',
};

const initials = (name?: string) => (name ?? '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

/**
 * App-style shell for every logged-in dashboard: a navy sidebar (logo, role, grouped navigation,
 * account card) on desktop; on phones a compact top bar whose menu opens the same navigation as
 * a drawer, plus a swipeable row of sections when there are only a few.
 */
export const DashboardLayout: React.FC<{
  groups: DashNavGroup[];
  active: string;
  onSelect: (id: string) => void;
  title?: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}> = ({ groups, active, onSelect, title, subtitle, actions, children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [drawer, setDrawer] = useState(false);
  const items = groups.flatMap((g) => g.items);
  const current = items.find((i) => i.id === active);

  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawer(false);
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [drawer]);

  const select = (id: string) => {
    onSelect(id);
    setDrawer(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  const sidebar = (
    <div className="flex flex-col h-full text-white">
      <div className="px-5 pt-5 pb-4 flex items-center justify-between gap-2">
        <Link to="/" className="bg-white rounded-xl px-2.5 py-1.5 shadow" aria-label="JobCharcha home">
          <img src="/icons/jobcharcha_logo_transparent.png" alt="JobCharcha" width={570} height={100} className="h-6 w-auto" />
        </Link>
        <button type="button" onClick={() => setDrawer(false)} aria-label="Close menu" className="lg:hidden w-9 h-9 rounded-xl bg-white/10 grid place-items-center cursor-pointer"><X className="w-5 h-5" /></button>
      </div>
      <div className="px-5">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 border border-amber-300/25 text-amber-200 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider">
          {ROLE_LABEL[user?.role ?? ''] ?? 'Dashboard'}
        </span>
      </div>

      <nav aria-label="Dashboard" className="mt-3 flex-1 overflow-y-auto px-3 pb-4 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.2)_transparent]">
        {groups.map((g, gi) => (
          <div key={g.title ?? gi} className="mt-3 first:mt-1">
            {g.title && <p className="px-3 mb-1 text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-blue-200/50">{g.title}</p>}
            <ul className="space-y-0.5">
              {g.items.map((it) => {
                const on = it.id === active;
                return (
                  <li key={it.id}>
                    <button type="button" onClick={() => select(it.id)} aria-current={on ? 'page' : undefined}
                      className={`relative w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] text-left cursor-pointer transition-colors ${on ? 'bg-white/[0.12] text-white font-bold' : 'text-blue-100/75 font-semibold hover:bg-white/[0.06] hover:text-white'}`}>
                      {on && <span aria-hidden className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-amber-400" />}
                      <it.icon className={`w-[18px] h-[18px] shrink-0 ${on ? 'text-amber-300' : ''}`} />
                      <span className="flex-1 min-w-0 truncate">{it.label}</span>
                      {it.badge !== undefined && it.badge !== null && it.badge !== '' && (
                        <span className={`shrink-0 rounded-full px-2 py-px text-[11px] font-extrabold ${on ? 'bg-amber-400 text-slate-900' : 'bg-white/10 text-blue-50'}`}>{it.badge}</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-3 rounded-2xl bg-white/[0.06] p-3">
          <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-300 to-orange-500 text-slate-900 grid place-items-center font-extrabold text-sm shrink-0">{initials(user?.name)}</span>
          <span className="flex-1 min-w-0">
            <span className="block text-[13.5px] font-bold truncate">{user?.name}</span>
            <span className="block text-[12px] text-blue-100/60 truncate">{user?.email}</span>
          </span>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Link to="/" className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] py-2 text-[12.5px] font-bold text-blue-50"><ExternalLink className="w-3.5 h-3.5" />View site</Link>
          <button type="button" onClick={handleLogout} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white/[0.06] hover:bg-red-500/80 py-2 text-[12.5px] font-bold text-blue-50 cursor-pointer"><LogOut className="w-3.5 h-3.5" />Log out</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f3f6fb] lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      <aside className="hidden lg:block sticky top-0 h-screen bg-[linear-gradient(180deg,#0b1a3f,#12285c_60%,#173273)]">{sidebar}</aside>

      {drawer && (
        <div className="lg:hidden fixed inset-0 z-[60]">
          <button type="button" aria-label="Close menu" onClick={() => setDrawer(false)} className="absolute inset-0 bg-slate-950/50 animate-[fadeIn_.15s_ease-out] cursor-default" />
          <aside className="absolute inset-y-0 left-0 w-[min(86vw,300px)] bg-[linear-gradient(180deg,#0b1a3f,#12285c_60%,#173273)] shadow-2xl animate-[drawerIn_.2s_ease-out]">{sidebar}</aside>
        </div>
      )}

      <div className="min-w-0 flex flex-col">
        <header className="sticky top-0 z-40 bg-white/85 backdrop-blur border-b border-slate-200">
          <div className="flex items-center gap-3 px-4 sm:px-6 lg:px-8 h-14 sm:h-16">
            <button type="button" onClick={() => setDrawer(true)} aria-label="Open menu" className="lg:hidden w-10 h-10 -ml-1 rounded-xl border border-slate-200 grid place-items-center text-slate-700 cursor-pointer"><Menu className="w-5 h-5" /></button>
            <div className="min-w-0 flex-1">
              <h1 className="text-[16px] sm:text-[19px] font-extrabold tracking-tight text-slate-900 truncate">{title ?? current?.label}</h1>
              {subtitle && <p className="hidden sm:block text-[12.5px] text-slate-500 truncate">{subtitle}</p>}
            </div>
            {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
            <span className="hidden sm:grid w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white place-items-center font-extrabold text-[13px] shrink-0" title={user?.name}>{initials(user?.name)}</span>
          </div>
          {items.length <= 8 && (
            <div className="lg:hidden flex gap-1.5 overflow-x-auto no-scrollbar px-4 pb-2.5">
              {items.map((it) => (
                <button key={it.id} type="button" onClick={() => select(it.id)}
                  className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-bold cursor-pointer ${it.id === active ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  <it.icon className="w-3.5 h-3.5" />{it.label}
                </button>
              ))}
            </div>
          )}
        </header>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
};

/** A KPI stat tile: icon, big value, label, optional hint. Clickable when `onClick`/`to` is given. */
export const StatTile: React.FC<{
  icon: React.ElementType;
  tone: string;
  value: React.ReactNode;
  label: string;
  hint?: React.ReactNode;
  onClick?: () => void;
}> = ({ icon: Icon, tone, value, label, hint, onClick }) => {
  const body = (
    <>
      <span className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${tone}`}><Icon className="w-5 h-5" /></span>
      <span className="min-w-0">
        <span className="block text-[24px] sm:text-[26px] leading-none font-black tracking-tight text-slate-900 tabular-nums">{value}</span>
        <span className="mt-1 block text-[12.5px] leading-tight font-bold text-slate-600 line-clamp-2 break-words">{label}</span>
        {hint && <span className="block text-[11.5px] text-slate-400 truncate">{hint}</span>}
      </span>
    </>
  );
  const cls = 'min-w-0 flex items-center gap-3 rounded-2xl bg-white border border-slate-200 p-4 text-left';
  return onClick
    ? <button type="button" onClick={onClick} className={`${cls} hover:border-blue-300 hover:shadow-[0_10px_24px_-18px_rgba(37,99,235,0.6)] transition cursor-pointer`}>{body}</button>
    : <div className={cls}>{body}</div>;
};
