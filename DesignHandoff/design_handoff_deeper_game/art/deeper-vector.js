/* DEEPER — vector renderer ("Deep Vector / Jewel-Noir").
   A full redesign: faceted geological strata, treasure as glowing cut-gems,
   a sleek dark drill-drone casting a real headlight beam into the dark. */
(function (global) {
  'use strict';
  const D = global.DEEPER;
  const TILE = 48, SS = 2;

  function hx(h){h=h.replace('#','');return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];}
  function rgba(c,a){const[r,g,b]=hx(c);return `rgba(${r},${g},${b},${a})`;}
  function lerp(c1,c2,t){const a=hx(c1),b=hx(c2);return `rgb(${Math.round(a[0]+(b[0]-a[0])*t)},${Math.round(a[1]+(b[1]-a[1])*t)},${Math.round(a[2]+(b[2]-a[2])*t)})`;}
  function shade(c,amt){const[r,g,b]=hx(c);const f=v=>Math.max(0,Math.min(255,v+amt));return `rgb(${f(r)},${f(g)},${f(b)})`;}

  // stylised strata palette: warm umber (surface) -> mauve -> cold indigo (deep)
  const STRATA = { top:'#866041', mid:'#5a4663', deep:'#2b294a' };
  function strataColor(r, rows, surface){
    const t = Math.max(0, (r-surface)/(rows-surface));
    return t<0.5 ? lerp(STRATA.top, STRATA.mid, t/0.5) : lerp(STRATA.mid, STRATA.deep, (t-0.5)/0.5);
  }

  // gems: core + glow (luminous, faceted) — coal is matte (no glow)
  const GEM = {
    coal:   { core:'#34343c', hi:'#52525e', glow:null },
    copper: { core:'#d07b3e', hi:'#ffb064', glow:'#ff9a52' },
    gold:   { core:'#f6cb46', hi:'#fff0ad', glow:'#ffd24d' },
  };

  function rr(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}

  function drawGem(ctx, cx, cy, type){
    const g = GEM[type], R = 15;
    if (g.glow){
      ctx.globalCompositeOperation='lighter';
      const gr=ctx.createRadialGradient(cx,cy,1,cx,cy,R*2.4);
      gr.addColorStop(0,rgba(g.glow,0.6));gr.addColorStop(0.35,rgba(g.glow,0.25));gr.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=gr;ctx.beginPath();ctx.arc(cx,cy,R*2.4,0,7);ctx.fill();
      ctx.globalCompositeOperation='source-over';
    }
    // cut-gem silhouette: irregular hexagon
    const pts=[];
    for(let i=0;i<6;i++){const a=-Math.PI/2+i*Math.PI/3;const rr2=R*(0.82+((i*53)%7)/22);pts.push([cx+Math.cos(a)*rr2, cy+Math.sin(a)*rr2*1.05]);}
    ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();
    const bg=ctx.createLinearGradient(cx-R,cy-R,cx+R,cy+R);
    bg.addColorStop(0,g.hi);bg.addColorStop(0.5,g.core);bg.addColorStop(1,shade(g.core,-26));
    ctx.fillStyle=bg;ctx.fill();
    // facets from centre
    for(let i=0;i<6;i++){const a=pts[i],b=pts[(i+1)%6];ctx.beginPath();ctx.moveTo(cx,cy-2);ctx.lineTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.closePath();ctx.fillStyle=rgba(i%2?'#000000':'#ffffff', i%2?0.16:0.12);ctx.fill();}
    // rim + glint
    ctx.lineWidth=1.4;ctx.strokeStyle=rgba(g.glow||g.hi,0.85);ctx.stroke();
    ctx.beginPath();ctx.arc(cx-R*0.3,cy-R*0.35,2.4,0,7);ctx.fillStyle='rgba(255,255,255,0.92)';ctx.fill();
  }

  function drawDrone(ctx, cx, cy, s){
    ctx.save();ctx.translate(cx,cy);
    const BODY='#2b303c';
    // side nacelles
    [-1,1].forEach(d=>{ rr(ctx, d*18*s-5*s, -8*s, 10*s, 18*s, 4*s);
      const ng=ctx.createLinearGradient(0,-8*s,0,10*s);ng.addColorStop(0,'#3c4250');ng.addColorStop(1,'#1c2027');ctx.fillStyle=ng;ctx.fill();
      ctx.lineWidth=1.4*s;ctx.strokeStyle='#11141a';ctx.stroke();
      // thruster ember
      ctx.globalCompositeOperation='lighter';ctx.beginPath();ctx.arc(d*18*s,11*s,3.4*s,0,7);ctx.fillStyle=rgba('#ff8a3a',0.7);ctx.fill();ctx.globalCompositeOperation='source-over';
    });
    // drill cone (refined)
    const dg=ctx.createLinearGradient(-10*s,12*s,10*s,30*s);dg.addColorStop(0,'#cfd6df');dg.addColorStop(0.5,'#8b929c');dg.addColorStop(1,'#494f59');
    ctx.beginPath();ctx.moveTo(-11*s,14*s);ctx.lineTo(11*s,14*s);ctx.lineTo(0,32*s);ctx.closePath();ctx.fillStyle=dg;ctx.fill();
    ctx.strokeStyle='#23262d';ctx.lineWidth=1.4*s;ctx.stroke();
    ctx.strokeStyle=rgba('#2b2f36',0.7);for(let i=1;i<=2;i++){const yy=14*s+i*5*s,ww=11*s*(1-i*0.32);ctx.beginPath();ctx.moveTo(-ww,yy);ctx.lineTo(ww,yy);ctx.stroke();}
    // main body — smooth ovoid capsule
    ctx.beginPath();ctx.ellipse(0,0,21*s,19*s,0,0,7);
    const bg=ctx.createLinearGradient(-14*s,-16*s,12*s,16*s);bg.addColorStop(0,'#454c5a');bg.addColorStop(0.5,BODY);bg.addColorStop(1,'#181c24');
    ctx.fillStyle=bg;ctx.fill();ctx.lineWidth=2*s;ctx.strokeStyle='#10131a';ctx.stroke();
    // orange accent ring
    ctx.beginPath();ctx.ellipse(0,1*s,15*s,13*s,0,Math.PI*0.15,Math.PI*0.85);ctx.lineWidth=2.4*s;ctx.strokeStyle=rgba('#ff7a32',0.9);ctx.stroke();
    // glowing cyan eye (headlight source)
    const ex=0,ey=-1*s,er=8*s;
    ctx.globalCompositeOperation='lighter';
    const eg=ctx.createRadialGradient(ex,ey,1,ex,ey,er*2);eg.addColorStop(0,rgba('#cffaff',0.95));eg.addColorStop(0.5,rgba('#34d0ee',0.5));eg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=eg;ctx.beginPath();ctx.arc(ex,ey,er*2,0,7);ctx.fill();
    ctx.globalCompositeOperation='source-over';
    ctx.beginPath();ctx.arc(ex,ey,er,0,7);const ec=ctx.createRadialGradient(ex-er*0.3,ey-er*0.4,1,ex,ey,er);ec.addColorStop(0,'#eaffff');ec.addColorStop(0.5,'#33cfee');ec.addColorStop(1,'#0c6f93');ctx.fillStyle=ec;ctx.fill();
    ctx.lineWidth=1.6*s;ctx.strokeStyle='#06303f';ctx.stroke();
    ctx.beginPath();ctx.arc(ex-er*0.35,ey-er*0.4,er*0.3,0,7);ctx.fillStyle='rgba(255,255,255,0.9)';ctx.fill();
    // top gloss + antenna
    ctx.beginPath();ctx.ellipse(-5*s,-11*s,9*s,4*s,-0.3,0,7);ctx.fillStyle='rgba(255,255,255,0.18)';ctx.fill();
    ctx.strokeStyle='#7f8794';ctx.lineWidth=1.6*s;ctx.beginPath();ctx.moveTo(11*s,-15*s);ctx.lineTo(15*s,-23*s);ctx.stroke();
    ctx.globalCompositeOperation='lighter';ctx.beginPath();ctx.arc(15*s,-24*s,3*s,0,7);ctx.fillStyle=rgba('#ff5a4a',0.8);ctx.fill();ctx.globalCompositeOperation='source-over';
    ctx.restore();
  }

  function drawScene(ctx, scene){
    const W=scene.cols*TILE, H=scene.rows*TILE, surf=scene.surfaceRow*TILE;
    const grid=scene.grid;

    // --- sky: cold indigo dusk + warm horizon glow (no moon — different from A/B)
    const sky=ctx.createLinearGradient(0,0,0,surf);sky.addColorStop(0,'#0a0d24');sky.addColorStop(0.55,'#141833');sky.addColorStop(1,'#33243f');
    ctx.fillStyle=sky;ctx.fillRect(0,0,W,surf);
    const rs=D.mulberry32(21);for(let i=0;i<34;i++){ctx.fillStyle=rgba('#cfe0ff',0.2+rs()*0.5);ctx.fillRect(rs()*W,rs()*(surf-10),1.3,1.3);}
    ctx.globalCompositeOperation='lighter';
    const hz=ctx.createLinearGradient(0,surf-30,0,surf);hz.addColorStop(0,'rgba(0,0,0,0)');hz.addColorStop(1,rgba('#7a4fb0',0.4));ctx.fillStyle=hz;ctx.fillRect(0,surf-30,W,30);
    ctx.globalCompositeOperation='source-over';
    // cave dark backing
    ctx.fillStyle='#0b0a14';ctx.fillRect(0,surf,W,H-surf);

    // --- build solid mask (union of solid tiles)
    const solid=new Path2D();
    for(let r=0;r<scene.rows;r++)for(let c=0;c<scene.cols;c++){const t=grid[r][c].type;if(t!=='sky'&&t!=='empty')solid.rect(c*TILE,r*TILE,TILE,TILE);}

    ctx.save();ctx.clip(solid);
    // strata gradient bands (continuous, no grid)
    for(let r=scene.surfaceRow;r<scene.rows;r++){
      const c1=strataColor(r,scene.rows,scene.surfaceRow), c2=strataColor(r+1,scene.rows,scene.surfaceRow);
      const g=ctx.createLinearGradient(0,r*TILE,0,(r+1)*TILE);g.addColorStop(0,c1);g.addColorStop(1,c2);
      ctx.fillStyle=g;ctx.fillRect(0,r*TILE,W,TILE);
      // thin geological seam line
      ctx.fillStyle=rgba('#000000',0.16);ctx.fillRect(0,r*TILE,W,1.4);
      ctx.fillStyle=rgba('#ffffff',0.05);ctx.fillRect(0,r*TILE+1.4,W,1);
    }
    // low-poly facet overlay (subtle planar shading)
    const fc=42, rf=D.mulberry32(7);
    for(let y=surf-fc;y<H;y+=fc)for(let x=-fc;x<W;x+=fc){
      const cells=[[[x,y],[x+fc,y],[x,y+fc]],[[x+fc,y],[x+fc,y+fc],[x,y+fc]]];
      cells.forEach(tri=>{const b=rf();ctx.beginPath();ctx.moveTo(tri[0][0],tri[0][1]);ctx.lineTo(tri[1][0],tri[1][1]);ctx.lineTo(tri[2][0],tri[2][1]);ctx.closePath();ctx.fillStyle=rgba(b>0.5?'#ffffff':'#000000', b>0.5?0.025+b*0.03:0.03+(0.5-b)*0.06);ctx.fill();});
    }
    // rock pockets — angular dark faceted boulders
    for(let r=0;r<scene.rows;r++)for(let c=0;c<scene.cols;c++){const t=grid[r][c].type;if(t!=='stone'&&t!=='hard')continue;
      const rng=D.mulberry32((c*197+r*613+5)>>>0);const cx=(c+0.5)*TILE,cy=(r+0.5)*TILE,R=TILE*0.5;
      const pts=[];const n=6;for(let i=0;i<n;i++){const a=i/n*Math.PI*2;const rr2=R*(0.72+rng()*0.34);pts.push([cx+Math.cos(a)*rr2,cy+Math.sin(a)*rr2]);}
      ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();
      const base=t==='hard'?'#23222e':'#3a3748';
      const g=ctx.createLinearGradient(cx-R,cy-R,cx+R,cy+R);g.addColorStop(0,shade(base,26));g.addColorStop(1,shade(base,-16));ctx.fillStyle=g;ctx.fill();
      for(let i=0;i<n;i++){const a=pts[i],b=pts[(i+1)%n];ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.closePath();ctx.fillStyle=rgba(i%2?'#000000':'#ffffff',i%2?0.18:0.08);ctx.fill();}
      ctx.lineWidth=1.2;ctx.strokeStyle=rgba('#000000',0.4);ctx.stroke();
    }
    // depth darkening within earth
    const dk=ctx.createLinearGradient(0,surf,0,H);dk.addColorStop(0,'rgba(0,0,0,0)');dk.addColorStop(1,'rgba(0,0,0,0.5)');ctx.fillStyle=dk;ctx.fillRect(0,surf,W,H-surf);
    ctx.restore();

    // bright surface edge (lit crown line instead of grass blades)
    ctx.save();ctx.globalCompositeOperation='lighter';
    for(let c=0;c<scene.cols;c++){if(grid[scene.surfaceRow][c].type==='sky'||grid[scene.surfaceRow][c].type==='empty')continue;
      const x=c*TILE;const g=ctx.createLinearGradient(0,surf,0,surf+6);g.addColorStop(0,rgba('#8be38a',0.85));g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(x,surf-1,TILE,6);}
    ctx.restore();

    // pod position
    const pcx=(scene.pod.col+0.5)*TILE, pcy=(scene.pod.row+0.5)*TILE;

    // --- headlight beam (additive cone into the dark below the drone)
    ctx.save();ctx.globalCompositeOperation='lighter';
    ctx.beginPath();ctx.moveTo(pcx-6,pcy+4);ctx.lineTo(pcx+6,pcy+4);ctx.lineTo(pcx+50,pcy+150);ctx.lineTo(pcx-50,pcy+150);ctx.closePath();
    const cone=ctx.createLinearGradient(0,pcy,0,pcy+150);cone.addColorStop(0,rgba('#bfeaff',0.32));cone.addColorStop(0.5,rgba('#7fc6e8',0.12));cone.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=cone;ctx.fill();ctx.restore();

    // ore as glowing cut-gems
    for(let r=0;r<scene.rows;r++)for(let c=0;c<scene.cols;c++){const t=grid[r][c];if(!t.ore)continue;drawGem(ctx,(c+0.5)*TILE,(r+0.5)*TILE,t.ore);}

    // the drone + its ambient glow
    ctx.save();ctx.globalCompositeOperation='lighter';
    const amb=ctx.createRadialGradient(pcx,pcy,4,pcx,pcy,TILE*2.2);amb.addColorStop(0,rgba('#9fe6ff',0.14));amb.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=amb;ctx.beginPath();ctx.arc(pcx,pcy,TILE*2.2,0,7);ctx.fill();ctx.restore();
    drawDrone(ctx, pcx, pcy, 0.92);

    // global vignette for drama
    const vg=ctx.createRadialGradient(W/2,H*0.62,H*0.2,W/2,H*0.62,H*0.75);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,0.45)');ctx.fillStyle=vg;ctx.fillRect(0,surf,W,H-surf);
  }

  /* render crisp, or render-then-pixelate for the gritty in-between look */
  function renderVector(canvas, scene, opts){
    const W=scene.cols*TILE, H=scene.rows*TILE; opts=opts||{};
    if(opts.pixel){
      const pxl=opts.pxl||3;
      const o1=document.createElement('canvas');o1.width=W;o1.height=H;
      drawScene(o1.getContext('2d'), scene);
      const lw=Math.ceil(W/pxl), lh=Math.ceil(H/pxl);
      const o2=document.createElement('canvas');o2.width=lw;o2.height=lh;
      const c2=o2.getContext('2d');c2.imageSmoothingEnabled=true;c2.drawImage(o1,0,0,W,H,0,0,lw,lh);
      canvas.width=W*SS;canvas.height=H*SS;canvas.style.width='100%';canvas.style.height='auto';
      const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(o2,0,0,lw,lh,0,0,W*SS,H*SS);
    } else {
      canvas.width=W*SS;canvas.height=H*SS;canvas.style.width='100%';canvas.style.height='auto';
      const ctx=canvas.getContext('2d');ctx.scale(SS,SS);drawScene(ctx,scene);
    }
  }

  Object.assign(D, { renderVector, drawVectorScene: drawScene });
})(window);
