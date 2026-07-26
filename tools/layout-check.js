const { chromium } = require('playwright');

// Capture the main screens at phone-landscape size. 844x390 is an iPhone 14
// landscape: the tightest common case. If it works here it works on the taller
// Android landscape sizes too.

const W = +(process.argv[2] || 844), H = +(process.argv[3] || 390);
const TAG = process.argv[4] || 'before';

(async () => {
  const b = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader']
  });
  const ctx = await b.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 2, isMobile: true, hasTouch: true
  });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/user/Corewright/index.html');
  await p.waitForTimeout(4000);

  // Report anything that overflows the viewport — the concrete layout failures.
  const overflow = async label => await p.evaluate(({ W, H, label }) => {
    const bad = [];
    // Content taller than a scrollable ancestor is reachable, not a bug. Only
    // report things the player genuinely cannot get to.
    const inScroller = el => {
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const oy = getComputedStyle(p).overflowY;
        if (oy === 'auto' || oy === 'scroll') return true;
      }
      return false;
    };
    for (const el of document.querySelectorAll('body *')) {
      if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (inScroller(el)) continue;
      const over = [];
      if (r.right > W + 1) over.push('right+' + Math.round(r.right - W));
      if (r.bottom > H + 1) over.push('bottom+' + Math.round(r.bottom - H));
      if (r.left < -1) over.push('left' + Math.round(r.left));
      if (r.top < -1) over.push('top' + Math.round(r.top));
      if (over.length) bad.push({
        el: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ').filter(Boolean).slice(0,2).join('.') : ''),
        box: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)].join(','),
        over: over.join(' ')
      });
    }
    return { label, scrollW: document.documentElement.scrollWidth, scrollH: document.documentElement.scrollHeight, bad: bad.slice(0, 12) };
  }, { W, H, label });

  const shot = async name => { await p.screenshot({ path: `shot-${TAG}-${name}.png` }); };
  const report = [];

  await shot('01-surface'); report.push(await overflow('surface'));

  await p.keyboard.down('Control'); await p.keyboard.down('Shift');
  await p.keyboard.press('A');
  await p.keyboard.up('Shift'); await p.keyboard.up('Control');
  await p.waitForTimeout(1200);
  await shot('02-admin'); report.push(await overflow('admin'));

  // Drive straight to the screens via showView, avoiding click-target guessing.
  for (const [name, view] of [['03-lab','lab'], ['04-forge','forge'], ['05-brew','brew'], ['06-lapidary','lapidary']]) {
    await p.evaluate(v => showView(v), view);
    await p.waitForTimeout(1500);
    await shot(name); report.push(await overflow(view));
  }

  // A real bench with a core on it.
  await p.evaluate(async () => {
    adminOn = true; powerBank = 1e9;
    const core = makeCore(12345, 3); generateCells(core);
    core.cells = core.cells.filter(c => !isMatrix(c)); core.clean = true;
    inventory.push(core); loadCore(core); showView('facet');
  });
  await p.waitForTimeout(2500);
  await shot('07-facet'); report.push(await overflow('facet'));

  await p.evaluate(() => showView('cleave'));
  await p.waitForTimeout(1800);
  await shot('09-cleave'); report.push(await overflow('cleave'));

  await p.evaluate(() => showView('seatbench'));
  await p.waitForTimeout(2000);
  await shot('08-seat'); report.push(await overflow('seatbench'));

  console.log(JSON.stringify({ viewport: [W, H], report, errors: errs.slice(0, 5) }, null, 2));
  await b.close();
})();
