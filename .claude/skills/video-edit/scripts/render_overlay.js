// Render an HTML motion-graphics page to a transparent PNG sequence.
// The page must define window.render(t) that positions everything for time t (seconds),
// deterministically (no CSS animations/transitions, no timers).
//
// Usage: node render_overlay.js graphics.html OUT_DIR DURATION [FPS=30] [WIDTH=1080] [HEIGHT=1920]
//        node render_overlay.js graphics.html OUT_DIR --stills 3.1,6.3,10   (preview frames only)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');

(async () => {
  const [html, out, durArg, fpsArg, wArg, hArg] = process.argv.slice(2);
  const fps = +(fpsArg || 30), W = +(wArg || 1080), H = +(hArg || 1920);
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.resolve(html));
  await page.evaluate(() => document.fonts.ready);
  const times = durArg === '--stills'
    ? fpsArg.split(',').map(Number)
    : Array.from({ length: Math.ceil(+durArg * fps) }, (_, i) => i / fps);
  for (let i = 0; i < times.length; i++) {
    await page.evaluate(t => window.render(t), times[i]);
    const name = durArg === '--stills' ? `still_${times[i]}.png` : `${String(i).padStart(5, '0')}.png`;
    await page.screenshot({ path: path.join(out, name), omitBackground: true });
    if (i % 60 === 0) process.stderr.write(`frame ${i}/${times.length}\n`);
  }
  await browser.close();
})();
