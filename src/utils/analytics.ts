declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
    fbq?: ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue?: unknown[][]; loaded?: boolean; version?: string; push?: unknown };
    _fbq?: Window['fbq'];
  }
}

// ---- Meta (Facebook/Instagram) Pixel -----------------------------------------------------------
// Set VITE_META_PIXEL_ID at build time to turn it on; without it every metaTrack() call is a no-op.

const META_PIXEL_ID: string | undefined = ((import.meta as any).env?.VITE_META_PIXEL_ID as string | undefined)?.trim();

/** Loads the Pixel once, after window 'load' so it never competes with first paint. Skipped in headless
 * browsers (the prerender build) so build-time page visits are not counted as real traffic. */
export function initMetaPixel() {
  if (!META_PIXEL_ID || typeof window === 'undefined' || window.fbq || navigator.webdriver) return;
  const fbq = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args); else fbq.queue!.push(args);
  } as NonNullable<Window['fbq']>;
  fbq.queue = [];
  fbq.loaded = true;
  fbq.version = '2.0';
  window.fbq = fbq;
  window._fbq = fbq;
  fbq('init', META_PIXEL_ID);
  const load = () => {
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(s);
  };
  if (document.readyState === 'complete') load(); else window.addEventListener('load', load, { once: true });
}

/** Meta standard/custom event; safe to call before the Pixel has loaded or when it is disabled. */
function metaTrack(event: string, params?: Record<string, unknown>) {
  try { window.fbq?.('track', event, params); } catch { /* analytics must never break the page */ }
}

/** GA4 page_view — the base gtag('config', 'G-...') snippet only fires this once on initial
 * script load, so this SPA (client-side routing, no full reloads) needs an explicit call per
 * navigation. Wire this into a route-change effect, not into individual pages. */
export function trackPageView(path: string) {
  window.gtag?.('event', 'page_view', { page_path: path });
  metaTrack('PageView');
}

export interface AnalyticsItem { item_id: string; item_name: string; price: number; quantity: number }

function send(name: string, params: Record<string, unknown>) {
  try { window.gtag?.('event', name, params); } catch { /* analytics must never break the page */ }
}

/** GA4 view_item: a product detail was opened. */
export function trackViewItem(item: AnalyticsItem) {
  send('view_item', { currency: 'INR', value: item.price, items: [item] });
}

/** GA4 begin_checkout: the buyer pressed pay on a non-empty cart. */
export function trackBeginCheckout(value: number, items: AnalyticsItem[]) {
  send('begin_checkout', { currency: 'INR', value, items });
}

/** GA4 download: a buyer started a paid-file download from My Orders. */
export function trackStoreDownload(orderId: number, itemName?: string) {
  send('download', { transaction_id: String(orderId), file_name: itemName, content_type: 'store_product' });
}

/** GA4 sign_up + Meta CompleteRegistration: an account was created (aspirant or employer). */
export function trackSignUp(role: 'aspirant' | 'employer') {
  send('sign_up', { method: 'email', role });
  metaTrack('CompleteRegistration', { content_name: role, status: true });
}

/** GA4 community_click + Meta Lead: a visitor tapped through to a community channel. */
export function trackCommunityClick(channel: 'whatsapp' | 'telegram' | 'instagram') {
  send('community_click', { channel });
  metaTrack('Lead', { content_name: `community_${channel}` });
}

/** GA4 purchase + Meta Purchase: a mock-test plan payment succeeded. */
export function trackPlanPurchase(value: number, planId: string | number, planName?: string) {
  const transactionId = `plan-${planId}-${Date.now()}`;
  send('purchase', { transaction_id: transactionId, value, currency: 'INR', items: [{ item_id: String(planId), item_name: planName ?? 'Plan', price: value, quantity: 1 }] });
  metaTrack('Purchase', { value, currency: 'INR', content_name: planName });
}

/** GA4 job_view: a job detail page was shown. */
export function trackJobView(jobId: string | number, title: string, organisation?: string) {
  send('job_view', { job_id: String(jobId), job_title: title, organisation });
}

/** GA4 job_apply_click / official_notification_click: outbound clicks on the job page's apply and notification links. */
export function trackJobOutbound(kind: 'apply' | 'notification', jobId: string | number, title: string) {
  send(kind === 'apply' ? 'job_apply_click' : 'official_notification_click', { job_id: String(jobId), job_title: title });
}

// One purchase per order per browser session: a remount or double-callback must not report the same revenue twice.
const reportedPurchases = new Set<string>();

/** Google Ads conversion + GA4 purchase: a paid PDF/product purchase completed (Store checkout). */
export function trackPDFPurchase(value: number, transactionId: string, items?: AnalyticsItem[]) {
  if (reportedPurchases.has(transactionId)) return;
  reportedPurchases.add(transactionId);
  if (value > 0) {
    send('purchase', { transaction_id: transactionId, value, currency: 'INR', items: items ?? [] });
    metaTrack('Purchase', { value, currency: 'INR' });
  }
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
  trackCommunityClick('whatsapp');
}

/** GA4 + Meta: user clicked to join the Telegram channel (no Google Ads conversion action exists for it). */
export function trackTelegramJoin() {
  trackCommunityClick('telegram');
}

/** Google Ads conversion: user completed an email-based signup (newsletter or job alerts). */
export function trackEmailSignup() {
  window.gtag?.('event', 'conversion', {
    send_to: 'AW-17821775814/F8XMCMj-4vkbEMbvirJC',
    value: 0.5,
    currency: 'INR',
  });
  send('generate_lead', { lead_type: 'job_alert' });
  metaTrack('Lead', { content_name: 'job_alert' });
}
