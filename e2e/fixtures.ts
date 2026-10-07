import { test as base, expect, type APIRequestContext } from '@playwright/test';

export const API = process.env.E2E_API_URL ?? 'http://localhost:5101';

/** Third-party noise that is not a JobCharcha defect (ad/analytics endpoints blocked in headless runs, favicon probes, etc.). */
const IGNORED = [/googletagmanager|google-analytics|doubleclick|googlesyndication|adtrafficquality|googleadservices/i, /favicon/i, /ERR_BLOCKED_BY_CLIENT/i];

export interface Evidence {
  consoleErrors: string[];
  failedRequests: string[];
  badResponses: string[];
}

/**
 * Every test gets an `evidence` collector (console errors, failed requests, 4xx/5xx responses). It is attached to the report when a
 * test fails, so a red test always carries the HTTP status / console / network evidence, next to the screenshot, trace and video.
 */
export const test = base.extend<{ evidence: Evidence }>({
  evidence: [async ({ page }, use, testInfo) => {
    const ev: Evidence = { consoleErrors: [], failedRequests: [], badResponses: [] };
    page.on('console', (m) => { if (m.type() === 'error' && !IGNORED.some((r) => r.test(m.text()))) ev.consoleErrors.push(m.text()); });
    page.on('pageerror', (e) => ev.consoleErrors.push(`pageerror: ${e.message}`));
    page.on('requestfailed', (r) => { if (!IGNORED.some((x) => x.test(r.url()))) ev.failedRequests.push(`${r.method()} ${r.url()} — ${r.failure()?.errorText}`); });
    page.on('response', (r) => { if (r.status() >= 400 && !IGNORED.some((x) => x.test(r.url()))) ev.badResponses.push(`${r.status()} ${r.request().method()} ${r.url()}`); });
    await use(ev);
    if (testInfo.status !== testInfo.expectedStatus) {
      await testInfo.attach('evidence.json', { body: JSON.stringify({ test: testInfo.title, ...ev }, null, 2), contentType: 'application/json' });
    }
  }, { auto: true }],
});

export { expect };

export async function firstJobSlug(request: APIRequestContext): Promise<string> {
  const res = await request.get(`${API}/api/jobs?pageSize=1`);
  expect(res.status(), 'GET /api/jobs').toBe(200);
  const body = await res.json();
  const slug = body.items?.[0]?.slug;
  expect(slug, 'at least one published job exists').toBeTruthy();
  return slug;
}
