'use strict'
// Scoreboard panel (#util) for the 3D page: drag by its grip to float it anywhere, drop it on the
// left/right edge (or use the grip buttons) to dock it full-height, and click "Collected runes"
// to fold the belt away. Layout is remembered per browser. index.js is untouched.
;(()=>{
const KEY='runemaster3d-panel',EDGE=48
let st={mode:'right',x:16,y:16,shut:false,last:'right'},u,grip,hint
try{Object.assign(st,JSON.parse(localStorage.getItem(KEY))??{})}catch(_){}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(st))}catch(_){}}

function place(){                                     // floating: keep at least the grip on screen
  const w=u.offsetWidth
  st.x=Math.min(Math.max(0,st.x),Math.max(0,innerWidth-w))
  st.y=Math.min(Math.max(0,st.y),Math.max(0,innerHeight-40))
  u.style.left=st.x+'px';u.style.top=st.y+'px';u.style.maxHeight=innerHeight-st.y-8+'px'
}
function apply(){
  u.classList.remove('left','right','float');u.classList.add(st.mode)
  if(st.mode=='float')place()
  else{u.style.left=u.style.top=u.style.maxHeight='';st.last=st.mode}
  $`#belt`.classList.toggle('shut',st.shut)
  const w=u.offsetWidth,shift=st.mode=='right'?w/2:st.mode=='left'?-w/2:0   // let the 3D view re-centre beside a docked panel
  window.dockShift=shift;dispatchEvent(new CustomEvent('runemaster:dock',{detail:{mode:st.mode,shift}}))
}
const showHint=x=>{const s=x<EDGE?'left':x>innerWidth-EDGE?'right':'';hint.className=s;return s}

addEventListener('DOMContentLoaded',()=>{
  u=$`#util`
  grip=document.createElement('div');grip.id='grip'
  grip.title='Drag to move; drop on the left or right edge to dock; double-click to toggle'
  grip.innerHTML=`<span class=gh>⠿⠿</span>
    <button data-dock=left  title="Dock left">⇤</button>
    <button data-dock=float title="Float">⧉</button>
    <button data-dock=right title="Dock right">⇥</button>`
  u.prepend(grip)
  hint=document.createElement('div');hint.id='dockhint';document.body.append(hint)

  u.addEventListener('click',e=>e.stopPropagation())   // index.js's document.onclick would read panel clicks as "step that way"
  grip.querySelectorAll('button').forEach(b=>b.onclick=()=>{
    const m=b.dataset.dock
    if(m=='float'&&st.mode!='float'){const r=u.getBoundingClientRect();st.x=r.left+(st.mode=='right'?-24:24);st.y=16}
    st.mode=m;apply();save();b.blur()})                // blur: Enter/Space must go back to the game, not re-press this
  grip.ondblclick=e=>{if(e.target.closest`button`)return
    st.mode=st.mode=='float'?st.last:'float';apply();save()}

  grip.addEventListener('pointerdown',e=>{
    if(e.button||e.target.closest`button`)return
    const r=u.getBoundingClientRect(),dx=e.clientX-r.left,dy=e.clientY-r.top
    if(st.mode!='float'){st.mode='float';st.x=r.left;st.y=r.top;apply()}   // tear off a docked panel where it sits
    grip.setPointerCapture(e.pointerId);u.classList.add('drag')
    const mv=e=>{st.x=e.clientX-dx;st.y=e.clientY-dy;place();showHint(e.clientX)}
    const up=e=>{
      grip.removeEventListener('pointermove',mv);grip.removeEventListener('pointerup',up);grip.removeEventListener('pointercancel',up)
      u.classList.remove('drag');const s=showHint(e.clientX);hint.className=''
      if(s)st.mode=s;apply();save()}
    grip.addEventListener('pointermove',mv);grip.addEventListener('pointerup',up);grip.addEventListener('pointercancel',up)
  })

  const cap=$`#belt caption`;cap.tabIndex=0;cap.title='Show or hide the collected runes'
  const fold=()=>{st.shut=!st.shut;apply();save()}
  cap.onclick=fold
  cap.onkeydown=e=>{if(e.key=='Enter'||e.key==' '){e.preventDefault();e.stopPropagation();fold()}}

  addEventListener('resize',apply)
  apply()
})
})()
