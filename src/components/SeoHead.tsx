import { useEffect } from 'react';

interface SeoHeadProps {
  title: string;
  description?: string | null;
  keywords?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImage?: string | null;
  path: string;
  jsonLd?: object | object[] | null;
  /** Emit <meta name="robots" content="noindex,follow"> — for pages that must not be indexed (404, thin/utility pages). */
  noindex?: boolean;
}

const MANAGED_ATTR = 'data-seo-managed';

function upsertMeta(attrName: 'name' | 'property', attrValue: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attrName}="${attrValue}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrName, attrValue);
    el.setAttribute(MANAGED_ATTR, '');
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/** Shared <head> tag updater for public detail pages — meta description/keywords, canonical link,
 * Open Graph + Twitter card tags, and optional JSON-LD structured data (JobPosting/FAQPage/Article).
 * Uses direct DOM manipulation rather than react-helmet-async: React 19 auto-hoists any literal
 * <title>/<meta> JSX to <head>, which fights with Helmet's own manual head writes and left duplicate
 * tags (verified live — see the two competing <title> nodes this used to produce). Updating the
 * existing node in place (matched by name/property, same as index.html's static defaults) avoids that. */
export function SeoHead({ title, description, keywords, ogTitle, ogDescription, ogImage, path, jsonLd, noindex }: SeoHeadProps) {
  const jsonLdKey = jsonLd ? JSON.stringify(jsonLd) : '';

  useEffect(() => {
    document.title = title;

    const url = `${window.location.origin}${path}`;
    const effectiveOgDescription = ogDescription || description;

    if (description) upsertMeta('name', 'description', description);
    if (keywords) upsertMeta('name', 'keywords', keywords);
    if (noindex) upsertMeta('name', 'robots', 'noindex,follow');

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      canonical.setAttribute(MANAGED_ATTR, '');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', url);

    upsertMeta('property', 'og:title', ogTitle || title);
    if (effectiveOgDescription) upsertMeta('property', 'og:description', effectiveOgDescription);
    upsertMeta('property', 'og:url', url);
    upsertMeta('property', 'og:type', 'website');
    if (ogImage) upsertMeta('property', 'og:image', ogImage);

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', ogTitle || title);
    if (effectiveOgDescription) upsertMeta('name', 'twitter:description', effectiveOgDescription);
    if (ogImage) upsertMeta('name', 'twitter:image', ogImage);

    // Drop any managed JSON-LD already in <head> — e.g. baked in by the build-time prerender —
    // so hydration doesn't leave two identical structured-data blocks on the page.
    document.head
      .querySelectorAll(`script[type="application/ld+json"][${MANAGED_ATTR}]`)
      .forEach((el) => el.remove());

    if (jsonLdKey) {
      const parsed = JSON.parse(jsonLdKey) as object | object[];
      const blocks = Array.isArray(parsed) ? parsed : [parsed];
      blocks.forEach((block) => {
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.setAttribute(MANAGED_ATTR, '');
        script.textContent = JSON.stringify(block);
        document.head.appendChild(script);
      });
    }

    return () => {
      document.head.querySelectorAll(`[${MANAGED_ATTR}]`).forEach((el) => el.remove());
    };
  }, [title, description, keywords, ogTitle, ogDescription, ogImage, path, jsonLdKey, noindex]);

  return null;
}
