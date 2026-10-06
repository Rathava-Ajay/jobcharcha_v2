import { expect, test } from './fixtures';

test.describe('mobile (Pixel 7)', () => {
  test('homepage fits the viewport with no horizontal scroll', async ({ page }) => {
    await page.goto('/');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, 'horizontal overflow in px').toBeLessThanOrEqual(1);
  });

  test('hamburger menu opens, lists navigation and navigates to Jobs', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /menu/i }).first().click();
    const menu = page.getByRole('dialog');
    await expect(menu).toBeVisible();
    await menu.locator('a[href="/jobs"]').first().click();
    await expect(page).toHaveURL(/\/jobs/);
  });

  test('job detail is usable on a phone: heading visible, apply/notification link reachable', async ({ page, request }) => {
    const api = process.env.E2E_API_URL ?? 'http://localhost:5101';
    const slug = (await (await request.get(`${api}/api/jobs?pageSize=1`)).json()).items[0].slug;
    await page.goto(`/jobs/${slug}`);
    await expect(page.locator('h1').first()).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    const outbound = page.locator('a[target="_blank"][rel*="noopener"]').first();
    await expect(outbound).toBeVisible();
  });

  test('store page renders on mobile', async ({ page, evidence }) => {
    await page.goto('/store');
    await expect(page.locator('h1, h2').first()).toBeVisible();
    expect(evidence.consoleErrors).toEqual([]);
  });
});
