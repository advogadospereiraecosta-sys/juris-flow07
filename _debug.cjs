const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3000/');
  await page.waitForLoadState('networkidle');
  await page.goto('http://localhost:3000/api/auth/csrf?redirect=/login');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  console.log('URL:', page.url());
  const inputs = await page.$$('input[name="email"]');
  console.log('email inputs count:', inputs.length);
  if (inputs.length > 0) {
    const visible = await inputs[0].isVisible();
    console.log('visible:', visible);
    const html = await inputs[0].evaluate(e => e.outerHTML.slice(0, 200));
    console.log('html:', html);
  }
  await page.screenshot({ path: 'C:/Users/davi9/projects/juris-flow/_debug.png' });
  await browser.close();
})().catch(e => { console.error('ERR:', e.message); process.exit(1); });