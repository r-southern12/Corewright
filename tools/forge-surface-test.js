const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport:{width:1200,height:800} });
  const errs=[]; p.on('pageerror',e=>errs.push('PAGEERROR '+e.message));
  p.on('console',m=>{ if(m.type()==='error') errs.push(m.text()); });
  await p.goto('http://localhost:8099/index.html');
  await p.waitForTimeout(4500);
  await p.evaluate(()=>{ if(tut&&tut.on)tut.on=false; const t=document.getElementById('tut'); if(t)t.style.display='none';
    const r=document.getElementById('instrumentRail'); if(r)r.style.display='none'; });

  const out = await p.evaluate(async ()=>{
    const sleep=ms=>new Promise(r=>setTimeout(r,ms));
    adminOn=true; metals.copper=99;
    forgePart=FORGE_TEMPLATES.find(m=>m.id==='copperFrame'); forgeActive=false; showView('forgeb');
    forgeGroup.rotation.set(0.5,0.4,0);
    // time syncForgeMesh: wrap it
    const orig=syncForgeMesh; let syncMs=0, syncN=0;
    syncForgeMesh=function(){ const t=performance.now(); const r=orig.apply(this,arguments); syncMs+=performance.now()-t; syncN++; return r; };
    await sleep(500);

    // frame sampler
    const deltas=[]; let last=performance.now(), running=true;
    (function step(now){ deltas.push(now-last); last=now; if(running) requestAnimationFrame(step); })(performance.now());

    fluxOn=true;
    for (let t=0;t<200;t++){ const a=t*0.4, rr=1.6+ (t%50)/50*1.4;
      fluxAim={x:(FGW-1)/2+Math.cos(a)*rr, z:(FGD-1)/2+Math.sin(a)*rr}; await sleep(16); }
    fluxOn=false; await sleep(1200);
    running=false; deltas.shift();
    const s=deltas.slice().sort((a,b)=>a-b);
    return {
      fill:+forgeFillFrac().toFixed(3), q:+forgeQualityNow().toFixed(3), flash:fgFlash,
      tris:forgeVCount/3, verts:forgeVCount,
      syncAvgMs:+(syncMs/Math.max(1,syncN)).toFixed(3), syncCalls:syncN,
      frame:{ n:deltas.length, p50:+s[(s.length*0.5)|0].toFixed(1), p95:+s[(s.length*0.95)|0].toFixed(1), max:+Math.max(...deltas).toFixed(1) },
      draws:renderer.info.render.calls
    };
  });
  await p.screenshot({path:'surf-live.png'});
  console.log(JSON.stringify(out,null,1));
  console.log('ERRORS('+errs.length+')'); errs.slice(0,6).forEach(e=>console.log('  '+e));
  await b.close();
})();
