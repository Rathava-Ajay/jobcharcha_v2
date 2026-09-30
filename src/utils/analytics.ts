declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

/** GA4 page_view — the base gtag('config', 'G-...') snippet only fires this once on initial
 * script load, so this SPA (client-side routing, no full reloads) needs an explicit call per
 * navigation. Wire this into a route-change effect, not into individual pages. */
export function trackPageView(path: string) {
  window.gtag?.('event', 'page_view', { page_path: path });
}

/** Google Ads conversion: a paid PDF/product purchase completed (Store checkout). */
export function trackPDFPurchase(value: number, transactionId: string) {
  window.gtag?.('event', 'conversion', {
    send_to: 'AW-17821775814/XZ7vCMzy7_kbEMbvirJC',
    value,
    currency: 'INR',
    transaction_id: transactionId,
  });
}

/** Google Ads conversion: user clicked to join the official WhatsApp channel. */
export function trackWhatsAppJoin() {
  window.gtag?.('event', 'conversion', {
    send_to: 'AW-17821775814/HPVpCPuj7_kbEMbvirJC',
    value: 1.0,
    currency: 'INR',
  });
}

/** Google Ads conversion: user completed an email-based signup (newsletter or job alerts). */
export function trackEmailSignup() {
  window.gtag?.('event', 'conversion', {
    send_to: 'AW-17821775814/F8XMCMj-4vkbEMbvirJC',
    value: 0.5,
    currency: 'INR',
  });
}
