/* DEEPER — painterly renderer ("Stylised-Real").
   Material surfaces, soft AO, top-left key light, glowing treasure. */
(function (global) {
  'use strict';
  const D = global.DEEPER;
  const TILE = 48;        // logical tile px
  const SS = 2;           // supersample for crisp upscale

  /* ---- colour helpers ---- */
  function hx(h) { h = h.replace('#',''); return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)]; }
  function rgba(c, a) { const [r,g,b]=hx(c); return `rgba(${r},${g},${b},${a})`; }
  function mix(c1, c2, t) { const a=hx(c1), b=hx(c2); return `rgb(${Math.round(a[0]+(b[0]-a[0])*t)},${Math.round(a[1]+(b[1]-a[1])*t)},${Math.round(a[2]+(b[2]-a[2])*t)})`; }
  function shade(c, amt) { const [r,g,b]=hx(c); const f=v=> Math.max(0,Math.min(255, v + amt)); return `rgb(${f(r)},${f(g)},${f(b)})`; }

  function rr(ctx, x, y, w, h, r) {
    if (typeof r === 'number') r = {tl:r,tr:r,br:r,bl:r};
    ctx.beginPath();
    ctx.moveTo(x+r.tl, y);
    ctx.lineTo(x+w-r.tr, y); ctx.arcTo(x+w, y, x+w, y+r.tr, r.tr);
    ctx.lineTo(x+w, y+h-r.br); ctx.arcTo(x+w, y+h, x+w-r.br, y+h, r.br);
    ctx.lineTo(x+r.bl, y+h); ctx.arcTo(x, y+h, x, y+h-r.bl, r.bl);
    ctx.lineTo(x, y+r.tl); ctx.arcTo(x, y, x+r.tl, y, r.tl);
    ctx.closePath();
  }

  /* ---- dirt tile (seamless-ish mottle, low contrast) ---- */
  function drawDirt(ctx, x, y, rng, P) {
    const g = ctx.createLinearGradient(x, y, x+TILE, y+TILE);
    g.addColorStop(0, P.dirtHi); g.addColorStop(0.5, P.dirt); g.addColorStop(1, P.dirtLo);
    ctx.fillStyle = g; ctx.fillRect(x, y, TILE, TILE);
    // organic mottle — low contrast clumps
    for (let i=0;i<14;i++){
      const px=x+rng()*TILE, py=y+rng()*TILE, rad=3+rng()*9;
      ctx.beginPath(); ctx.arc(px,py,rad,0,7);
      ctx.fillStyle = rgba(rng()>0.5?P.dirtHi:P.dirtLo, 0.12+rng()*0.12); ctx.fill();
    }
    // fine grain
    for (let i=0;i<26;i++){
      ctx.fillStyle = rgba(rng()>0.5?'#000000':'#ffffff', 0.04+rng()*0.05);
      ctx.fillRect(x+rng()*TILE, y+rng()*TILE, 1.4, 1.4);
    }
    // occasional embedded pebble
    if (rng()<0.5){
      const px=x+6+rng()*(TILE-12), py=y+6+rng()*(TILE-12), pr=2+rng()*2.5;
      ctx.beginPath(); ctx.arc(px,py,pr,0,7); ctx.fillStyle=P.pebble; ctx.fill();
      ctx.beginPath(); ctx.arc(px-pr*0.3,py-pr*0.3,pr*0.5,0,7); ctx.fillStyle=rgba('#ffffff',0.35); ctx.fill();
    }
  }

  /* ---- stone / hard pocket: organic lump that fuses with rock neighbours ---- */
  function drawRock(ctx, x, y, grid, c, r, rng, P, hard) {
    const top=D.isRock(grid,c,r-1), bot=D.isRock(grid,c,r+1), left=D.isRock(grid,c-1,r), right=D.isRock(grid,c+1,r);
    const OVER=5, IN=7;
    const l = x - (left?OVER:IN), t = y - (top?OVER:IN);
    const w = TILE + (left?OVER:IN) + (right?OVER:IN);
    const h = TILE + (top?OVER:IN) + (bot?OVER:IN);
    const rad = {
      tl: (top||left)?4:IN+4, tr:(top||right)?4:IN+4,
      br:(bot||right)?4:IN+4, bl:(bot||left)?4:IN+4,
    };
    const base = hard ? {hi:P.hardHi, mid:P.hard, lo:P.hardLo} : {hi:P.stoneHi, mid:P.stone, lo:P.stoneLo};
    ctx.save();
    // soft seat shadow under the lump
    ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 5; ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 3;
    rr(ctx, l, t, w, h, rad);
    const g = ctx.createLinearGradient(l, t, l+w, t+h);
    g.addColorStop(0, base.hi); g.addColorStop(0.5, base.mid); g.addColorStop(1, base.lo);
    ctx.fillStyle = g; ctx.fill();
    ctx.restore();
    // clip to lump for surface detail
    ctx.save(); rr(ctx, l, t, w, h, rad); ctx.clip();
    // speckle
    for (let i=0;i<22;i++){ ctx.fillStyle=rgba(rng()>0.5?base.hi:base.lo, 0.18); ctx.fillRect(l+rng()*w, t+rng()*h, 2, 2); }
    if (hard){ // banded hatching for hard-stone
      ctx.strokeStyle=rgba('#000000',0.18); ctx.lineWidth=1.5;
      for(let yy=t+4; yy<t+h; yy+=7){ ctx.beginPath(); ctx.moveTo(l,yy); ctx.lineTo(l+w,yy-3); ctx.stroke(); }
    }
    // top-left rim light + bottom-right AO
    ctx.strokeStyle=rgba('#ffffff',0.20); ctx.lineWidth=2; rr(ctx, l+1, t+1, w-2, h-2, rad); ctx.stroke();
    const ao=ctx.createLinearGradient(l, t, l+w, t+h);
    ao.addColorStop(0.55,'rgba(0,0,0,0)'); ao.addColorStop(1,'rgba(0,0,0,0.30)');
    ctx.fillStyle=ao; ctx.fillRect(l,t,w,h);
    ctx.restore();
  }

  /* ---- ore overlay (nuggets / gem + glow) ---- */
  function drawOre(ctx, x, y, type, rng) {
    const o = D.ORES[type];
    const cx=x+TILE/2, cy=y+TILE/2;
    if (o.glow) {
      const gr=ctx.createRadialGradient(cx,cy,2,cx,cy,TILE*0.62);
      gr.addColorStop(0, rgba(o.glow,0.55)); gr.addColorStop(0.4, rgba(o.glow,0.22)); gr.addColorStop(1,'rgba(0,0,0,0)');
      ctx.globalCompositeOperation='lighter'; ctx.fillStyle=gr; ctx.fillRect(x-6,y-6,TILE+12,TILE+12);
      ctx.globalCompositeOperation='source-over';
    }
    const n = 4 + Math.floor(rng()*3);
    for (let i=0;i<n;i++){
      const a=rng()*7, dist=rng()*9, nx=cx+Math.cos(a)*dist, ny=cy+Math.sin(a)*dist, rad=4+rng()*5;
      ctx.beginPath(); ctx.arc(nx,ny,rad,0,7);
      const g=ctx.createRadialGradient(nx-rad*0.35,ny-rad*0.4,1,nx,ny,rad);
      g.addColorStop(0, shade(o.core,38)); g.addColorStop(0.6,o.core); g.addColorStop(1,o.edge);
      ctx.fillStyle=g; ctx.fill();
      ctx.lineWidth=1; ctx.strokeStyle=rgba(o.edge,0.8); ctx.stroke();
      // glint
      ctx.beginPath(); ctx.arc(nx-rad*0.4, ny-rad*0.45, rad*0.28, 0, 7); ctx.fillStyle=rgba('#ffffff',0.85); ctx.fill();
    }
  }

  /* ---- the pod (hero asset) ---- */
  function drawPod(ctx, cx, cy, s) {
    ctx.save();
    ctx.translate(cx, cy);
    const W=58*s, H=52*s;
    // thruster flame (additive teardrop, underside)
    ctx.globalCompositeOperation='lighter';
    const fl=ctx.createRadialGradient(0,H*0.5,1,0,H*0.7,26*s);
    fl.addColorStop(0, rgba('#fff7d6',0.95)); fl.addColorStop(0.4, rgba('#ffb43a',0.7)); fl.addColorStop(1,'rgba(255,90,20,0)');
    ctx.beginPath(); ctx.moveTo(-9*s,H*0.42); ctx.quadraticCurveTo(0,H*1.05,9*s,H*0.42); ctx.quadraticCurveTo(0,H*0.5,-9*s,H*0.42); ctx.fillStyle=fl; ctx.fill();
    ctx.globalCompositeOperation='source-over';

    // drill (nose, pointing down)
    const dgrad=ctx.createLinearGradient(-12*s,H*0.3,12*s,H*0.62);
    dgrad.addColorStop(0,'#e9edf2'); dgrad.addColorStop(0.5,'#9aa3ad'); dgrad.addColorStop(1,'#5c636c');
    ctx.beginPath(); ctx.moveTo(-13*s,H*0.30); ctx.lineTo(13*s,H*0.30); ctx.lineTo(0,H*0.66); ctx.closePath();
    ctx.fillStyle=dgrad; ctx.fill();
    ctx.strokeStyle=rgba('#2b2f34',0.6); ctx.lineWidth=1.5*s; ctx.stroke();
    // drill bands
    ctx.strokeStyle=rgba('#3a3f45',0.7); ctx.lineWidth=1.4*s;
    for(let i=1;i<=2;i++){ const yy=H*0.30 + i*H*0.10; const ww=13*s*(1-i*0.30); ctx.beginPath(); ctx.moveTo(-ww,yy); ctx.lineTo(ww,yy); ctx.stroke(); }

    // body (gold/amber rounded chassis, top-left light)
    rr(ctx, -W/2, -H/2, W, H*0.78, 12*s);
    const bg=ctx.createLinearGradient(-W/2,-H/2,W/2,H*0.3);
    bg.addColorStop(0,'#ffd870'); bg.addColorStop(0.45,'#e7a531'); bg.addColorStop(1,'#a96f1c');
    ctx.fillStyle=bg; ctx.fill();
    // steel trim outline
    ctx.lineWidth=2*s; ctx.strokeStyle='#6e4d18'; ctx.stroke();

    // hazard skid plate (bottom)
    ctx.save(); rr(ctx, -W/2, H*0.06, W, H*0.22, {tl:0,tr:0,br:10*s,bl:10*s}); ctx.clip();
    ctx.fillStyle='#2c2f35'; ctx.fillRect(-W/2,H*0.06,W,H*0.22);
    ctx.fillStyle='#f5c542';
    for(let i=-4;i<5;i++){ ctx.beginPath(); const xx=i*12*s; ctx.moveTo(xx,H*0.06); ctx.lineTo(xx+8*s,H*0.06); ctx.lineTo(xx,H*0.30); ctx.lineTo(xx-8*s,H*0.30); ctx.closePath(); ctx.fill(); }
    ctx.restore();

    // visor (glowing cyan eye)
    const vx=0, vy=-H*0.10, vr=12*s;
    ctx.globalCompositeOperation='lighter';
    const vg=ctx.createRadialGradient(vx,vy,1,vx,vy,vr*1.7);
    vg.addColorStop(0,rgba('#bff6ff',0.9)); vg.addColorStop(0.5,rgba('#36c8e6',0.5)); vg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=vg; ctx.beginPath(); ctx.arc(vx,vy,vr*1.7,0,7); ctx.fill();
    ctx.globalCompositeOperation='source-over';
    ctx.beginPath(); ctx.arc(vx,vy,vr,0,7);
    const vc=ctx.createRadialGradient(vx-vr*0.3,vy-vr*0.4,1,vx,vy,vr);
    vc.addColorStop(0,'#e8feff'); vc.addColorStop(0.5,'#37c6e8'); vc.addColorStop(1,'#0e6f93');
    ctx.fillStyle=vc; ctx.fill();
    ctx.lineWidth=2*s; ctx.strokeStyle='#0a2e3c'; ctx.stroke();
    ctx.beginPath(); ctx.arc(vx-vr*0.35,vy-vr*0.4,vr*0.3,0,7); ctx.fillStyle=rgba('#ffffff',0.9); ctx.fill();

    // rivets
    ctx.fillStyle=rgba('#5a3d12',0.8);
    [[-W/2+7*s,-H/2+7*s],[W/2-7*s,-H/2+7*s],[-W/2+7*s,H*0.0],[W/2-7*s,H*0.0]].forEach(p=>{ ctx.beginPath(); ctx.arc(p[0],p[1],2.2*s,0,7); ctx.fill(); });

    // antenna + red beacon
    ctx.strokeStyle='#8a8f96'; ctx.lineWidth=2*s; ctx.beginPath(); ctx.moveTo(-W*0.32,-H/2); ctx.lineTo(-W*0.40,-H*0.78); ctx.stroke();
    ctx.beginPath(); ctx.arc(-W*0.40,-H*0.80,3*s,0,7); ctx.fillStyle='#ff4338'; ctx.fill();
    ctx.globalCompositeOperation='lighter'; ctx.beginPath(); ctx.arc(-W*0.40,-H*0.80,5*s,0,7); ctx.fillStyle=rgba('#ff4338',0.4); ctx.fill(); ctx.globalCompositeOperation='source-over';

    // top gloss
    rr(ctx, -W/2+3*s, -H/2+3*s, W-6*s, H*0.22, {tl:9*s,tr:9*s,br:2*s,bl:2*s});
    ctx.fillStyle=rgba('#ffffff',0.22); ctx.fill();
    ctx.restore();
  }

  /* ---- dig dust burst at the drill tip ---- */
  function drawDust(ctx, x, y, rng, P) {
    for(let i=0;i<10;i++){ const a=Math.PI*(0.15+rng()*0.7), d=6+rng()*22; const px=x+Math.cos(a)*d, py=y+Math.sin(a)*d*0.5; ctx.beginPath(); ctx.arc(px,py,3+rng()*5,0,7); ctx.fillStyle=rgba(P.dirtHi,0.28); ctx.fill(); }
  }

  function renderPainterly(canvas, scene) {
    const W = scene.cols*TILE, H = scene.rows*TILE;
    canvas.width = W*SS; canvas.height = H*SS;
    canvas.style.width='100%'; canvas.style.height='auto';
    const ctx = canvas.getContext('2d'); ctx.scale(SS,SS);
    const P = D.TOPSOIL;

    // sky gradient + cave dark below
    const sky=ctx.createLinearGradient(0,0,0,scene.surfaceRow*TILE);
    sky.addColorStop(0,P.skyTop); sky.addColorStop(0.6,P.skyMid); sky.addColorStop(1,P.skyHorizon);
    ctx.fillStyle=sky; ctx.fillRect(0,0,W,scene.surfaceRow*TILE);
    // moon
    const mx=W*0.30, my=TILE*1.05, mr=TILE*0.62;
    const mg=ctx.createRadialGradient(mx-mr*0.3,my-mr*0.3,2,mx,my,mr);
    mg.addColorStop(0,'#fdfdf4'); mg.addColorStop(1,'#c9ccdd'); ctx.fillStyle=mg; ctx.beginPath(); ctx.arc(mx,my,mr,0,7); ctx.fill();
    ctx.globalCompositeOperation='lighter'; const mh=ctx.createRadialGradient(mx,my,mr*0.6,mx,my,mr*2.2); mh.addColorStop(0,rgba('#cfe0ff',0.25)); mh.addColorStop(1,'rgba(0,0,0,0)'); ctx.fillStyle=mh; ctx.beginPath(); ctx.arc(mx,my,mr*2.2,0,7); ctx.fill(); ctx.globalCompositeOperation='source-over';
    // stars
    const rs=D.mulberry32(7);
    for(let i=0;i<40;i++){ ctx.fillStyle=rgba('#ffffff',0.3+rs()*0.5); ctx.fillRect(rs()*W, rs()*(scene.surfaceRow*TILE-6), 1.4,1.4); }
    // cave dark backing under surface
    ctx.fillStyle=P.caveDark; ctx.fillRect(0,scene.surfaceRow*TILE,W,H-scene.surfaceRow*TILE);

    const grid=scene.grid;
    // pass 1: dirt base under every solid tile + grass
    for(let r=0;r<scene.rows;r++)for(let c=0;c<scene.cols;c++){
      const t=grid[r][c]; if(t.type==='sky'||t.type==='empty') continue;
      const rng=D.mulberry32((c*131+r*977+11)>>>0);
      drawDirt(ctx, c*TILE, r*TILE, rng, P);
    }
    // pass 2: grass crown on the surface row
    for(let c=0;c<scene.cols;c++){ const t=grid[scene.surfaceRow][c]; if(t.type!=='grass') continue;
      const x=c*TILE, y=scene.surfaceRow*TILE; const rng=D.mulberry32((c*53+7)>>>0);
      const gg=ctx.createLinearGradient(x,y,x,y+10); gg.addColorStop(0,P.grass); gg.addColorStop(1,P.grassLo); ctx.fillStyle=gg; ctx.fillRect(x,y,TILE,9);
      ctx.strokeStyle=P.grass; ctx.lineWidth=1.4;
      for(let i=0;i<10;i++){ const bx=x+rng()*TILE; ctx.beginPath(); ctx.moveTo(bx,y+8); ctx.lineTo(bx+(rng()-0.5)*5,y+1+rng()*3); ctx.stroke(); }
    }
    // pass 3: rock pockets
    for(let r=0;r<scene.rows;r++)for(let c=0;c<scene.cols;c++){
      const t=grid[r][c]; if(t.type!=='stone'&&t.type!=='hard') continue;
      const rng=D.mulberry32((c*197+r*613+5)>>>0);
      drawRock(ctx, c*TILE, r*TILE, grid, c, r, rng, P, t.type==='hard');
    }
    // pass 4: ore overlays
    for(let r=0;r<scene.rows;r++)for(let c=0;c<scene.cols;c++){
      const t=grid[r][c]; if(!t.ore) continue;
      const rng=D.mulberry32((c*311+r*89+3)>>>0);
      drawOre(ctx, c*TILE, r*TILE, t.ore, rng);
    }
    // pass 5: tunnel edge AO (soft inner shadow where solid meets the dug shaft)
    for(let r=0;r<scene.rows;r++)for(let c=0;c<scene.cols;c++){
      if(grid[r][c].type!=='empty') continue; const x=c*TILE,y=r*TILE;
      const v=ctx.createRadialGradient(x+TILE/2,y+TILE/2,TILE*0.2,x+TILE/2,y+TILE/2,TILE*0.9);
      v.addColorStop(0,'rgba(0,0,0,0)'); v.addColorStop(1,'rgba(0,0,0,0.5)');
      ctx.fillStyle=v; ctx.fillRect(x-TILE/2,y-TILE/2,TILE*2,TILE*2);
    }

    // pod at its tile (sitting at the bottom of the shaft, drilling down)
    const pcx=(scene.pod.col+0.5)*TILE, pcy=(scene.pod.row+0.5)*TILE;
    drawDust(ctx, pcx, pcy+TILE*0.5, D.mulberry32(99), P);
    drawPod(ctx, pcx, pcy, 0.92);

    // global underground darkness gradient (deeper = darker)
    const dk=ctx.createLinearGradient(0,scene.surfaceRow*TILE,0,H);
    dk.addColorStop(0,'rgba(0,0,0,0)'); dk.addColorStop(1,'rgba(0,0,0,0.42)');
    ctx.fillStyle=dk; ctx.fillRect(0,scene.surfaceRow*TILE,W,H-scene.surfaceRow*TILE);
    // lamp glow around the pod
    ctx.globalCompositeOperation='lighter';
    const lamp=ctx.createRadialGradient(pcx,pcy,TILE*0.3,pcx,pcy,TILE*2.6);
    lamp.addColorStop(0,rgba('#ffe9b0',0.16)); lamp.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=lamp; ctx.fillRect(0,0,W,H); ctx.globalCompositeOperation='source-over';
  }

  Object.assign(D, { renderPainterly });
})(window);
