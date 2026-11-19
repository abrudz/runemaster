'use strict'
// RuneMaster 3D: a view layer only. index.js keeps the rules, saving and TryAPL checks;
// its <table id=M> stays in the page (hidden) as the source of truth, and this file
// reads it every frame and mirrors it into a Three.js scene. Clicks are turned back
// into index.js's own step(r,c), so no line of index.js changes.
;(()=>{
const EMOJI='"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'
// Rune stones keep the 2D shapes from index.css: a sharp corner marks where things attach.
// Bottom corners = array arguments, top corners = operands; r lists corner radii TL TR BR BL (1 = 50%).
const STONE={
  m:{r:[1,1,0,1],bg:'rgb(140,214,209)',fg:'rgb(0,73,73)'  ,side:0x3fae9f},   // emerald: monadic function (right arg)
  d:{r:[1,1,0,0],bg:'rgb(240,184,184)',fg:'rgb(146,0,0)'  ,side:0xd0607a},   // ruby: dyadic function (left + right args)
  M:{r:[0,1,1,1],bg:'rgb(158,205,250)',fg:'rgb(0,109,219)',side:0x4f8fe0},   // sapphire: monadic operator (left operand)
  D:{r:[1,0,1,1],bg:'rgb(206,176,236)',fg:'rgb(73,0,146)' ,side:0x8a5cc8},   // amethyst: ∘. (right operand)
  j:{r:[1,1,1,1],bg:null              ,fg:'#222'          ,side:0xd8dcef},   // diamond: enclosure syntax
}
const H=.26                                           // stone half-width
const geo={
  wall :new THREE.BoxGeometry(1,.7,1),
  floor:new THREE.BoxGeometry(.97,.06,.97),
  slab :new THREE.BoxGeometry(.78,.82,.12),
  post :new THREE.BoxGeometry(.11,.95,.2),
  ring :new THREE.RingGeometry(.38,.47,32),
}
const shared={
  door    :new THREE.MeshStandardMaterial({color:0x7a4b22,roughness:.8}),
  doorOpen:new THREE.MeshStandardMaterial({color:0xd9a441,emissive:0x5a3a00,roughness:.5}),
  post    :new THREE.MeshStandardMaterial({color:0x3b2a1a,roughness:.9}),
}
const stoneGeo={}
const stoneShape=([tl,tr,br,bl])=>{                   // rounded square, per-corner radius (fraction of H)
  const s=new THREE.Shape(),P=Math.PI;[tl,tr,br,bl]=[tl,tr,br,bl].map(x=>x*H)
  s.moveTo(-H+bl,-H)
  s.lineTo(H-br,-H);if(br)s.absarc(H-br,-H+br,br,-P/2,0)
  s.lineTo(H,H-tr) ;if(tr)s.absarc(H-tr,H-tr,tr,0,P/2)
  s.lineTo(-H+tl,H);if(tl)s.absarc(-H+tl,H-tl,tl,P/2,P)
  s.lineTo(-H,-H+bl);if(bl)s.absarc(-H+bl,-H+bl,bl,P,1.5*P)
  return s}
const stone=k=>stoneGeo[k]??=(()=>{
  const g=new THREE.ExtrudeGeometry(stoneShape(STONE[k].r),{depth:.09,bevelEnabled:true,bevelThickness:.03,bevelSize:.028,bevelSegments:3,curveSegments:18})
  g.translate(0,0,-.045);return g})()                 // caps get UVs = shape x,y; the face texture is fitted to [-H,H]

let R,S,C,lamp,hero,fig,hover,room,mats=[],cells=[],T={},anims=[]
let shift=0,key=null,rm=10,cm=10,mode=0,zoom=1,snapHero=true,yaw=0
const clock=new THREE.Clock(),ray=new THREE.Raycaster(),ground=new THREE.Plane(new THREE.Vector3(0,1,0),0)
const camPos=new THREE.Vector3(),camAim=new THREE.Vector3(),mouse=new THREE.Vector2(9,9)
const X=c=>c-cm/2,Z=r=>r-rm/2                       // board cell -> world x/z (room centred on origin)

// ---- textures: emoji and APL glyphs drawn on canvases ----
const texCache={},spriteMats={}
const canvasTex=(id,draw)=>texCache[id]??=(()=>{
  const cv=document.createElement('canvas');cv.width=cv.height=128
  const x=cv.getContext('2d');x.textAlign='center';x.textBaseline='middle';draw(x)
  const t=new THREE.CanvasTexture(cv);t.anisotropy=4;return t})()
const emojiTex=e=>canvasTex('e'+e,x=>{x.font=`92px ${EMOJI}`;x.fillText(e,64,70)})
const stoneMats=(k,gl)=>shared[k+gl]??=(()=>{        // [face with glyph, bevelled sides]
  const{bg,fg,side}=STONE[k]
  const t=canvasTex('s'+k+gl,x=>{
    if(bg)x.fillStyle=bg
    else{const r=x.createRadialGradient(64,51,0,64,64,90)  // diamond: the 2D stone's rainbow
      ;[[0,'#fff'],[.24,'#ffb3c6'],[.38,'#ffe0a3'],[.52,'#b9eda3'],[.66,'#a3d5ff'],[.8,'#d9a8f0'],[1,'#fff']].forEach(([o,c])=>r.addColorStop(o,c));x.fillStyle=r}
    x.fillRect(0,0,128,128)
    let s=104;const f=()=>x.font=`${s}px APL,monospace`;f()
    while(x.measureText(gl).width>100&&s>28){s-=6;f()}  // shrink multi-char tokens like () or ∘.
    x.fillStyle=x.strokeStyle=fg;x.lineWidth=5;x.lineJoin='round';x.strokeText(gl,64,68);x.fillText(gl,64,68)})
  t.repeat.set(1/(2*H),1/(2*H));t.offset.set(.5,.5)
  return[new THREE.MeshStandardMaterial({map:t,emissive:0xffffff,emissiveMap:t,emissiveIntensity:.4,roughness:.35}),
         new THREE.MeshStandardMaterial({color:side,emissive:side,emissiveIntensity:.2,metalness:.25,roughness:.3})]})()
const wallTopTex=(e,hex)=>canvasTex('w'+e+hex,x=>{x.fillStyle=hex;x.fillRect(0,0,128,128);x.font=`74px ${EMOJI}`;x.fillText(e,64,70)})
const sprite=(t,s,y)=>{
  const m=spriteMats[t.uuid]??=new THREE.SpriteMaterial({map:t,transparent:true,depthWrite:false})
  const o=new THREE.Sprite(m);o.scale.set(s,s,1);o.position.y=y;return o}
const rgb=s=>{const m=/rgba?\(([^)]+)\)/.exec(s??'');if(!m)return new THREE.Color(s||'#666')
  const[r,g,b]=m[1].split(',').map(Number);return new THREE.Color(r/255,g/255,b/255)}

// ---- tiny tween helper ----
const tween=(dur,f,done)=>anims.push({t:0,dur,f,done})
const pop=o=>{o.visible=true;o.scale.setScalar(.01);tween(.35,p=>o.scale.setScalar(1+2.2*Math.pow(p-1,3)+1.2*Math.pow(p-1,2)))}   // ease-out-back

// ---- scene setup ----
function init(){
  R=new THREE.WebGLRenderer({antialias:true})
  R.setPixelRatio(Math.min(devicePixelRatio,2));R.setSize(innerWidth,innerHeight)
  R.shadowMap.enabled=true;R.shadowMap.type=THREE.PCFSoftShadowMap
  R.domElement.id='view3d';document.body.prepend(R.domElement)
  S=new THREE.Scene()
  C=new THREE.PerspectiveCamera(45,innerWidth/innerHeight,.1,100)
  S.add(new THREE.HemisphereLight(0xffffff,0x202030,.55))
  const moon=new THREE.DirectionalLight(0xaab4ff,.35);moon.position.set(4,10,6);S.add(moon)
  lamp=new THREE.PointLight(0xffffff,1.6,9,1.4);lamp.castShadow=true
  lamp.shadow.mapSize.set(512,512);lamp.shadow.bias=-.004;S.add(lamp)
  hero=makeHero();S.add(hero)
  hover=new THREE.Mesh(geo.ring,new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.45,depthWrite:false}))
  hover.rotation.x=-Math.PI/2;hover.position.y=.04;S.add(hover)
  addEventListener('resize',()=>{R.setSize(innerWidth,innerHeight);C.aspect=innerWidth/innerHeight;aimView()})
  addEventListener('runemaster:dock',e=>{shift=e.detail.shift;aimView()})   // dock.js: keep the action centred in the space beside a docked panel
  shift=window.dockShift??0;aimView()
  R.domElement.addEventListener('pointermove',e=>mouse.set(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1))
  R.domElement.addEventListener('pointerleave',()=>mouse.set(9,9))
  R.domElement.addEventListener('click',onClick)
  R.domElement.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.min(2.2,Math.max(.55,zoom*Math.exp(e.deltaY*.001)))},{passive:false})
  addEventListener('keydown',e=>{if(dialogOpen())return
    if(e.key=='v'||e.key=='V')setMode(mode^1)
    if(e.key=='+'||e.key=='=')zoom=Math.max(.55,zoom/1.15)
    if(e.key=='-'||e.key=='_')zoom=Math.min(2.2,zoom*1.15)})
  document.getElementById('vbtn')?.addEventListener('click',()=>setMode(mode^1))
  requestAnimationFrame(frame)
}
const aimView=()=>{shift?C.setViewOffset(innerWidth,innerHeight,shift,0,innerWidth,innerHeight):C.clearViewOffset();C.updateProjectionMatrix()}
const dialogOpen=()=>[...document.querySelectorAll('dialog')].some(d=>d.open)
const setMode=m=>{mode=m;const b=document.getElementById('vbtn');if(b)b.textContent=m?'Follow':'Room'}

function makeHero(){                                  // 🕴️ the levitating man in a suit and hat
  const g=new THREE.Group(),f=new THREE.Group()
  const suit=new THREE.MeshStandardMaterial({color:0x1d1d26,roughness:.55})
  const skin=new THREE.MeshStandardMaterial({color:0xf0c9a0,roughness:.8})
  const add=(geom,mat,x,y,z)=>{const m=new THREE.Mesh(geom,mat);m.position.set(x,y,z);f.add(m);return m}
  add(new THREE.CylinderGeometry(.12,.19,.5,18),suit,0,.42,0)
  add(new THREE.SphereGeometry(.13,20,14),skin,0,.79,0)
  add(new THREE.CylinderGeometry(.21,.21,.02,24),suit,0,.89,0)
  add(new THREE.CylinderGeometry(.12,.13,.17,20),suit,0,.98,0)
  add(new THREE.BoxGeometry(.045,.2,.02),new THREE.MeshStandardMaterial({color:0xc0202a}),0,.56,.155).rotation.x=-.2
  const sh=new THREE.Mesh(new THREE.CircleGeometry(.22,24),new THREE.MeshBasicMaterial({color:0,transparent:true,opacity:.35,depthWrite:false}))
  sh.rotation.x=-Math.PI/2;sh.position.y=.04;g.add(sh,f);fig=f;return g
}

// ---- room build + per-frame sync from the DOM board ----
function build(){
  if(room)S.remove(room);mats.forEach(m=>m.dispose());mats=[];T={};anims=[]
  key=cur;rm=rMax;cm=cMax;snapHero=true
  const th=j.theme,back=new THREE.Color(th.back||'#111'),spot=new THREE.Color(th.spot||'#fff'),wall=rgb(th.wall)
  S.background=back;S.fog=new THREE.Fog(back,10,24);lamp.color=spot
  const mk=o=>{const m=new THREE.MeshStandardMaterial(o);mats.push(m);return m}
  const wallSide=mk({color:wall,roughness:.85}),wallTop=mk({map:wallTopTex(th.w||'⬛','#'+wall.getHexString()),roughness:.9})
  room=new THREE.Group();S.add(room)
  room.userData={wallMats:[wallSide,wallSide,wallTop,wallSide,wallSide,wallSide],
    seen:mk({color:back.clone().lerp(spot,.16),roughness:.95}),fog:mk({color:back.clone().multiplyScalar(.5),roughness:1})}
  const base=new THREE.Mesh(new THREE.PlaneGeometry(80,80),mk({color:back.clone().multiplyScalar(.6)}))
  base.rotation.x=-Math.PI/2;base.position.y=-.05;base.receiveShadow=true;room.add(base)
  cells=[...M.querySelectorAll('td')].map(t=>({t,r:parseInt(t.id.slice(1)),c:+t.id.split('c')[1]}))
  for(const{r,c}of cells){
    const f=new THREE.Mesh(geo.floor,room.userData.fog);f.position.set(X(c),0,Z(r));f.receiveShadow=true;room.add(f)
    T[r+','+c]={floor:f,kind:null,obj:null,shown:false}
  }
  sync(true)
}
const kindOf=b=>!b?'':b.style.visibility=='hidden'?'passed':b.className=='a'?(b.querySelector('.lk')?'al':'a'):b.className
const isWall=(r,c)=>r<0||c<0||r>rm||c>cm||td(r,c)?.children[0]?.className=='w'

function sync(snap){
  if(cur!==key)return build()
  const sn=new Set(seen[cur]??[])
  for(const{t,r,c}of cells){
    const k=r+','+c,e=T[k],b=t.children[0],vis=sn.has(k),kind=kindOf(b)
    e.floor.material=vis?room.userData.seen:room.userData.fog
    if(kind!==e.kind)change(e,kind,b,r,c,snap)
    if(e.obj&&vis&&!e.shown){e.shown=true;snap?e.obj.visible=true:pop(e.obj)}   // fog lifts: pop in
  }
}

function change(e,kind,b,r,c,snap){
  const old=e.kind;e.kind=kind
  const door=old=='l'||old=='o'
  if(!snap&&old!==null){
    if((old=='l'&&kind=='o')||(old=='al'&&kind=='a')){                 // runes gathered: lock falls away
      dropLock(e.obj);if(kind=='o')e.obj.userData.slab.material=shared.doorOpen;return}
    if(door&&kind=='passed'){                                         // challenge solved: door sinks into the floor
      dropLock(e.obj);const s=e.obj.userData.slab,g=e.obj
      tween(.7,p=>s.position.y=.41-.9*p*p,()=>g.remove(s));return}
    if(kind==''&&e.obj){                                               // rune or apple taken: float up and vanish
      const o=e.obj;e.obj=null
      tween(.5,p=>{o.position.y=.9*p;o.scale.setScalar(Math.max(.01,1-p))},()=>room.remove(o));return}
  }
  if(e.obj)room.remove(e.obj)
  e.obj=make(kind,b,r,c)
  if(e.obj){e.obj.visible=e.shown;room.add(e.obj)}
}
const dropLock=g=>{const l=g?.userData.lock;if(!l)return;g.userData.lock=null
  tween(.4,p=>{l.position.y=1.05-.6*p;l.material.opacity=1-p},()=>g.remove(l))
  l.material=l.material.clone()}                                       // fade this lock only, not the shared sprite material

function make(kind,b,r,c){
  const g=new THREE.Group();g.position.set(X(c),0,Z(r))
  const mesh=(geom,mat,y)=>{const m=new THREE.Mesh(geom,mat);m.position.y=y;m.castShadow=m.receiveShadow=true;g.add(m);return m}
  if(kind=='w')mesh(geo.wall,room.userData.wallMats,.35)
  else if(kind=='l'||kind=='o'||kind=='passed'){
    if(!(isWall(r,c-1)&&isWall(r,c+1)))g.rotation.y=Math.PI/2           // span the passage
    mesh(geo.post,shared.post,.475).position.x=-.445
    mesh(geo.post,shared.post,.475).position.x=.445
    if(kind!='passed')g.userData.slab=mesh(geo.slab,kind=='o'?shared.doorOpen:shared.door,.41)
    if(kind=='l')g.add(g.userData.lock=sprite(emojiTex('🔒'),.42,1.05))
  }
  else if(kind=='a'||kind=='al'){
    g.add(g.userData.bob=sprite(emojiTex('🍎'),.72,.45))
    if(kind=='al')g.add(g.userData.lock=sprite(emojiTex('🔒'),.36,1.05))
  }
  else if(STONE[kind])g.userData.stone=mesh(stone(kind),stoneMats(kind,b.textContent),.45)
  else return null
  return g
}

// ---- input: click a tile -> index.js's step() toward it (outside the board crosses the edge) ----
const pick=v=>{ray.setFromCamera(v,C);const p=new THREE.Vector3()
  return ray.ray.intersectPlane(ground,p)?{r:Math.round(p.z+rm/2),c:Math.round(p.x+cm/2)}:null}
function onClick(e){
  e.stopPropagation()                                   // keep index.js's 2D document.onclick out of it
  if(dialogOpen())return
  const h=pick(new THREE.Vector2(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1));if(!h)return
  const dr=Math.sign(h.r-i.r),dc=Math.sign(h.c-i.c)
  if(dr||dc)step(i.r+dr,i.c+dc)
}

// ---- per frame ----
function frame(){
  requestAnimationFrame(frame)
  const dt=Math.min(clock.getDelta(),.1),t=clock.elapsedTime
  sync(false)
  const snap=snapHero                                   // room just (re)built: no gliding or camera swoop
  anims=anims.filter(a=>{a.t+=dt;const p=Math.min(1,a.t/a.dur);a.f(p);if(p<1)return true;a.done?.();return false})
  // hero glides cell to cell and turns to face where it's going
  const tx=X(i.c),tz=Z(i.r),dx=tx-hero.position.x,dz=tz-hero.position.z
  if(snap){hero.position.set(tx,0,tz);snapHero=false}
  else{const k=1-Math.exp(-dt*12);hero.position.x+=dx*k;hero.position.z+=dz*k}
  if(Math.hypot(dx,dz)>.05)yaw=Math.atan2(dx,dz)
  let dy=yaw-fig.rotation.y;dy=Math.atan2(Math.sin(dy),Math.cos(dy));fig.rotation.y+=dy*Math.min(1,dt*12)
  fig.position.y=.12+Math.sin(t*3)*.04
  lamp.position.set(hero.position.x,1.4,hero.position.z)
  for(const g of room.children){const u=g.userData
    if(u.stone){                                      // face the camera so the sharp corners keep their meaning, with a gentle sway
      u.stone.quaternion.copy(C.quaternion);u.stone.rotateY(Math.sin(t*1.3+g.position.x)*.3)
      u.stone.position.y=.45+Math.sin(t*2+g.position.x)*.05}
    if(u.bob)u.bob.position.y=.45+Math.sin(t*2.4+g.position.z)*.06}
  // camera: follow the hero, or frame the whole room
  const big=Math.max(rm,cm)+1
  const aim=mode?new THREE.Vector3(0,0,.4):hero.position.clone()
  const off=mode?new THREE.Vector3(0,big*1.2,big*.62):new THREE.Vector3(0,7.4,3.9).multiplyScalar(zoom)
  const k=snap?1:1-Math.exp(-dt*5)
  camAim.lerp(aim,k);camPos.lerp(aim.clone().add(off),k)
  C.position.copy(camPos);C.lookAt(camAim)
  const d=camPos.distanceTo(camAim);S.fog.near=d*.9;S.fog.far=d*2.4
  // hover ring
  const h=Math.abs(mouse.x)<=1&&!dialogOpen()?pick(mouse):null
  hover.visible=!!h&&h.r>=0&&h.c>=0&&h.r<=rm&&h.c<=cm
  if(hover.visible)hover.position.set(X(h.c),.04,Z(h.r))
  R.render(S,C)
}

// ---- start once index.js has loaded a room and placed the player ----
addEventListener('DOMContentLoaded',async()=>{
  try{await document.fonts.load('64px APL','⍳')}catch(_){}            // glyph textures need SAX2 loaded first
  while(typeof cur=='undefined'||cur==null||!i||i.rVal==null)await new Promise(r=>setTimeout(r,30))
  init()
})
})()
