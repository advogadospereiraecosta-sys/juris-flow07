const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3000/api/auth/csrf?redirect=%2Fdashboard', { waitUntil: 'load' });
  console.log('URL final:', page.url());
  console.log('Title:', await page.title());
  // Lista inputs visíveis
  const inputs = await page.$$eval('input', els => els.map(e => ({ name: e.name, type: e.type, visible: e.offsetParent !== null })));
  console.log('Inputs:', JSON.stringify(inputs, null, 2));
  // Lista botões
  const buttons = await page.$$eval('button', els => els.map(e => e.textContent?.slice(0, 40)));
  console.log('Buttons:', JSON.stringify(buttons, null, 2));
  await browser.close();
})().catch(e => { console.error('ERR:', e.message); process.exit(1); });
