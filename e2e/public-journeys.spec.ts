import { API, expect, firstJobSlug, test } from './fixtures';

test.describe('public journeys (desktop)', () => {
  test('homepage renders with a title, a main landmark and no console errors', async ({ page, evidence }) => {
    const res = await page.goto('/');
    expect(res?.status()).toBe(200);
    await expect(page).toHaveTitle(/JobCharcha/i);
    await expect(page.locator('main, [role="main"], #root').first()).toBeVisible();
    expect(evidence.consoleErrors, 'console errors').toEqual([]);
  });

  test('job listing shows real jobs from the API and links to a detail page', async ({ page, request }) => {
    const apiJobs = await (await request.get(`${API}/api/jobs?pageSize=5`)).json();
    expect(apiJobs.items.length).toBeGreaterThan(0);
    await page.goto('/jobs');
    const link = page.locator('a[href^="/jobs/"]').first();
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/jobs\/[^/]+$/);
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('job detail: title, apply / official-notification links point at real URLs, and the page is indexable', async ({ page, request, evidence }) => {
    const slug = await firstJobSlug(request);
    const job = await (await request.get(`${API}/api/jobs/${slug}`)).json();
    await page.goto(`/jobs/${slug}`);
    await expect(page.locator('h1').first()).toContainText(job.title.split(' ').slice(0, 3).join(' '));

    for (const [name, url] of [['apply link', job.applyUrl], ['official notification', job.officialNotificationUrl]] as const) {
      if (!url) continue;                                      // not every job has both; a missing one is reported by the data audit, not failed here
      const a = page.locator(`a[href="${url}"]`).first();
      await expect(a, name).toBeVisible();
      expect(await a.getAttribute('rel'), `${name} rel`).toMatch(/noopener/);
      expect(url, `${name} is absolute https/http`).toMatch(/^https?:\/\//i);
    }
    await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(0);
    expect(evidence.consoleErrors).toEqual([]);
  });

  test('job detail emits one canonical URL, OG tags and a valid JobPosting JSON-LD', async ({ page, request }) => {
    const slug = await firstJobSlug(request);
    await page.goto(`/jobs/${slug}`);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toMatch(new RegExp(`/jobs/${slug}$`));
    expect(await page.locator('meta[property="og:title"]').getAttribute('content')).toBeTruthy();
    expect((await page.locator('meta[name="description"]').getAttribute('content'))?.length).toBeGreaterThan(40);

    await expect(page.locator('script[type="application/ld+json"]').first()).toBeAttached({ timeout: 20_000 });   // injected after the job loads
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const parsed = blocks.map((b) => JSON.parse(b));                       // throws (fails the test) on invalid JSON
    const posting = parsed.find((j) => j['@type'] === 'JobPosting');
    expect(posting, 'JobPosting JSON-LD present').toBeTruthy();
    for (const f of ['title', 'description', 'datePosted', 'hiringOrganization', 'jobLocation']) expect(posting[f], `JobPosting.${f}`).toBeTruthy();
  });

  test('search from the jobs page filters results', async ({ page }) => {
    await page.goto('/jobs');
    const box = page.getByRole('searchbox').or(page.locator('input[type="search"], input[placeholder*="earch" i]')).first();
    await expect(box).toBeVisible({ timeout: 20_000 });
    await box.fill('zzzz-no-such-job-xyz');
    await box.press('Enter');
    await expect(page.locator('a[href^="/jobs/"]')).toHaveCount(0, { timeout: 15_000 });
  });

  for (const [name, path] of [['results', '/results'], ['admit cards', '/admit-cards'], ['store / study material', '/store'], ['study library', '/study']] as const) {
    test(`${name} page loads and has a heading`, async ({ page, evidence }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page.locator('h1, h2').first()).toBeVisible();
      expect(evidence.consoleErrors, 'console errors').toEqual([]);
    });
  }

  test('result and admit-card detail pages open from their lists', async ({ page, request }) => {
    for (const [api, route] of [['results', 'results'], ['admitcards', 'admit-cards']] as const) {
      const res = await request.get(`${API}/api/${api}?pageSize=1`);
      if (res.status() !== 200) continue;
      const slug = (await res.json()).items?.[0]?.slug;
      if (!slug) continue;
      const nav = await page.goto(`/${route}/${slug}`);
      expect(nav?.status()).toBe(200);
      await expect(page.locator('h1').first()).toBeVisible();
    }
  });

  test('unknown URL shows the 404 page and tells search engines not to index it', async ({ page }) => {
    await page.goto('/definitely-not-a-real-page-xyz');
    await expect(page.getByRole('heading', { name: /404/ })).toBeVisible();
    await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(1);
  });
});
