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
  if (value > 0) send('purchase', { transaction_id: transactionId, value, currency: 'INR', items: items ?? [] });
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
