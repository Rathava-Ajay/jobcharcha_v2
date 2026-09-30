import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  ExternalLink,
  Calendar,
  Building2,
  ChevronRight
} from 'lucide-react';
import { getGovtSchemes, ApiGovtSchemeListItem } from '../api/govtSchemes';
import { getNews, ApiNewsListItem } from '../api/news';

export const SchemesNewsSection: React.FC = () => {
  const navigate = useNavigate();
  const [activeSubTab, setActiveSubTab] = useState<'schemes' | 'news'>('schemes');
  const [schemes, setSchemes] = useState<ApiGovtSchemeListItem[]>([]);
  const [newsPosts, setNewsPosts] = useState<ApiNewsListItem[]>([]);

  useEffect(() => {
    getGovtSchemes().then((data) => setSchemes(data.slice(0, 6))).catch(() => setSchemes([]));
    getNews().then((data) => setNewsPosts(data.slice(0, 6))).catch(() => setNewsPosts([]));
  }, []);

  return (
    <section className="py-10 sm:py-12 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md mb-2">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Government Schemes & Exam News Portal</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Central & State Schemes, Youth Welfare & Exam News
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Verified information on government welfare programs, scholarship loans, salary hikes, and preparation blog posts.
            </p>
          </div>

          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 text-xs font-semibold self-start md:self-auto">
            <button
              onClick={() => setActiveSubTab('schemes')}
              className={`px-3.5 py-2 rounded-lg transition-all ${
                activeSubTab === 'schemes' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Government Schemes ({schemes.length})
            </button>
            <button
              onClick={() => setActiveSubTab('news')}
              className={`px-3.5 py-2 rounded-lg transition-all ${
                activeSubTab === 'news' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              News & Blog Articles ({newsPosts.length})
            </button>
          </div>
        </div>

        {/* Schemes Tab */}
        {activeSubTab === 'schemes' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {schemes.map((sch) => (
              <div key={sch.id} className="card-3d card-3d-indigo bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col justify-between hover:border-blue-300">
                <div>
                  <span className="text-[10px] uppercase font-bold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded">
                    {sch.category}
                  </span>
                  
                  <h3 className="font-bold text-slate-900 text-base leading-snug mt-2">{sch.title}</h3>
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

                <div className="mt-5 pt-3 border-t border-slate-200">
                  <a
                    href={sch.applyLink}
                    className="btn-3d btn-3d-dark w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2 rounded-xl inline-flex items-center justify-center gap-1.5"
                  >
                    <span>Official Portal Application</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* News & Blog Tab */}
        {activeSubTab === 'news' && (
          <div className="space-y-4">
            {newsPosts.map((post) => (
              <div key={post.id} className="card-3d bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-300">
                <div className="space-y-1.5 max-w-3xl">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                      {post.categoryName}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {post.publishedDate}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-base sm:text-lg">{post.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{post.summary}</p>
                </div>

                <button
                  onClick={() => navigate(`/news/${post.slug}`)}
                  className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 text-xs font-bold px-4 py-2 rounded-xl inline-flex items-center gap-1.5 self-start md:self-auto shrink-0 shadow-2xs cursor-pointer"
                >
                  <span>Read Article</span>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            ))}
          </div>
        )}

      </div>
    </section>
  );
};
