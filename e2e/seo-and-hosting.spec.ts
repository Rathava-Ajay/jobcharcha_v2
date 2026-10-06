import { API, expect, test } from './fixtures';

/**
 * Sitemap / robots / host canonicalisation. Run against production to verify the nginx fixes in deploy/nginx-jobcharcha.conf.example:
 *   E2E_BASE_URL=https://jobcharcha.com E2E_API_URL=https://jobcharcha.com npx playwright test seo-and-hosting
 */
test.describe('sitemap, robots and security headers', () => {
  test('the API sitemap is valid XML with job URLs on the public host', async ({ request }) => {
    const res = await request.get(`${API}/sitemap.xml`);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toMatch(/xml/);
    const xml = await res.text();
    expect(xml.startsWith('<?xml')).toBe(true);
    expect((xml.match(/<loc>/g) ?? []).length).toBeGreaterThan(10);
    expect(xml).toMatch(/<loc>[^<]+\/jobs\/[^<]+<\/loc>/);
  });

  test('the sitemap the website itself serves at /sitemap.xml is XML, not the SPA shell', async ({ request, baseURL }) => {
    // Fails on the live site until nginx proxies /sitemap.xml to the API (deploy/nginx-jobcharcha.conf.example). On local dev there is no proxy.
    test.skip(!!baseURL && /localhost|127\.0\.0\.1/.test(baseURL), 'local dev server has no nginx proxy');
    const res = await request.get(`${baseURL}/sitemap.xml`);
    expect(res.headers()['content-type'], `/sitemap.xml content-type (${res.status()})`).toMatch(/xml/);
    expect((await res.text()).startsWith('<?xml')).toBe(true);
  });

  test('robots.txt blocks admin/dashboard areas and declares the sitemap', async ({ request, baseURL }) => {
    const txt = await (await request.get(`${baseURL}/robots.txt`)).text();
    expect(txt).toMatch(/Disallow:\s*\/admin\//);
    expect(txt).toMatch(/Disallow:\s*\/dashboard\//);
    expect(txt).toMatch(/Sitemap:\s*https:\/\/jobcharcha\.com\/sitemap\.xml/);
  });

  test('API responses carry baseline security headers', async ({ request }) => {
    const h = (await request.get(`${API}/api/jobs?pageSize=1`)).headers();
    expect(h['x-content-type-options']).toBe('nosniff');
    expect(h['referrer-policy']).toBeTruthy();
    expect(h['x-frame-options']).toBeTruthy();
  });

  test('production only: HTML has HSTS/nosniff/frame headers and www redirects to the bare domain', async ({ request, baseURL }) => {
    test.skip(!baseURL || /localhost|127\.0\.0\.1/.test(baseURL), 'production-only check (needs the nginx config applied)');
    const h = (await request.get(`${baseURL}/`)).headers();
    expect(h['strict-transport-security'], 'HSTS').toBeTruthy();
    expect(h['x-content-type-options'], 'nosniff').toBe('nosniff');
    expect(h['x-frame-options'], 'X-Frame-Options').toBeTruthy();
    expect(h['referrer-policy'], 'Referrer-Policy').toBeTruthy();
    const www = await request.get(baseURL!.replace('://', '://www.'), { maxRedirects: 0 });
    expect([301, 308], 'www → bare redirect').toContain(www.status());
  });
});
