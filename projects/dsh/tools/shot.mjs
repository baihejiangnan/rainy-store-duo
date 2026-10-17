// Headless-Chrome screenshot helper for visual QA of the three.js scene.
// Usage: node tools/shot.mjs --file index.html --out shots/a.png --wait 9000 --eval "window.__capture('hero')"
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const argv = process.argv.slice(2);
const opt = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
};
const has = (name) => argv.includes(`--${name}`);

const file = path.resolve(opt('file', 'index.html'));
const out = path.resolve(opt('out', 'shots/shot.png'));
const width = parseInt(opt('w', '1600'), 10);
const height = parseInt(opt('h', '1000'), 10);
const waitMs = parseInt(opt('wait', '8000'), 10);
const evalExpr = opt('eval', '');
const viewsRaw = opt('views', '');
const suffix = opt('suffix', '');

const base = pathToFileURL(file).href + (opt('query', '') ? `?${opt('query')}` : '');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function newTarget(url) {
  const res = await fetch(`http://127.0.0.1:9222/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
  if (!res.ok) throw new Error(`new target failed: ${res.status} ${await res.text()}`);
  return res.json();
}

class CDP {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.pending = new Map();
    this.events = [];
    this.logs = [];
    this.ready = new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });
    this.ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      } else if (msg.method) {
        this.events.push(msg);
        if (msg.method === 'Runtime.consoleAPICalled') {
          const p = msg.params;
          const text = (p.args || []).map((a) => a.value ?? a.description ?? '').join(' ');
          this.logs.push(`[${p.type}] ${text}`);
        } else if (msg.method === 'Runtime.exceptionThrown') {
          const d = msg.params.exceptionDetails;
          this.logs.push(`[exception] ${d.text} ${d.exception?.description ?? ''}`);
        }
      }
    };
  }
  async send(method, params = {}) {
    await this.ready;
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  close() {
    try { this.ws.close(); } catch {}
  }
}

async function main() {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const target = await newTarget('about:blank');
  const cdp = new CDP(target.webSocketDebuggerUrl);
  await cdp.ready;
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  await cdp.send('Page.navigate', { url: base });
  // Wait for load, then for scene readiness if the page exposes it.
  await sleep(1500);
  let title = '';
  try {
    title = (await cdp.send('Runtime.evaluate', { expression: 'document.title', returnByValue: true })).result.value;
  } catch {}
  console.log(`title: ${title}`);
  if (evalExpr) {
    try {
      const r = await cdp.send('Runtime.evaluate', { expression: evalExpr, awaitPromise: true, returnByValue: true });
      console.log('eval:', JSON.stringify(r.result?.value ?? r.result?.description ?? r.result));
    } catch (e) { console.log('eval error:', e.message); }
  }
  // Poll for readiness.
  const deadline = Date.now() + waitMs;
  let ready = false;
  while (Date.now() < deadline) {
    try {
      const r = await cdp.send('Runtime.evaluate', { expression: 'window.__READY__ === true', returnByValue: true });
      if (r.result.value === true) { ready = true; break; }
    } catch {}
    await sleep(300);
  }
  console.log(`ready: ${ready}`);
  try {
    await cdp.send('Runtime.evaluate', { expression: "document.body.classList.add('ready'); document.getElementById('veil') && (document.getElementById('veil').style.display='none');" });
  } catch {}
  await sleep(2600);

  const shots = [];
  if (process.argv.includes('--snapshot')) {
    const views = viewsRaw ? viewsRaw.split(',').map((x) => x.trim()).filter(Boolean) : ['hero'];
    for (const v of views) {
      try {
        const r = await cdp.send('Runtime.evaluate', { expression: `window.__snapshot(${JSON.stringify(v)})`, awaitPromise: true, returnByValue: true });
        const data = r.result.value;
        if (typeof data !== 'string' || !data.startsWith('data:image/png;base64,')) { console.log('snapshot failed:', JSON.stringify(r.result).slice(0, 300)); continue; }
        const p = views.length > 1 ? path.join(path.dirname(out), `${path.basename(out, '.png')}-${v}${suffix}.png`) : out;
        fs.writeFileSync(p, Buffer.from(data.split(',')[1], 'base64'));
        shots.push(p);
        console.log('wrote', p, (fs.statSync(p).size / 1024).toFixed(0) + 'KB');
      } catch (e) { console.log('snapshot error:', e.message); }
    }
  } else if (viewsRaw) {
    const views = viewsRaw.split(',').map((s) => s.trim()).filter(Boolean);
    for (const v of views) {
      try {
        await cdp.send('Runtime.evaluate', { expression: `window.__capture && window.__capture(${JSON.stringify(v)})`, awaitPromise: true });
      } catch (e) { console.log('view error:', e.message); }
      await sleep(1400);
      const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      const name = `${path.basename(out, '.png')}-${v}${suffix}.png`;
      const p = path.join(path.dirname(out), name);
      fs.writeFileSync(p, Buffer.from(shot.data, 'base64'));
      shots.push(p);
      console.log('wrote', p);
    }
  } else {
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(out, Buffer.from(shot.data, 'base64'));
    shots.push(out);
    console.log('wrote', out);
  }

  if (cdp.logs.length) {
    console.log('--- console ---');
    console.log(cdp.logs.slice(-40).join('\n'));
  }
  cdp.close();
  await fetch(`http://127.0.0.1:9222/json/close/${target.id}`);
  console.log('done');
}

main().catch((e) => { console.error(e); process.exit(1); });
