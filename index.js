'use strict'
let i,M,root,aski,askb,askp,ask,msg,msgp
let j,g,c,rMin,cMin,rMax,cMax,mr=0,mc=0,cur,mem={},doors={},seen={}
const KEY="runemaster"                             // localStorage key for saved progress
const $=s=>document.querySelector(s)
const $$=s=>[...document.querySelectorAll(s)]
const td=(r,c)=>$("#r"+r+"c"+c)
const ins={"(":"()","[":"[]","{":"{}","∘":"∘."}   // rune glyph -> displayed / typed form (multi-char)
const mid={"()":1,"[]":1,"{}":1}                   // enclosure pairs: cursor sits between
const b=r=>`<b tabindex='0' class='${r[0]}'>${ins[r[1]]??r[1]}</b>`
const mkb=id=>{const e=document.createElement("b");e.tabIndex=0;e.id=id;e.className=id[0];e.innerHTML=ins[id[1]]??id[1];return e}  // rebuild a collected rune (keeps its id so chk sees it)
const bs=s=>(s.match(/../g)??[]).map(b)
const reqs=t=>j[t.id].req.match(/../g)??[]
const dfnkeys=q=>q.f?(Array.isArray(q.a[0])?"⍺ ⍵ ":"⍵ "):""  // dfn arg keys for function challenges (braces come from the {} diamond)
const md=s=>s.replace(/\{(\w\W)\}/g,(_,m)=>b(m)).replace(/(?<!\\)`(.*?[^\\])`/g,"<code>$1</code>").replace(/(?<!\\)_(.*?[^\\])_/g,"<em>$1</em>").replace(/\\([`_])/g,"$1")
const exec=s=>fetch("https://tryapl.org/Exec",{
  method:"POST",
  headers:{"Content-Type":"application/json;charset=utf-8"},
  body:JSON.stringify([0, 0, 0, s]),
  signal:AbortSignal.timeout(35e3)
}).then(d=>d.json()).then(d=>react(+d[3][0]))
  .catch(_=>{msgp.innerHTML="TryAPL isn't responding — please try again.";msg.showModal()})
const getTop =e=>window.scrollY+e.getBoundingClientRect().top +"px"
const getLeft=e=>window.scrollX+e.getBoundingClientRect().left+"px"
const getR=e=>parseInt(e.id.replace(/r|c\d+/g,""))
const getC=e=>parseInt(e.id.replace(/r\d+c/,""))
const place=(e,y,x)=>{
  const t=td(y,x)
  e.style.top=getTop(t)
  e.style.left=getLeft(t)
}
const jump=(r,c)=>{
  i.style.transition="none"
  i.r=r;i.c=c
  void i.offsetWidth
  i.style.transition=""
}
const lb=ch=>{
  const a=[...new Set(ch.match(/../g)??[])]                       // the challenge's allowed runes, deduped
  aski.pattern="["+a.map(t=>t[1]==" "?t[0]:(ins[t[1]]??t[1])).join("").replace(/[-^$\\.*+?()[\]{}|\/&!#%,:;<=>@~`]/g,"\\$&")+" ]*"
  askb.innerHTML=a.sort(_=>Math.random()-0.5).
            map(s=>s[1]==" "?`<button>${s[0]}</button>`:b(s)).join("")
  $$("#askb>*").forEach(e=>e.onclick=()=>{
    const txt=e.innerText,off=mid[txt]??txt.length   // enclosure pairs put the cursor between; others after
    const at=aski.selectionStart
    aski.value=aski.value.slice(0,at)+txt+aski.value.slice(aski.selectionEnd)
    aski.selectionStart=aski.selectionEnd=at+off
    aski.focus()
  })
}
window.addEventListener('resize',()=>jump(i.r,i.c))
const show=()=>{                                       // reveal the 3×3 around the player, and remember it
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
}
const count=()=>{let n=$$("#M b.m,#M b.d,#M b.M,#M b.D,#M b.j").length   // uncollected rune stones in this room
  $("#left").textContent=n?`${n} rune${n-1?"s":""} yet to find here`:"all runes here are yours"}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify({mr,mc,r:i.r,c:i.c,belt:$$("#belt b").map(e=>e.id),doors,seen}))}catch(_){}}
const restore=()=>{
  let s;try{s=JSON.parse(localStorage.getItem(KEY))}catch(_){s=null}
  if(!s)return null
  doors=s.doors??{};seen=s.seen??{}
  ;(s.belt??[]).forEach(id=>{let g="mdMDj".indexOf(id[0]);if(~g)$$("#belt td")[g].appendChild(mkb(id))})
  return s
}
window.reset=()=>{localStorage.removeItem(KEY);location.reload()}   // playtesting: wipe saved progress
async function step(newR,newC){                        // move to / interact with (newR,newC); shared by keyboard + tap
  if($$("dialog").some(e=>e.hasAttribute("open")))return
  if(newR<0   &&newC==i.c){mr-=1;await loadM(mr,mc);jump(rMax,newC);show()}else
  if(newR>rMax&&newC==i.c){mr+=1;await loadM(mr,mc);jump(0   ,newC);show()}else
  if(newC<0   &&newR==i.r){mc-=1;await loadM(mr,mc);jump(newR,cMax);show()}else
  if(newC>cMax&&newR==i.r){mc+=1;await loadM(mr,mc);jump(newR,0   );show()}else  // only orthogonal steps switch maps; a diagonal move off an edge is ignored (would land on a wall)
  if(0<=newR&&newR<=rMax&&0<=newC&&newC<=cMax){
    let t=td(newR,newC).children[0]
    if(t&&t.style.visibility!="hidden"){
      if(t.className=="l"){
        msgp.innerHTML="This door requires mastery of the following runes:<br>"+bs(j[t.id].req).join(" ")
        msg.showModal()
      }else if(t.className=="o"){
        askp.innerHTML=md(j[t.id].task)
        let tinf=j[t.id]
        lb(tinf.req+tinf.add+dfnkeys(tinf)+[...tinf.task.matchAll(/`\w`/g)].join("").replace(/`(\w)`/g,"$1 "))
        ask.b=t
        ask.r=newR;ask.c=newC
        aski.value=""
        ask.showModal()
      }else if(~(g="mdMDj".indexOf(t.className))){
        show(i.r=newR,i.c=newC)
        c=t
        askp.innerHTML=md(j[c.id].task)
        let tinf=j[c.id]
        lb(c.id+tinf.req+tinf.add+dfnkeys(tinf)+[...tinf.task.matchAll(/`\w`/g)].join("").replace(/`(\w)`/g,"$1 "))
        ask.b=c
        aski.value=""
        ask.showModal()
      }
    }else show(i.r=newR,i.c=newC)
  }
  save()
}
addEventListener('keydown', e=>{
  const up   =()=>newR=i.r-1
  const down =()=>newR=i.r+1
  const left =()=>newC=i.c-1
  const right=()=>newC=i.c+1
  let newR=i.r,newC=i.c
  let moved=0
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
});
async function loadM(mr,mc) {
  if(cur!=null)mem[cur].html=M.innerHTML
  let key=mr+" "+mc
  if(!mem[key]){
    let jj=await fetch("r"+mr+"c"+mc+".json").then(d=>d.json())
    mem[key]={j:jj,html:"<tbody>\n"+jj.M.map(
      (t,r)=>
        "<tr>\n"+t.match(/.{1,2}/g).map(
          (t,c)=>"  <td id='r"+r+"c"+c+"'>"+(t[0]!=" "?"<b"+
            (t[0]!="w"?" id='"+t+"'":"")+
            " class='"+t[0]+"'"+
            ">"+
            (t[0]=="w"?jj.theme.w:t[0]=="l"?"⛔":t[0]=="o"?"🚪":ins[t[1]]??t[1])+
            "</b>":"")+"</td>"
        ).join("\n")+"\n</tr>"
    ).join("\n")+"</tbody>"}
  }
  cur=key
  j=mem[key].j
  M.innerHTML=mem[key].html
  let got=new Set($$("#belt b").map(e=>e.id))                                    // runes already collected
  $$("#M b").forEach(e=>got.has(e.id)?e.remove():doors[key]?.includes(e.id)?e.style.visibility="hidden":0)  // gone / passed doors open
  ;(seen[key]??[]).forEach(k=>{let[r,c]=k.split(",");let e=td(r,c)?.children[0];if(e)e.style.opacity=1})    // restore revealed fog-of-war
  if(j.theme.wall)root.style.setProperty("--wall",j.theme.wall)
  if(j.theme.back)root.style.setProperty("--back",j.theme.back)
  if(j.theme.spot)root.style.setProperty("--spot",j.theme.spot)
  let first=$$("#M td")[0]   ;rMin=getR(first);cMin=getC(first)
  let last =$$("#M td").pop();rMax=getR(last );cMax=getC(last )
  chk()
  count()
}
document.addEventListener('DOMContentLoaded', async function main() {
  i=$("#i");M=$("#M");root=$("#root")
  aski=$("#aski");askb=$("#askb");askp=$("#askp")
  ask=$("#ask");msg=$("#msg");msgp=$("#msgp")
  if(/[?&]reset\b/.test(location.search))localStorage.removeItem(KEY)
  const s=restore()
  if(s){mr=s.mr;mc=s.mc}
  await loadM(mr,mc)
  i.rVal=s?s.r:Math.floor(rMax/2);i.cVal=s?s.c:Math.floor(cMax/2)
  Object.defineProperty(i, 'r', {get: ()=>i.rVal, set: v=> place(i,i.rVal=v,i.cVal  )})
  Object.defineProperty(i, 'c', {get: ()=>i.cVal, set: v=> place(i,i.rVal  ,i.cVal=v)})
  i.r=i.rVal;i.c=i.cVal
  show()
  document.onclick=e=>{                    // click a tile to step toward it; click outside the map to step that way (even across an edge)
    if(e.target.closest("dialog,button,#belt"))return   // leave the UI controls alone
    const t=e.target.closest("#M td")
    let dr,dc
    if(t){dr=Math.sign(getR(t)-i.r);dc=Math.sign(getC(t)-i.c)}   // inside the map: head toward the tapped tile
    else{const b=M.getBoundingClientRect()                       // outside the map: general direction (diagonal in the corners)
      dr=e.clientY<b.top?-1:e.clientY>b.bottom?1:0
      dc=e.clientX<b.left?-1:e.clientX>b.right?1:0}
    if(dr||dc)step(i.r+dr,i.c+dc)
  }
})
window.ans=t=>{
  const q=j[ask.b.id]
  if(!q.f&&!RegExp("^"+aski.pattern+"$").test(aski.value))return
  let expr
  if(q.f){                              // function challenge: test player dfn G against reference F over cases
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
  if(b&&ask.b.id[0]=="l"){
    show(i.r=ask.r,i.c=ask.c)
    ask.b.style.visibility="hidden"
    ;(doors[cur]??=[]).push(ask.b.id)   // remember this door is passed
    save()
  }else if(b){
    $$("#belt td")[g].appendChild(c)
    chk()
    count()
    save()
  }
}
