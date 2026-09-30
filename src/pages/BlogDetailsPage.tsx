import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Loader2, Star, Clock3, Eye, FileText } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { Footer } from '../components/Footer';
import { getBlogPostBySlug, ApiBlogDetail } from '../api/blog';
import { SafeHtml } from '../components/SafeHtml';
import { SeoHead } from '../components/SeoHead';
import { DocumentPreview } from '../components/DocumentPreview';

export default function BlogDetailsPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState<ApiBlogDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);
    getBlogPostBySlug(slug)
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
        <Link to="/blog" className="bg-slate-900 text-white text-xs font-bold px-5 py-2.5 rounded-xl">Back to Blog</Link>
      </div>
    );
  }

  const tags = post.tags ? post.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.metaDescription || post.excerpt,
    image: post.featuredImage || undefined,
    datePublished: post.publishedDate,
    author: post.author ? { '@type': 'Person', name: post.author } : undefined,
    publisher: { '@type': 'Organization', name: 'JobCharcha' },
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <SeoHead
        title={post.metaTitle || `${post.title} - Blog | JobCharcha`}
        description={post.metaDescription || post.excerpt}
        keywords={post.metaKeywords}
        ogImage={post.featuredImage}
        path={`/blog/${post.slug}`}
        jsonLd={jsonLd}
      />
      <Navbar user={user} />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 mb-4 cursor-pointer">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>

        <article className="bg-white rounded-3xl border border-slate-200 shadow-2xs p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {post.isFeatured && (
              <span className="inline-flex items-center gap-1 text-[10px] uppercase font-extrabold text-amber-700 bg-amber-100 px-2.5 py-1 rounded">
                <Star className="w-3 h-3" /> Featured
              </span>
            )}
            <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded">
              {post.categoryName}
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-slate-900 leading-snug mb-3">{post.title}</h1>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium mb-6 pb-6 border-b border-slate-100">
            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {post.publishedDate}</span>
            {post.readTime > 0 && <span className="flex items-center gap-1"><Clock3 className="w-3.5 h-3.5" /> {post.readTime} min read</span>}
            <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {post.views.toLocaleString()} views</span>
            {post.author && <span>By {post.author}</span>}
          </div>

          {post.featuredImage && (
            <img src={post.featuredImage} alt={post.title} className="w-full rounded-2xl mb-6 object-cover max-h-96" />
          )}

          <SafeHtml html={post.content} className="text-sm text-slate-700 leading-relaxed" />

          {post.officialNotificationUrl && (
            <div className="mt-6">
              <a
                href={post.officialNotificationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:border-blue-400 text-slate-800 font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>Official Notification / Source</span>
              </a>
              <DocumentPreview url={post.officialNotificationUrl} variant="inline" className="mt-1.5" />
            </div>
          )}

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-6 pt-6 border-t border-slate-100">
              {tags.map((tag, i) => (
                <span key={i} className="bg-slate-100 text-slate-600 text-[10px] font-semibold px-2.5 py-1 rounded-full">#{tag}</span>
              ))}
            </div>
          )}
        </article>
      </main>

      <Footer />
    </div>
  );
}
