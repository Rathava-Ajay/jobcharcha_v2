import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Rss, Loader2, Calendar, ChevronRight, Star, Clock3 } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { Footer } from '../components/Footer';
import { SeoHead } from '../components/SeoHead';
import { getBlogPosts, ApiBlogListItem } from '../api/blog';

export default function BlogPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [posts, setPosts] = useState<ApiBlogListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBlogPosts().then(setPosts).catch(() => setPosts([])).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar user={user} />
      <SeoHead title="Blog & Career Guides | JobCharcha" description="Career guides, exam preparation strategies and job-search advice for government and private-sector aspirants." path="/blog" />

      <div className="bg-slate-900 text-white py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <button onClick={() => navigate('/')} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white mb-4 cursor-pointer">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
          </button>
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-semibold mb-3">
            <Rss className="w-3.5 h-3.5" /> Blog & Career Guides
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight mb-2">Exam Strategy & Career Guides</h1>
          <p className="text-xs sm:text-sm text-slate-300">
            {posts.length > 0 ? `${posts.length} articles` : 'Loading articles…'} — preparation guides, strategy tips, and success stories.
          </p>
        </div>
      </div>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
        {loading ? (
          <div className="py-20 flex items-center justify-center"><Loader2 className="w-8 h-8 text-emerald-600 animate-spin" /></div>
        ) : posts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <Rss className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-800">No blog posts published yet</h3>
            <p className="text-xs text-slate-500 mt-1">Check back soon — fresh career guides are added regularly.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <button
                key={post.id}
                onClick={() => navigate(`/blog/${post.slug}`)}
                className="w-full text-left bg-white border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-emerald-300 hover:shadow-lg transition-all cursor-pointer"
              >
                <div className="space-y-1.5 max-w-3xl">
                  <div className="flex items-center gap-2 text-xs flex-wrap">
                    {post.isFeatured && (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase font-extrabold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                        <Star className="w-3 h-3" /> Featured
                      </span>
                    )}
                    <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                      {post.categoryName}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {post.publishedDate}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-500 flex items-center gap-1">
                      <Clock3 className="w-3 h-3" /> {post.readTime} min read
                    </span>
                  </div>

                  <h3 className="font-heading font-bold text-slate-900 text-base sm:text-lg">{post.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{post.excerpt}</p>
                  {post.author && <p className="text-[11px] text-slate-400 font-semibold">By {post.author}</p>}
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
