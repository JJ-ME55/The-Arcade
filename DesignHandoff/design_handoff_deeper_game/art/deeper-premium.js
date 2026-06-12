/* DEEPER — premium renderer.
   "Realistic through consistency, not complexity."
   One light (moonlight, top-left), one material language (soft gradient + fine
   grain + a single soft outline), bold simple forms, tight nostalgic palette.
   Smooth (not pixelated). Surface hub + deep dig share every helper so the
   world feels consistent. */
(function (global) {
  'use strict';
  const D = global.DEEPER;
  const SS = 2;

  /* ---- palette: nostalgic-premium, anchored to the reference ---- */
  const P = {
    skyTop:'#091031', skyMid:'#0e1a44', skyHor:'#1a2247',
    crustHi:'#6f4a2b', crust:'#56381f', soilHi:'#9c6f40', soil:'#7c5530', soilLo:'#5f3f22',
    grass:'#5fa83f', grassHi:'#8fd45f', grassLo:'#3c7327',
    cave:'#2c1a0e', caveLo:'#120a05',
    clayHi:'#cda08f', clay:'#b07e6c', clayLo:'#8a5749', claySh:'#623c33',
    slab:'#8d8f93', slabLo:'#5c5e62', slabHi:'#b4b6ba',
    steelHi:'#cdd4dc', steel:'#9aa1ab', steelLo:'#5a616b',
    pod:'#7d7547', podHi:'#b3a766', podLo:'#494428', podTrim:'#3a3622',
    gold:'#ffd24d', goldHi:'#ffe79a', goldLo:'#cf9a1f',
    visor:'#46cfe6', visorHi:'#cffaff',
    flameA:'#fff0b0', flameB:'#ff9a2a', flameC:'#e0431c',
  };

  /* ---- helpers ---- */
  function hx(h){h=h.replace('#','');return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];}
  function rgba(c,a){const[r,g,b]=hx(c);return `rgba(${r},${g},${b},${a})`;}
  function lerp(c1,c2,t){const a=hx(c1),b=hx(c2);return `rgb(${Math.round(a[0]+(b[0]-a[0])*t)},${Math.round(a[1]+(b[1]-a[1])*t)},${Math.round(a[2]+(b[2]-a[2])*t)})`;}
  function shade(c,a){const[r,g,b]=hx(c);const f=v=>Math.max(0,Math.min(255,v+a));return `rgb(${f(r)},${f(g)},${f(b)})`;}
  function rr(ctx,x,y,w,h,r){if(typeof r==='number')r={tl:r,tr:r,br:r,bl:r};ctx.beginPath();ctx.moveTo(x+r.tl,y);ctx.lineTo(x+w-r.tr,y);ctx.arcTo(x+w,y,x+w,y+r.tr,r.tr);ctx.lineTo(x+w,y+h-r.br);ctx.arcTo(x+w,y+h,x+w-r.br,y+h,r.br);ctx.lineTo(x+r.bl,y+h);ctx.arcTo(x,y+h,x,y+h-r.bl,r.bl);ctx.lineTo(x,y+r.tl);ctx.arcTo(x,y,x+r.tl,y,r.tl);ctx.closePath();}

  // consistent grain + mottle over any region (the "consistency" tool)
  function grain(ctx,x,y,w,h,seed,opt){
    opt=opt||{}; const rng=D.mulberry32(seed>>>0);
    const clumps=opt.clumps!=null?opt.clumps:Math.round(w*h/520);
    for(let i=0;i<clumps;i++){const px=x+rng()*w,py=y+rng()*h,r=2+rng()*7;ctx.beginPath();ctx.arc(px,py,r,0,7);ctx.fillStyle=rgba(rng()>0.5?'#ffffff':'#000000',0.04+rng()*0.05);ctx.fill();}
    const dots=opt.dots!=null?opt.dots:Math.round(w*h/90);
    for(let i=0;i<dots;i++){ctx.fillStyle=rgba(rng()>0.5?'#000000':'#ffffff',0.03+rng()*0.05);ctx.fillRect(x+rng()*w,y+rng()*h,1.3,1.3);}
  }

  // earth body: dark crust over warm subsoil + grain (used surface + deep)
  function earth(ctx,x,y,w,h,seed){
    const crustH=Math.min(34,h*0.34);
    let g=ctx.createLinearGradient(0,y,0,y+crustH);g.addColorStop(0,P.crustHi);g.addColorStop(1,P.crust);ctx.fillStyle=g;ctx.fillRect(x,y,w,crustH);
    g=ctx.createLinearGradient(0,y+crustH,0,y+h);g.addColorStop(0,P.soilHi);g.addColorStop(0.6,P.soil);g.addColorStop(1,P.soilLo);ctx.fillStyle=g;ctx.fillRect(x,y+crustH,w,h-crustH);
    grain(ctx,x,y,w,h,seed);
    // soft seam where crust meets soil
    ctx.fillStyle=rgba('#000000',0.12);ctx.fillRect(x,y+crustH,w,1.5);
  }

  function grassCrown(ctx,x0,x1,gy,seed){
    const rng=D.mulberry32(seed>>>0);
    const g=ctx.createLinearGradient(0,gy-4,0,gy+7);g.addColorStop(0,P.grassHi);g.addColorStop(1,P.grassLo);ctx.fillStyle=g;ctx.fillRect(x0,gy-2,x1-x0,8);
    ctx.strokeStyle=P.grass;ctx.lineWidth=1.4;
    for(let x=x0;x<x1;x+=4){if(rng()<0.8){ctx.beginPath();ctx.moveTo(x,gy+4);ctx.lineTo(x+(rng()-0.5)*5,gy-3-rng()*3);ctx.stroke();}}
  }

  function pit(ctx,x0,x1,gy,bottom){
    const w=x1-x0;
    const g=ctx.createLinearGradient(0,gy,0,bottom);g.addColorStop(0,P.cave);g.addColorStop(1,P.caveLo);ctx.fillStyle=g;ctx.fillRect(x0,gy,w,bottom-gy);
    // wall AO
    let s=ctx.createLinearGradient(x0,0,x0+14,0);s.addColorStop(0,'rgba(0,0,0,0.55)');s.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=s;ctx.fillRect(x0,gy,14,bottom-gy);
    s=ctx.createLinearGradient(x1-14,0,x1,0);s.addColorStop(0,'rgba(0,0,0,0)');s.addColorStop(1,'rgba(0,0,0,0.45)');ctx.fillStyle=s;ctx.fillRect(x1-14,gy,14,bottom-gy);
    // lit top lip
    ctx.fillStyle=rgba(P.soilHi,0.5);ctx.fillRect(x0,gy,w,2);
  }

  function flame(ctx,cx,cy,s){
    ctx.save();ctx.globalCompositeOperation='lighter';
    const g=ctx.createRadialGradient(cx,cy+4*s,2,cx,cy,26*s);g.addColorStop(0,rgba(P.flameA,0.5));g.addColorStop(0.5,rgba(P.flameB,0.32));g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(cx,cy,26*s,0,7);ctx.fill();ctx.globalCompositeOperation='source-over';
    for(let i=-1;i<=1;i++){const fx=cx+i*7*s;ctx.beginPath();ctx.moveTo(fx,cy+9*s);ctx.quadraticCurveTo(fx-5*s,cy-2*s,fx,cy-12*s-Math.abs(i)*3*s);ctx.quadraticCurveTo(fx+5*s,cy-2*s,fx,cy+9*s);
      const fg=ctx.createLinearGradient(0,cy-12*s,0,cy+9*s);fg.addColorStop(0,P.flameA);fg.addColorStop(0.5,P.flameB);fg.addColorStop(1,P.flameC);ctx.fillStyle=fg;ctx.fill();}
    ctx.restore();
  }

  function moon(ctx,cx,cy,r){
    ctx.save();ctx.globalCompositeOperation='lighter';const h=ctx.createRadialGradient(cx,cy,r*0.7,cx,cy,r*2.4);h.addColorStop(0,rgba('#cdd9ff',0.22));h.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=h;ctx.beginPath();ctx.arc(cx,cy,r*2.4,0,7);ctx.fill();ctx.restore();
    const g=ctx.createRadialGradient(cx-r*0.3,cy-r*0.3,r*0.2,cx,cy,r);g.addColorStop(0,'#fdfdf6');g.addColorStop(0.7,'#e7e9f0');g.addColorStop(1,'#bfc4d6');ctx.fillStyle=g;ctx.beginPath();ctx.arc(cx,cy,r,0,7);ctx.fill();
    // craters
    const cr=[[0.28,-0.18,0.16],[ -0.22,0.22,0.2],[0.12,0.34,0.1],[ -0.34,-0.24,0.09]];
    cr.forEach(c=>{ctx.beginPath();ctx.arc(cx+c[0]*r,cy+c[1]*r,c[2]*r,0,7);ctx.fillStyle=rgba('#b9bed0',0.55);ctx.fill();ctx.beginPath();ctx.arc(cx+c[0]*r-c[2]*r*0.2,cy+c[1]*r-c[2]*r*0.2,c[2]*r*0.7,0,7);ctx.fillStyle=rgba('#ffffff',0.4);ctx.fill();});
  }

  /* ---- buildings: toy-industrial clay, consistent light ---- */
  function clayBody(ctx,x,y,w,h,rad){
    rr(ctx,x,y,w,h,rad);const g=ctx.createLinearGradient(x,y,x+w*0.5,y+h);g.addColorStop(0,P.clayHi);g.addColorStop(0.5,P.clay);g.addColorStop(1,P.clayLo);ctx.fillStyle=g;ctx.fill();
    ctx.save();rr(ctx,x,y,w,h,rad);ctx.clip();
    // right/bottom shade
    const s=ctx.createLinearGradient(x,y,x+w,y+h);s.addColorStop(0.55,'rgba(0,0,0,0)');s.addColorStop(1,rgba(P.claySh,0.6));ctx.fillStyle=s;ctx.fillRect(x,y,w,h);
    grain(ctx,x,y,w,h,(x*7+y*13)>>>0,{clumps:Math.round(w*h/900),dots:Math.round(w*h/160)});
    ctx.restore();
    ctx.lineWidth=2;ctx.strokeStyle=rgba(P.claySh,0.7);rr(ctx,x+1,y+1,w-2,h-2,rad);ctx.stroke();
  }
  function goldSign(ctx,x,y,w,h,text,fs){
    rr(ctx,x,y,w,h,5);const g=ctx.createLinearGradient(x,y,x,y+h);g.addColorStop(0,P.goldHi);g.addColorStop(0.5,P.gold);g.addColorStop(1,P.goldLo);ctx.fillStyle=g;ctx.fill();
    ctx.lineWidth=2;ctx.strokeStyle=shade(P.goldLo,-20);ctx.stroke();
    ctx.fillStyle='#4a2d0c';ctx.font=`800 ${fs}px Oxanium, sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,x+w/2,y+h/2+1);
    ctx.textAlign='start';ctx.textBaseline='alphabetic';
  }

  function fuelDepot(ctx,cx,gy){
    const w=176,h=104,x=cx-w/2,y=gy-h;
    // stone foundation
    rr(ctx,x-10,gy-6,w+20,16,3);const fg=ctx.createLinearGradient(0,gy-6,0,gy+10);fg.addColorStop(0,P.slabHi);fg.addColorStop(1,P.slabLo);ctx.fillStyle=fg;ctx.fill();
    clayBody(ctx,x,y,w,h,{tl:12,tr:12,br:4,bl:4});
    // window band
    rr(ctx,x+14,y+20,w-28,26,4);ctx.fillStyle='#241a16';ctx.fill();
    ctx.fillStyle=rgba('#4a6f86',0.5);for(let i=0;i<4;i++){ctx.fillRect(x+18+i*(w-36)/4,y+22,(w-44)/4-4,10);}
    ctx.lineWidth=2;ctx.strokeStyle=P.clayLo;for(let i=1;i<4;i++){ctx.beginPath();ctx.moveTo(x+14+i*(w-28)/4,y+20);ctx.lineTo(x+14+i*(w-28)/4,y+46);ctx.stroke();}
    // garage arch
    rr(ctx,x+w/2-30,y+h-46,60,46,{tl:16,tr:16,br:0,bl:0});ctx.fillStyle='#1c1411';ctx.fill();
    ctx.fillStyle=rgba(P.clayHi,0.25);for(let i=0;i<5;i++)ctx.fillRect(x+w/2-26,y+h-42+i*8,52,3);
    // little ore-cart / pump detail at left
    rr(ctx,x+8,y+h-26,26,22,3);ctx.fillStyle=P.steelLo;ctx.fill();rr(ctx,x+11,y+h-22,20,5,2);ctx.fillStyle=P.gold;ctx.fill();rr(ctx,x+11,y+h-15,20,5,2);ctx.fillStyle=shade(P.gold,-30);ctx.fill();
    // FUEL sign on posts
    ctx.strokeStyle=P.slabLo;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(cx-34,y+4);ctx.lineTo(cx-34,y-30);ctx.moveTo(cx+34,y+4);ctx.lineTo(cx+34,y-30);ctx.stroke();
    goldSign(ctx,cx-52,y-54,104,34,'FUEL',26);
  }

  function processor(ctx,cx,gy){
    const w=172,h=150,x=cx-w/2,y=gy-h;
    rr(ctx,x-10,gy-6,w+20,16,3);const fg=ctx.createLinearGradient(0,gy-6,0,gy+10);fg.addColorStop(0,P.slabHi);fg.addColorStop(1,P.slabLo);ctx.fillStyle=fg;ctx.fill();
    // silo + chimney behind
    rr(ctx,x+w-46,y-26,30,40,{tl:14,tr:14,br:0,bl:0});const cg=ctx.createLinearGradient(x+w-46,0,x+w-16,0);cg.addColorStop(0,P.clayHi);cg.addColorStop(1,P.clayLo);ctx.fillStyle=cg;ctx.fill();ctx.lineWidth=2;ctx.strokeStyle=P.claySh;ctx.stroke();
    clayBody(ctx,x,y,w,h,{tl:10,tr:10,br:4,bl:4});
    // sign
    goldSign(ctx,x+12,y+14,w-24,24,'MINERAL PROCESSING',14);
    // round intake door
    ctx.beginPath();ctx.arc(cx-18,y+h-30,26,Math.PI,0);ctx.lineTo(cx+8,y+h);ctx.lineTo(cx-44,y+h);ctx.closePath();ctx.fillStyle='#1c1411';ctx.fill();
    ctx.lineWidth=3;ctx.strokeStyle=P.steelLo;ctx.stroke();
    // pipes on right
    ctx.lineWidth=8;ctx.strokeStyle=P.steel;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x+w-18,y+50);ctx.lineTo(x+w-18,y+h-16);ctx.moveTo(x+w-18,y+62);ctx.lineTo(x+w+2,y+62);ctx.stroke();
    ctx.lineWidth=8;ctx.strokeStyle=P.steelLo;ctx.beginPath();ctx.moveTo(x+w-30,y+74);ctx.lineTo(x+w-30,y+h-16);ctx.stroke();
    ctx.lineCap='butt';
  }

  /* ---- pod (premium, refined-original olive-bronze, drill down) ---- */
  function pod(ctx,cx,cy,s){
    ctx.save();ctx.translate(cx,cy);
    const W=64*s,H=48*s;
    // thruster
    ctx.globalCompositeOperation='lighter';const fl=ctx.createRadialGradient(0,H*0.45,1,0,H*0.62,22*s);fl.addColorStop(0,rgba(P.flameA,0.9));fl.addColorStop(0.5,rgba(P.flameB,0.55));fl.addColorStop(1,'rgba(0,0,0,0)');ctx.beginPath();ctx.moveTo(-8*s,H*0.38);ctx.quadraticCurveTo(0,H*0.95,8*s,H*0.38);ctx.quadraticCurveTo(0,H*0.45,-8*s,H*0.38);ctx.fillStyle=fl;ctx.fill();ctx.globalCompositeOperation='source-over';
    // drill (nose down)
    const dg=ctx.createLinearGradient(-13*s,H*0.26,13*s,H*0.6);dg.addColorStop(0,P.steelHi);dg.addColorStop(0.5,P.steel);dg.addColorStop(1,P.steelLo);
    ctx.beginPath();ctx.moveTo(-14*s,H*0.26);ctx.lineTo(14*s,H*0.26);ctx.lineTo(0,H*0.64);ctx.closePath();ctx.fillStyle=dg;ctx.fill();ctx.lineWidth=1.6*s;ctx.strokeStyle='#2b2f34';ctx.stroke();
    ctx.strokeStyle=rgba('#33383f',0.8);ctx.lineWidth=1.4*s;for(let i=1;i<=2;i++){const yy=H*0.26+i*H*0.11,ww=14*s*(1-i*0.3);ctx.beginPath();ctx.moveTo(-ww,yy);ctx.lineTo(ww,yy);ctx.stroke();}
    // body olive-bronze
    rr(ctx,-W/2,-H/2,W,H*0.8,13*s);const bg=ctx.createLinearGradient(-W/2,-H/2,W/2,H*0.3);bg.addColorStop(0,P.podHi);bg.addColorStop(0.5,P.pod);bg.addColorStop(1,P.podLo);ctx.fillStyle=bg;ctx.fill();ctx.lineWidth=2*s;ctx.strokeStyle=P.podTrim;ctx.stroke();
    // skid + hazard
    ctx.save();rr(ctx,-W/2,H*0.07,W,H*0.22,{tl:0,tr:0,br:11*s,bl:11*s});ctx.clip();ctx.fillStyle='#2a2c22';ctx.fillRect(-W/2,H*0.07,W,H*0.22);ctx.fillStyle=P.gold;for(let i=-5;i<6;i++){const xx=i*13*s;ctx.beginPath();ctx.moveTo(xx,H*0.07);ctx.lineTo(xx+9*s,H*0.07);ctx.lineTo(xx,H*0.31);ctx.lineTo(xx-9*s,H*0.31);ctx.closePath();ctx.fill();}ctx.restore();
    // visor
    const vx=2*s,vy=-H*0.1,vr=12*s;ctx.globalCompositeOperation='lighter';const vg=ctx.createRadialGradient(vx,vy,1,vx,vy,vr*1.7);vg.addColorStop(0,rgba(P.visorHi,0.85));vg.addColorStop(0.5,rgba(P.visor,0.45));vg.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=vg;ctx.beginPath();ctx.arc(vx,vy,vr*1.7,0,7);ctx.fill();ctx.globalCompositeOperation='source-over';
    ctx.beginPath();ctx.arc(vx,vy,vr,0,7);const vc=ctx.createRadialGradient(vx-vr*0.3,vy-vr*0.4,1,vx,vy,vr);vc.addColorStop(0,P.visorHi);vc.addColorStop(0.5,P.visor);vc.addColorStop(1,'#0c5f80');ctx.fillStyle=vc;ctx.fill();ctx.lineWidth=2*s;ctx.strokeStyle='#08323f';ctx.stroke();ctx.beginPath();ctx.arc(vx-vr*0.35,vy-vr*0.4,vr*0.3,0,7);ctx.fillStyle=rgba('#ffffff',0.9);ctx.fill();
    // rivets + antenna
    ctx.fillStyle=rgba(P.podTrim,0.9);[[-W/2+8*s,-H/2+8*s],[W/2-8*s,-H/2+8*s],[-W/2+8*s,H*0.0],[W/2-8*s,H*0.0]].forEach(p=>{ctx.beginPath();ctx.arc(p[0],p[1],2.3*s,0,7);ctx.fill();});
    ctx.strokeStyle=P.steel;ctx.lineWidth=2*s;ctx.beginPath();ctx.moveTo(-W*0.34,-H/2);ctx.lineTo(-W*0.42,-H*0.82);ctx.stroke();ctx.beginPath();ctx.arc(-W*0.42,-H*0.84,3*s,0,7);ctx.fillStyle='#ff4a3c';ctx.fill();
    // top gloss
    rr(ctx,-W/2+4*s,-H/2+4*s,W-8*s,H*0.2,{tl:9*s,tr:9*s,br:2*s,bl:2*s});ctx.fillStyle=rgba('#ffffff',0.16);ctx.fill();
    ctx.restore();
  }

  /* ============ SURFACE HUB ============ */
  function renderSurface(canvas){
    const W=760,H=478;canvas.width=W*SS;canvas.height=H*SS;canvas.style.width='100%';canvas.style.height='auto';
    const ctx=canvas.getContext('2d');ctx.scale(SS,SS);
    const gy=298;
    // sky
    const sky=ctx.createLinearGradient(0,0,0,gy);sky.addColorStop(0,P.skyTop);sky.addColorStop(0.62,P.skyMid);sky.addColorStop(1,P.skyHor);ctx.fillStyle=sky;ctx.fillRect(0,0,W,gy);
    const rs=D.mulberry32(5);for(let i=0;i<70;i++){const sx=rs()*W,sy=rs()*(gy-20);ctx.fillStyle=rgba('#dfe6ff',0.25+rs()*0.55);ctx.fillRect(sx,sy,1.4,1.4);}
    moon(ctx,W*0.26,H*0.165,47);
    // earth full width
    earth(ctx,0,gy,W,H-gy,99);
    // pits
    pit(ctx,70,128,gy,H);
    pit(ctx,398,452,gy,H);
    pit(ctx,520,566,gy,H);
    // grass crown on solid spans
    grassCrown(ctx,0,70,gy,11);grassCrown(ctx,128,398,gy,12);grassCrown(ctx,452,520,gy,13);grassCrown(ctx,566,W,gy,14);
    // flame in central pit
    flame(ctx,425,gy+128,1);
    // buildings
    fuelDepot(ctx,262,gy);
    processor(ctx,648,gy);
    // pod on the central plateau edge, about to descend
    pod(ctx,372,gy-26,0.96);
    // direction marker
    ctx.beginPath();ctx.moveTo(470,gy-58);ctx.lineTo(486,gy-58);ctx.lineTo(478,gy-44);ctx.closePath();ctx.fillStyle=P.grassLo;ctx.fill();
    // moonlight wash + ground vignette
    ctx.save();ctx.globalCompositeOperation='lighter';const ml=ctx.createRadialGradient(W*0.30,H*0.2,40,W*0.30,H*0.2,W*0.7);ml.addColorStop(0,rgba('#9fb0e0',0.10));ml.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=ml;ctx.fillRect(0,0,W,H);ctx.restore();
    const vg=ctx.createRadialGradient(W/2,H*0.5,H*0.4,W/2,H*0.5,H*0.95);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,0.34)');ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);
  }

  /* ============ DEEP DIG (same materials) ============ */
  function drawOre(ctx,x,y,T,type,rng){
    const O=D.ORES[type],cx=x+T/2,cy=y+T/2;
    if(O.glow){ctx.save();ctx.globalCompositeOperation='lighter';const g=ctx.createRadialGradient(cx,cy,2,cx,cy,T*0.6);g.addColorStop(0,rgba(O.glow,0.55));g.addColorStop(0.4,rgba(O.glow,0.2));g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(x-6,y-6,T+12,T+12);ctx.restore();}
    const n=4+Math.floor(rng()*3);
    for(let i=0;i<n;i++){const a=rng()*7,d=rng()*9,nx=cx+Math.cos(a)*d,ny=cy+Math.sin(a)*d,r=4+rng()*5;ctx.beginPath();ctx.arc(nx,ny,r,0,7);const g=ctx.createRadialGradient(nx-r*0.35,ny-r*0.4,1,nx,ny,r);g.addColorStop(0,shade(O.core,40));g.addColorStop(0.6,O.core);g.addColorStop(1,O.edge);ctx.fillStyle=g;ctx.fill();ctx.lineWidth=1;ctx.strokeStyle=rgba(O.edge,0.8);ctx.stroke();ctx.beginPath();ctx.arc(nx-r*0.4,ny-r*0.45,r*0.28,0,7);ctx.fillStyle=rgba('#ffffff',0.85);ctx.fill();}
  }
  function rockMass(ctx,x,y,T,grid,c,r,rng){
    const top=D.isRock(grid,c,r-1),bot=D.isRock(grid,c,r+1),left=D.isRock(grid,c-1,r),right=D.isRock(grid,c+1,r);
    const OVER=5,IN=8,l=x-(left?OVER:IN),t=y-(top?OVER:IN),w=T+(left?OVER:IN)+(right?OVER:IN),h=T+(top?OVER:IN)+(bot?OVER:IN);
    const rad={tl:(top||left)?4:IN+4,tr:(top||right)?4:IN+4,br:(bot||right)?4:IN+4,bl:(bot||left)?4:IN+4};
    ctx.save();ctx.shadowColor='rgba(0,0,0,0.35)';ctx.shadowBlur=5;ctx.shadowOffsetX=2;ctx.shadowOffsetY=3;rr(ctx,l,t,w,h,rad);
    const stoneHi='#8a8275',stone='#6a6258',stoneLo='#48433b';const g=ctx.createLinearGradient(l,t,l+w,t+h);g.addColorStop(0,stoneHi);g.addColorStop(0.5,stone);g.addColorStop(1,stoneLo);ctx.fillStyle=g;ctx.fill();ctx.restore();
    ctx.save();rr(ctx,l,t,w,h,rad);ctx.clip();grain(ctx,l,t,w,h,(c*197+r*613)>>>0,{clumps:6,dots:18});ctx.strokeStyle=rgba('#ffffff',0.18);ctx.lineWidth=2;rr(ctx,l+1,t+1,w-2,h-2,rad);ctx.stroke();const ao=ctx.createLinearGradient(l,t,l+w,t+h);ao.addColorStop(0.55,'rgba(0,0,0,0)');ao.addColorStop(1,'rgba(0,0,0,0.3)');ctx.fillStyle=ao;ctx.fillRect(l,t,w,h);ctx.restore();
  }
  function renderDeep(canvas,scene){
    const T=48,W=scene.cols*T,H=scene.rows*T;canvas.width=W*SS;canvas.height=H*SS;canvas.style.width='100%';canvas.style.height='auto';
    const ctx=canvas.getContext('2d');ctx.scale(SS,SS);const grid=scene.grid,surf=scene.surfaceRow*T;
    // sky strip
    const sky=ctx.createLinearGradient(0,0,0,surf);sky.addColorStop(0,P.skyTop);sky.addColorStop(1,P.skyHor);ctx.fillStyle=sky;ctx.fillRect(0,0,W,surf);
    const rs=D.mulberry32(9);for(let i=0;i<26;i++)ctx.fillStyle=rgba('#dfe6ff',0.3+rs()*0.4),ctx.fillRect(rs()*W,rs()*(surf-6),1.3,1.3);
    moon(ctx,W*0.60,T*0.95,24);
    // cave backing
    ctx.fillStyle=P.cave;ctx.fillRect(0,surf,W,H-surf);
    // earth under every solid tile (continuous)
    const solid=new Path2D();for(let r=0;r<scene.rows;r++)for(let c=0;c<scene.cols;c++){const t=grid[r][c].type;if(t!=='sky'&&t!=='empty')solid.rect(c*T,r*T,T,T);}
    ctx.save();ctx.clip(solid);earth(ctx,0,surf,W,H-surf,77);ctx.restore();
    // grass crown along surface row (solid spans)
    for(let c=0;c<scene.cols;c++){if(grid[scene.surfaceRow][c].type==='grass')grassCrown(ctx,c*T,c*T+T,surf,(c*31)>>>0);}
    // rock masses
    for(let r=0;r<scene.rows;r++)for(let c=0;c<scene.cols;c++){const t=grid[r][c].type;if(t==='stone'||t==='hard'){rockMass(ctx,c*T,r*T,T,grid,c,r,D.mulberry32((c*197+r*613+5)>>>0));}}
    // ore
    for(let r=0;r<scene.rows;r++)for(let c=0;c<scene.cols;c++){const t=grid[r][c];if(t.ore)drawOre(ctx,c*T,r*T,T,t.ore,D.mulberry32((c*311+r*89+3)>>>0));}
    // tunnel AO
    for(let r=0;r<scene.rows;r++)for(let c=0;c<scene.cols;c++){if(grid[r][c].type!=='empty')continue;const x=c*T,y=r*T;const v=ctx.createRadialGradient(x+T/2,y+T/2,T*0.2,x+T/2,y+T/2,T*0.9);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,0.5)');ctx.fillStyle=v;ctx.fillRect(x-T/2,y-T/2,T*2,T*2);}
    // pod
    const pcx=(scene.pod.col+0.5)*T,pcy=(scene.pod.row+0.5)*T;
    // dig dust
    const dr=D.mulberry32(42);ctx.save();for(let i=0;i<10;i++){const a=Math.PI*(0.15+dr()*0.7),d=6+dr()*22;ctx.beginPath();ctx.arc(pcx+Math.cos(a)*d,pcy+T*0.5+Math.sin(a)*d*0.5,3+dr()*5,0,7);ctx.fillStyle=rgba(P.soilHi,0.26);ctx.fill();}ctx.restore();
    pod(ctx,pcx,pcy,0.92);
    // darkness + lamp
    const dk=ctx.createLinearGradient(0,surf,0,H);dk.addColorStop(0,'rgba(0,0,0,0)');dk.addColorStop(1,'rgba(0,0,0,0.46)');ctx.fillStyle=dk;ctx.fillRect(0,surf,W,H-surf);
    ctx.save();ctx.globalCompositeOperation='lighter';const lamp=ctx.createRadialGradient(pcx,pcy,T*0.3,pcx,pcy,T*2.6);lamp.addColorStop(0,rgba('#ffe9b0',0.17));lamp.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=lamp;ctx.fillRect(0,0,W,H);ctx.restore();
  }

  Object.assign(D, { renderSurface, renderDeep });
})(window);
