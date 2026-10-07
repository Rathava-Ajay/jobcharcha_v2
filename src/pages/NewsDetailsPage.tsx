import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Loader2, Flame, ExternalLink, Eye } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { Footer } from '../components/Footer';
import { getNewsBySlug, ApiNewsDetail } from '../api/news';
import { SafeHtml } from '../components/SafeHtml';
import { SeoHead } from '../components/SeoHead';
import { DocumentPreview } from '../components/DocumentPreview';

export default function NewsDetailsPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState<ApiNewsDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);
    getNewsBySlug(slug)
      .then(setPost)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 text-emerald-600 animate-spin" /></div>;
  }

  if (notFound || !post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <h1 className="text-2xl font-heading font-extrabold text-slate-900">Article not found</h1>
        <Link to="/news" className="bg-slate-900 text-white text-xs font-bold px-5 py-2.5 rounded-xl">Back to News</Link>
      </div>
    );
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: post.title,
    description: post.metaDescription || post.summary,
    image: post.featuredImage || undefined,
    datePublished: post.publishedDate,
    publisher: { '@type': 'Organization', name: 'JobCharcha' },
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SeoHead
        title={post.metaTitle || `${post.title} - News | JobCharcha`}
        description={post.metaDescription || post.summary}
        keywords={post.metaKeywords}
        ogImage={post.featuredImage}
        path={`/news/${post.slug}`}
        jsonLd={jsonLd}
      />
      <Navbar user={user} />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 mb-4 cursor-pointer">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>

        <article className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {post.isBreaking && (
              <span className="inline-flex items-center gap-1 text-[10px] uppercase font-extrabold text-red-700 bg-red-100 px-2.5 py-1 rounded">
                <Flame className="w-3 h-3" /> Breaking
              </span>
            )}
            <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded">
              {post.categoryName}
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-slate-900 leading-snug mb-3">{post.title}</h1>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium mb-6 pb-6 border-b border-slate-100">
            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {post.publishedDate}</span>
            <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {post.views.toLocaleString()} views</span>
            {post.source && <span>Source: {post.source}</span>}
          </div>

          {post.featuredImage && (
            <img src={post.featuredImage} alt={post.title} className="w-full rounded-2xl mb-6 object-cover max-h-96" />
          )}

          <SafeHtml html={post.content} className="text-sm text-slate-700 leading-relaxed" />

          {post.sourceLink && (
            <div className="mt-6">
              <a
                href={post.sourceLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800"
              >
                View Original Source <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <DocumentPreview url={post.sourceLink} variant="inline" className="mt-1.5" />
            </div>
          )}
        </article>
      </main>

      <Footer />
    </div>
  );
}
