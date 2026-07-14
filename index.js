'use strict'
let i,M,root,aski,askb,askp,ask,msg,msgp
let j,g,c,rMin,cMin,rMax,cMax,mr=0,mc=0,cur,mem={},doors={},seen={},apples=[],atlas={},busy,cheating,moving
const KEY="runemaster2"                            // saved-progress key (bumped: 4×4 reshape renamed/added rooms)
const $=s=>document.querySelector(s)
const $$=s=>[...document.querySelectorAll(s)]
const td=(r,c)=>$("#r"+r+"c"+c)
const ins={"(":"()","[":"[]","{":"{}","∘":"∘."}    // glyph -> typed form
const mid={"()":1,"[]":1,"{}":1}                   // pairs: cursor between
const b=r=>`<b tabindex='0' class='${r[0]}'>${ins[r[1]]??r[1]}</b>`
const mkb=id=>{const e=document.createElement("b");e.tabIndex=0;e.id=id;e.className=id[0];e.innerHTML=ins[id[1]]??id[1];return e}  // rebuild collected rune (keep id for chk)
const reqs=t=>(j[t.id].req??"").match(/../g)??[]
const dfnkeys=q=>q.f?(Array.isArray(q.a[0])?"⍺ ⍵ ":"⍵ "):""   // dfn arg keys ({} from diamond)
const keys=q=>q.req+q.add+dfnkeys(q)+[...q.task.matchAll(/`\w`/g)].join``.replace(/`(\w)`/g,"$1 ")   // a challenge's allowed runes
const md=s=>s.replace(/\{(\w\W)\}/g,(_,m)=>b(m)).replace(/(?<!\\)`(.*?[^\\])`/g,"<code>$1</code>").replace(/(?<!\\)_(.*?[^\\])_/g,"<em>$1</em>").replace(/\\([`_])/g,"$1").replace(/\d+(?![^<]*>)/g,"<span class=num>$&</span>")   // digits (outside tags) in the APL font — never enter allowed-runes (keys())
const exec=s=>{
  busy=1;$("#askr").textContent="";$("#asks").textContent="Checking…";$$("#ask form button").forEach(b=>b.disabled=1)   // hold the challenge open + inert until the check resolves
  return fetch("https://tryapl.org/Exec",{
    method:"POST",
    headers:{"Content-Type":"application/json;charset=utf-8"},
    body:JSON.stringify([0,0,0,s]),
    signal:AbortSignal.timeout(35e3)
  }).then(d=>d.json()).then(d=>{busy=0;react(+d[3][0])})
    .catch(_=>{busy=0;$$("#ask form button").forEach(b=>b.disabled=0);$("#asks").textContent="Submit";$("#askr").textContent="TryAPL didn't respond — try again";aski.focus()})   // keep the dialog + input; let them retry
}
const getTop =e=>window.scrollY+e.getBoundingClientRect().top +"px"
const getLeft=e=>window.scrollX+e.getBoundingClientRect().left+"px"
const getR=e=>parseInt(e.id.replace(/r|c\d+/g,""))
const getC=e=>parseInt(e.id.replace(/r\d+c/,""))
const place=(e,y,x)=>{const t=td(y,x);e.style.top=getTop(t);e.style.left=getLeft(t)}
const jump=(r,c)=>{i.style.transition="none";i.r=r;i.c=c;void i.offsetWidth;i.style.transition=""}
const lb=(ch,sol)=>{
  const a=[...new Set(ch.match(/../g)??[])]          // allowed runes, deduped
  const gl=t=>t[1]==" "?t[0]:(ins[t[1]]??t[1])       // token -> shown glyph
  aski.pattern="["+a.map(gl).join``.replace(/[-^$\\.*+?()[\]{}|\/&!#%,:;<=>@~`]/g,"\\$&")+" ]*"
  const ans=[...(sol??"")].filter(x=>a.some(t=>gl(t)==x)).join``   // what the buttons spell if left in solution order
  let sh=[...a]
  do sh.sort(_=>Math.random()-0.5);while(a.length>1&&sh.map(gl).join``==ans)   // never hand over the answer
  askb.innerHTML=sh.map(s=>s[1]==" "?`<button>${s[0]}</button>`:b(s)).join``
  $$("#askb>*").forEach(e=>e.onclick=()=>{
    const txt=e.innerText,off=mid[txt]??txt.length    // pairs: cursor between; else after
    const at=aski.selectionStart
    aski.value=aski.value.slice(0,at)+txt+aski.value.slice(aski.selectionEnd)
    aski.selectionStart=aski.selectionEnd=at+off
    aski.focus()
  })
}
window.addEventListener('resize',()=>{fit();jump(i.r,i.c)})
const show=()=>{                                     // reveal 3×3 round player, remember it
  let s=seen[cur]??=[]
  for(let r=i.r-1;r<=i.r+1;r++)for(let c=i.c-1;c<=i.c+1;c++){
    let t=td(r,c);if(!t)continue
    if(t.children[0])t.children[0].style.opacity=1
    let k=r+","+c;if(!s.includes(k))s.push(k)
  }
}
const chk=()=>{
  let bi=$$("#belt b").map(e=>e.id)
  $$(".l").forEach(e=>reqs(e).every(r=>~bi.indexOf(r))?(e.className="o",e.innerText="🚪"):0)
  $$("#M .a").forEach(e=>reqs(e).every(r=>~bi.indexOf(r))?e.innerHTML="🍎":0)   // met-prereq apples shed their lock (non-blocking, so class stays "a")
}
const count=()=>{let n=$$("#M b.m,#M b.d,#M b.M,#M b.D,#M b.j").length   // uncollected stones here (for the tab title)
  $("#left").textContent=j.name;$("#left").title=j.name                 // room name (rune count now lives on the mini-map tile)
  document.title=`${j.name} (${n}) - RuneMaster`}
const favico=w=>{                                    // dynamic svg favicon of the wall emoji
  let l=$("link[rel=icon]")??document.head.appendChild(Object.assign(document.createElement("link"),{rel:"icon"}))
  l.href="data:image/svg+xml,"+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text x="50" y="82" font-size="88" text-anchor="middle">${w}</text></svg>`)}
const mini=()=>{                                     // 4×4 discovered-rooms table: row=mr+2, col=mc+1
  let m=$("#mini");m.innerHTML=""
  let belt=$$("#belt b").map(e=>e.id)                 // collected rune ids (globally unique)
  const mk=(d,cls,txt)=>{let s=document.createElement("span");s.className=cls;s.textContent=txt;d.appendChild(s)}
  for(let r=-2;r<=1;r++){let tr=m.insertRow()
    for(let cc=-1;cc<=2;cc++){let k=r+" "+cc,d=tr.insertCell()
      if(k==cur)d.className="now"                     // current room: bg cleared → reads as a highlight
      let a=atlas[k];if(a==null)continue
      if(typeof a=="string")a={w:a,stones:[],apple:0} // migrate legacy save entries (bare wall emoji)
      mk(d,"wm",a.w)                                  // wall emoji, revealed on first entry
      if(a.apple&&!apples.includes(a.apple))mk(d,"ap","🍎")   // uncollected apple → lower-left badge
      let n=a.stones.filter(s=>!belt.includes(s)).length     // runes left in this room
      if(n)mk(d,"rc",n)                               // remaining-rune count → bottom-right badge
    }
  }
}
const win=()=>{msgp.innerHTML="🍎 Sixteen apples gathered — you are the RuneMaster! 🍎";msg.showModal()}
const fit=()=>{                                      // fit board+margin+utilities to viewport (no scroll)
  root.style.setProperty("--cols",cMax+1)            // map width in tiles (portrait #util width)
  const land=matchMedia("(orientation: landscape)").matches, util=$("#util")
  let s=parseFloat(getComputedStyle(root).getPropertyValue("--size"))||24   // seed from current
  for(let p=0;p<4;p++){                              // fixed point: utilities' extent depends on --size
    root.style.setProperty("--size",Math.max(14,s)+"px")   // (reading offset* below forces a reflow)
    if(land){                                        // landscape: utilities to the right (incl. their margin)
      let cs=getComputedStyle(util),uw=util.offsetWidth+(parseFloat(cs.marginLeft)||0)+(parseFloat(cs.marginRight)||0)
      s=Math.min((innerWidth-8-uw)/(cMax+3),(innerHeight-12)/(rMax+3))
    }else s=Math.min((innerWidth-8)/(cMax+3),(innerHeight-util.offsetHeight-12)/(rMax+3))   // +3: cols/rows + 1-tile margin each side
  }
  root.style.setProperty("--size",Math.max(14,s)+"px")
}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify({mr,mc,r:i.r,c:i.c,belt:$$("#belt b").map(e=>e.id),doors,seen,apples,atlas}))}catch(_){}}
const restore=()=>{
  let s;try{s=JSON.parse(localStorage.getItem(KEY))}catch(_){s=null}
  if(!s)return null
  doors=s.doors??{};seen=s.seen??{};apples=s.apples??[];atlas=s.atlas??{}
  ;(s.belt??[]).forEach(id=>{let g="mdMDj".indexOf(id[0]);if(~g)$$("#belt td")[g].appendChild(mkb(id))})
  return s
}
window.reset=()=>{localStorage.removeItem(KEY);location.reload()}   // wipe saved progress
window.cheat=(on=1)=>(cheating=on,`QA cheat ${on?"ON — walk into any met-prerequisite rune, unlocked door or apple to auto-take it (sealed ones still need their runes)":"off"}`)   // console QA aid
const openask=(el,k)=>{askp.innerHTML=md(j[el.id].task);lb(k,j[el.id].expr??j[el.id].f);ask.b=el;aski.value="";$("#askr").textContent="";$("#asks").textContent="Submit";$$("#ask form button").forEach(b=>b.disabled=0);ask.showModal()}   // open a challenge dialog
async function step(newR,newC){                      // move to / interact with cell; keyboard + tap
  if(moving)return                                   // a level crossing is still loading — drop this press (else fast keys race the await and shove r/c out of bounds)
  if($$("dialog").some(e=>e.hasAttribute("open")))return
  moving=1
  try{
  if(newR<0   &&newC==i.c){if(await loadM(mr-1,mc)){mr--;jump(rMax,newC);show()}}else   // commit the move only once the level actually loads
  if(newR>rMax&&newC==i.c){if(await loadM(mr+1,mc)){mr++;jump(0   ,newC);show()}}else   // (missing/unreachable file -> stay put, don't corrupt mr/mc)
  if(newC<0   &&newR==i.r){if(await loadM(mr,mc-1)){mc--;jump(newR,cMax);show()}}else
  if(newC>cMax&&newR==i.r){if(await loadM(mr,mc+1)){mc++;jump(newR,0   );show()}}else   // ignore diag move off edge (wall!)
  if(0<=newR&&newR<=rMax&&0<=newC&&newC<=cMax){
    let t=td(newR,newC).children[0]
    if(t&&t.style.visibility!="hidden"){
      if(t.className=="l"){
        let bi=$$("#belt b").map(e=>e.id)   // collected
        msgp.innerHTML="This door still needs:<br>"+reqs(t).filter(r=>!~bi.indexOf(r)).map(b).join` `   // only the runes you lack
        msg.showModal()
      }else if(t.className=="o"){ask.r=newR;ask.c=newC;cheating?(ask.b=t,react(1)):openask(t,keys(j[t.id]))}   // cheat: walk through an unlocked door
      else if(~(g="mdMDj".indexOf(t.className))){show(i.r=newR,i.c=newC)   // rune stone: req-gated (prerequisite runes)
        let bi=$$("#belt b").map(e=>e.id)
        reqs(t).every(r=>~bi.indexOf(r))?(c=t,cheating?(ask.b=t,react(1)):openask(c,c.id+keys(j[c.id]))):(msgp.innerHTML="This rune stays sealed; you still need:<br>"+reqs(t).filter(r=>!~bi.indexOf(r)).map(b).join` `,msg.showModal())}   // cheat: auto-collect an available rune
      else if(t.className=="a"){show(i.r=newR,i.c=newC)   // free-standing 🍎: req-gated but non-blocking
        let bi=$$("#belt b").map(e=>e.id)
        reqs(t).every(r=>~bi.indexOf(r))?(cheating?(ask.b=t,react(1)):openask(t,keys(j[t.id]))):(msgp.innerHTML="This apple is still guarded; you still need:<br>"+reqs(t).filter(r=>!~bi.indexOf(r)).map(b).join` `,msg.showModal())}   // cheat: auto-take an available apple
    }else show(i.r=newR,i.c=newC)
  }
  save()
  }finally{moving=0}
}
addEventListener('keydown',e=>{
  const up   =()=>newR=i.r-1
  const down =()=>newR=i.r+1
  const left =()=>newC=i.c-1
  const right=()=>newC=i.c+1
  let newR=i.r,newC=i.c,moved=0
  e.key=="Home"      ||e.key=="7"||e.key=="q"||e.key=="u"    ?up(left(moved=1)):0
  e.key=="ArrowUp"   ||e.key=="8"||e.key=="w"||e.key=="i"    ?up(moved=1):0
  e.key=="PageUp"    ||e.key=="9"||e.key=="e"||e.key=="o"    ?up(right(moved=1)):0
  e.key=="ArrowLeft" ||e.key=="4"||e.key=="a"||e.key=="j"    ?left(moved=1):0
  e.key=="Clear"     ||e.key=="5"||e.key==" "||e.key=="Enter"?moved=1:0
  e.key=="ArrowRight"||e.key=="6"||e.key=="d"||e.key=="l"    ?right(moved=1):0
  e.key=="End"       ||e.key=="1"||e.key=="z"||e.key=="m"    ?down(left(moved=1)):0
  e.key=="ArrowDown" ||e.key=="2"||e.key=="s"||e.key=="k"    ?down(moved=1):0
  e.key=="PageDown"  ||e.key=="3"||e.key=="c"||e.key=="."    ?down(right(moved=1)):0
  if(moved&&!$$("dialog").some(x=>x.hasAttribute("open"))){e.preventDefault();step(newR,newC)}
})
async function loadM(mr,mc){
  let key=mr+" "+mc
  if(!mem[key]){
    let jj
    try{jj=await fetch("r"+mr+"c"+mc+".json").then(d=>{if(!d.ok)throw 0;return d.json()})}
    catch(_){return}                                   // no such level (or unreachable) — abort; caller keeps the player put
    mem[key]={j:jj,html:"<tbody>\n"+jj.M.map(
      (t,r)=>
        "<tr>\n"+t.match(/.{1,2}/g).map(
          (t,c)=>"  <td id='r"+r+"c"+c+"'>"+(t[0]!=" "?"<b"+
            (t[0]!="w"?' id="'+t+'"':"")+   // double-quoted: a token may contain ' (the quote rune j')
            " class='"+t[0]+"'"+
            ">"+
            (t[0]=="w"?jj.theme.w:t[0]=="l"?'🚪<b class="lk">🔒</b>':t[0]=="o"?"🚪":t[0]=="a"?'🍎<b class="lk">🔒</b>':ins[t[1]]??t[1])+   // apples wear the lock too, until their runes are gathered
            "</b>":"")+"</td>"
        ).join`\n`+"\n</tr>"
    ).join`\n`+"</tbody>"}
  }
  if(cur!=null)mem[cur].html=M.innerHTML               // save the room we're leaving — only now the new one is secured
  cur=key
  j=mem[key].j
  atlas[key]={w:j.theme.w,stones:[],apple:0}           // remember this room's wall + inventory (idempotent; migrates legacy entries)
  j.M.forEach(row=>(row.match(/.{1,2}/g)||[]).forEach(t=>{
    if("mdMDj".includes(t[0]))atlas[key].stones.push(t)   // rune stones (ids globally unique)
    else if(t[0]=="a")atlas[key].apple=t                  // the room's apple, if any
  }))
  M.innerHTML=mem[key].html
  let got=new Set($$("#belt b").map(e=>e.id))          // already collected
  $$("#M b").forEach(e=>got.has(e.id)||apples.includes(e.id)?e.remove():doors[key]?.includes(e.id)?e.style.visibility="hidden":0)   // collected runes/apples gone; passed doors open
  ;(seen[key]??[]).forEach(k=>{let[r,c]=k.split`,`;let e=td(r,c)?.children[0];if(e)e.style.opacity=1})        // restore revealed fog
  if(j.theme.wall)root.style.setProperty("--wall",j.theme.wall)
  if(j.theme.back)root.style.setProperty("--back",j.theme.back)
  if(j.theme.spot)root.style.setProperty("--spot",j.theme.spot)
  favico(j.theme.w)
  let first=$$("#M td")[0]     ;rMin=getR(first);cMin=getC(first)
  let last =$$("#M td").at(-1) ;rMax=getR(last );cMax=getC(last )
  chk();count();mini();fit()
  return 1                                             // signal a successful load (see step()'s edge crossings)
}
document.addEventListener('DOMContentLoaded',async function main(){
  i=$("#i");M=$("#M");root=$("#root")
  aski=$("#aski");askb=$("#askb");askp=$("#askp")
  ask=$("#ask");msg=$("#msg");msgp=$("#msgp")
  if(/[?&]reset\b/.test(location.search))localStorage.removeItem(KEY)
  const s=restore()
  if(s){mr=s.mr;mc=s.mc}
  await loadM(mr,mc)
  i.rVal=s?s.r:Math.floor(rMax/2);i.cVal=s?s.c:Math.floor(cMax/2)
  Object.defineProperty(i,"r",{get:()=>i.rVal,set:v=>place(i,i.rVal=v,i.cVal)})
  Object.defineProperty(i,"c",{get:()=>i.cVal,set:v=>place(i,i.rVal,i.cVal=v)})
  i.r=i.rVal;i.c=i.cVal
  show()
  document.onclick=e=>{                    // tile click steps toward it; click outside map steps that way (even across edge)
    if(e.target.closest("dialog,button,#belt"))return   // leave UI controls alone
    const t=e.target.closest("#M td")
    let dr,dc
    if(t){dr=Math.sign(getR(t)-i.r);dc=Math.sign(getC(t)-i.c)}   // inside map: toward tapped tile
    else{const b=M.getBoundingClientRect()                       // outside map: general dir (diag in corners)
      dr=e.clientY<b.top?-1:e.clientY>b.bottom?1:0
      dc=e.clientX<b.left?-1:e.clientX>b.right?1:0}
    if(dr||dc)step(i.r+dr,i.c+dc)
  }
})
window.ans=t=>{
  if(busy)return                                     // a check is already in flight — ignore repeat submits
  const q=j[ask.b.id]
  if(!q.f&&!RegExp("^"+aski.pattern+"$").test(aski.value))return
  let expr
  if(q.f){                              // fn challenge: player G vs reference F over cases
    const dyad=Array.isArray(q.a[0]),pf=q.p??"⊢"
    const cmp=dyad
      ?`{((${pf})((⊃⍵)F(⊃⌽⍵)))≡((${pf})((⊃⍵)G(⊃⌽⍵)))}`
      :`{((${pf})(F ⍵))≡((${pf})(G ⍵))}`
    const terms=q.a.map(x=>dyad?`(C((${x[0]})(${x[1]})))`:`(C(${x}))`).join``
    expr=`{0::0 ⋄ F←(${q.f}) ⋄ G←(${t}) ⋄ C←${cmp} ⋄ ∧/${terms}}0`
  }else expr="{0::0 ⋄ ("+t+")≡⍵}"+q.expr
  exec(expr)
}
const react=b=>{
  $$("#ask form button").forEach(x=>x.disabled=0);$("#asks").textContent="Submit"   // check resolved — controls live again
  if(!b){$("#askr").textContent="Not quite — try again";aski.focus();return}          // wrong answer: keep the dialog + input so they can retry or Cancel
  $("#askr").textContent=""
  const o=ask.getBoundingClientRect()   // rune-fly origin: challenge dialog (grab before close blanks it)
  ask.close()
  if(ask.b.id[0]=="l"){
    show(i.r=ask.r,i.c=ask.c)
    ask.b.style.visibility="hidden"
    ;(doors[cur]??=[]).push(ask.b.id)   // remember door passed
    save()
  }else if(ask.b.id[0]=="a"){            // 🍎 collected
    if(!apples.includes(ask.b.id))apples.push(ask.b.id)
    ask.b.remove();mini();save()
    if(apples.length>=16)win()
  }else{
    $$("#belt td")[g].appendChild(c)    // gem into its belt slot, then fly it in from the dialog (FLIP)
    const f=c.getBoundingClientRect()
    c.animate?.([{transform:`translate(${o.left+o.width/2-f.left-f.width/2}px,${o.top+o.height/2-f.top-f.height/2}px) scale(2)`,opacity:.4},{transform:"none",opacity:1}],{duration:500,easing:"ease-in-out"})
    chk();count();mini();save()
  }
}
