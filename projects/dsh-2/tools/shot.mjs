// Headless screenshot harness for visual iteration.
// usage: node tools/shot.mjs [out.png] [waitMs] [width] [height] [extraQuery]
import puppeteer from 'puppeteer-core';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find((p) => existsSync(p));

const out = resolve(process.argv[2] || 'shots/shot.png');
const waitMs = Number(process.argv[3] || 2500);
const width = Number(process.argv[4] || 1600);
const height = Number(process.argv[5] || 1000);
const extra = process.argv[6] || '';
const file = resolve(process.env.SHOT_HTML || 'index.html');
const url = pathToFileURL(file).href + (extra ? '?' + extra : '');

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: [
    '--hide-scrollbars',
    '--mute-audio',
    '--enable-unsafe-swiftshader',
    '--use-angle=swiftshader',
    '--disable-dev-shm-usage',
    `--window-size=${width},${height}`,
  ],
  defaultViewport: { width, height, deviceScaleFactor: 1 },
});

const page = await browser.newPage();
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
page.on('requestfailed', (r) => logs.push(`[reqfail] ${r.url()} ${r.failure()?.errorText}`));

try {
  await page.goto(url, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction('window.__ready === true', { timeout: 180000 });
  await new Promise((r) => setTimeout(r, waitMs));
  const diag = await page.evaluate(() => window.__diag || {});
  await page.screenshot({ path: out });
  console.log('shot:', out);
  console.log('diag:', JSON.stringify(diag));
} catch (e) {
  console.error('FAILED:', e.message);
} finally {
  if (logs.length) console.log(logs.slice(-40).join('\n'));
  await browser.close();
}

