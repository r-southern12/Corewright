const { chromium } = require('playwright');

// Exercise the paths the instanced conversion touches: core swap (clearBench),
// dissolve/dying shards, matrix on the excavation bench, polish, seating, and
// a full new-game reset.

(async () => {
  const b = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader']
  });
  const p = await b.newPage({ viewport: { width: 1000, height: 700 } });
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('http://localhost:8099/index.html');
  await p.waitForTimeout(4000);

  const steps = await p.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const log = [];
    const snap = label => log.push({ label, calls: renderer.info.render.calls,
      shards: voxels.length, drawn: voxels.filter(v => !v.buried).length,
      batches: batches.size, mats: batchMats.size, dying: dying.length,
      inMineral: mineral.children.filter(o => o.isInstancedMesh).length });

    adminOn = true; powerBank = 1e9;

    // 1. A DIRTY core at the excavation bench: matrix present, different buckets.
    const dirty = makeCore(4242, 2); generateCells(dirty);
    inventory.push(dirty); loadCore(dirty); showView('dig');
    await sleep(2000); snap('dig/dirty');

    // 2. Swap to another core — clearBench must tear the batches down.
    const c2 = makeCore(777, 3); generateCells(c2);
    c2.cells = c2.cells.filter(c => !isMatrix(c)); c2.clean = true;
    inventory.push(c2); loadCore(c2); showView('facet');
    await sleep(2000); snap('facet/swapped');

    // 3. Dissolve: shards leave the batches and animate as individual meshes.
    const victims = new Set(voxels.slice(0, 12).map(v => v.mesh));
    dissolve(victims);
    await sleep(200); snap('mid-dissolve');
    await sleep(2500); snap('after-dissolve');

    // 4. Polish bench — applyPolishLook rewrites finish across every shard.
    showView('polish'); await sleep(1800); snap('polish');

    // 5. Seating bench.
    showView('seatbench'); await sleep(1800); snap('seatbench');

    // 6. Back to the lab and a fresh core.
    showView('lapidary'); await sleep(1200); snap('lapidary');

    return log;
  });

  console.log(JSON.stringify(steps, null, 1));
  console.log('ERRORS(' + errs.length + ')');
  errs.slice(0, 8).forEach(e => console.log('  ' + e));
  await p.screenshot({ path: 'regress-end.png' });
  await b.close();
})();
