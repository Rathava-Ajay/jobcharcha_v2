/**
 * Build-time prerender: snapshot every public route of the built SPA to static HTML so crawlers
 * (and first paint) get real markup + meta + JSON-LD. `main.tsx` hydrates onto the snapshot.
 *
 * Run AFTER `vite build`:  node scripts/prerender.mjs
 *
 * Env:
 *   API_BASE     API origin to read /sitemap.xml from        (default http://127.0.0.1:5101)
 *   SITE_ORIGIN  public origin baked into canonical/og:url   (default https://jobcharcha.com)
 *   DIST         built output dir                            (default ./dist)
 *   CONCURRENCY  parallel pages                              (default 8)
 *
 * Flags:
 *   --limit N            cap dynamic (detail) routes — handy for smoke tests
 *   --routes a,b,c       prerender ONLY these paths (used by the incremental rebuild trigger)
 *   --routes-file path   prerender ONLY the newline-separated paths in this file
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, dirname } from 'node:path';

const API_BASE = (process.env.API_BASE || 'http://127.0.0.1:5101').replace(/\/$/, '');
const SITE_ORIGIN = (process.env.SITE_ORIGIN || 'https://jobcharcha.com').replace(/\/$/, '');
const DIST = process.env.DIST || 'dist';
const CONCURRENCY = Number(process.env.CONCURRENCY || 8);

const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};
const LIMIT = flag('--limit') ? Number(flag('--limit')) : Infinity;
const ONLY_ROUTES = flag('--routes')?.split(',').map((r) => r.trim()).filter(Boolean);
const ROUTES_FILE = flag('--routes-file');

// Routes with no per-record content — always prerendered.
const STATIC_ROUTES = [
  '/', '/jobs', '/private-jobs', '/results', '/admit-cards', '/schemes', '/news', '/blog',
  '/mock-tests', '/old-papers', '/daily-quiz', '/practice-questions', '/cutoff-predictor',
  '/job-alerts', '/about', '/contact', '/privacy', '/terms', '/refund-policy',
  '/shipping-policy', '/sitemap',
];

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.txt': 'text/plain', '.xml': 'application/xml', '.webmanifest': 'application/manifest+json',
};

const corsHeaders = () => ({
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'access-control-allow-headers': '*',
});

function startStaticServer() {
  const shell = join(DIST, 'index.html');
  const server = createServer(async (req, res) => {
    try {
      const url = decodeURIComponent((req.url || '/').split('?')[0]);
      let filePath = join(DIST, url);
      if (existsSync(filePath) && (await stat(filePath)).isDirectory()) filePath = join(filePath, 'index.html');
      if (!existsSync(filePath) || extname(filePath) === '') filePath = shell; // SPA fallback
      const body = await readFile(filePath);
      res.writeHead(200, { 'content-type': MIME[extname(filePath)] || 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(500).end('prerender static server error');
    }
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port })));
}

async function collectDynamicRoutes() {
  try {
    const res = await fetch(`${API_BASE}/sitemap.xml`, { headers: { accept: 'application/xml' } });
    if (!res.ok) throw new Error(`sitemap ${res.status}`);
    const xml = await res.text();
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
    const paths = new Set();
    for (const loc of locs) {
      try {
        const p = new URL(loc).pathname;
        if (p !== '/' && !STATIC_ROUTES.includes(p)) paths.add(p);
      } catch { /* skip malformed loc */ }
    }
    return [...paths];
  } catch (e) {
    console.warn(`⚠  Could not read ${API_BASE}/sitemap.xml (${e.message}). Prerendering static routes only.`);
    return [];
  }
}

async function routesToRender() {
  if (ROUTES_FILE) {
    const raw = await readFile(ROUTES_FILE, 'utf8');
    return raw.split('\n').map((r) => r.trim()).filter(Boolean);
  }
  if (ONLY_ROUTES?.length) return ONLY_ROUTES;
  const dynamic = (await collectDynamicRoutes()).slice(0, LIMIT === Infinity ? undefined : LIMIT);
  return [...STATIC_ROUTES, ...dynamic];
}

async function main() {
  if (!existsSync(join(DIST, 'index.html'))) {
    console.error(`✗ ${DIST}/index.html not found — run \`vite build\` first.`);
    process.exit(1);
  }

  const routes = await routesToRender();
  const { server, port } = await startStaticServer();
  const localOrigin = `http://127.0.0.1:${port}`;
  console.log(`Prerendering ${routes.length} route(s) at concurrency ${CONCURRENCY} …`);

  const browser = await chromium.launch();
  const context = await browser.newContext({ locale: 'en-IN', timezoneId: 'Asia/Kolkata' });

  // The built bundle keeps its production VITE_API_BASE_URL. During prerender we transparently
  // reroute every /api/* and /sitemap.xml request (whatever host it targets) to the local API,
  // adding permissive CORS headers so the cross-origin fetch from the static server succeeds.
  await context.route((url) => /\/(api\/|sitemap\.xml)/.test(url.pathname), async (route) => {
    const reqUrl = new URL(route.request().url());
    if (route.request().method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: corsHeaders() });
    }
    try {
      const upstream = await fetch(`${API_BASE}${reqUrl.pathname}${reqUrl.search}`, {
        method: route.request().method(),
        headers: { ...route.request().headers(), host: new URL(API_BASE).host },
        body: ['GET', 'HEAD'].includes(route.request().method()) ? undefined : route.request().postData() ?? undefined,
      });
      const body = Buffer.from(await upstream.arrayBuffer());
      route.fulfill({
        status: upstream.status,
        headers: { ...Object.fromEntries(upstream.headers), ...corsHeaders() },
        body,
      });
    } catch (e) {
      route.fulfill({ status: 502, headers: corsHeaders(), body: `prerender API proxy: ${e.message}` });
    }
  });

  let ok = 0;
  let failed = 0;
  const queue = [...routes];

  async function worker() {
    while (queue.length) {
      const route = queue.shift();
      const page = await context.newPage();
      try {
        const resp = await page.goto(`${localOrigin}${route}`, { waitUntil: 'networkidle', timeout: 45_000 });
        if (resp && resp.status() >= 400) throw new Error(`HTTP ${resp.status()}`);
        // App-level "done loading" heuristic: no spinner visible and #root has real content.
        await page.waitForFunction(
          () => !document.querySelector('.animate-spin') && document.getElementById('root')?.childElementCount > 0,
          { timeout: 20_000 },
        ).catch(() => { /* fall through — snapshot whatever rendered */ });
        await page.waitForTimeout(250);

        let html = await page.content();
        html = html.split(localOrigin).join(SITE_ORIGIN); // fix canonical / og:url baked from the local server

        const outPath = route === '/' ? join(DIST, 'index.html') : join(DIST, route, 'index.html');
        await mkdir(dirname(outPath), { recursive: true });
        await writeFile(outPath, html);
        ok++;
        console.log(`  ✓ ${route}`);
      } catch (e) {
        failed++;
        console.warn(`  ✗ ${route} — ${e.message}`);
      } finally {
        await page.close();
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker));
  await browser.close();
  server.close();

  console.log(`\nPrerender done: ${ok} ok, ${failed} failed.`);
  if (ok === 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
