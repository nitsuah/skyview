// One-off: the homepage hero without the cursor drone (the spots animate their
// own). Run inside the Playwright image with the e2e static server on :3000:
//   node tests/support/static-server.mjs 3000 & node promo/assets/capture-hero.mjs
import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
await p.route(/\.(mp4|mov|webm)(\?.*)?$/, (r) => r.abort());
await p.goto('http://127.0.0.1:3000/');
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(1500);
await p.screenshot({ path: 'promo/assets/hero-clean.jpg', type: 'jpeg', quality: 90 });
await b.close();
