import React, { useEffect, useMemo, useState } from 'react';
import { Search, Download, Clock, CheckCircle2, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { SeoHead } from '../components/SeoHead';
import { useAuth } from '../context/AuthContext';
import { getAdmitCards, ApiAdmitCardListItem } from '../api/admitCards';
import { UpdateRow } from '../components/ui/JobRow';
import { PageHeader, Card, Chip, Pill, RowSkeleton, EmptyState, btn } from '../components/ui/kit';
import { fmtDate, daysUntil } from '../utils/dates';

type StatusFilter = '' | 'Released' | 'Upcoming';

const CARRY = [
  'Printed admit card (colour print if asked)',
  'Original photo ID — Aadhaar, PAN, voter ID or passport',
  '2 recent passport-size photos',
  'Black/blue ball-point pen',
  'Reach the centre 60 minutes early',
];

export default function AdmitCardsPage() {
  const { user } = useAuth();
  const [cards, setCards] = useState<ApiAdmitCardListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<StatusFilter>('');

  useEffect(() => {
    getAdmitCards().then(setCards).catch(() => setCards([])).finally(() => setLoading(false));
  }, []);

  const counts = useMemo(() => ({
    Released: cards.filter((c) => c.status === 'Released').length,
    Upcoming: cards.filter((c) => c.status !== 'Released').length,
  }), [cards]);

  // Released first (soonest exam first), then upcoming.
  const shown = cards
    .filter((c) => (!status || (status === 'Released' ? c.status === 'Released' : c.status !== 'Released'))
      && (!q || `${c.title} ${c.organizationName} ${c.examName ?? ''}`.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === 'Released' ? -1 : 1;
      return (daysUntil(a.examDate) ?? 999) - (daysUntil(b.examDate) ?? 999);
    });

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} />
      <SeoHead title="Admit Cards & Hall Tickets | JobCharcha" description="Download admit cards and hall tickets for GPSC, GSSSB, Police, SSC, Banking and Railway exams — with exam dates and official download links." path="/admit-cards" />

      <PageHeader
        title="Admit cards / hall tickets"
        subtitle="Download your call letter from the official site — with the exam date and what to carry."
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Admit cards' }]}
      >
        <label className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 max-w-xl focus-within:border-emerald-600 focus-within:bg-white">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search exam or department…" aria-label="Search admit cards" className="w-full bg-transparent py-2.5 text-sm outline-none" />
        </label>
        <div className="flex gap-2 mt-3">
          <Chip active={status === ''} onClick={() => setStatus('')} count={cards.length}>All</Chip>
          <Chip active={status === 'Released'} onClick={() => setStatus('Released')} count={counts.Released}>Released</Chip>
          <Chip active={status === 'Upcoming'} onClick={() => setStatus('Upcoming')} count={counts.Upcoming}>Coming soon</Chip>
        </div>
      </PageHeader>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-5 sm:py-7 grid lg:grid-cols-[1fr_320px] gap-6 items-start">
        <div className="space-y-4 min-w-0">
          {counts.Upcoming > 0 && (
            <Card className="p-4 flex items-start gap-3 bg-amber-50/70 border-amber-200">
              <Bell className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <p className="text-[13.5px] text-amber-950">
                <b>Waiting for a hall ticket?</b> Turn on free alerts and we'll email you when new admit cards are released.{' '}
                <Link to="/job-alerts" className="font-bold underline">Set alerts</Link>
              </p>
            </Card>
          )}
          <Card>
            {loading ? <RowSkeleton rows={6} /> : shown.length === 0 ? (
              <EmptyState title={cards.length ? 'No admit cards match your search' : 'No admit cards yet'} body="New hall tickets are added the day they are released." />
            ) : shown.map((c) => {
              const released = c.status === 'Released';
              const examIn = daysUntil(c.examDate);
              return (
                <UpdateRow
                  key={c.id}
                  to={`/admit-cards/${c.slug}`}
                  title={c.title}
                  org={c.organizationName}
                  meta={c.examDate ? `Exam ${fmtDate(c.examDate)}` : 'Exam date to be announced'}
                  pill={<>
                    {released ? <Pill tone="green" icon={CheckCircle2}>Released</Pill> : <Pill tone="amber" icon={Clock}>Coming soon</Pill>}
                    {examIn !== null && examIn >= 0 && examIn <= 14 && <Pill tone="red">Exam in {examIn === 0 ? 'today' : `${examIn} day${examIn === 1 ? '' : 's'}`}</Pill>}
                  </>}
                  action={released ? 'Download' : 'Details'}
                  actionIcon={released ? Download : Clock}
                  muted={!released}
                />
              );
            })}
          </Card>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20">
          <Card className="p-5">
            <p className="font-bold">On exam day, carry</p>
            <ul className="mt-2 space-y-2">
              {CARRY.map((c) => (
                <li key={c} className="flex gap-2 text-[13.5px] text-slate-700"><CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />{c}</li>
              ))}
            </ul>
            <p className="text-xs text-slate-400 mt-3">Always follow the instructions printed on your admit card.</p>
          </Card>
          <Card className="p-5">
            <p className="font-bold">Last-minute revision</p>
            <p className="text-[13px] text-slate-500 mt-1">Take a free mock test in the real exam pattern before the big day.</p>
            <Link to="/mock-tests" className={`${btn.primary} ${btn.small} mt-3`}>Start a mock test</Link>
          </Card>
        </aside>
      </main>
      <Footer />
    </div>
  );
}
