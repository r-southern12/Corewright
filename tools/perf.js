const { chromium } = require('playwright');

// Hold the faceting saw closed through a pass and sample the scene as it goes.
// Splits multiply shards and wear removes them, so the number that matters is
// the PEAK, not the end state.
//
// Usage: install playwright OUTSIDE the repo, then run from that directory.
//   npm i playwright && node /path/to/Corewright/tools/perf.js
//
// Read the STRUCTURAL numbers — shards, draw calls, triangles, geometries.
// Those are hardware independent and are what predicts mobile GPU behaviour.
// IGNORE the absolute frame times: headless Chromium rasterises on the CPU via
// SwiftShader, so ~120ms/frame here says nothing about a real phone. Frame
// times are only meaningful compared BETWEEN tiers in one run, and the max
// spikes are worth watching because those are main-thread split costs, which
// do translate.

async function run(tier, throttle) {
  const b = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader']
  });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  const cdp = await p.context().newCDPSession(p);
  if (throttle > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
  await p.goto('file:///home/user/Corewright/corewrightv95.html');
  await p.waitForTimeout(4000);

  const out = await p.evaluate(async ({ tier }) => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    adminOn = true;
    powerBank = 1e9;
    const core = makeCore(12345, tier);
    generateCells(core);
    core.cells = core.cells.filter(c => !isMatrix(c));
    core.clean = true;
    inventory.push(core);
    loadCore(core);
    showView('facet');
    await sleep(2500);

    const sample = () => ({
      t: +performance.now().toFixed(0),
      shards: voxels.length,
      visible: voxels.filter(v => v.mesh && v.mesh.visible).length,
      calls: renderer.info.render.calls,
      tris: renderer.info.render.triangles,
      geo: renderer.info.memory.geometries,
      gap: +sawGap.toFixed(3)
    });

    const start = sample();

    // Frame-time sampler running across the whole cut.
    const deltas = [];
    let last = performance.now(), running = true;
    (function step(now) {
      deltas.push(now - last); last = now;
      if (running) requestAnimationFrame(step);
    })(performance.now());

    // Hold the button down. sawTick advances the blade and does the splitting.
    const series = [];
    sawClosing = true;
    for (let i = 0; i < 90; i++) {
      await sleep(200);
      sawClosing = true;               // a real hold re-asserts every frame
      series.push(sample());
      if (sawGap <= 0.06) break;
    }
    sawClosing = false;
    running = false;
    await sleep(300);

    deltas.shift();
    const s = deltas.slice().sort((a, b) => a - b);
    const peakBy = k => series.reduce((a, b) => (b[k] > a[k] ? b : a), series[0] || start);

    return {
      tier,
      vox: TIERS[tier].vox, halfN: TIERS[tier].halfN,
      start,
      end: sample(),
      peakShards: peakBy('shards'),
      peakCalls: peakBy('calls'),
      peakTris: peakBy('tris'),
      frames: {
        n: deltas.length,
        p50: +s[Math.floor(s.length * 0.5)].toFixed(1),
        p95: +s[Math.floor(s.length * 0.95)].toFixed(1),
        max: +Math.max(...deltas).toFixed(1)
      },
      series: series.filter((_, i) => i % 4 === 0).slice(0, 14)
    };
  }, { tier });

  out.throttle = throttle;
  out.errors = errs.slice(0, 3);
  await b.close();
  return out;
}

(async () => {
  const rows = [];
  for (const tier of [1, 2, 3]) {
    const r = await run(tier, 1);
    rows.push(r);
    console.log(`\n=== TIER ${r.tier}  vox=${r.vox} halfN=${r.halfN} ===`);
    console.log(`  start   shards ${r.start.shards} vis ${r.start.visible} calls ${r.start.calls} tris ${r.start.tris} gap ${r.start.gap}`);
    console.log(`  PEAK    shards ${r.peakShards.shards} vis ${r.peakShards.visible} (gap ${r.peakShards.gap})`);
    console.log(`  PEAK    calls  ${r.peakCalls.calls}  tris ${r.peakTris.tris}`);
    console.log(`  end     shards ${r.end.shards} vis ${r.end.visible} calls ${r.end.calls} gap ${r.end.gap}`);
    console.log(`  frames  p50 ${r.frames.p50}ms p95 ${r.frames.p95}ms max ${r.frames.max}ms  (n=${r.frames.n})`);
    console.log('  trace   ' + r.series.map(s => `${s.gap}:${s.shards}/${s.visible}`).join('  '));
    if (r.errors.length) console.log('  ERRORS ' + JSON.stringify(r.errors));
  }
  require('fs').writeFileSync('perf2-results.json', JSON.stringify(rows, null, 2));
})();
