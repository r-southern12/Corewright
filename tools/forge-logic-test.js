const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport:{width:1000,height:700} });
  const errs=[]; p.on('pageerror',e=>errs.push('PAGEERROR '+e.message));
  p.on('console',m=>{ if(m.type()==='error') errs.push(m.text()); });
  await p.goto('http://localhost:8099/index.html');
  await p.waitForTimeout(4000);
  const r = await p.evaluate(async () => {
    const sleep=ms=>new Promise(r=>setTimeout(r,ms));
    adminOn=true; metals.copper=99;
    forgePart=FORGE_TEMPLATES.find(m=>m.id==='copperFrame'); forgeActive=false; showView('forgeb');
    await sleep(300);

    // SCENARIO A: perfect placement — tile the footprint flat with 9 chunks,
    // one deliberate pile-up with the 10th.
    forgeMap.clear(); forgeChunksLeft=10; forgePhase='place';
    const tile=[[0,0],[2,0],[4,0],[0,2],[2,2],[4,2],[0,4],[2,4],[4,4]];
    for (const [ix,iz] of tile) placeAtGrid(ix,iz);
    placeAtGrid(2,2);                 // 10th: stacks into a pile
    const A_place={inm:forgeFillFlash().inm, fl:forgeFillFlash().fl, q:+forgeQualityNow().toFixed(3)};
    heatForge();
    // whack the pile columns down
    let guard=0;
    while (forgeFillFlash().fl>0 && guard++<200){
      // find a proud column and hit it
      let hit=false;
      for (let ix=0;ix<6&&!hit;ix++) for (let iz=0;iz<6&&!hit;iz++) if (whackColumn(ix,iz)) hit=true;
      if (!hit) break;
    }
    const A_whack={inm:forgeFillFlash().inm, fl:forgeFillFlash().fl, q:+forgeQualityNow().toFixed(3), guard};

    // SCENARIO B: sloppy placement — dump all 10 chunks in one corner.
    forgeMap.clear(); forgeChunksLeft=10; forgePhase='place';
    for (let i=0;i<10;i++) placeAtGrid(1,1);
    const B_place={inm:forgeFillFlash().inm, fl:forgeFillFlash().fl, q:+forgeQualityNow().toFixed(3)};
    heatForge();
    guard=0;
    while (forgeFillFlash().fl>0 && guard++<400){
      let hit=false;
      for (let ix=0;ix<6&&!hit;ix++) for (let iz=0;iz<6&&!hit;iz++) if (whackColumn(ix,iz)) hit=true;
      if (!hit) break;
    }
    const B_whack={inm:forgeFillFlash().inm, fl:forgeFillFlash().fl, q:+forgeQualityNow().toFixed(3), guard};

    return {mouldTotal:F_MOULD_TOTAL, A_place, A_whack, B_place, B_whack};
  });
  console.log(JSON.stringify(r,null,1));
  console.log('ERRORS('+errs.length+')'); errs.slice(0,6).forEach(e=>console.log('  '+e));
  await b.close();
})();
