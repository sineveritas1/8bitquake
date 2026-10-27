// Builds the site icons, the link-preview image and the 8-bit "made by" badge, all drawn as pixel art.
// Run from the repo root: node tools/build-icons.js   (needs Playwright with Chromium, and network for the font and badge)
// Writes: favicon.ico (16, 32, 48), favicon.svg, favicon-32.png, apple-touch-icon.png, icon-192.png, icon-512.png,
// og-image.png (1200x630 link preview), img/made-by-8bit.png (the badge on the About page).
const fs = require('fs'), path = require('path'), { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..');
const BADGE_URL = 'https://res.cloudinary.com/dmbeoutyi/image/upload/v1774725492/Untitled_design_21_aakkji.png';
// the badge uses only the logo's own colors, picked from the NES palette, so it reads as crisp 8-bit art
// each entry: [color as it looks in the source logo, NES color to paint]
const BADGE_PAL = [['#000000', '#000000'], ['#ffffff', '#fcfcfc'], ['#c4161c', '#d82800'], ['#1d3f8f', '#0058f8'], ['#9a9a9a', '#bcbcbc']];

// the icon: a quake ripple (two rings) around a red triangle on navy, 16 x 16 pixels
function iconPixels() {
  const px = [];
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const d = Math.hypot(x + 0.5 - 8, y + 0.5 - 8);
    px.push(Math.abs(d - 7) < 0.55 ? '#3cbcfc' : Math.abs(d - 4.6) < 0.55 ? '#a4e4fc' : '#24188c');
  }
  // triangle rows 6 to 10, centered between columns 7 and 8
  [[7, 8], [7, 8], [6, 9], [6, 9], [5, 10]].forEach(([a, b], r) => { for (let x = a; x <= b; x++) px[(6 + r) * 16 + x] = '#f83800'; });
  return px;
}
function svg(px) {
  let rects = '';
  px.forEach((c, i) => { if (c !== '#24188c') rects += `<rect x="${i % 16}" y="${(i / 16) | 0}" width="1" height="1" fill="${c}"/>`; });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect width="16" height="16" fill="#24188c"/>${rects}</svg>\n`;
}
function ico(pngs) { // ICO file that wraps PNG images (supported by every current browser and by Google)
  const head = Buffer.alloc(6 + 16 * pngs.length); head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(pngs.length, 4);
  let off = head.length;
  pngs.forEach(([size, buf], i) => { const e = 6 + i * 16; head.writeUInt8(size, e); head.writeUInt8(size, e + 1); head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6);
    head.writeUInt32LE(buf.length, e + 8); head.writeUInt32LE(off, e + 12); off += buf.length; });
  return Buffer.concat([head, ...pngs.map(p => p[1])]);
}
(async () => {
  const px = iconPixels(); fs.writeFileSync(path.join(ROOT, 'favicon.svg'), svg(px));
  const br = await chromium.launch(), p = await br.newPage();
  await p.setContent('<canvas id=c></canvas>');
  const draw = (size, pad) => p.evaluate(([px, size, pad]) => { // nearest-neighbor scale of the 16 x 16 icon
    const c = document.getElementById('c'), k = c.getContext('2d'); c.width = c.height = size; k.fillStyle = '#24188c'; k.fillRect(0, 0, size, size);
    const s = (size - pad * 2) / 16; px.forEach((col, i) => { k.fillStyle = col; k.fillRect(pad + (i % 16) * s, pad + ((i / 16) | 0) * s, Math.ceil(s), Math.ceil(s)); });
    return c.toDataURL('image/png').split(',')[1]; }, [px, size, pad]).then(b => Buffer.from(b, 'base64'));
  const p16 = await draw(16, 0), p32 = await draw(32, 0), p48 = await draw(48, 0);
  fs.writeFileSync(path.join(ROOT, 'favicon.ico'), ico([[16, p16], [32, p32], [48, p48]]));
  fs.writeFileSync(path.join(ROOT, 'favicon-32.png'), p32);
  fs.writeFileSync(path.join(ROOT, 'apple-touch-icon.png'), await draw(180, 2));
  fs.writeFileSync(path.join(ROOT, 'icon-192.png'), await draw(192, 0));
  fs.writeFileSync(path.join(ROOT, 'icon-512.png'), await draw(512, 0));

  // badge: shrink the logo to 48 x 48, then snap every pixel to the badge palette
  const logo = Buffer.from(await (await fetch(BADGE_URL)).arrayBuffer()).toString('base64');
  const badge = await p.evaluate(async ([logo, PAL]) => {
    const im = new Image(); im.src = 'data:image/png;base64,' + logo; await im.decode();
    const c = document.getElementById('c'), k = c.getContext('2d'), N = 48; c.width = c.height = N; k.clearRect(0, 0, N, N); k.imageSmoothingQuality = 'high'; k.drawImage(im, 0, 0, N, N);
    const d = k.getImageData(0, 0, N, N), rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)], pal = PAL.map(e => rgb(e[0])), out = PAL.map(e => rgb(e[1]));
    for (let i = 0; i < d.data.length; i += 4) {
      if (d.data[i + 3] < 128) { d.data[i + 3] = 0; continue; }
      let best = 0, bd = 1e9; pal.forEach((q, j) => { const e = (q[0] - d.data[i]) ** 2 + (q[1] - d.data[i + 1]) ** 2 + (q[2] - d.data[i + 2]) ** 2; if (e < bd) { bd = e; best = j; } });
      d.data[i] = out[best][0]; d.data[i + 1] = out[best][1]; d.data[i + 2] = out[best][2]; d.data[i + 3] = 255;
    }
    k.putImageData(d, 0, 0); return c.toDataURL('image/png').split(',')[1];
  }, [logo, BADGE_PAL]);
  fs.mkdirSync(path.join(ROOT, 'img'), { recursive: true }); fs.writeFileSync(path.join(ROOT, 'img', 'made-by-8bit.png'), Buffer.from(badge, 'base64'));

  // link preview: 1200 x 630
  const og = await br.newPage({ viewport: { width: 1200, height: 630 } });
  await og.setContent(`<html><head><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=block"></head>
  <body style="margin:0;width:1200px;height:630px;background:#000;font-family:'Press Start 2P';color:#fcfcfc;display:flex;align-items:center;gap:56px;padding:0 72px;box-sizing:border-box;border:12px solid #fcfcfc">
  <img src="data:image/svg+xml;base64,${Buffer.from(svg(px)).toString('base64')}" style="width:320px;height:320px;image-rendering:pixelated;flex:none">
  <div><div style="font-size:64px;color:#f8b800;line-height:1.25">8-BIT<br>QUAKE</div>
  <div style="font-size:26px;line-height:1.7;margin-top:28px;color:#a4e4fc">EVERY EARTHQUAKE ON EARTH, LIVE FROM USGS, ON A PIXEL MAP.</div></div></body></html>`);
  await og.evaluate(() => document.fonts.ready); await og.waitForTimeout(300);
  await og.screenshot({ path: path.join(ROOT, 'og-image.png') });
  await br.close(); console.log('icons, og-image.png and img/made-by-8bit.png written');
})();
