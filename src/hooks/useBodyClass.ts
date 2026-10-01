import { useEffect } from 'react';

/**
 * Adds a class to <body> while `active` is true. Used by fixed bottom bars so the page reserves
 * room for them at the very end of the document (see index.css), instead of a spacer that can
 * land above the footer.
 */
export function useBodyClass(className: string, active = true) {
  useEffect(() => {
    if (!active) return;
    document.body.classList.add(className);
    return () => document.body.classList.remove(className);
  }, [className, active]);
}
