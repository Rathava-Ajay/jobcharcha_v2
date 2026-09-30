const SRC = 'https://checkout.razorpay.com/v1/checkout.js';

let promise: Promise<void> | null = null;

/**
 * Loads the Razorpay Checkout script on demand and resolves once `window.Razorpay`
 * is available. Memoised — the script is injected at most once per page. Keeping it
 * out of index.html saves ~750 KiB of render-blocking third-party JS on every page
 * that isn't a checkout.
 */
export function loadRazorpayScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if (typeof (window as unknown as { Razorpay?: unknown }).Razorpay === 'function') {
    return Promise.resolve();
  }
  if (promise) return promise;

  promise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Razorpay script failed to load')));
      return;
    }
    const script = document.createElement('script');
    script.src = SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      promise = null; // allow a retry on the next checkout attempt
      reject(new Error('Razorpay script failed to load'));
    };
    document.head.appendChild(script);
  });

  return promise;
}
