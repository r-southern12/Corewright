const { chromium } = require('playwright');

// Profile the RUBBING path — the excavation bench scribe, which is the first
// carving a player ever does and the one that uses castAt plus the per-shard
// sweeps. Drives real touch events so input coalescing is exercised too.
// Report JS-side time only: this box rasterises in software, so wall time and
// frame times here say nothing about a phone, but CPU work does translate.

const FILE = process.argv[2] || '/home/user/Corewright/index.html';

(async () => {
  const b = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader']
  });
  const ctx = await b.newContext({ viewport: { width: 880, height: 400 }, hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + FILE);
  await p.waitForTimeout(4000);

  await p.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    window.__P = {};
    for (const fn of ['castAt', 'scribeAt', 'buildOcc', 'cullInterior', 'rebuildBatches',
                      'liveOutput', 'setPreview', 'dissolve', 'refreshTint']) {
      const orig = eval(fn);
      window.__P[fn] = { calls: 0, ms: 0 };
      const w = function (...a) {
        const t = performance.now();
        const r = orig.apply(this, a);
        window.__P[fn].ms += performance.now() - t;
        window.__P[fn].calls++;
        return r;
      };
      eval(fn + ' = w');
    }
    adminOn = true; powerBank = 1e9;
    const core = makeCore(4242, 3);      // dirty core: matrix to scribe off
    generateCells(core);
    inventory.push(core); loadCore(core); showView('dig');
    await sleep(2500);
    for (const k in window.__P) { window.__P[k].calls = 0; window.__P[k].ms = 0; }
    window.__T0 = performance.now();
  });

  // Drive the tool directly, using the core's own projected centre so the ray
  // definitely lands on stone. benchMove in a loop is exactly what a stream of
  // touchmove events does, so the per-frame coalescing is still exercised.
  await p.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const v = new THREE.Vector3();
    const centre = () => {
      v.set(0, 0, 0).project(camera);
      return { x: (v.x * 0.5 + 0.5) * VW, y: (-v.y * 0.5 + 0.5) * VH };
    };
    const c = centre();
    benchDown(c.x, c.y);
    window.__scribing = scribing;
    for (let i = 0; i < 200; i++) {
      benchMove(c.x + Math.sin(i / 6) * 60, c.y + Math.cos(i / 9) * 34, false);
      if (i % 3 === 0) await sleep(12);
    }
    benchUp(c.x, c.y);
    await sleep(300);
  });

  const out = await p.evaluate(() => {
    const wall = performance.now() - window.__T0;
    const tot = Object.values(window.__P).reduce((a, v) => a + v.ms, 0);
    return {
      wallMs: Math.round(wall),
      jsTotalMs: +tot.toFixed(0),
      jsPctOfWall: +(100 * tot / wall).toFixed(1),
      shards: voxels.length,
      matrixLeft: activeCore.cells.filter(isMatrix).length,
      scribingStarted: !!window.__scribing,
      profile: Object.fromEntries(Object.entries(window.__P)
        .sort((a, b) => b[1].ms - a[1].ms)
        .map(([k, v]) => [k, { calls: v.calls, ms: +v.ms.toFixed(0), perCall: +(v.ms / Math.max(1, v.calls)).toFixed(3) }]))
    };
  });
  console.log(JSON.stringify(out, null, 1));
  console.log('ERRORS(' + errs.length + ')'); errs.slice(0, 4).forEach(e => console.log('  ' + e));
  await b.close();
})();
