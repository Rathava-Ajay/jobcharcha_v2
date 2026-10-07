import { API, expect, test } from './fixtures';

test.describe('login & admin protection', () => {
  test('login form has labelled, autofill-friendly fields', async ({ page }) => {
    await page.goto('/login');
    const email = page.locator('input[type="email"]').first();
    const password = page.locator('input[type="password"]').first();
    await expect(email).toBeVisible();
    await expect(password).toBeVisible();
    expect(await email.getAttribute('autocomplete')).toBe('email');
    expect(await password.getAttribute('autocomplete')).toMatch(/current-password|new-password/);
  });

  test('wrong credentials are rejected with a visible error and no session', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').first().fill('nobody-e2e@example.invalid');
    await page.locator('input[type="password"]').first().fill('definitely-wrong-password');
    await page.locator('button[type="submit"]').first().click();
    await expect(page.getByText(/invalid|incorrect|failed|not found|wrong/i).first()).toBeVisible({ timeout: 20_000 });
    expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => /token/i.test(k)))).toEqual([]);
  });

  test('admin dashboard URL cannot be opened by a logged-out visitor', async ({ page }) => {
    await page.goto('/dashboard/admin');
    await expect(page).not.toHaveURL(/\/dashboard\/admin\/?$/);               // bounced (to /login or home)
    await expect(page.getByText(/Admin Dashboard|Post a job|Auto-share/i)).toHaveCount(0);
  });

  test('admin mobile-post pages are not usable when logged out', async ({ page }) => {
    await page.goto('/admin/mobile-post');
    await expect(page.locator('textarea')).toHaveCount(0);
  });

  const adminGets = ['/api/admin/social/status', '/api/admin/social/jobs', '/api/admin/ai-usage', '/api/products/admin/all', '/api/study-materials/admin/all', '/api/admin/payments/stuck-pending'];
  for (const path of adminGets) {
    test(`GET ${path} requires an admin token`, async ({ request }) => {
      const res = await request.get(`${API}${path}`);
      expect([401, 403, 404], `${path} → ${res.status()}`).toContain(res.status());     // 404 only if the route was renamed; never 200
      expect(res.status()).not.toBe(200);
    });
  }

  test('admin write endpoints reject a missing token and a forged one', async ({ request }) => {
    for (const [method, path] of [['post', '/api/products'], ['put', '/api/products/1'], ['delete', '/api/products/1'], ['post', '/api/jobs'], ['delete', '/api/jobs/1']] as const) {
      const anon = await request[method](`${API}${path}`, { data: {} });
      expect(anon.status(), `${method} ${path} anonymous`).toBe(401);
      const forged = await request[method](`${API}${path}`, { data: {}, headers: { Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.e30.forged' } });
      expect(forged.status(), `${method} ${path} forged JWT`).toBe(401);
    }
  });

  // Optional: runs only when seeded admin credentials are provided (never hard-coded, never against production by default).
  test('seeded admin can sign in and reach the admin API', async ({ request }) => {
    test.skip(!process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD, 'set E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD to run');
    const login = await request.post(`${API}/api/auth/login`, { data: { email: process.env.E2E_ADMIN_EMAIL, password: process.env.E2E_ADMIN_PASSWORD, role: 'admin' } });
    expect(login.status()).toBe(200);
    const { accessToken } = await login.json();
    expect((await request.get(`${API}/api/products/admin/all`, { headers: { Authorization: `Bearer ${accessToken}` } })).status()).toBe(200);
  });
});
