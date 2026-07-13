'use strict'
let i,M,root,aski,askb,askp,ask,msg,msgp
let j,g,c,rMin,cMin,rMax,cMax,mr=0,mc=0,dir=0,ang=0,cur,mem={},doors={},seen={},apples=[],atlas={},busy
const KEY="runemaster"                             // saved-progress key
const $=s=>document.querySelector(s)
const $$=s=>[...document.querySelectorAll(s)]
const td=(r,c)=>$("#r"+r+"c"+c)
const DR=[-1,0,1,0]                                // facing → forward Δrow (N E S W)
const DC=[ 0,1,0,-1]                               //          forward Δcol
const ins={"(":"()","[":"[]","{":"{}","∘":"∘."}    // glyph -> typed form
const mid={"()":1,"[]":1,"{}":1}                   // pairs: cursor between
const b=r=>`<b tabindex='0' class='${r[0]}'>${ins[r[1]]??r[1]}</b>`
const mkb=id=>{const e=document.createElement("b");e.tabIndex=0;e.id=id;e.className=id[0];e.innerHTML=ins[id[1]]??id[1];return e}  // rebuild collected rune (keep id for chk)
const reqs=t=>(j[t.id].req??"").match(/../g)??[]
const dfnkeys=q=>q.f?(Array.isArray(q.a[0])?"⍺ ⍵ ":"⍵ "):""   // dfn arg keys ({} from diamond)
const keys=q=>q.req+q.add+dfnkeys(q)+[...q.task.matchAll(/`\w`/g)].join``.replace(/`(\w)`/g,"$1 ")   // a challenge's allowed runes
const md=s=>s.replace(/\{(\w\W)\}/g,(_,m)=>b(m)).replace(/(?<!\\)`(.*?[^\\])`/g,"<code>$1</code>").replace(/(?<!\\)_(.*?[^\\])_/g,"<em>$1</em>").replace(/\\([`_])/g,"$1")
const exec=s=>{
  busy=1;$("#asks").textContent="checking…";$$("#ask form button").forEach(b=>b.disabled=1)   // hold the challenge open + inert until the check resolves
  return fetch("https://tryapl.org/Exec",{
    method:"POST",
    headers:{"Content-Type":"application/json;charset=utf-8"},
    body:JSON.stringify([0,0,0,s]),
    signal:AbortSignal.timeout(35e3)
  }).then(d=>d.json()).then(d=>{busy=0;react(+d[3][0])})
    .catch(_=>{busy=0;ask.close();msgp.innerHTML="TryAPL isn't responding — please try again.";msg.showModal()})
}
const getTop =e=>window.scrollY+e.getBoundingClientRect().top +"px"
const getLeft=e=>window.scrollX+e.getBoundingClientRect().left+"px"
const getR=e=>parseInt(e.id.replace(/r|c\d+/g,""))
const getC=e=>parseInt(e.id.replace(/r\d+c/,""))
const place=(e,y,x)=>{const t=td(y,x);e.style.top=getTop(t);e.style.left=getLeft(t)}   // (facing is set by turn(), continuously, so the arrow spins the short way)
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
const MAXV=5,VW=2                                    // first-person frustum: cells ahead, lateral ±
const FC=`<b class="p ceil"></b><b class="p floor"></b>`   // constant sky + ground slabs
const wallAt=(r,c)=>{let t=td(r,c);if(!t)return 1;let e=t.children[0];return e&&e.className=="w"&&e.style.visibility!="hidden"?1:0}   // off-grid & live walls block sight
const show=()=>{                                     // reveal only what the view sees (line of sight down each frustum column), remember, repaint
  let s=seen[cur]??=[],R=(dir+1)&3
  const lit=(r,c)=>{let t=td(r,c);if(!t)return 0;if(t.children[0])t.children[0].style.opacity=1;s.includes(r+","+c)||s.push(r+","+c);return!wallAt(r,c)}
  for(let o=-VW;o<=VW;o++)for(let f=0;f<=MAXV;f++)                     // each column from the current rank forward, halt at first wall
    if(!lit(i.r+DR[dir]*f+DR[R]*o,i.c+DC[dir]*f+DC[R]*o))break
  draw()
}
const draw=()=>{                                     // project the visible cells into the first-person scene
  let R=(dir+1)&3,h=[]                                // R: "right" facing (lateral offset)
  const at=(f,o)=>[i.r+DR[dir]*f+DR[R]*o,i.c+DC[dir]*f+DC[R]*o]       // camera(f ahead,o right) → world r,c
  const p=(cl,f,o,g)=>`<b class="p ${cl}" style="--f:${f};--o:${o}">${g}</b>`
  const border=(r,c)=>r==0||r==rMax||c==0||c==cMax
  const seenAt=(r,c)=>seen[cur]?.includes(r+","+c)
  const door=(r,c,f,o,lk)=>`<b class="p w door f" data-r="${r}" data-c="${c}" style="--f:${f};--o:${o}">🚪${lk?`<b class="lk">${lk}</b>`:""}</b>`   // 🚪 on a solid wall pane
  for(let f=MAXV;f>=0;f--)for(let o=-VW;o<=VW;o++){    // far→near
    let[r,c]=at(f,o),t=td(r,c),e=t?.children[0]
    if(!t){                                           // off-grid: an open edge = a doorway into the neighbouring room
      let[pr,pc]=at(f-1,o),pt=td(pr,pc)
      if(f&&pt&&!pt.children[0]&&border(pr,pc)&&seenAt(pr,pc))h.push(door(pr,pc,f,o,""))   // plain 🚪, no challenge
      continue
    }
    if(!e||e.style.visibility=="hidden"||e.style.opacity!="1")continue   // floor / fogged / gone
    if(e.className=="w"){                              // wall: emit only camera-exposed faces
      f&&!wallAt(...at(f-1,o))?h.push(p("w f",f,o,e.textContent)):0      // front (toward camera)
      wallAt(...at(f,o-1))?0:h.push(p("w l",f,o,e.textContent))         // left face
      wallAt(...at(f,o+1))?0:h.push(p("w r",f,o,e.textContent))         // right face
    }else if(e.className=="l"||e.className=="o")        // door on a solid pane: 🔒 locked / 🔓 ready to solve
      h.push(door(r,c,f,o,e.className=="l"?"🔒":"🔓"))
    else if((f||o)&&~"mdMDja".indexOf(e.className))     // stone/apple billboard (hangs in the air, never underfoot)
      h.push(`<b class="p bill" data-r="${r}" data-c="${c}" style="--f:${f};--o:${o}"><b class="${e.className}">${e.textContent}</b></b>`)
  }
  $("#scene").innerHTML=FC+h.join``
}
const chk=()=>{
  let bi=$$("#belt b").map(e=>e.id)
  $$("#M .l").forEach(e=>reqs(e).every(r=>~bi.indexOf(r))?(e.className="o",e.innerText="🚪"):0)   // #M-scoped: scene clones share class 'l' but carry no id
}
const count=()=>{let n=$$("#M b.m,#M b.d,#M b.M,#M b.D,#M b.j").length   // uncollected stones here (for the tab title)
  $("#left").textContent=j.name;$("#left").title=j.name                 // room name (rune count now lives on the mini-map tile)
  document.title=`${j.name} (${n}) - RuneMaster`}
const favico=w=>{                                    // dynamic svg favicon of the wall emoji
  let l=$("link[rel=icon]")??document.head.appendChild(Object.assign(document.createElement("link"),{rel:"icon"}))
  l.href="data:image/svg+xml,"+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text x="50" y="82" font-size="88" text-anchor="middle">${w}</text></svg>`)}
const mini=()=>{                                     // 4×5 discovered-rooms table: row=mr+2, col=mc+1
  let m=$("#mini");m.innerHTML=""
  let belt=$$("#belt b").map(e=>e.id)                 // collected rune ids (globally unique)
  const mk=(d,cls,txt)=>{let s=document.createElement("span");s.className=cls;s.textContent=txt;d.appendChild(s)}
  for(let r=-2;r<=1;r++){let tr=m.insertRow()
    for(let cc=-1;cc<=3;cc++){let k=r+" "+cc,d=tr.insertCell()
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
const win=()=>{msgp.innerHTML="🍎 Nine apples gathered — you are the RuneMaster! 🍎";msg.showModal()}
const fit=()=>{                                      // size the first-person cell + camera to the view box
  let v=$("#view"),w=v.clientWidth,h=v.clientHeight
  if(!w||!h)return
  let cell=Math.min(w,h)*0.95                         // a cell ≈ fills the view's smaller dimension
  root.style.setProperty("--cell",cell+"px")
  root.style.setProperty("--persp",cell*1.15+"px")   // focal length → field of view
}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify({mr,mc,dir,r:i.r,c:i.c,belt:$$("#belt b").map(e=>e.id),doors,seen,apples,atlas}))}catch(_){}}
const restore=()=>{
  let s;try{s=JSON.parse(localStorage.getItem(KEY))}catch(_){s=null}
  if(!s)return null
  doors=s.doors??{};seen=s.seen??{};apples=s.apples??[];atlas=s.atlas??{};dir=s.dir??0   // old saves lack dir → North
  ;(s.belt??[]).forEach(id=>{let g="mdMDj".indexOf(id[0]);if(~g)$$("#belt td")[g].appendChild(mkb(id))})
  return s
}
window.reset=()=>{localStorage.removeItem(KEY);location.reload()}   // wipe saved progress
const turn=d=>{dir=(dir+d)&3;ang+=d==3?-90:90;i.style.rotate=ang+"deg";show();save()}   // rotate 90° (d: +1 CW, +3 CCW); ang is continuous so the marker turns the short way
const inw=(r,c,dr,dc)=>{let t=td(r+dr,c+dc);return t&&!t.children[0]?[r+dr,c+dc]:[r,c]}   // one cell inward onto open ground, so entering a room lands you inside (not on the border)
const openask=(el,k)=>{askp.innerHTML=md(j[el.id].task);lb(k,j[el.id].expr??j[el.id].f);ask.b=el;aski.value="";$("#asks").textContent="submit";$$("#ask form button").forEach(b=>b.disabled=0);ask.showModal()}   // open a challenge dialog
async function step(newR,newC){                      // move to / interact with cell; keyboard + tap
  if($$("dialog").some(e=>e.hasAttribute("open")))return
  if(newR<0   &&newC==i.c){mr-=1;await loadM(mr,mc);jump(...inw(rMax,newC,-1, 0));show()}else
  if(newR>rMax&&newC==i.c){mr+=1;await loadM(mr,mc);jump(...inw(0   ,newC, 1, 0));show()}else
  if(newC<0   &&newR==i.r){mc-=1;await loadM(mr,mc);jump(...inw(newR,cMax, 0,-1));show()}else
  if(newC>cMax&&newR==i.r){mc+=1;await loadM(mr,mc);jump(...inw(newR,0   , 0, 1));show()}else   // ignore diag move off edge (wall!)
  if(0<=newR&&newR<=rMax&&0<=newC&&newC<=cMax){
    let t=td(newR,newC).children[0]
    if(t&&t.style.visibility!="hidden"){
      if(t.className=="l"){
        let bi=$$("#belt b").map(e=>e.id)   // collected
        msgp.innerHTML="This door still needs:<br>"+reqs(t).filter(r=>!~bi.indexOf(r)).map(b).join` `   // only the runes you lack
        msg.showModal()
      }else if(t.className=="o"){ask.r=newR;ask.c=newC;openask(t,keys(j[t.id]))}
      else if(~(g="mdMDj".indexOf(t.className))){show(i.r=newR,i.c=newC)   // rune stone: req-gated (prerequisite runes)
        let bi=$$("#belt b").map(e=>e.id)
        reqs(t).every(r=>~bi.indexOf(r))?(c=t,openask(c,c.id+keys(j[c.id]))):(msgp.innerHTML="This rune stays sealed; you still need:<br>"+reqs(t).filter(r=>!~bi.indexOf(r)).map(b).join` `,msg.showModal())}
      else if(t.className=="a"){show(i.r=newR,i.c=newC)   // free-standing 🍎: req-gated but non-blocking
        let bi=$$("#belt b").map(e=>e.id)
        reqs(t).every(r=>~bi.indexOf(r))?openask(t,keys(j[t.id])):(msgp.innerHTML="This apple is still guarded; you still need:<br>"+reqs(t).filter(r=>!~bi.indexOf(r)).map(b).join` `,msg.showModal())}
    }else show(i.r=newR,i.c=newC)
  }
  save()
}
addEventListener('keydown',e=>{
  if($$("dialog").some(x=>x.hasAttribute("open")))return          // frozen while a dialog is open
  const fwd   =()=>step(i.r+DR[dir],      i.c+DC[dir])            // ahead
  const back  =()=>step(i.r-DR[dir],      i.c-DC[dir])            // behind
  const strafe=s=>step(i.r+DR[(dir+s)&3], i.c+DC[(dir+s)&3])      // sidestep, keep facing
  let k=e.key,act=1
  k=="ArrowUp"   ||k=="w"||k=="8"||k=="Enter"||k==" "?fwd():      // step / activate ahead
  k=="ArrowDown" ||k=="s"||k=="2"                    ?back():     // step back
  k=="ArrowLeft" ||k=="a"||k=="4"                    ?turn(3):    // rotate CCW
  k=="ArrowRight"||k=="d"||k=="6"                    ?turn(1):    // rotate CW
  k=="q"                                             ?strafe(3):  // strafe left
  k=="e"                                             ?strafe(1):  // strafe right
  act=0
  if(act)e.preventDefault()
})
async function loadM(mr,mc){
  if(cur!=null)mem[cur].html=M.innerHTML
  let key=mr+" "+mc
  if(!mem[key]){
    let jj=await fetch("r"+mr+"c"+mc+".json").then(d=>d.json())
    mem[key]={j:jj,html:"<tbody>\n"+jj.M.map(
      (t,r)=>
        "<tr>\n"+t.match(/.{1,2}/g).map(
          (t,c)=>"  <td id='r"+r+"c"+c+"'>"+(t[0]!=" "?"<b"+
            (t[0]!="w"?' id="'+t+'"':"")+   // double-quoted: a token may contain ' (the quote rune j')
            " class='"+t[0]+"'"+
            ">"+
            (t[0]=="w"?jj.theme.w:t[0]=="l"?"⛔":t[0]=="o"?"🚪":t[0]=="a"?"🍎":ins[t[1]]??t[1])+
            "</b>":"")+"</td>"
        ).join`\n`+"\n</tr>"
    ).join`\n`+"</tbody>"}
  }
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
  chk();count();mini();fit();draw()
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
  ang=dir*90;i.style.rotate=ang+"deg"     // seed the marker's heading (no animation on load)
  show()
  document.onclick=e=>{                    // click a billboard/door to interact; click view zones to move/turn
    if(e.target.closest("dialog,button,#belt,#util"))return       // leave UI + automap alone
    let tgt=e.target.closest(".p[data-r]")
    if(tgt){let r=+tgt.dataset.r,c=+tgt.dataset.c                  // tapped a stone/door/apple/exit: one step toward it (onto it → interact/cross)
      return Math.abs(r-i.r)>=Math.abs(c-i.c)?step(i.r+Math.sign(r-i.r),i.c):step(i.r,i.c+Math.sign(c-i.c))}
    let v=$("#view").getBoundingClientRect()
    if(e.clientX<v.left||e.clientX>v.right||e.clientY<v.top||e.clientY>v.bottom)return
    let x=(e.clientX-v.left)/v.width,y=(e.clientY-v.top)/v.height  // zones: top→fwd, bottom→back, sides→turn
    y<.33?step(i.r+DR[dir],i.c+DC[dir]):y>.67?step(i.r-DR[dir],i.c-DC[dir]):x<.5?turn(3):turn(1)
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
  ask.close()                                        // the check resolved — dismiss the challenge
  if(b&&ask.b.id[0]=="l"){
    ask.b.style.visibility="hidden"
    ;(doors[cur]??=[]).push(ask.b.id)   // remember door passed
    show(i.r=ask.r,i.c=ask.c)           // step through, reveal, repaint
    save()
  }else if(b&&ask.b.id[0]=="a"){         // 🍎 collected
    if(!apples.includes(ask.b.id))apples.push(ask.b.id)
    ask.b.remove();mini();draw();save()
    if(apples.length>=9)win()
  }else if(b){
    $$("#belt td")[g].appendChild(c)
    chk();count();mini();draw();save()
  }
}
