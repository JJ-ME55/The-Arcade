/* DEEPER — pixel renderer ("Nostalgic Pixel").
   Low-res procedural scene blitted up with smoothing off → chunky pixels. */
(function (global) {
  'use strict';
  const D = global.DEEPER;
  const TILE = 48;      // display px per tile
  const LR = 12;        // low-res pixels per tile
  const SS = 2;         // device supersample of the *display* canvas

  // nostalgic, slightly punchier palette (faithful old-school)
  const PX = {
    dirt: ['#6f4a2a','#7e5532','#5c3d22','#8a6038'],
    grass:['#7cc24a','#5e9a35','#94d65c'],
    stone:['#6c655b','#807a70','#544f47','#928b80'],
    hard: ['#46423b','#5a554c','#332f29'],
    sky:  ['#0d1233','#161a44','#222658','#3a2f53'],
    coal: ['#26262b','#3b3b44','#1a1a1e'],
    copper:['#c0703a','#e08c4e','#8a4d26','#ffa860'],
    gold: ['#f2c33d','#ffe27a','#c9962a','#fff0b0'],
  };
  function pick(arr, rng){ return arr[Math.floor(rng()*arr.length)]; }

  function px(ctx,x,y,w,h,col){ ctx.fillStyle=col; ctx.fillRect(x,y,w,h); }

  function dirt(ctx,bx,by,rng){
    px(ctx,bx,by,LR,LR,PX.dirt[1]);
    for(let i=0;i<16;i++){ const v=rng(); px(ctx,bx+Math.floor(rng()*LR),by+Math.floor(rng()*LR),1,1, v<0.3?PX.dirt[2]:(v>0.82?PX.dirt[3]:pick(PX.dirt,rng))); }
    for(let i=0;i<3;i++){ if(rng()<0.6) px(ctx,bx+Math.floor(rng()*(LR-1)),by+Math.floor(rng()*(LR-1)),2,1,'#48301a'); }
    if(rng()<0.45) px(ctx,bx+2+Math.floor(rng()*(LR-4)),by+2+Math.floor(rng()*(LR-4)),2,2,'#9a8a6a');
  }
  function grass(ctx,bx,by,rng){
    dirt(ctx,bx,by,rng);
    px(ctx,bx,by,LR,3,PX.grass[1]);
    for(let i=0;i<LR;i+=2){ if(rng()<0.7) px(ctx,bx+i,by,1,2,pick(PX.grass,rng)); }
    px(ctx,bx,by,LR,1,PX.grass[2]);
  }
  function rock(ctx,bx,by,grid,c,r,rng,hard){
    const top=D.isRock(grid,c,r-1),bot=D.isRock(grid,c,r+1),left=D.isRock(grid,c-1,r),right=D.isRock(grid,c+1,r);
    const pal = hard?PX.hard:PX.stone;
    // start from dirt base then stamp the rock blob
    dirt(ctx,bx,by,rng);
    const il=left?0:2, it=top?0:2, ir=right?0:2, ib=bot?0:2;
    px(ctx,bx+il,by+it,LR-il-ir,LR-it-ib, pal[0]);
    // round the soil-facing corners (knock a pixel out)
    if(!top&&!left) px(ctx,bx+il,by+it,1,1,PX.dirt[2]);
    if(!top&&!right) px(ctx,bx+LR-ir-1,by+it,1,1,PX.dirt[2]);
    if(!bot&&!left) px(ctx,bx+il,by+LR-ib-1,1,1,PX.dirt[2]);
    if(!bot&&!right) px(ctx,bx+LR-ir-1,by+LR-ib-1,1,1,PX.dirt[2]);
    // speckle + top-left hi / bottom-right lo
    for(let i=0;i<8;i++){ px(ctx,bx+il+Math.floor(rng()*(LR-il-ir)),by+it+Math.floor(rng()*(LR-it-ib)),1,1,pick(pal,rng)); }
    px(ctx,bx+il,by+it,LR-il-ir,1,pal[1]); // top hi
    px(ctx,bx+il,by+it,1,LR-it-ib,pal[1]);
    px(ctx,bx+il,by+LR-ib-1,LR-il-ir,1,pal[2]); // bottom lo
    if(hard){ px(ctx,bx,by+Math.floor(LR/2),LR,1,'#2b2823'); } // band
  }
  function ore(ctx,bx,by,type,rng){
    const pal = PX[type];
    const cx=bx+LR/2, cy=by+LR/2;
    const glow = (type==='gold'||type==='copper');
    if(glow){ // soft 1px halo ring
      ctx.fillStyle = type==='gold' ? 'rgba(255,226,122,0.30)' : 'rgba(255,157,84,0.22)';
      ctx.fillRect(bx+1,by+1,LR-2,LR-2);
    }
    const spots=[[0,-2],[-2,0],[2,1],[0,2],[-1,-1],[2,-2]];
    const n=4+Math.floor(rng()*2);
    for(let i=0;i<n;i++){ const s=spots[i%spots.length]; const x=Math.round(cx+s[0]), y=Math.round(cy+s[1]);
      px(ctx,x-1,y-1,2,2, pal[rng()<0.5?0:2]); px(ctx,x-1,y-1,1,1, pal[0]); }
    // bright glint
    px(ctx,Math.round(cx)-1,Math.round(cy)-2,1,1, pal[1]||'#ffffff');
    if(glow) px(ctx,Math.round(cx)+1,Math.round(cy),1,1,'#ffffff');
  }
  function pod(ctx,bx,by){
    const A='#6e7263', AH='#9ea291', AL='#444940', steel='#23252b', visor='#37c6e8', visH='#cffaff';
    // headlight cone (warm light widening down from the nose)
    ctx.fillStyle='rgba(255,243,200,0.16)';
    px(ctx,bx+4,by+15,5,2); px(ctx,bx+3,by+17,7,2); px(ctx,bx+2,by+19,9,3);
    // flame under
    px(ctx,bx+5,by+13,3,2,'#ffd34d'); px(ctx,bx+5,by+15,3,1,'#ff8a2a');
    // drill (triangle below body)
    px(ctx,bx+3,by+12,7,1,'#9aa3ad'); px(ctx,bx+4,by+13,5,1,'#cbd2d9'); px(ctx,bx+5,by+14,3,1,'#9aa3ad'); px(ctx,bx+6,by+15,1,1,'#e9edf2');
    // body (dark gunmetal-olive)
    px(ctx,bx+1,by+2,11,10,A);
    px(ctx,bx+1,by+2,11,1,AH); px(ctx,bx+1,by+2,1,10,AH); // top-left light
    px(ctx,bx+11,by+3,1,9,AL); px(ctx,bx+2,by+11,10,1,AL); // bottom-right shade
    // hazard skid (amber accent)
    px(ctx,bx+1,by+12,11,2,steel);
    for(let i=0;i<11;i+=3){ px(ctx,bx+1+i,by+12,1,2,'#e7a531'); }
    // visor (glowing cyan eye) = headlight source
    px(ctx,bx+4,by+5,5,3,visor); px(ctx,bx+4,by+5,2,1,visH); px(ctx,bx+5,by+6,1,1,'#0e6f93'); px(ctx,bx+7,by+6,1,1,visH);
    // rivets
    px(ctx,bx+2,by+3,1,1,AL); px(ctx,bx+10,by+3,1,1,AL); px(ctx,bx+2,by+10,1,1,AL); px(ctx,bx+10,by+10,1,1,AL);
    // antenna + beacon
    px(ctx,bx+2,by,1,2,'#8a8f96'); px(ctx,bx+2,by-1,1,1,'#ff4338');
  }

  function renderPixel(canvas, scene){
    const Wt=scene.cols*TILE, Ht=scene.rows*TILE;
    const lw=scene.cols*LR, lh=scene.rows*LR;
    const off=document.createElement('canvas'); off.width=lw; off.height=lh;
    const o=off.getContext('2d');

    // sky bands
    const skyH=scene.surfaceRow*LR;
    for(let y=0;y<skyH;y++){ const t=y/skyH; const idx=Math.min(PX.sky.length-1, Math.floor(t*PX.sky.length)); px(o,0,y,lw,1,PX.sky[idx]); }
    // stars
    const rs=D.mulberry32(13); for(let i=0;i<22;i++){ px(o,Math.floor(rs()*lw),Math.floor(rs()*(skyH-2)),1,1,'#ffffff'); }
    // moon
    const mx=Math.floor(lw*0.3), my=Math.floor(LR*1.1), mr=Math.floor(LR*0.7);
    o.fillStyle='#e9ebf5'; o.beginPath(); o.arc(mx,my,mr,0,7); o.fill();
    o.fillStyle='#fdfdf4'; o.beginPath(); o.arc(mx-1,my-1,mr-1,0,7); o.fill();
    o.fillStyle='#c9ccdd'; px(o,mx+1,my+1,1,1,'#c9ccdd');
    // cave dark backing
    px(o,0,skyH,lw,lh-skyH,'#1c130c');

    const grid=scene.grid;
    for(let r=0;r<scene.rows;r++)for(let c=0;c<scene.cols;c++){
      const t=grid[r][c]; if(t.type==='sky'||t.type==='empty') continue;
      const rng=D.mulberry32((c*131+r*977+11)>>>0);
      const bx=c*LR, by=r*LR;
      if(t.type==='grass') grass(o,bx,by,rng);
      else if(t.type==='stone') rock(o,bx,by,grid,c,r,rng,false);
      else if(t.type==='hard') rock(o,bx,by,grid,c,r,rng,true);
      else dirt(o,bx,by,rng);
    }
    // ore
    for(let r=0;r<scene.rows;r++)for(let c=0;c<scene.cols;c++){ const t=grid[r][c]; if(!t.ore) continue;
      ore(o, c*LR, r*LR, t.ore, D.mulberry32((c*311+r*89+3)>>>0)); }
    // tunnel AO (darken shaft edges)
    for(let r=0;r<scene.rows;r++)for(let c=0;c<scene.cols;c++){ if(grid[r][c].type!=='empty') continue;
      o.fillStyle='rgba(0,0,0,0.35)'; o.fillRect(c*LR,r*LR,1,LR); o.fillRect((c+1)*LR-1,r*LR,1,LR); }
    // deeper-darkness wash (before pod so the headlight reads)
    const dk=o.createLinearGradient(0,skyH,0,lh); dk.addColorStop(0,'rgba(0,0,0,0)'); dk.addColorStop(1,'rgba(0,0,0,0.4)');
    o.fillStyle=dk; o.fillRect(0,skyH,lw,lh-skyH);

    // pod
    pod(o, (scene.pod.col)*LR, (scene.pod.row)*LR-1);

    // blit up with no smoothing
    canvas.width=Wt*SS; canvas.height=Ht*SS; canvas.style.width='100%'; canvas.style.height='auto';
    const ctx=canvas.getContext('2d'); ctx.imageSmoothingEnabled=false;
    ctx.drawImage(off,0,0,lw,lh,0,0,Wt*SS,Ht*SS);
  }

  Object.assign(D, { renderPixel });
})(window);
