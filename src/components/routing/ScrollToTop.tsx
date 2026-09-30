import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Resets scroll position on every route change, matching traditional multi-page navigation. */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    // A hash means the navigation targets an in-page section (see Navbar) —
    // let that handler own the scroll instead of jumping to the top first.
    if (hash) return;
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}
