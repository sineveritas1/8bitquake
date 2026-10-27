// Device check: loads the site on 15 desktop, phone and tablet setups (Chromium emulation with touch and iPhone
// notch/home bar insets), taps through title screen, list, card, settings scroll, tap-outside close and the ticker,
// and reports anything off screen, overlapping, or not scrolling. Screenshots go to tests/shots/ (git-ignored).
// Run: python3 -m http.server 8787 & node tests/devices.js [url]   (needs the playwright package)
const OUT = require('path').join(__dirname, 'shots'); require('fs').mkdirSync(OUT, { recursive: true });
const { chromium, devices } = require('playwright');
const list = [
  ['Desktop 1440', { viewport: { width: 1440, height: 900 } }],
  ['Desktop 1280', { viewport: { width: 1280, height: 720 } }],
  ['iPhone 15', devices['iPhone 15'], { top: 59, bottom: 34 }],
  ['iPhone 15 land', devices['iPhone 15 landscape'], { left: 59, right: 59, bottom: 21 }],
  ['iPhone SE', devices['iPhone SE']],
  ['iPhone 15 Pro Max', devices['iPhone 15 Pro Max'], { top: 59, bottom: 34 }],
  ['Pixel 7', devices['Pixel 7']],
  ['Pixel 7 land', devices['Pixel 7 landscape']],
  ['Galaxy S9+', devices['Galaxy S9+']],
  ['iPad 11', devices['iPad (gen 11)'], { top: 24, bottom: 20 }],
  ['iPad 11 land', devices['iPad (gen 11) landscape'], { top: 24, bottom: 20 }],
  ['iPad Mini', devices['iPad Mini']],
  ['iPad Pro 11 land', devices['iPad Pro 11 landscape']],
  ['Galaxy Tab S9', devices['Galaxy Tab S9']],
  ['Galaxy Tab S9 land', devices['Galaxy Tab S9 landscape']],
];
async function drag(cdp, x, y0, y1) { x = Math.round(x); await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: Math.round(y0) }] });
  const n = 14; for (let i = 1; i <= n; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: Math.round(y0 + (y1 - y0) * i / n) }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
const ov = (a, b) => a && b && a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
(async () => {
  const br = await chromium.launch();
  for (const [name, dev, safe] of list) {
    const ctx = await br.newContext({ ...dev });
    const p = await ctx.newPage(); const errs = [], probs = [];
    p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 80)); });
    p.on('pageerror', e => errs.push(String(e).slice(0, 120)));
    const cdp = await ctx.newCDPSession(p);
    if (safe) { try { await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 0, left: 0, bottom: 0, right: 0, ...safe } }); } catch (e) { probs.push('no safe-area emu'); } }
    const touch = !!dev.hasTouch, tap = async (sel) => touch ? p.tap(sel) : p.click(sel);
    const tapXY = async (x, y) => touch ? p.touchscreen.tap(x, y) : p.mouse.click(x, y);
    const fn = name.replace(/\W+/g, '_');
    await p.goto(process.argv[2] || 'http://localhost:8787/');
    await p.waitForSelector('#bStart:not([disabled])', { timeout: 40000 });
    const vp = p.viewportSize();
    let sb = await p.locator('#bStart').boundingBox();
    if (sb.y + sb.height > vp.height) {
      if (touch) await drag(cdp, vp.width / 2, vp.height * 0.8, vp.height * 0.2);
      else { await p.mouse.move(vp.width / 2, vp.height / 2); await p.mouse.wheel(0, 400); }
      await p.waitForTimeout(400); sb = await p.locator('#bStart').boundingBox();
      if (sb.y + sb.height > vp.height) probs.push('start unreachable'); else probs.push('(start needs a scroll)');
    }
    await p.screenshot({ path: require('path').join(OUT, fn) + '-0.png' });
    await tap('#bStart'); await p.waitForTimeout(3500);
    const g = await p.evaluate(() => { const r = id => { const e = document.getElementById(id); if (!e || e.hidden) return null; const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height }; };
      return { sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight, top: r('top'), dock: r('dock'), zoom: r('zoom'), tick: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tick')), safe: [getComputedStyle(document.getElementById('safe')).paddingTop, getComputedStyle(document.getElementById('safe')).paddingBottom] }; });
    if (g.sw > vp.width || g.sh > vp.height) probs.push('page scrolls ' + g.sw + 'x' + g.sh);
    for (const k of ['top', 'dock', 'zoom']) { const b = g[k]; if (b.x < 0 || b.y < 0 || b.x + b.width > vp.width + 0.5 || b.y + b.height > vp.height - g.tick + 0.5) probs.push(k + ' out of bounds'); }
    if (ov(g.dock, g.zoom)) probs.push('dock overlaps zoom'); if (ov(g.top, g.zoom)) probs.push('top overlaps zoom');
    await p.screenshot({ path: require('path').join(OUT, fn) + '-1.png' });
    // list -> pick a quake -> card
    await tap('#bList'); await p.waitForTimeout(300);
    await p.locator('#quakes button').first().tap ? (touch ? p.locator('#quakes button').first().tap() : p.locator('#quakes button').first().click()) : 0;
    await p.waitForTimeout(1200);
    const c = await p.evaluate(() => { const r = id => { const e = document.getElementById(id); if (!e || e.hidden) return null; const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height }; }; const tb = [...document.querySelectorAll('#top button')].map(e => e.getBoundingClientRect()); const top = { x: Math.min(...tb.map(b => b.x)), y: Math.min(...tb.map(b => b.y)), width: Math.max(...tb.map(b => b.right)) - Math.min(...tb.map(b => b.x)), height: Math.max(...tb.map(b => b.bottom)) - Math.min(...tb.map(b => b.y)) };
      const st = [...document.querySelectorAll('.stats div')].map(e => Math.round(e.getBoundingClientRect().y)); const sd = document.getElementById('sDist'); 
      return { rows: new Set(st).size, distWraps: sd.getBoundingClientRect().height > parseFloat(getComputedStyle(sd).lineHeight) * 1.5, card: r('card'), dock: r('dock'), zoom: r('zoom'), top, tick: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tick')) }; });
    if (!c.card) probs.push('card did not open'); else {
      if (c.card.y + c.card.height > vp.height - c.tick + 0.5) probs.push('card under ticker');
      if (c.rows !== 1) probs.push('stat boxes wrap to ' + c.rows + ' rows'); if (c.distWraps) probs.push('(distance wraps)');
      if (c.card.y < 0) probs.push('card above screen top ' + Math.round(c.card.y));
      for (const k of ['dock', 'zoom', 'top']) if (ov(c.card, c[k])) probs.push('card overlaps ' + k);
    }
    await p.screenshot({ path: require('path').join(OUT, fn) + '-2.png' });
    // settings: scroll the panel, then tap outside to close
    await tap('#bKey'); await p.waitForTimeout(300);
    const pb = await p.locator('#keySheet .panel').boundingBox();
    if (touch) await drag(cdp, pb.x + pb.width / 2, pb.y + pb.height * 0.8, pb.y + pb.height * 0.3);
    else { await p.mouse.move(pb.x + pb.width / 2, pb.y + pb.height / 2); await p.mouse.wheel(0, 300); }
    await p.waitForTimeout(500);
    const st = await p.evaluate(() => document.querySelector('#keySheet .panel').scrollTop);
    if (st <= 0) probs.push('settings would not scroll');
    await p.screenshot({ path: require('path').join(OUT, fn) + '-3.png' });
    await tapXY(4, Math.round(vp.height / 2)); await p.waitForTimeout(300);
    if (!(await p.evaluate(() => document.getElementById('keySheet').hidden))) probs.push('tap outside did not close');
    // ticker tap
    await p.evaluate(() => { document.getElementById('card').hidden = true; });
    await tapXY(Math.round(vp.width * 0.7), Math.round(vp.height - c.tick / 2)); await p.waitForTimeout(800);
    const tk = await p.evaluate(() => !document.getElementById('card').hidden || !document.getElementById('listSheet').hidden);
    if (!tk) probs.push('ticker tap did nothing');
    console.log((probs.filter(x=>x[0]!=='(').length ? 'FAIL ' : 'ok   ') + name.padEnd(20), JSON.stringify({ vp: vp.width + 'x' + vp.height, tick: g.tick, safe: g.safe.join('/') }), probs.join('; '), errs.length ? 'ERR ' + errs.join(' | ') : '');
    await ctx.close();
  }
  await br.close();
})();
