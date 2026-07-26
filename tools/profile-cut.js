const { chromium } = require('playwright');

// Where does the time go DURING a cut? Fragment cost is constant, so it cannot
// explain "fine until you carve". Wrap the functions that only run when shards
// change and see which one dominates.

(async () => {
  const b = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader']
  });
  const p = await b.newPage({ viewport: { width: 900, height: 420 } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8099/index.html');
  await p.waitForTimeout(4000);

  const out = await p.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const P = { };
    function wrap(name, fnName) {
      const orig = window[fnName] || eval(fnName);
      P[name] = { calls: 0, ms: 0 };
      const w = function (...a) {
        const t = performance.now();
        const r = orig.apply(this, a);
        P[name].ms += performance.now() - t;
        P[name].calls++;
        return r;
      };
      eval(fnName + ' = w');
      return w;
    }
    wrap('rebuildBatches', 'rebuildBatches');
    wrap('cullInterior', 'cullInterior');
    wrap('setPreview', 'setPreview');
    wrap('buildOcc', 'buildOcc');
    wrap('addVoxelMesh', 'addVoxelMesh');
    wrap('splitOneCube', 'splitOneCube');
    wrap('liveOutput', 'liveOutput');

    adminOn = true; powerBank = 1e9;
    const core = makeCore(12345, 3); generateCells(core);
    core.cells = core.cells.filter(c => !isMatrix(c)); core.clean = true;
    inventory.push(core); loadCore(core); showView('facet');
    await sleep(2500);

    // reset counters after setup so we only measure the cut
    for (const k in P) { P[k].calls = 0; P[k].ms = 0; }

    const frames = [];
    let last = performance.now(), running = true;
    (function step(now) { frames.push(now - last); last = now; if (running) requestAnimationFrame(step); })(performance.now());

    const t0 = performance.now();
    sawClosing = true;
    for (let i = 0; i < 50; i++) { await sleep(200); sawClosing = true; if (sawGap <= 0.06) break; }
    sawClosing = false; running = false;
    const wall = performance.now() - t0;
    await sleep(200);

    frames.shift();
    const s = frames.slice().sort((a, b) => a - b);
    return {
      wallMs: Math.round(wall),
      shards: voxels.length,
      drawn: voxels.filter(v => !v.buried).length,
      batches: batches.size,
      frame: { n: frames.length, p50: +s[Math.floor(s.length * .5)].toFixed(1),
               p95: +s[Math.floor(s.length * .95)].toFixed(1), max: +Math.max(...frames).toFixed(1) },
      profile: Object.fromEntries(Object.entries(P).map(([k, v]) =>
        [k, { calls: v.calls, totalMs: +v.ms.toFixed(0), perCallMs: +(v.ms / Math.max(1, v.calls)).toFixed(2),
              pctOfWall: +(100 * v.ms / wall).toFixed(1) }]))
    };
  });

  console.log(JSON.stringify(out, null, 1));
  console.log('ERRORS(' + errs.length + ')');
  await b.close();
})();
