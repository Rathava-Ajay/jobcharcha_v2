import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '../../utils/analytics';

/** Fires a GA4 page_view on every client-side route change — gtag's default config only
 * tracks the initial load, which would otherwise undercount this SPA's real navigation. */
export function AnalyticsPageView() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    trackPageView(pathname + search);
  }, [pathname, search]);

  return null;
}
