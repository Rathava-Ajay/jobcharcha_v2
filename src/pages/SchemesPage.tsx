import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, Loader2, Building2, ExternalLink, Sparkles } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { Footer } from '../components/Footer';
import { SeoHead } from '../components/SeoHead';
import { getGovtSchemes, ApiGovtSchemeListItem } from '../api/govtSchemes';

export default function SchemesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [schemes, setSchemes] = useState<ApiGovtSchemeListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getGovtSchemes().then(setSchemes).catch(() => setSchemes([])).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} />
      <SeoHead title="Government Schemes | JobCharcha" description="Central and state government welfare schemes, scholarships and youth benefit programs — eligibility, benefits and how to apply." path="/schemes" />

      <div className="bg-white border-b border-slate-200 py-5 sm:py-7">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <button onClick={() => navigate('/')} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 mb-3 cursor-pointer">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
          </button>
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold mb-3">
            <BookOpen className="w-3.5 h-3.5" /> Government Schemes Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-1">Central & State Government Schemes</h1>
          <p className="text-[13px] sm:text-sm text-slate-500">
            {schemes.length > 0 ? `${schemes.length} verified schemes` : 'Loading schemes…'} — welfare programs, scholarships, and youth benefits.
          </p>
        </div>
      </div>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-5 sm:py-7">
        {loading ? (
          <div className="py-20 flex items-center justify-center"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>
        ) : schemes.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-800">No schemes published yet</h3>
            <p className="text-xs text-slate-500 mt-1">Check back soon — new government schemes are added regularly.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {schemes.map((sch) => (
              <div key={sch.id} className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between hover:border-blue-300 hover:shadow-lg transition-all">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] uppercase font-bold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded">
                      {sch.category}
                    </span>
                    {sch.isFeatured && (
                      <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded">
                        <Sparkles className="w-3 h-3" /> Featured
                      </span>
                    )}
                  </div>

                  <Link to={`/schemes/${sch.slug}`} className="font-heading font-bold text-slate-900 text-base leading-snug hover:text-blue-700">
                    {sch.title}
                  </Link>
                  <p className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" /> {sch.ministry}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-200 space-y-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Eligibility:</span>
                      <span className="text-slate-700 font-medium">{sch.eligibility}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Key Benefits:</span>
                      <span className="text-slate-800 font-semibold">{sch.benefits}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-200 flex items-center gap-2">
                  <Link
                    to={`/schemes/${sch.slug}`}
                    className="flex-1 bg-white border border-slate-200 hover:border-blue-300 text-slate-700 text-xs font-bold py-2 rounded-xl inline-flex items-center justify-center transition-colors"
                  >
                    View details
                  </Link>
                  <a
                    href={sch.applyLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2 rounded-xl inline-flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>Apply</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
