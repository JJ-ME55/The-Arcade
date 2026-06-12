/* DEEPER — dig view: grid world renderer + minimal dig loop.
   Tactile-industrial procedural art (pebbly soil, carved tunnels, glinting ore)
   consistent with the locked style frames. */
(function (global) {
  'use strict';
  const D = global.DEEPER;

  const TILE=48, COLS=20, ROWS=40, SURFACE=2; // rows 0..1 sky, row 2 grass-topped
  function hx(c){c=c.replace('#','');return [parseInt(c.slice(0,2),16),parseInt(c.slice(2,4),16),parseInt(c.slice(4,6),16)];}
  function rgba(c,a){const[r,g,b]=hx(c);return `rgba(${r},${g},${b},${a})`;}
  function lerp(c1,c2,t){const a=hx(c1),b=hx(c2);return `rgb(${Math.round(a[0]+(b[0]-a[0])*t)},${Math.round(a[1]+(b[1]-a[1])*t)},${Math.round(a[2]+(b[2]-a[2])*t)})`;}

  const ORE2={
    coal:   {base:'#3b3b42',hi:'#62626e',lo:'#191920',glint:'#9aa0ad',glow:null,      name:'Coal',   val:12},
    copper: {base:'#c0703a',hi:'#ffb472',lo:'#783c1b',glint:'#ffe6c2',glow:'#ff8a40', name:'Copper', val:45},
    iron:   {base:'#9a5f43',hi:'#cf8a64',lo:'#5e3322',glint:'#e8c2a8',glow:null,      name:'Iron',   val:30},
    silver: {base:'#9ba2ab',hi:'#edf2f7',lo:'#595f68',glint:'#ffffff',glow:null,      name:'Silver', val:90},
    gold:   {base:'#d9a52a',hi:'#ffe884',lo:'#8f6512',glint:'#fff6c8',glow:'#ffcf57', name:'Gold',   val:320},
    diamond:{base:'#82bce4',hi:'#e2f4ff',lo:'#3f80b2',glint:'#ffffff',glow:'#9fd8ff', name:'Diamond',val:1200},
  };

  /* ---- world gen ---- */
  function genWorld(seed){
    const rng=D.mulberry32(seed>>>0);
    const grid=[];
    for(let r=0;r<ROWS;r++){
      const row=[];
      for(let c=0;c<COLS;c++){
        if(r<SURFACE){row.push({t:'sky'});continue;}
        const depth=(r-SURFACE)/(ROWS-SURFACE);
        let t='dirt', ore=null, hp=1;
        if(r>SURFACE && rng()<0.10+depth*0.15){t='stone';hp=2;}
        const roll=rng();
        if(r>SURFACE+1){
          if(roll<0.05) ore='coal';
          else if(roll<0.05+0.04*Math.min(1,depth*3)) ore='copper';
          else if(roll<0.09+0.035*Math.min(1,depth*2.4)) ore='iron';
          else if(depth>0.3&&roll>0.96) ore='silver';
          else if(depth>0.45&&roll>0.985) ore='gold';
          else if(depth>0.7&&roll>0.995) ore='diamond';
        }
        row.push({t,ore,hp,seed:(rng()*1e9)|0});
      }
      grid.push(row);
    }
    // landing pit under start col
    grid[SURFACE][10]={t:'empty',ore:null,hp:0,seed:1};
    return grid;
  }

  /* ---- tile painters ---- */
  function paintDirt(ctx,x,y,seed,depth){
    const rng=D.mulberry32(seed);
    ctx.fillStyle=lerp('#65401f','#2e1c0c',Math.min(1,depth*1.15));ctx.fillRect(x,y,TILE,TILE);
    for(let i=0;i<16;i++){
      const px=x+rng()*TILE,py=y+rng()*TILE,r=1.6+rng()*4.2;
      const base=lerp(lerp('#8a5e34','#3a2614',Math.min(1,depth)), '#1c120a', rng()*0.3);
      ctx.beginPath();ctx.ellipse(px,py+r*0.4,r*1.02,r*0.6,0,0,7);ctx.fillStyle='rgba(0,0,0,0.25)';ctx.fill();
      ctx.beginPath();ctx.arc(px,py,r,0,7);ctx.fillStyle=base;ctx.fill();
      ctx.beginPath();ctx.arc(px-r*0.3,py-r*0.32,r*0.5,0,7);ctx.fillStyle='rgba(255,235,200,0.16)';ctx.fill();
    }
  }
  function paintStone(ctx,x,y,seed,hp){
    const rng=D.mulberry32(seed+7);
    paintDirt(ctx,x,y,seed,0.5);
    const l=x+3,t=y+3,w=TILE-6,h=TILE-6;
    ctx.beginPath();ctx.moveTo(l+6,t);ctx.lineTo(l+w-4,t+2);ctx.lineTo(l+w,t+h-6);ctx.lineTo(l+w-8,t+h);ctx.lineTo(l+4,t+h-3);ctx.lineTo(l,t+8);ctx.closePath();
    const g=ctx.createLinearGradient(l,t,l+w,t+h);g.addColorStop(0,'#8a8275');g.addColorStop(0.5,'#6a6258');g.addColorStop(1,'#48433b');
    ctx.fillStyle=g;ctx.fill();ctx.lineWidth=1.5;ctx.strokeStyle='rgba(20,18,14,0.7)';ctx.stroke();
    for(let i=0;i<8;i++){ctx.fillStyle=rng()>0.5?'rgba(255,255,255,0.10)':'rgba(0,0,0,0.18)';ctx.fillRect(l+rng()*w,t+rng()*h,2,2);}
    if(hp<2){ctx.strokeStyle='rgba(10,8,6,0.85)';ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(l+w*0.2,t+h*0.25);ctx.lineTo(l+w*0.5,t+h*0.55);ctx.lineTo(l+w*0.42,t+h*0.8);ctx.moveTo(l+w*0.5,t+h*0.55);ctx.lineTo(l+w*0.78,t+h*0.62);ctx.stroke();}
  }
  function paintOre(ctx,x,y,type,seed){
    const O=ORE2[type],rng=D.mulberry32(seed+13),cx=x+TILE/2,cy=y+TILE/2;
    if(O.glow){ctx.save();ctx.globalCompositeOperation='lighter';
      const g=ctx.createRadialGradient(cx,cy,2,cx,cy,TILE*0.62);g.addColorStop(0,rgba(O.glow,0.4));g.addColorStop(0.5,rgba(O.glow,0.13));g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g;ctx.fillRect(x-6,y-6,TILE+12,TILE+12);ctx.restore();}
    const n=4+((rng()*3)|0);
    for(let i=0;i<n;i++){
      const a=rng()*7,d=rng()*10,nx=cx+Math.cos(a)*d,ny=cy+Math.sin(a)*d,r=3.5+rng()*4;
      const pts=[];const m=5+((rng()*2)|0);
      for(let k=0;k<m;k++){const aa=k/m*Math.PI*2+rng()*0.4;pts.push([nx+Math.cos(aa)*r*(0.75+rng()*0.4),ny+Math.sin(aa)*r*(0.75+rng()*0.4)]);}
      ctx.beginPath();pts.forEach((p,k)=>k?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();
      const g=ctx.createLinearGradient(nx-r,ny-r,nx+r,ny+r);g.addColorStop(0,O.hi);g.addColorStop(0.5,O.base);g.addColorStop(1,O.lo);
      ctx.fillStyle=g;ctx.fill();ctx.lineWidth=1;ctx.strokeStyle=rgba(O.lo,0.9);ctx.stroke();
      ctx.beginPath();ctx.arc(nx-r*0.3,ny-r*0.35,r*0.22,0,7);ctx.fillStyle=O.glint;ctx.fill();
    }
  }
  function paintEmpty(ctx,x,y,grid,c,r){
    const g=ctx.createLinearGradient(0,y,0,y+TILE);g.addColorStop(0,'#171008');g.addColorStop(1,'#0a0603');
    ctx.fillStyle=g;ctx.fillRect(x,y,TILE,TILE);
    const solid=(cc,rr)=>{const t=grid[rr]&&grid[rr][cc];return t&&t.t!=='empty'&&t.t!=='sky';};
    ctx.fillStyle='rgba(176,118,54,0.75)';
    if(solid(c,r-1))ctx.fillRect(x,y,TILE,2.5);
    ctx.fillStyle='rgba(122,78,38,0.6)';
    if(solid(c-1,r))ctx.fillRect(x,y,2.5,TILE);
    if(solid(c+1,r))ctx.fillRect(x+TILE-2.5,y,2.5,TILE);
    ctx.fillStyle='rgba(201,138,68,0.4)';
    if(solid(c,r+1))ctx.fillRect(x,y+TILE-2.5,TILE,2.5);
  }
  function paintPod(ctx,px,py,dir,frame){
    const cx=px+TILE/2,cy=py+TILE/2;
    ctx.save();ctx.translate(cx,cy);
    // lamp glow
    ctx.save();ctx.globalCompositeOperation='lighter';
    const lg=ctx.createRadialGradient(0,0,6,0,0,TILE*2.2);lg.addColorStop(0,'rgba(255,233,176,0.20)');lg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=lg;ctx.fillRect(-TILE*2.2,-TILE*2.2,TILE*4.4,TILE*4.4);ctx.restore();
    if(dir==='left')ctx.scale(-1,1);
    const down=dir==='down';
    ctx.rotate(down?Math.PI/2:0);
    // drill (points +x)
    const wob=Math.sin(frame*0.8)*1.2;
    const dg=ctx.createLinearGradient(0,-10,0,10);dg.addColorStop(0,'#e6ebf1');dg.addColorStop(0.5,'#9aa1ab');dg.addColorStop(1,'#4e545e');
    ctx.beginPath();ctx.moveTo(10,-9+wob*0.3);ctx.lineTo(24,0);ctx.lineTo(10,9-wob*0.3);ctx.closePath();
    ctx.fillStyle=dg;ctx.fill();ctx.lineWidth=1.4;ctx.strokeStyle='#262a30';ctx.stroke();
    ctx.strokeStyle='rgba(35,39,45,0.85)';ctx.beginPath();ctx.moveTo(14,-6);ctx.lineTo(14,6);ctx.moveTo(19,-3);ctx.lineTo(19,3);ctx.stroke();
    // treads
    ctx.fillStyle='#33302a';ctx.strokeStyle='#15130f';ctx.lineWidth=1.2;
    ctx.beginPath();ctx.roundRect(-14,8,26,7,3);ctx.fill();ctx.stroke();
    ctx.fillStyle='#1c1a16';for(let k=0;k<4;k++)ctx.fillRect(-12+k*6+((frame|0)%6)*0.7,9.5,3,4);
    // body
    ctx.beginPath();ctx.roundRect(-16,-12,28,22,7);
    const bg=ctx.createLinearGradient(-16,-12,8,10);bg.addColorStop(0,'#f6c83e');bg.addColorStop(0.5,'#e09a22');bg.addColorStop(1,'#9c6516');
    ctx.fillStyle=bg;ctx.fill();ctx.lineWidth=1.8;ctx.strokeStyle='#5e3f12';ctx.stroke();
    ctx.beginPath();ctx.roundRect(-13.5,-10,23,4.5,4);ctx.fillStyle='rgba(255,255,255,0.22)';ctx.fill();
    // visor
    ctx.beginPath();ctx.arc(0,-3,5.4,0,7);
    const vg=ctx.createRadialGradient(-1.5,-4.5,1,0,-3,5.4);vg.addColorStop(0,'#cdf2ff');vg.addColorStop(0.5,'#37b6d8');vg.addColorStop(1,'#0c5f80');
    ctx.fillStyle=vg;ctx.fill();ctx.lineWidth=1.3;ctx.strokeStyle='#08323f';ctx.stroke();
    ctx.beginPath();ctx.arc(-1.6,-4.6,1.4,0,7);ctx.fillStyle='rgba(255,255,255,0.85)';ctx.fill();
    // beacon
    ctx.strokeStyle='#8a8f96';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(-10,-12);ctx.lineTo(-13,-19);ctx.stroke();
    ctx.beginPath();ctx.arc(-13,-20,2,0,7);ctx.fillStyle=(frame|0)%14<7?'#ff4a3c':'#7a221a';ctx.fill();
    ctx.restore();
  }

  /* ---- sky band ---- */
  function paintSky(ctx,W){
    const h=SURFACE*TILE;
    const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,'#0a1330');g.addColorStop(0.7,'#141d3c');g.addColorStop(1,'#1b2440');
    ctx.fillStyle=g;ctx.fillRect(0,0,W,h);
    const rs=D.mulberry32(3);
    for(let i=0;i<60;i++){ctx.fillStyle=rgba('#dfe7ff',0.2+rs()*0.6);ctx.fillRect(rs()*W,rs()*(h-8),1.3,1.3);}
    // moon
    const mx=W*0.18,my=h*0.45,mr=16;
    ctx.save();ctx.globalCompositeOperation='lighter';const hg=ctx.createRadialGradient(mx,my,mr*0.7,mx,my,mr*2.4);hg.addColorStop(0,rgba('#cdd9ff',0.25));hg.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=hg;ctx.beginPath();ctx.arc(mx,my,mr*2.4,0,7);ctx.fill();ctx.restore();
    const mg=ctx.createRadialGradient(mx-5,my-5,3,mx,my,mr);mg.addColorStop(0,'#fdfdf6');mg.addColorStop(1,'#bcc2d4');ctx.fillStyle=mg;ctx.beginPath();ctx.arc(mx,my,mr,0,7);ctx.fill();
    // grass lip on surface row top
    ctx.fillStyle='#5fa83f';ctx.fillRect(0,h-3,W,3);
  }

  Object.assign(D,{DIG:{TILE,COLS,ROWS,SURFACE,ORE2,genWorld,paintDirt,paintStone,paintOre,paintEmpty,paintPod,paintSky}});
})(window);
