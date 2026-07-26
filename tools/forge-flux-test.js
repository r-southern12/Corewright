const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport:{width:1200,height:800} });
  const errs=[]; p.on('pageerror',e=>errs.push('PAGEERROR '+e.message));
  p.on('console',m=>{ if(m.type()==='error') errs.push(m.text()); });
  await p.goto('http://localhost:8099/index.html');
  await p.waitForTimeout(4500);

  const r = await p.evaluate(async () => {
    const sleep=ms=>new Promise(r=>setTimeout(r,ms));
    adminOn=true; metals.copper=99;
    if (tut&&tut.on) tut.on=false;
    forgePart=FORGE_TEMPLATES.find(m=>m.id==='copperFrame'); forgeActive=false; showView('forgeb');
    await sleep(400);
    const seed={fill:+forgeFillFrac().toFixed(3), mould:fgMouldTotal,
      billet:(()=>{let n=0;for(let i=0;i<FG_N;i++)if(fgFill[i])n++;return n;})()};

    // frame-time sampler across the whole flux session
    const deltas=[]; let last=performance.now(), running=true;
    (function step(now){ deltas.push(now-last); last=now; if(running) requestAnimationFrame(step); })(performance.now());

    // sweep the torch around the frame ring: walk the aim around the border so
    // metal is driven outward into the mould. fluxHeat reads fluxAim in grid coords.
    fluxOn=true;
    const cx=(FGW-1)/2, cz=(FGD-1)/2, ring=3.2;
    const prog=[];
    for (let t=0;t<220;t++){
      const a=t*0.28;
      fluxAim={x:cx+Math.cos(a)*ring, z:cz+Math.sin(a)*ring};
      await sleep(16);
      if (t%40===0) prog.push({t, fill:+forgeFillFrac().toFixed(3), q:+forgeQualityNow().toFixed(3), flash:fgFlash});
    }
    fluxOn=false;
    await sleep(1200);   // let it cool and settle
    running=false;
    deltas.shift();
    const s=deltas.slice().sort((a,b)=>a-b);

    const afterFlux={fill:+forgeFillFrac().toFixed(3), q:+forgeQualityNow().toFixed(3), flash:fgFlash};

    // recess stamp
    forgeToStamp();
    const stampPhase=forgePhase;
    for (let i=0;i<3;i++) stampRecess();
    const afterStamp={phase:forgePhase, recessHits, q:+forgeQualityNow().toFixed(3), finishEnabled:!document.getElementById('fbFinish').disabled};

    return {
      seed, prog, afterFlux, afterStamp, stampPhase,
      frame:{ n:deltas.length, p50:+s[(s.length*0.5)|0].toFixed(1), p95:+s[(s.length*0.95)|0].toFixed(1), max:+Math.max(...deltas).toFixed(1) },
      draws: renderer.info.render.calls,
      bands: forgeBandMesh.map(im=>im.count)
    };
  });
  console.log(JSON.stringify(r,null,1));
  console.log('ERRORS('+errs.length+')'); errs.slice(0,8).forEach(e=>console.log('  '+e));
  await p.screenshot({path:'forge-flux.png'});
  await b.close();
})();
