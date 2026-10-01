import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Newspaper, Loader2, Calendar, ChevronRight, Flame } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { Footer } from '../components/Footer';
import { SeoHead } from '../components/SeoHead';
import { getNews, ApiNewsListItem } from '../api/news';

export default function NewsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [posts, setPosts] = useState<ApiNewsListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getNews().then(setPosts).catch(() => setPosts([])).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} />
      <SeoHead title="Exam News & Updates | JobCharcha" description="Recruitment news and exam updates — new notifications, date extensions, pattern changes and official announcements for government job aspirants." path="/news" />

      <div className="bg-white border-b border-slate-200 py-5 sm:py-7">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <button onClick={() => navigate('/')} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 mb-3 cursor-pointer">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
          </button>
          <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-semibold mb-3">
            <Newspaper className="w-3.5 h-3.5" /> Exam News Desk
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-1">Latest Exam News & Updates</h1>
          <p className="text-[13px] sm:text-sm text-slate-500">
            {posts.length > 0 ? `${posts.length} articles` : 'Loading news…'} — recruitment notices, syllabus changes, and preparation tips.
          </p>
        </div>
      </div>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-5 sm:py-7">
        {loading ? (
          <div className="py-20 flex items-center justify-center"><Loader2 className="w-8 h-8 text-emerald-600 animate-spin" /></div>
        ) : posts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <Newspaper className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-800">No news articles published yet</h3>
            <p className="text-xs text-slate-500 mt-1">Check back soon — fresh exam news is added regularly.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <button
                key={post.id}
                onClick={() => navigate(`/news/${post.slug}`)}
                className="w-full text-left bg-white border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-emerald-300 hover:shadow-lg transition-all cursor-pointer"
              >
                <div className="space-y-1.5 max-w-3xl">
                  <div className="flex items-center gap-2 text-xs flex-wrap">
                    {post.isBreaking && (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase font-extrabold text-red-700 bg-red-100 px-2 py-0.5 rounded">
                        <Flame className="w-3 h-3" /> Breaking
                      </span>
                    )}
                    <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                      {post.categoryName}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {post.publishedDate}
                    </span>
                  </div>

                  <h3 className="font-heading font-bold text-slate-900 text-base sm:text-lg">{post.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{post.summary}</p>
                </div>

                <span className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold px-4 py-2 rounded-xl inline-flex items-center gap-1.5 self-start md:self-auto shrink-0">
                  <span>Read Article</span>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </span>
              </button>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
