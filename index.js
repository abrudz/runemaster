$=s=>document.querySelector(s)
$$=s=>[...document.querySelectorAll(s)]
td=(r,c)=>$("#r"+r+"c"+c)
b=r=>`<b tabindex='0' class='${r[0]}'>${r[1]}</b>`
bs=s=>(s.match(/../g)??[]).map(b)
reqs=t=>j[t.id].req.match(/../g)
md=s=>s.replace(/\{(\w\W)\}/g,(_,m)=>b(m)).replace(/(?<!\\)`(.*?[^\\])`/g,"<code>$1</code>").replace(/(?<!\\)_(.*?[^\\])_/g,"<em>$1</em>").replace(/\\([`_])/g,"$1")
exec=s=>{with(new XMLHttpRequest) {
	open("POST", "https://tryapl.org/Exec");
	setRequestHeader("Content-Type", "application/json;charset=utf-8");
	send(JSON.stringify([0, 0, 0, s]));
	onload = _ => react(+eval(responseText)[3][0])
}}
getTop =e=>window.scrollY+e.getBoundingClientRect().top +"px"
getLeft=e=>window.scrollX+e.getBoundingClientRect().left+"px"
getR=e=>parseInt(e.id.replace(/r|c\d+/g,""))
getC=e=>parseInt(e.id.replace(/r\d+c/,""))
place=(e,y,x)=>{
  t=td(y,x)
  e.style.top=getTop(t)
  e.style.left=getLeft(t)
}
lb=ch=>{
  bi=$$("#belt b").map(e=>e.id)
  a=ch.match(/../g,"")
  aski.pattern="["+a.map(t=>t[1]==" "?t[0]:t[1]).join("").replace(/\W/g,"$&")+" ]*"
  askb.innerHTML=a.sort(_=>Math.random()-0.5).
            map(s=>s[1]==" "?`<button>${s[0]}</button>`:s==c.id||~bi.indexOf(s)?b(s):"").join("")
  $$("#askb>*").forEach(e=>e.setAttribute("onclick",
    `se=aski.selectionStart+1;
    aski.value=aski.value.slice(0,aski.selectionStart)+
    this.innerText+aski.value.slice(aski.selectionEnd,aski.value.length);
    aski.selectionStart=aski.selectionEnd=se;aski.focus()`))
  
}
window.addEventListener('resize',()=>{
  i.style.display="none"
  place(i,i.r,i.c)
  i.style.display="block"
})
show=()=>$$(
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
mr=0;mc=0
addEventListener('keydown', e=>{
  up   =()=>newR=i.r-1
  down =()=>newR=i.r+1
  left =()=>newC=i.c-1
  right=()=>newC=i.c+1
  newR=i.r;newC=i.c
  if(newR<0)   {mr-=1;loadM(mr,mc);r=rMax}else
  if(newR>rMax){mr+=1;loadM(mr,mc);r=0}   else
  if(newC<0)   {mc-=1;loadM(mr,mc);c=cMax}else
  if(newC>cMax){mc+=1;loadM(mr,mc);c=0}
  else{
    moved=0
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
      t=td(newR,newC).children[0]
      if(t&&t.style.visibility!="hidden"){
        if(t.className=="l"){
          msgp.innerHTML="This door requires mastery of the following runes:<br>"+bs(j[t.id].req).join(" ")
          msg.showModal()
        }else if(t.className=="o"){
          askp.innerHTML=md(j[t.id].task)
          tinf=j[t.id]
          lb(tinf.req+tinf.add+[...tinf.task.matchAll(/`\w`/g)].join("").replace(/`(\w)`/g,"$1 "))
          ask.b=t
          ask.r=newR;ask.c=newC
          aski.value=""
          ask.showModal()
        }else if(~(g="mdMD".indexOf(t.className))){
          show(i.r=newR,i.c=newC)
          c=t.children[0]
          askp.innerHTML=md(j[c.id].task)
          tinf=j[c.id]
          lb(c.id+tinf.req+tinf.add+[...tinf.task.matchAll(/`\w`/g)].join("").replace(/`(\w)`/g,"$1 "))
          ask.b=c
          aski.value=""
          ask.showModal()
        }
      }else show(i.r=newR,i.c=newC)
      e.preventDefault()
    }
  }
});
async function loadM(mr,mc) {
  await fetch("r"+mr+"c"+mc+".json").then(d=>d.text()).then(d=>{
    j=JSON.parse(d)
    if(j.theme.wall)root.style.setProperty("--wall",j.theme.wall)
    if(j.theme.back)root.style.setProperty("--back",j.theme.back)
    if(j.theme.spot)root.style.setProperty("--spot",j.theme.spot)
    M.innerHTML="<tbody>\n"+j.M.map(
      (t,r)=>
        "<tr>\n"+t.match(/.{1,2}/g).map(
          (t,c)=>"  <td id='r"+r+"c"+c+"'>"+(t[0]!=" "?"<b"+
            (t[0]!="w"?" id='"+t+"'":"")+
            " class='"+t[0]+"'"+
            ">"+
            t.replace("w "," "+j.theme.w)
             .replace(/o\d/," 🚪")
             .replace(/l\d/," ⛔").slice(1)+
            "</b>":"")+"</td>"
        ).join("\n")+"\n</tr>"
    ).join("\n")+"</tbody>"
    first=$$("#M td")[0]   ;rMin=getR(first);cMin=getC(first)
    last =$$("#M td").pop();rMax=getR(last );cMax=getC(last )
  })
  show()
}
document.addEventListener('DOMContentLoaded', async function main() {
  await loadM(mr,mc)
  i.rVal=Math.floor(rMax/2);i.cVal=Math.floor(cMax/2)
  Object.defineProperty(i, 'r', {get: ()=>i.rVal, set: v=> place(i,i.rVal=v,i.cVal  )})
  Object.defineProperty(i, 'c', {get: ()=>i.cVal, set: v=> place(i,i.rVal  ,i.cVal=v)})
  i.r=i.rVal;i.c=i.cVal
  show()
})
ans=t=>{
  if(!RegExp("^"+aski.pattern+"$").test(aski.value))return
  expr="{0::0 ⋄ ("+t+")≡⍵}"+j[ask.b.id].expr
  exec(expr)
}
react=b=>{
  if(b&&ask.b.id[0]=="l"){
    show(i.r=ask.r,i.c=ask.c)
    ask.b.style.visibility="hidden"  
  }else if(b){
    $$("#belt td")[g].appendChild(c)
    bi=$$("#belt b").map(e=>e.id)
    $$(".l").forEach(e=>reqs(e).every(r=>~bi.indexOf(r))?(e.className="o",e.innerText="🚪"):0)
  }
}