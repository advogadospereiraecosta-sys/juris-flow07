const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    // Bypass all cache
    serviceWorkers: 'block',
  });
  // Disable HTTP cache
  const client = await ctx.newPage();
  client.route('**', async (route) => {
    const headers = { ...route.request().headers() };
    headers['pragma'] = 'no-cache';
    headers['cache-control'] = 'no-cache, no-store, must-revalidate';
    route.continue({ headers });
  });
  await client.goto('http://localhost:3000/api/auth/csrf', { waitUntil: 'networkidle' });
  await client.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await client.waitForSelector('input[name="email"]', { timeout: 15000 });
  await client.fill('input[name="email"]', 'owner@juris.com');
  await client.fill('input[name="password"]', 'Tamp@221122');
  await Promise.all([
    client.waitForURL('**/dashboard', { timeout: 30000 }),
    client.click('button[type="submit"]'),
  ]);
  await client.waitForLoadState('networkidle');
  await client.waitForTimeout(4000); // espera o hot reload completar
  // Force reload bypassing cache
  await client.evaluate(() => window.location.reload());
  await client.waitForLoadState('networkidle');
  await client.waitForTimeout(3000);
  await client.screenshot({ path: 'C:/Users/davi9/projects/juris-flow/_dashboard3.png', fullPage: true });
  console.log('OK screenshot v3');
  await browser.close();
})().catch(e => { console.error('ERR:', e.message); process.exit(1); });