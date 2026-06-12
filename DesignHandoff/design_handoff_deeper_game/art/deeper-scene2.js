/* DEEPER — reference recreation ("tactile industrial").
   A faithful-as-possible build of the steampunk surface+deep mockup:
   rusty riveted buildings, faceted clustered ore, pebbly rim-lit tunnels,
   a drill-rover, lamp, lantern, conveyor + gold pile. Canvas-composited. */
(function (global) {
  'use strict';
  const D = global.DEEPER;
  const SS = 2;

  function hx(h){h=h.replace('#','');return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];}
  function rgba(c,a){const[r,g,b]=hx(c);return `rgba(${r},${g},${b},${a})`;}
  function lerp(c1,c2,t){const a=hx(c1),b=hx(c2);return `rgb(${Math.round(a[0]+(b[0]-a[0])*t)},${Math.round(a[1]+(b[1]-a[1])*t)},${Math.round(a[2]+(b[2]-a[2])*t)})`;}
  function shade(c,a){const[r,g,b]=hx(c);const f=v=>Math.max(0,Math.min(255,v+a));return `rgb(${f(r)},${f(g)},${f(b)})`;}
  function rr(ctx,x,y,w,h,r){if(typeof r==='number')r={tl:r,tr:r,br:r,bl:r};ctx.beginPath();ctx.moveTo(x+r.tl,y);ctx.lineTo(x+w-r.tr,y);ctx.arcTo(x+w,y,x+w,y+r.tr,r.tr);ctx.lineTo(x+w,y+h-r.br);ctx.arcTo(x+w,y+h,x+w-r.br,y+h,r.br);ctx.lineTo(x+r.bl,y+h);ctx.arcTo(x,y+h,x,y+h-r.bl,r.bl);ctx.lineTo(x,y+r.tl);ctx.arcTo(x,y,x+r.tl,y,r.tl);ctx.closePath();}
  function rivets(ctx,x,y,w,h,step,col){col=col||'#1a1713';for(let rx=x+step/2;rx<x+w;rx+=step){[y+4,y+h-4].forEach(ry=>{ctx.beginPath();ctx.arc(rx,ry,1.6,0,7);ctx.fillStyle=col;ctx.fill();ctx.beginPath();ctx.arc(rx-0.5,ry-0.5,0.7,0,7);ctx.fillStyle='rgba(255,255,255,0.3)';ctx.fill();});}}

  const W=1200,H=720,GY=282;

  /* ---------- sky ---------- */
  function sky(ctx){
    const g=ctx.createLinearGradient(0,0,0,GY);g.addColorStop(0,'#0a1330');g.addColorStop(0.55,'#101a3a');g.addColorStop(1,'#1b2440');ctx.fillStyle=g;ctx.fillRect(0,0,W,GY);
    const rs=D.mulberry32(3);for(let i=0;i<150;i++){const x=rs()*W,y=rs()*(GY-30);ctx.fillStyle=rgba('#dfe7ff',0.2+rs()*0.6);ctx.fillRect(x,y,1.3,1.3);}
    // soft clouds
    ctx.save();ctx.globalCompositeOperation='lighter';for(let i=0;i<5;i++){const cx=rs()*W,cy=40+rs()*120,cw=120+rs()*160;const cg=ctx.createRadialGradient(cx,cy,4,cx,cy,cw);cg.addColorStop(0,rgba('#3a4a78',0.16));cg.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=cg;ctx.fillRect(cx-cw,cy-cw,cw*2,cw*2);}ctx.restore();
    // moon
    const mx=580,my=66,mr=46;
    ctx.save();ctx.globalCompositeOperation='lighter';const h=ctx.createRadialGradient(mx,my,mr*0.7,mx,my,mr*2.6);h.addColorStop(0,rgba('#cdd9ff',0.28));h.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=h;ctx.beginPath();ctx.arc(mx,my,mr*2.6,0,7);ctx.fill();ctx.restore();
    const mg=ctx.createRadialGradient(mx-mr*0.3,my-mr*0.3,mr*0.2,mx,my,mr);mg.addColorStop(0,'#fdfdf6');mg.addColorStop(0.7,'#e7e9f0');mg.addColorStop(1,'#bcc2d4');ctx.fillStyle=mg;ctx.beginPath();ctx.arc(mx,my,mr,0,7);ctx.fill();
    [[0.28,-0.16,0.15],[-0.22,0.2,0.18],[0.1,0.3,0.09],[-0.3,-0.22,0.08]].forEach(c=>{ctx.beginPath();ctx.arc(mx+c[0]*mr,my+c[1]*mr,c[2]*mr,0,7);ctx.fillStyle=rgba('#b7bcce',0.5);ctx.fill();});
  }
  function mountains(ctx){
    const layers=[['#172murky',0],['#16203f',0]];
    // two silhouette ridges
    const draw=(base,amp,yBase,col)=>{const rng=D.mulberry32(base);ctx.beginPath();ctx.moveTo(0,GY);let x=0,y=yBase;ctx.lineTo(0,yBase);while(x<W){const seg=40+rng()*90;y=yBase-amp*rng();ctx.lineTo(x,y);x+=seg;}ctx.lineTo(W,yBase);ctx.lineTo(W,GY);ctx.closePath();ctx.fillStyle=col;ctx.fill();};
    draw(11,90,GY-30,'#141d38');
    draw(23,60,GY-8,'#1b2540');
  }

  /* ---------- soil + tunnels ---------- */
  const TUN=[ // excavated corridors (negative space) — connected to a surface entrance
    {x:648,y:280,w:42,h:104},   // ENTRANCE shaft from the surface
    {x:560,y:362,w:170,h:42},   // upper corridor
    {x:648,y:362,w:42,h:250},   // central vertical (down to the lantern)
    {x:330,y:432,w:240,h:44},   // left corridor
    {x:330,y:432,w:44,h:160},   // left vertical
    {x:330,y:558,w:150,h:44},   // left lower
    {x:560,y:476,w:200,h:42},   // mid corridor (links central)
    {x:760,y:520,w:210,h:44},   // right corridor
    {x:1000,y:452,w:152,h:44},  // far-right pocket
  ];
  function pebble(ctx,x,y,r,rng){
    const depth=Math.max(0,Math.min(1,(y-GY)/(H-GY)));
    const base=lerp('#8a5e34','#3a2614',depth*0.8+rng()*0.2);
    ctx.beginPath();ctx.ellipse(x,y+r*0.5,r*1.05,r*0.6,0,0,7);ctx.fillStyle='rgba(0,0,0,0.28)';ctx.fill();
    ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fillStyle=base;ctx.fill();
    ctx.beginPath();ctx.arc(x-r*0.3,y-r*0.35,r*0.55,0,7);ctx.fillStyle=rgba(shade(base,38),0.9);ctx.fill();
  }
  function pebbleSoil(ctx){
    const gg=ctx.createLinearGradient(0,GY,0,H);gg.addColorStop(0,'#65401f');gg.addColorStop(0.5,'#4a2f17');gg.addColorStop(1,'#311e0e');ctx.fillStyle=gg;ctx.fillRect(0,GY,W,H-GY);
    const rng=D.mulberry32(99);
    const N=Math.floor((W*(H-GY))/140);
    for(let i=0;i<N;i++){ pebble(ctx, rng()*W, GY+rng()*(H-GY), 2+rng()*5.5, rng); }
  }
  function carve(ctx,t){
    const g=ctx.createLinearGradient(0,t.y,0,t.y+t.h);g.addColorStop(0,'#211408');g.addColorStop(1,'#090402');ctx.fillStyle=g;ctx.fillRect(t.x,t.y,t.w,t.h);
    // overhang shadow: the soil ceiling casts a soft shadow into the cavity
    const ah=Math.min(24,t.h*0.7);let ao=ctx.createLinearGradient(0,t.y,0,t.y+ah);ao.addColorStop(0,'rgba(0,0,0,0.8)');ao.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=ao;ctx.fillRect(t.x,t.y,t.w,ah);
    // side wall AO
    let sl=ctx.createLinearGradient(t.x,0,t.x+13,0);sl.addColorStop(0,'rgba(0,0,0,0.5)');sl.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=sl;ctx.fillRect(t.x,t.y,13,t.h);
    let sr=ctx.createLinearGradient(t.x+t.w-13,0,t.x+t.w,0);sr.addColorStop(0,'rgba(0,0,0,0)');sr.addColorStop(1,'rgba(0,0,0,0.5)');ctx.fillStyle=sr;ctx.fillRect(t.x+t.w-13,t.y,13,t.h);
    // faint warm light pooling on the floor (no hard lip)
    const fl=ctx.createLinearGradient(0,t.y+t.h-18,0,t.y+t.h);fl.addColorStop(0,'rgba(0,0,0,0)');fl.addColorStop(1,rgba('#6a4422',0.45));ctx.fillStyle=fl;ctx.fillRect(t.x,t.y+t.h-18,t.w,18);
  }
  // crumbly organic edges (pebbles straddling the cavity borders) — kills the
  // straight "boarded-up" line and reads as freshly-dug earth
  function tunnelEdges(ctx){
    const rng=D.mulberry32(404);
    TUN.forEach(t=>{
      for(let x=t.x-3;x<t.x+t.w+3;x+=3.5+rng()*3){ pebble(ctx,x,t.y+(rng()-0.45)*5,2+rng()*3.5,rng); }
      for(let x=t.x+4;x<t.x+t.w-2;x+=7+rng()*5){ if(rng()<0.7) pebble(ctx,x,t.y+t.h+(rng()-0.6)*5,1.5+rng()*3,rng); }
      for(let y=t.y+8;y<t.y+t.h-4;y+=8+rng()*6){ if(rng()<0.55) pebble(ctx,t.x+(rng()-0.5)*5,y,1.4+rng()*2.4,rng); if(rng()<0.55) pebble(ctx,t.x+t.w+(rng()-0.5)*5,y,1.4+rng()*2.4,rng); }
    });
  }

  /* ---------- ore clusters ---------- */
  const ORE2={
    gold:{base:'#d9a52a',hi:'#ffe884',lo:'#8f6512',glint:'#fff6c8',glow:'#ffcf57'},
    coal:{base:'#3b3b42',hi:'#62626e',lo:'#191920',glint:'#9aa0ad',glow:null},
    emerald:{base:'#2f9560',hi:'#86ecae',lo:'#185c39',glint:'#e6fff0',glow:'#46d98a'},
    copper:{base:'#c0703a',hi:'#ffb472',lo:'#783c1b',glint:'#ffe6c2',glow:'#ff8a40'},
    iron:{base:'#9a5f43',hi:'#cf8a64',lo:'#5e3322',glint:'#e8c2a8',glow:null},
    silver:{base:'#9ba2ab',hi:'#edf2f7',lo:'#595f68',glint:'#ffffff',glow:null},
    diamond:{base:'#82bce4',hi:'#e2f4ff',lo:'#3f80b2',glint:'#ffffff',glow:'#9fd8ff'},
  };
  function chunk(ctx,cx,cy,r,O,rng){
    const n=5+Math.floor(rng()*2),pts=[];
    for(let i=0;i<n;i++){const a=i/n*Math.PI*2+rng()*0.3;const rr2=r*(0.7+rng()*0.5);pts.push([cx+Math.cos(a)*rr2,cy+Math.sin(a)*rr2]);}
    ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();
    const g=ctx.createLinearGradient(cx-r,cy-r,cx+r,cy+r);g.addColorStop(0,O.hi);g.addColorStop(0.5,O.base);g.addColorStop(1,O.lo);ctx.fillStyle=g;ctx.fill();
    ctx.lineWidth=1;ctx.strokeStyle=shade(O.lo,-18);ctx.stroke();
    // facet split (darker lower-right half)
    ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(pts[Math.floor(n*0.15)][0],pts[Math.floor(n*0.15)][1]);for(let i=Math.floor(n*0.15);i<=Math.floor(n*0.6);i++)ctx.lineTo(pts[i%n][0],pts[i%n][1]);ctx.closePath();ctx.fillStyle=rgba('#000000',0.22);ctx.fill();
    // glint
    ctx.beginPath();ctx.arc(cx-r*0.3,cy-r*0.35,r*0.18,0,7);ctx.fillStyle=O.glint;ctx.fill();
  }
  function oreCluster(ctx,cx,cy,type,scale){
    scale=scale||1;const O=ORE2[type];const rng=D.mulberry32((cx*131+cy*977)>>>0);
    // ground shadow
    ctx.beginPath();ctx.ellipse(cx,cy+14*scale,30*scale,12*scale,0,0,7);ctx.fillStyle='rgba(0,0,0,0.4)';ctx.fill();
    if(O.glow){ctx.save();ctx.globalCompositeOperation='lighter';const gg=ctx.createRadialGradient(cx,cy,3,cx,cy,46*scale);gg.addColorStop(0,rgba(O.glow,0.4));gg.addColorStop(0.5,rgba(O.glow,0.14));gg.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=gg;ctx.beginPath();ctx.arc(cx,cy,46*scale,0,7);ctx.fill();ctx.restore();}
    const spots=[[0,0,1.3],[-18,4,1],[16,6,1],[-9,-12,0.9],[10,-10,1],[0,14,0.85],[22,-4,0.8],[-22,-3,0.8]];
    const m=6+Math.floor(rng()*3);
    for(let i=0;i<m;i++){const s=spots[i%spots.length];chunk(ctx,cx+s[0]*scale+(rng()-0.5)*4,cy+s[1]*scale+(rng()-0.5)*4,(8+rng()*4)*s[2]*scale,O,rng);}
  }

  /* ---------- props ---------- */
  function grassCrown(ctx){
    // leave a gap where a tunnel reaches the surface (the entrance hole)
    const gaps=TUN.filter(t=>t.y<=GY+3).map(t=>[t.x-2,t.x+t.w+2]).sort((a,b)=>a[0]-b[0]);
    const spans=[];let cur=0;gaps.forEach(g=>{if(g[0]>cur)spans.push([cur,g[0]]);cur=Math.max(cur,g[1]);});if(cur<W)spans.push([cur,W]);
    const rng=D.mulberry32(7);
    spans.forEach(sp=>{const x0=sp[0],x1=sp[1];
      const g=ctx.createLinearGradient(0,GY-5,0,GY+8);g.addColorStop(0,'#7fc24a');g.addColorStop(1,'#3c7327');ctx.fillStyle=g;ctx.fillRect(x0,GY-3,x1-x0,9);
      ctx.fillStyle='rgba(0,0,0,0.3)';ctx.fillRect(x0,GY+6,x1-x0,3);
      ctx.strokeStyle='#6fb13e';ctx.lineWidth=1.4;
      for(let x=x0;x<x1;x+=4){if(rng()<0.7){ctx.beginPath();ctx.moveTo(x,GY+4);ctx.lineTo(x+(rng()-0.5)*5,GY-3-rng()*4);ctx.stroke();}}
    });
  }
  function lantern(ctx,x,y){
    ctx.strokeStyle='#2a2118';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,y-26);ctx.lineTo(x,y-6);ctx.stroke();
    ctx.save();ctx.globalCompositeOperation='lighter';const g=ctx.createRadialGradient(x,y,2,x,y,40);g.addColorStop(0,rgba('#ffd27a',0.55));g.addColorStop(0.5,rgba('#ff9a3a',0.22));g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,40,0,7);ctx.fill();ctx.restore();
    for(let i=-1;i<=1;i++){const fx=x+i*4;ctx.beginPath();ctx.moveTo(fx,y+6);ctx.quadraticCurveTo(fx-3,y-2,fx,y-8-Math.abs(i)*2);ctx.quadraticCurveTo(fx+3,y-2,fx,y+6);const fg=ctx.createLinearGradient(0,y-8,0,y+6);fg.addColorStop(0,'#fff0b0');fg.addColorStop(0.5,'#ff9a2a');fg.addColorStop(1,'#e0431c');ctx.fillStyle=fg;ctx.fill();}
  }
  function lampPost(ctx,x){
    ctx.strokeStyle='#3a342c';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(x,GY);ctx.lineTo(x,GY-150);ctx.stroke();
    ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x,GY-150);ctx.quadraticCurveTo(x+8,GY-162,x+30,GY-158);ctx.stroke();
    rr(ctx,x+26,GY-162,16,12,3);ctx.fillStyle='#4a4238';ctx.fill();
    // light cone
    ctx.save();ctx.globalCompositeOperation='lighter';ctx.beginPath();ctx.moveTo(x+34,GY-150);ctx.lineTo(x+150,GY-10);ctx.lineTo(x-30,GY-10);ctx.closePath();const cg=ctx.createLinearGradient(0,GY-150,0,GY-10);cg.addColorStop(0,rgba('#ffe6a0',0.5));cg.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=cg;ctx.fill();ctx.restore();
    ctx.beginPath();ctx.arc(x+34,GY-156,3,0,7);ctx.fillStyle='#fff0c0';ctx.fill();
  }

  function metalPanel(ctx,x,y,w,h,base){
    const g=ctx.createLinearGradient(0,y,0,y+h);g.addColorStop(0,shade(base,26));g.addColorStop(0.5,base);g.addColorStop(1,shade(base,-26));ctx.fillStyle=g;ctx.fillRect(x,y,w,h);
    // grime streaks
    const rng=D.mulberry32((x*7+y*3)>>>0);for(let i=0;i<w/22;i++){const sx=x+rng()*w;ctx.fillStyle=rgba('#000000',0.06+rng()*0.06);ctx.fillRect(sx,y,1.5+rng()*2,h);}
    ctx.strokeStyle=shade(base,-40);ctx.lineWidth=2;ctx.strokeRect(x,y,w,h);
    ctx.strokeStyle=rgba('#ffffff',0.1);ctx.beginPath();ctx.moveTo(x+1,y+1);ctx.lineTo(x+w-1,y+1);ctx.stroke();
  }
  function sign(ctx,x,y,w,h,text,fs,plate){
    rr(ctx,x,y,w,h,4);const g=ctx.createLinearGradient(0,y,0,y+h);g.addColorStop(0,shade(plate,24));g.addColorStop(1,shade(plate,-26));ctx.fillStyle=g;ctx.fill();
    ctx.lineWidth=3;ctx.strokeStyle=shade(plate,-48);ctx.stroke();rivets(ctx,x,y,w,h,Math.max(20,w/8),shade(plate,-55));
    ctx.font=`800 ${fs}px Oxanium, sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillText(text,x+w/2+1.5,y+h/2+2);
    ctx.fillStyle='#f3dca0';ctx.fillText(text,x+w/2,y+h/2);
    ctx.textAlign='start';ctx.textBaseline='alphabetic';
  }
  function pipe(ctx,pts,wd,col){ctx.strokeStyle=col;ctx.lineWidth=wd;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.stroke();ctx.strokeStyle=rgba('#ffffff',0.18);ctx.lineWidth=wd*0.3;ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p[0]-wd*0.18,p[1]-wd*0.18):ctx.moveTo(p[0]-wd*0.18,p[1]-wd*0.18));ctx.stroke();ctx.lineCap='butt';}
  function litWindow(ctx,x,y,w,h){ctx.save();ctx.globalCompositeOperation='lighter';const g=ctx.createRadialGradient(x+w/2,y+h/2,1,x+w/2,y+h/2,w);g.addColorStop(0,rgba('#ffb347',0.5));g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(x-w,y-h,w*3,h*3);ctx.restore();const wg=ctx.createLinearGradient(0,y,0,y+h);wg.addColorStop(0,'#ffd27a');wg.addColorStop(1,'#c9781f');ctx.fillStyle=wg;ctx.fillRect(x,y,w,h);ctx.strokeStyle='#1a120a';ctx.lineWidth=1.5;ctx.strokeRect(x,y,w,h);}

  function fuelDepot(ctx){
    const x0=224,x1=470,top=132,gy=GY;
    // back pipes
    pipe(ctx,[[x0+10,top+8],[x1-8,top+8],[x1-8,top+40]],8,'#54483a');
    // main hall
    metalPanel(ctx,x0+54,top+24,x1-x0-54,gy-(top+24),'#4d4034');
    rivets(ctx,x0+54,top+24,x1-x0-54,gy-(top+24),34);
    // sign banner
    sign(ctx,x0+58,top+30,x1-x0-66,30,'FUEL DEPOT',21,'#9a3a26');
    // garage door
    metalPanel(ctx,x1-92,gy-78,80,78,'#332a22');for(let i=0;i<6;i++){ctx.fillStyle=rgba('#000000',0.3);ctx.fillRect(x1-90,gy-74+i*12,76,2);}
    // windows
    litWindow(ctx,x0+96,top+76,30,26);litWindow(ctx,x0+150,top+76,30,26);
    // red fuel tank (cylinder) on the left
    const tx=x0+12,tw=46,ttop=top+34,tbot=gy-6;
    const tg=ctx.createLinearGradient(tx,0,tx+tw,0);tg.addColorStop(0,'#7a2417');tg.addColorStop(0.4,'#b8472f');tg.addColorStop(1,'#5e1d12');rr(ctx,tx,ttop,tw,tbot-ttop,{tl:10,tr:10,br:6,bl:6});ctx.fillStyle=tg;ctx.fill();
    ctx.strokeStyle='#3a120a';ctx.lineWidth=2;ctx.stroke();
    for(let yy=ttop+14;yy<tbot;yy+=22){ctx.strokeStyle='rgba(0,0,0,0.35)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(tx,yy);ctx.lineTo(tx+tw,yy);ctx.stroke();}
    pipe(ctx,[[tx+tw,ttop+10],[tx+tw+18,ttop+10],[tx+tw+18,gy-30]],6,'#4a4036');
    // pump w/ LCD
    const px=x0+2,py=gy-58;rr(ctx,px,py,30,58,3);ctx.fillStyle='#3a342c';ctx.fill();ctx.strokeStyle='#1a160f';ctx.lineWidth=2;ctx.stroke();
    rr(ctx,px+4,py+6,22,14,2);ctx.fillStyle='#0c1a0c';ctx.fill();ctx.fillStyle='#7bf06a';ctx.font='700 9px Oxanium, monospace';ctx.fillText('1245L',px+5,py+16);
    ctx.fillStyle='#b03020';ctx.fillRect(px+8,py+26,14,8);
    // roof beacon
    ctx.beginPath();ctx.arc(x0+74,top+24,3,0,7);ctx.fillStyle='#ff4338';ctx.fill();ctx.save();ctx.globalCompositeOperation='lighter';ctx.beginPath();ctx.arc(x0+74,top+24,7,0,7);ctx.fillStyle=rgba('#ff4338',0.4);ctx.fill();ctx.restore();
  }

  function processor(ctx){
    const x0=760,x1=1066,top=104,gy=GY;
    // smokestack + antenna behind
    metalPanel(ctx,x1-118,top-44,30,50,'#3e352b');
    // smoke
    ctx.save();ctx.globalCompositeOperation='lighter';const rng=D.mulberry32(5);for(let i=0;i<6;i++){const sy=top-50-i*16,sx=x1-104+Math.sin(i)*6,sr=8+i*3;const sg=ctx.createRadialGradient(sx,sy,1,sx,sy,sr);sg.addColorStop(0,rgba('#9aa0ad',0.18));sg.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=sg;ctx.beginPath();ctx.arc(sx,sy,sr,0,7);ctx.fill();}ctx.restore();
    ctx.strokeStyle='#4a4238';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x0+60,top-30);ctx.lineTo(x0+60,top-70);ctx.stroke();ctx.beginPath();ctx.arc(x0+60,top-72,3,0,7);ctx.fillStyle='#ff4338';ctx.fill();
    // back header pipe (single, structural)
    pipe(ctx,[[x0+20,top+8],[x1-20,top+8]],9,'#564a3c');
    // main hall
    metalPanel(ctx,x0+40,top+18,x1-x0-40,gy-(top+18),'#4a4034');
    rivets(ctx,x0+40,top+18,x1-x0-40,gy-(top+18),36);
    sign(ctx,x0+44,top+24,x1-x0-52,30,'MINERAL PROCESSOR',16,'#6a5a2e');
    // round silo tank left
    const sxx=x0+8,scy=gy-44;rr(ctx,sxx,gy-92,52,86,{tl:24,tr:24,br:6,bl:6});const sg=ctx.createLinearGradient(sxx,0,sxx+52,0);sg.addColorStop(0,'#3a352d');sg.addColorStop(0.45,'#615648');sg.addColorStop(1,'#2c2820');ctx.fillStyle=sg;ctx.fill();ctx.strokeStyle='#1c1813';ctx.lineWidth=2;ctx.stroke();
    for(let yy=gy-78;yy<gy-6;yy+=20){ctx.strokeStyle='rgba(0,0,0,0.3)';ctx.beginPath();ctx.moveTo(sxx,yy);ctx.lineTo(sxx+52,yy);ctx.stroke();}
    litWindow(ctx,sxx+14,gy-58,18,16);
    // glowing furnace window
    const fx=x0+96,fy=gy-66;ctx.save();ctx.globalCompositeOperation='lighter';const fg=ctx.createRadialGradient(fx+24,fy+22,2,fx+24,fy+22,60);fg.addColorStop(0,rgba('#ff9a2a',0.55));fg.addColorStop(0.5,rgba('#ff6a1a',0.2));fg.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=fg;ctx.fillRect(fx-40,fy-40,140,120);ctx.restore();
    rr(ctx,fx,fy,48,46,4);const fwg=ctx.createLinearGradient(0,fy,0,fy+46);fwg.addColorStop(0,'#ffd27a');fwg.addColorStop(0.5,'#ff8a1f');fwg.addColorStop(1,'#c2450c');ctx.fillStyle=fwg;ctx.fill();ctx.strokeStyle='#1a120a';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='rgba(0,0,0,0.4)';ctx.fillRect(fx+22,fy,3,46);ctx.fillRect(fx,fy+21,48,3);
    // one clean downpipe on the right
    pipe(ctx,[[x1-22,top+30],[x1-22,gy-12]],8,'#564a3c');
  }

  function conveyor(ctx){
    const x0=1080,x1=1180,gy=GY;
    // belt frame down to gold pile
    ctx.save();ctx.translate(x0,gy-70);ctx.rotate(0.5);
    metalPanel(ctx,0,0,140,18,'#3a352c');for(let i=0;i<7;i++){ctx.fillStyle='rgba(0,0,0,0.4)';ctx.fillRect(8+i*18,2,3,14);}
    ctx.restore();
    // gold pile
    const px=1140,py=gy-4;const rng=D.mulberry32(33);
    ctx.beginPath();ctx.ellipse(px,py+6,48,14,0,0,7);ctx.fillStyle='rgba(0,0,0,0.4)';ctx.fill();
    for(let i=0;i<26;i++){const a=rng()*Math.PI*2,d=rng()*40;const gx=px+Math.cos(a)*d,gy2=py-Math.abs(Math.sin(a))*22*rng();chunk(ctx,gx,gy2,6+rng()*4,ORE2.gold,rng);}
  }

  function rover(ctx){
    // compact pod ~ one tunnel-bore wide (so it fits the corridors it digs),
    // sitting at the entrance shaft (x648..690) with the drill pointing DOWN.
    const cx=669,gy=GY;
    ctx.save();ctx.translate(cx,gy);
    ctx.beginPath();ctx.ellipse(0,-2,22,5,0,0,7);ctx.fillStyle='rgba(0,0,0,0.4)';ctx.fill();
    // drill (down into the shaft)
    const dg=ctx.createLinearGradient(-12,-6,12,18);dg.addColorStop(0,'#e6ebf1');dg.addColorStop(0.5,'#9aa1ab');dg.addColorStop(1,'#4e545e');
    ctx.beginPath();ctx.moveTo(-12,-6);ctx.lineTo(12,-6);ctx.lineTo(0,18);ctx.closePath();ctx.fillStyle=dg;ctx.fill();ctx.lineWidth=1.6;ctx.strokeStyle='#262a30';ctx.stroke();
    for(let i=1;i<=2;i++){const t=i/3;ctx.strokeStyle='rgba(35,39,45,0.85)';ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(-12*(1-t),-6+24*t);ctx.lineTo(12*(1-t),-6+24*t);ctx.stroke();}
    // side treads
    [-1,1].forEach(d=>{rr(ctx,d*16-4,-26,8,20,3);ctx.fillStyle='#33302a';ctx.fill();ctx.lineWidth=1.3;ctx.strokeStyle='#15130f';ctx.stroke();ctx.fillStyle='#1c1a16';for(let k=0;k<3;k++)ctx.fillRect(d*16-3,-24+k*7,6,2);});
    // body (compact amber pod)
    rr(ctx,-19,-34,38,30,{tl:13,tr:13,br:6,bl:6});
    const bg=ctx.createLinearGradient(-19,-34,12,-4);bg.addColorStop(0,'#f6c83e');bg.addColorStop(0.5,'#e09a22');bg.addColorStop(1,'#9c6516');ctx.fillStyle=bg;ctx.fill();ctx.lineWidth=2;ctx.strokeStyle='#5e3f12';ctx.stroke();
    rr(ctx,-16,-32,32,6,5);ctx.fillStyle='rgba(255,255,255,0.22)';ctx.fill();
    // cockpit visor
    ctx.beginPath();ctx.arc(0,-18,7,0,7);const vg=ctx.createRadialGradient(-2,-20,1,0,-18,7);vg.addColorStop(0,'#cdf2ff');vg.addColorStop(0.5,'#37b6d8');vg.addColorStop(1,'#0c5f80');ctx.fillStyle=vg;ctx.fill();ctx.lineWidth=1.6;ctx.strokeStyle='#08323f';ctx.stroke();ctx.beginPath();ctx.arc(-2,-20,2,0,7);ctx.fillStyle='rgba(255,255,255,0.85)';ctx.fill();
    // hazard stripe
    ctx.save();rr(ctx,-19,-12,38,6,2);ctx.clip();for(let i=-3;i<8;i++){ctx.fillStyle=i%2?'#1a1610':'#f0b21f';ctx.beginPath();ctx.moveTo(i*8,-12);ctx.lineTo(i*8+6,-12);ctx.lineTo(i*8-2,-6);ctx.lineTo(i*8-8,-6);ctx.closePath();ctx.fill();}ctx.restore();
    // rivets
    ctx.fillStyle='#5e3f12';[[-14,-30],[14,-30],[-14,-9],[14,-9]].forEach(p=>{ctx.beginPath();ctx.arc(p[0],p[1],1.5,0,7);ctx.fill();});
    // antenna + beacon
    ctx.strokeStyle='#8a8f96';ctx.lineWidth=1.8;ctx.beginPath();ctx.moveTo(-12,-34);ctx.lineTo(-16,-46);ctx.stroke();ctx.beginPath();ctx.arc(-16,-47,2.4,0,7);ctx.fillStyle='#ff4a3c';ctx.fill();
    ctx.save();ctx.globalCompositeOperation='lighter';ctx.beginPath();ctx.arc(-16,-47,4,0,7);ctx.fillStyle=rgba('#ff4a3c',0.4);ctx.fill();ctx.restore();
    ctx.restore();
  }

  /* ---- shop thumbnails: the same art the world uses ---- */
  function renderOreIcon(canvas,type,px){
    px=px||36;canvas.width=px*2;canvas.height=px*2;
    canvas.style.width=px+'px';canvas.style.height=px+'px';
    const ctx=canvas.getContext('2d');ctx.scale(2,2);
    oreCluster(ctx,px/2,px/2-1,type,px/72);
  }
  function renderDrillIcon(canvas,cHi,cLo,px){
    px=px||84;const w=px,h=Math.round(px*0.72);
    canvas.width=w*2;canvas.height=h*2;canvas.style.width=w+'px';canvas.style.height=h+'px';
    const ctx=canvas.getContext('2d');ctx.scale(2,2);
    const x0=w*0.16,tip=w*0.96,cy=h/2,R=h*0.38;
    // mount plate + collar
    rr(ctx,x0-w*0.11,cy-R*1.12,w*0.12,R*2.24,3);ctx.fillStyle='#23262c';ctx.fill();
    ctx.beginPath();ctx.ellipse(x0,cy,w*0.05,R*1.06,0,0,7);ctx.fillStyle='#3c4148';ctx.fill();
    // cone with cylinder shading
    const g=ctx.createLinearGradient(0,cy-R,0,cy+R);
    g.addColorStop(0,lerp(cHi,cLo,0.35));g.addColorStop(0.28,cHi);g.addColorStop(0.6,lerp(cHi,cLo,0.5));g.addColorStop(1,cLo);
    ctx.beginPath();ctx.moveTo(x0,cy-R);
    ctx.quadraticCurveTo(x0+(tip-x0)*0.5,cy-R*0.78,tip,cy);
    ctx.quadraticCurveTo(x0+(tip-x0)*0.5,cy+R*0.78,x0,cy+R);
    ctx.closePath();ctx.fillStyle=g;ctx.fill();
    ctx.lineWidth=1.4;ctx.strokeStyle='rgba(10,12,16,0.7)';ctx.stroke();
    // screw-thread arcs
    [0.16,0.36,0.56,0.76].forEach(t=>{
      const x=x0+(tip-x0)*t,r=R*(1-t)*0.95+R*0.05;
      ctx.beginPath();ctx.ellipse(x,cy,r*0.26,r*0.96,0,-Math.PI/2,Math.PI/2);ctx.strokeStyle='rgba(0,0,0,0.35)';ctx.lineWidth=2;ctx.stroke();
      ctx.beginPath();ctx.ellipse(x-2,cy,r*0.26,r*0.96,0,-Math.PI/2,Math.PI/2);ctx.strokeStyle='rgba(255,255,255,0.22)';ctx.lineWidth=1.2;ctx.stroke();
    });
    // specular streak + tip glint
    ctx.beginPath();ctx.ellipse(x0+(tip-x0)*0.42,cy-R*0.5,(tip-x0)*0.3,R*0.1,-0.06,0,7);ctx.fillStyle='rgba(255,255,255,0.3)';ctx.fill();
    ctx.beginPath();ctx.arc(tip-2,cy,1.6,0,7);ctx.fillStyle='rgba(255,255,255,0.8)';ctx.fill();
  }

  function renderRef(canvas){
    canvas.width=W*SS;canvas.height=H*SS;canvas.style.width='100%';canvas.style.height='auto';
    const ctx=canvas.getContext('2d');ctx.scale(SS,SS);
    sky(ctx);mountains(ctx);
    pebbleSoil(ctx);
    TUN.forEach(t=>carve(ctx,t));
    tunnelEdges(ctx);
    grassCrown(ctx);
    // ores embedded
    oreCluster(ctx,770,360,'gold');
    oreCluster(ctx,512,432,'coal');
    oreCluster(ctx,884,408,'coal',0.7);
    oreCluster(ctx,1108,452,'silver',0.7);
    oreCluster(ctx,250,520,'emerald');
    oreCluster(ctx,840,560,'copper');
    oreCluster(ctx,1040,560,'silver',0.8);
    oreCluster(ctx,720,590,'diamond');
    lantern(ctx,662,540);
    // surface structures
    lampPost(ctx,70);
    fuelDepot(ctx);
    processor(ctx);
    conveyor(ctx);
    rover(ctx);
    // moonlight + vignette
    ctx.save();ctx.globalCompositeOperation='lighter';const ml=ctx.createRadialGradient(580,66,40,580,66,W*0.7);ml.addColorStop(0,rgba('#aebbe6',0.08));ml.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=ml;ctx.fillRect(0,0,W,H);ctx.restore();
    const vg=ctx.createRadialGradient(W/2,H*0.46,H*0.42,W/2,H*0.5,H*0.95);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,0.4)');ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);
  }

  Object.assign(D, { renderRef, renderOreIcon, renderDrillIcon });
})(window);
