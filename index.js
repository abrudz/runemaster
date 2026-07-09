'use strict'
let i,M,root,aski,askb,askp,ask,msg,msgp
let j,g,c,rMin,cMin,rMax,cMax,mr=0,mc=0,cur,mem={}
const $=s=>document.querySelector(s)
const $$=s=>[...document.querySelectorAll(s)]
const td=(r,c)=>$("#r"+r+"c"+c)
const b=r=>`<b tabindex='0' class='${r[0]}'>${r[1]}</b>`
const bs=s=>(s.match(/../g)??[]).map(b)
const reqs=t=>j[t.id].req.match(/../g)??[]
const dfnkeys=q=>q.f?(Array.isArray(q.a[0])?"{ } ⍺ ⍵ ":"{ } ⍵ "):""  // dfn scaffold keys for function challenges
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
const cls={"(":")","[":"]","{":"}"}          // enclosure openers -> closers
const lb=ch=>{
  const bi=$$("#belt b").map(e=>e.id)
  const a=ch.match(/../g,"")
  aski.pattern="["+a.map(t=>t[0]=="j"?t[1]+cls[t[1]]:t[1]==" "?t[0]:t[1]).join("").replace(/[-^$\\.*+?()[\]{}|\/&!#%,:;<=>@~`]/g,"\\$&")+" ]*"
  askb.innerHTML=a.sort(_=>Math.random()-0.5).
            map(s=>s[1]==" "?`<button>${s[0]}</button>`:s==c.id||~bi.indexOf(s)?b(s):"").join("")
  $$("#askb>*").forEach(e=>e.onclick=()=>{
    const ins=e.innerText+(cls[e.innerText]??"")   // enclosures insert as a pair, cursor between
    let se=aski.selectionStart+1
    aski.value=aski.value.slice(0,aski.selectionStart)+ins+aski.value.slice(aski.selectionEnd)
    aski.selectionStart=aski.selectionEnd=se
    aski.focus()
  })
}
window.addEventListener('resize',()=>jump(i.r,i.c))
const show=()=>$$(
  `#r${i.r-1}c${i.c-1}>*,`+
  `#r${i.r-1}c${i.c+0}>*,`+
  `#r${i.r-1}c${i.c+1}>*,`+
  `#r${i.r+0}c${i.c-1}>*,`+
  `#r${i.r+0}c${i.c+0}>*,`+
  `#r${i.r+0}c${i.c+1}>*,`+
  `#r${i.r+1}c${i.c-1}>*,`+
  `#r${i.r+1}c${i.c+0}>*,`+
  `#r${i.r+1}c${i.c+1}>*`
).forEach(e=>e.style.opacity=1)
const chk=()=>{
  let bi=$$("#belt b").map(e=>e.id)
  $$(".l").forEach(e=>reqs(e).every(r=>~bi.indexOf(r))?(e.className="o",e.innerText="🚪"):0)
}
addEventListener('keydown', async e=>{
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
  if(moved&&!$$("dialog").some(e=>e.hasAttribute("open"))){
    e.preventDefault()
    if(newR<0)   {mr-=1;await loadM(mr,mc);jump(rMax,newC);show()}else
    if(newR>rMax){mr+=1;await loadM(mr,mc);jump(0   ,newC);show()}else
    if(newC<0)   {mc-=1;await loadM(mr,mc);jump(newR,cMax);show()}else
    if(newC>cMax){mc+=1;await loadM(mr,mc);jump(newR,0   );show()}
    else{
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
  }
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
            t.replace("w "," "+jj.theme.w)
             .replace(/o\d/," 🚪")
             .replace(/l\d/," ⛔").slice(1)+
            "</b>":"")+"</td>"
        ).join("\n")+"\n</tr>"
    ).join("\n")+"</tbody>"}
  }
  cur=key
  j=mem[key].j
  M.innerHTML=mem[key].html
  if(j.theme.wall)root.style.setProperty("--wall",j.theme.wall)
  if(j.theme.back)root.style.setProperty("--back",j.theme.back)
  if(j.theme.spot)root.style.setProperty("--spot",j.theme.spot)
  let first=$$("#M td")[0]   ;rMin=getR(first);cMin=getC(first)
  let last =$$("#M td").pop();rMax=getR(last );cMax=getC(last )
  chk()
}
document.addEventListener('DOMContentLoaded', async function main() {
  i=$("#i");M=$("#M");root=$("#root")
  aski=$("#aski");askb=$("#askb");askp=$("#askp")
  ask=$("#ask");msg=$("#msg");msgp=$("#msgp")
  await loadM(mr,mc)
  i.rVal=Math.floor(rMax/2);i.cVal=Math.floor(cMax/2)
  Object.defineProperty(i, 'r', {get: ()=>i.rVal, set: v=> place(i,i.rVal=v,i.cVal  )})
  Object.defineProperty(i, 'c', {get: ()=>i.cVal, set: v=> place(i,i.rVal  ,i.cVal=v)})
  i.r=i.rVal;i.c=i.cVal
  show()
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
  }else if(b){
    $$("#belt td")[g].appendChild(c)
    chk()
  }
}
