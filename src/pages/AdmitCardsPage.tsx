import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Award, Loader2, Building2, CalendarDays, Sparkles } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { Footer } from '../components/Footer';
import { SeoHead } from '../components/SeoHead';
import { getAdmitCards, ApiAdmitCardListItem } from '../api/admitCards';

export default function AdmitCardsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cards, setCards] = useState<ApiAdmitCardListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdmitCards().then(setCards).catch(() => setCards([])).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar user={user} />
      <SeoHead title="Admit Cards & Hall Tickets | JobCharcha" description="Download admit cards and hall tickets for upcoming government recruitment exams — exam dates, centre details and direct official download links." path="/admit-cards" />

      <div className="bg-slate-900 text-white py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <button onClick={() => navigate('/')} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white mb-4 cursor-pointer">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
          </button>
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full text-xs font-semibold mb-3">
            <Award className="w-3.5 h-3.5" /> Examination Intelligence
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight mb-2">Admit Cards & Hall Tickets</h1>
          <p className="text-xs sm:text-sm text-slate-300">
            {cards.length > 0 ? `${cards.length} admit card notifications` : 'Loading admit cards…'} — official download portals for released exams.
          </p>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
        {loading ? (
          <div className="py-20 flex items-center justify-center"><Loader2 className="w-8 h-8 text-indigo-600 animate-spin" /></div>
        ) : cards.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <Award className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-800">No admit cards published yet</h3>
            <p className="text-xs text-slate-500 mt-1">Check back soon — new hall tickets are added regularly.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cards.map((c) => (
              <button
                key={c.id}
                onClick={() => navigate(`/admit-cards/${c.slug}`)}
                className="text-left bg-white rounded-2xl border border-slate-200/80 p-6 hover:shadow-lg hover:border-indigo-300 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3 gap-2">
                    <span className="text-[10px] uppercase font-extrabold tracking-wider text-white bg-slate-900 px-2.5 py-1 rounded-md truncate">
                      {c.category}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${
                      c.status === 'Released' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'
                    }`}>
                      {c.status}
                    </span>
                  </div>
                  {c.isFeatured && (
                    <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded mb-2">
                      <Sparkles className="w-3 h-3" /> Featured
                    </span>
                  )}
                  <h3 className="font-heading font-bold text-slate-900 text-base leading-snug">{c.title}</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{c.organizationName}</span>
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Release Date</span>
                    <span className="font-bold text-slate-800">{c.releaseDate}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Exam Date</span>
                    <span className="font-bold text-indigo-700">{c.examDate || 'TBA'}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
