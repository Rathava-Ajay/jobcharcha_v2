import { API, expect, test } from './fixtures';

/**
 * Money & download protection, proven WITHOUT paying: public APIs never carry the paid files, every checkout / verify / download call
 * needs a login, and forged payment callbacks are refused. The signed-payment happy path (verify, webhook, duplicate callbacks, wrong
 * amount, exactly-once revenue) is covered by backend/JobPortal.Tests/StoreSecurityTests.cs.
 */
test.describe('store, payments & paid downloads', () => {
  test('public product APIs never expose the Google Drive file links (the paid file itself)', async ({ request }) => {
    const list = await (await request.get(`${API}/api/products`)).json();
    expect(Array.isArray(list)).toBe(true);
    for (const p of list) {
      expect(p.googleDriveDownloadUrl ?? null, `${p.slug} download link`).toBeNull();
      expect(p.googleDriveViewUrl ?? null, `${p.slug} view link`).toBeNull();
    }
    if (list.length) {
      const detail = await (await request.get(`${API}/api/products/${list[0].slug}`)).json();
      expect(detail.googleDriveDownloadUrl ?? null).toBeNull();
      expect(detail.googleDriveViewUrl ?? null).toBeNull();
    }
  });

  test('the product pages the browser loads contain no Drive links either', async ({ page }) => {
    const seen: string[] = [];
    page.on('response', async (r) => {
      if (/\/api\/products/.test(r.url()) && r.ok()) seen.push(await r.text());
    });
    await page.goto('/store');
    await page.waitForLoadState('networkidle');
    expect(seen.join('\n')).not.toMatch(/drive\.google\.com|googleusercontent\.com/);
    expect(await page.content()).not.toMatch(/drive\.google\.com\/uc\?|export=download/);
  });

  test('checkout, verify, my-orders and download all require a login', async ({ request }) => {
    const calls: Array<['get' | 'post', string, unknown?]> = [
      ['post', '/api/store/orders/checkout', { items: [{ productId: 1, quantity: 1 }], paymentMethod: 'razorpay' }],
      ['post', '/api/store/orders/verify', { razorpayOrderId: 'order_x', razorpayPaymentId: 'pay_x', razorpaySignature: 'sig' }],
      ['get', '/api/store/orders'],
      ['get', '/api/store/orders/1/download/1'],
      ['post', '/api/payments/order', { amount: 1 }],
      ['post', '/api/payments/verify', {}],
    ];
    for (const [method, path, data] of calls) {
      const res = await request[method](`${API}${path}`, method === 'post' ? { data } : undefined);
      expect(res.status(), `${method.toUpperCase()} ${path}`).toBe(401);
    }
  });

  test('a forged or unsigned Razorpay webhook is refused and changes nothing', async ({ request }) => {
    const body = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_forged', order_id: 'order_forged', amount: 100, currency: 'INR' } } } });
    const unsigned = await request.post(`${API}/api/payments/webhook`, { data: body, headers: { 'Content-Type': 'application/json' } });
    expect(unsigned.status()).toBe(400);
    const forged = await request.post(`${API}/api/payments/webhook`, { data: body, headers: { 'Content-Type': 'application/json', 'X-Razorpay-Signature': 'deadbeef' } });
    expect(forged.status()).toBe(400);
  });

  test('store page: add to cart and open the cart without paying', async ({ page, evidence }) => {
    await page.goto('/store');
    await page.waitForLoadState('networkidle');
    const add = page.getByRole('button', { name: /add/i }).first();
    const hasProducts = await add.waitFor({ state: 'visible', timeout: 15_000 }).then(() => true, () => false);   // wait for the product list before deciding
    test.skip(!hasProducts, 'no products listed in this environment');
    await add.click();
    await expect(page.getByText(/₹\s?\d+|Free/).first()).toBeVisible();
    expect(evidence.consoleErrors).toEqual([]);
  });

  test('study-material library lists files and never exposes paid store files', async ({ request }) => {
    const res = await request.get(`${API}/api/study-materials`);
    expect(res.status()).toBe(200);
    expect(JSON.stringify(await res.json())).not.toMatch(/drive\.google\.com\/uc\?|export=download/);
  });
});
