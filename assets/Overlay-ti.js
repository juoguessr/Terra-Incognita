import{n as __e}from"./rolldown-runtime-CbXtAM7H.js";
import{u as __rc,n as __yi}from"./index-Tn2611c.js";
import{t as __lf}from"./leaflet-Ck6P6yHn.js";
const R=__e(__rc()),L=__e(__lf()).default;
const ROUNDS=5,KEY="terra-hidden";

function hiddenList(){try{return JSON.parse(localStorage.getItem(KEY)||"[]")}catch{return[]}}
function report(row){try{const l=hiddenList();if(!l.some(a=>a[0]===row[0])){l.push([row[0],row[1]]);localStorage.setItem(KEY,JSON.stringify(l))}}catch{}}

const Pz=(lat,lng)=>L.CRS.EPSG3857.latLngToPoint(L.latLng(lat,lng),0);
const Lz=(x,y)=>L.CRS.EPSG3857.pointToLatLng(L.point(x,y),0);
const geo=(r,x,y)=>[r[8]*x+r[9]*y+r[10],r[5]*x+r[6]*y+r[7]];
const wrapDeg=d=>{d=((d+180)%360+360)%360-180;return d};
const fmtKm=k=>k<100?k.toFixed(0)+" km":Math.round(k).toLocaleString("fr-FR")+" km";
const srcUrl=l=>l.startsWith("http")?l.replace(/^http:/,"https:"):"https://www.davidrumsey.com/luna/servlet/detail/"+l;
const baseUrl=id=>id.startsWith("http")?id:"https://images.iiifhosting.com/iiif/"+id;

function el(tag,attrs={},...kids){
  const n=document.createElement(tag);
  for(const k in attrs){const v=attrs[k];
    if(k==="style")Object.assign(n.style,v);
    else if(k.startsWith("on"))n.addEventListener(k.slice(2).toLowerCase(),v);
    else if(v!==undefined&&v!==null&&v!==false)n.setAttribute(k,v===true?"":v)}
  for(const c of kids.flat())if(c!=null&&c!==false)n.append(c.nodeType?c:document.createTextNode(String(c)));
  return n}

export function score(player,truth,hint){
  const km=L.latLng(Lz(player.cx,player.cy)).distanceTo(L.latLng(Lz(truth.center.x,truth.center.y)))/1000;
  const ratio=player.s/truth.s;
  const rot=Math.abs(wrapDeg((player.th-truth.theta)*180/Math.PI));
  const sp=Math.exp(-km/(0.3*truth.diagKm)),ss=Math.exp(-Math.abs(Math.log(ratio))/0.4),sr=Math.exp(-rot/20);
  const raw=5000*(0.5*sp+0.3*ss+0.2*sr);
  return{km,ratio,rot,pts:Math.round(raw*(hint?0.7:1))}}

function mount(root,props,lang){
  const tr=(fr,en)=>lang==="en"?en:fr;
  if(!document.querySelector('link[data-ti-leaflet]')){
    const l=document.createElement("link");l.rel="stylesheet";l.dataset.tiLeaflet="1";
    l.href=new URL("./leaflet-vh-t_kPv.css",import.meta.url).href;document.head.append(l)}

  let round=0,total=0,results=[],phase="load",dead=false,seen=new Set();
  let row=null,img=null,truthImg=null,W=0,H=0,pose=null,s0=1,truth=null,hint=false;

  const btn=(label,cls,fn,extra={})=>el("button",{class:cls,type:"button",onclick:fn,style:extra},label);

  const title=el("span",{class:"font-display text-primary"},tr("Calque","Overlay"));
  const roundLbl=el("span"),scoreLbl=el("span",{class:"text-primary"});
  const header=el("header",{class:"border-b border-border",style:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:"12px",padding:"8px 12px",flexWrap:"wrap"}},
    btn("‹ Terra Incognita","font-display text-lg",()=>props.onExit(),{cursor:"pointer",background:"none"}),
    el("div",{class:"font-display text-sm",style:{display:"flex",gap:"12px",alignItems:"center"}},title,roundLbl,scoreLbl));
  const mapDiv=el("div",{style:{position:"relative",flex:"1",minHeight:"52vh",background:"var(--muted)"}});
  const info=el("div",{class:"text-sm text-muted-foreground",style:{textAlign:"center",minHeight:"1.4em"}});
  const panel=el("div",{style:{padding:"10px 12px",display:"flex",flexDirection:"column",gap:"8px",borderTop:"1px solid var(--border)"}});
  const body=el("div",{style:{flex:"1",display:"flex",flexDirection:"column",minHeight:0}},mapDiv,panel);
  root.append(header,body);

  const map=L.map(mapDiv,{zoomAnimation:false,worldCopyJump:false,minZoom:1}).setView([30,10],2);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"© OpenStreetMap contributors",maxZoom:19}).addTo(map);
  const cont=map.getContainer();

  const svgNS="http://www.w3.org/2000/svg";
  const svg=document.createElementNS(svgNS,"svg");
  Object.assign(svg.style,{position:"absolute",left:0,top:0,width:"100%",height:"100%",zIndex:460,pointerEvents:"none",display:"none"});
  const poly=document.createElementNS(svgNS,"polygon"),line=document.createElementNS(svgNS,"line");
  const dotT=document.createElementNS(svgNS,"circle"),dotP=document.createElementNS(svgNS,"circle");
  poly.setAttribute("fill","none");poly.setAttribute("stroke","oklch(42% .07 200)");poly.setAttribute("stroke-width","2.5");poly.setAttribute("stroke-dasharray","6 4");
  line.setAttribute("stroke","oklch(20% .03 50)");line.setAttribute("stroke-width","2");line.setAttribute("stroke-dasharray","6 6");
  dotT.setAttribute("r","6");dotT.setAttribute("fill","oklch(42% .07 200)");dotP.setAttribute("r","6");dotP.setAttribute("fill","oklch(45% .13 35)");
  svg.append(poly,line,dotT,dotP);cont.append(svg);

  const toC=()=>{const k=map.getZoomScale(map.getZoom(),0),o=map.latLngToContainerPoint(Lz(0,0));return p=>({x:o.x+p.x*k,y:o.y+p.y*k,k})};
  const posePts=p=>{const cs=Math.cos(p.th),sn=Math.sin(p.th);const f=(u,v)=>{const dx=(u-W/2)*p.s,dy=(v-H/2)*p.s;return{x:p.cx+dx*cs-dy*sn,y:p.cy+dx*sn+dy*cs}};return[f(0,0),f(W,0),f(0,H),f(W,H)]};
  function place(node,pts){const C=toC(),[a,b,c]=pts.map(C);
    node.style.transform=`matrix(${(b.x-a.x)/W},${(b.y-a.y)/W},${(c.x-a.x)/H},${(c.y-a.y)/H},${a.x},${a.y})`}
  function redraw(){
    if(!img||!W)return;
    place(img,posePts(pose));
    if(truthImg&&truth){place(truthImg,[truth.a,truth.b,truth.c]);
      const C=toC(),pts=[truth.a,truth.b,truth.d,truth.c].map(C);
      poly.setAttribute("points",pts.map(p=>p.x+","+p.y).join(" "));
      const t=C(truth.center),q=C({x:pose.cx,y:pose.cy});
      line.setAttribute("x1",t.x);line.setAttribute("y1",t.y);line.setAttribute("x2",q.x);line.setAttribute("y2",q.y);
      dotT.setAttribute("cx",t.x);dotT.setAttribute("cy",t.y);dotP.setAttribute("cx",q.x);dotP.setAttribute("cy",q.y)}}
  map.on("move zoom viewreset resize",redraw);

  /* ---------- interactions on the player's overlay ---------- */
  const ptrs=new Map();
  const toZ=(cx,cy)=>{const r=cont.getBoundingClientRect(),C=toC();const o=C({x:0,y:0});return{x:(cx-r.left-o.x)/o.k,y:(cy-r.top-o.y)/o.k}};
  const clampS=s=>Math.min(s0*50,Math.max(s0/50,s));
  function transformAbout(m0,m1,r,dth){
    const cs=Math.cos(dth),sn=Math.sin(dth),dx=pose.cx-m0.x,dy=pose.cy-m0.y;
    pose.cx=m1.x+r*(dx*cs-dy*sn);pose.cy=m1.y+r*(dx*sn+dy*cs);
    const ns=clampS(pose.s*r);pose.s=ns;pose.th+=dth;syncSliders();redraw()}
  function mid(){const v=[...ptrs.values()];return v.length===1?{x:v[0].x,y:v[0].y}:{x:(v[0].x+v[1].x)/2,y:(v[0].y+v[1].y)/2}}
  function gesture(a){const v=[...a.values()];return v.length<2?null:{d:Math.hypot(v[1].x-v[0].x,v[1].y-v[0].y),ang:Math.atan2(v[1].y-v[0].y,v[1].x-v[0].x)}}
  function attach(node){
    node.addEventListener("pointerdown",e=>{if(phase!=="play")return;e.preventDefault();e.stopPropagation();
      try{node.setPointerCapture(e.pointerId)}catch{}
      ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});map.dragging.disable()});
    node.addEventListener("pointermove",e=>{if(phase!=="play"||!ptrs.has(e.pointerId))return;
      const before=new Map(ptrs),m0=mid(),g0=gesture(before);
      ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
      const m1=mid(),g1=gesture(ptrs);
      transformAbout(toZ(m0.x,m0.y),toZ(m1.x,m1.y),g0&&g1&&g0.d>0?g1.d/g0.d:1,g0&&g1?g1.ang-g0.ang:0)});
    const up=e=>{ptrs.delete(e.pointerId);if(!ptrs.size)map.dragging.enable()};
    node.addEventListener("pointerup",up);node.addEventListener("pointercancel",up);
    node.addEventListener("wheel",e=>{if(phase!=="play")return;e.preventDefault();e.stopPropagation();
      const z=toZ(e.clientX,e.clientY);
      if(e.shiftKey)transformAbout(z,z,1,e.deltaY*0.002);else transformAbout(z,z,Math.exp(-e.deltaY*0.002),0)},{passive:false});
    node.addEventListener("dragstart",e=>e.preventDefault())}

  /* ---------- panel ---------- */
  const mk=(label,min,max,step,val,fn)=>{
    const out=el("span",{class:"text-sm",style:{minWidth:"3.5em",textAlign:"right"}});
    const inp=el("input",{type:"range",min,max,step,value:val,class:"accent-primary",style:{flex:"1"}});
    inp.addEventListener("input",()=>fn(+inp.value,out));
    return{row:el("label",{style:{display:"flex",alignItems:"center",gap:"8px"}},el("span",{class:"font-display text-sm",style:{minWidth:"5.5em"}},label),inp,out),inp,out}};
  const sOp=mk(tr("Opacité","Opacity"),0.1,1,0.01,0.55,(v,o)=>{if(img)img.style.opacity=v;o.textContent=Math.round(v*100)+" %"});
  const sSz=mk(tr("Taille","Size"),-400,400,1,0,(v,o)=>{if(pose){pose.s=s0*Math.pow(2,v/100);o.textContent="×"+Math.pow(2,v/100).toFixed(2);redraw()}});
  const sRo=mk(tr("Rotation","Rotation"),-180,180,1,0,(v,o)=>{if(pose){pose.th=pose.th0+v*Math.PI/180;o.textContent=v+"°";redraw()}});
  function syncSliders(){
    if(!pose)return;
    const z=Math.max(-400,Math.min(400,Math.log2(pose.s/s0)*100));sSz.inp.value=z;sSz.out.textContent="×"+(pose.s/s0).toFixed(2);
    const d=wrapDeg((pose.th-pose.th0)*180/Math.PI);sRo.inp.value=Math.round(d);sRo.out.textContent=Math.round(d)+"°"}

  sOp.out.textContent="55 %";
  function status(msg){info.textContent=msg||""}
  function setHeader(){roundLbl.textContent=tr("Manche","Round")+" "+Math.min(round+1,ROUNDS)+"/"+ROUNDS;scoreLbl.textContent=total.toLocaleString("fr-FR")+" pts"}

  function playPanel(){
    panel.replaceChildren(
      el("p",{class:"text-sm text-muted-foreground",style:{textAlign:"center"}},
        tr("Déplacez la carte historique (glisser), changez sa taille et son angle (molette, pincement ou curseurs) jusqu'à ce qu'elle épouse le fond moderne.",
           "Drag the historical map, resize and rotate it (wheel, pinch or sliders) until it fits the modern map.")),
      sOp.row,sSz.row,sRo.row,info,
      el("div",{style:{display:"flex",gap:"8px",flexWrap:"wrap",justifyContent:"center",alignItems:"center"}},
        btn(tr("Valider le calque","Submit overlay"),"btn-seal",validate,{cursor:"pointer"}),
        btn(tr("Révéler le titre (−30 %)","Reveal title (−30%)"),"chip",()=>{hint=true;status(row[1]+(row[2]?" ("+row[2]+")":""))},{cursor:"pointer"}),
        btn(tr("Changer de carte","Change map"),"chip",()=>nextMap(false),{cursor:"pointer"}),
        btn(tr("Pas une carte (signaler)","Not a map (report)"),"chip",()=>{report(row);nextMap(false)},{cursor:"pointer"}),
        btn(tr("Abandonner","Give up"),"chip",giveUp,{cursor:"pointer"})))}

  function cleanup(){
    if(img)img.remove();if(truthImg)truthImg.remove();img=truthImg=null;truth=null;pose=null;W=H=0;
    svg.style.display="none";ptrs.clear();map.dragging.enable()}

  async function nextMap(advance){
    if(advance)round++;
    cleanup();setHeader();
    if(round>=ROUNDS)return end();
    phase="load";hint=false;
    panel.replaceChildren(el("p",{class:"text-sm text-muted-foreground",style:{textAlign:"center"}},tr("Ouverture des archives…","Opening the archives…")));
    map.setView([30,10],2,{animate:false});
    try{
      const sc=props.scale&&props.scale.length?props.scale:["world","large","country"];
      const[r]=await props.pick(1,{datedOnly:false,scale:sc,era:props.era||[],maritime:false},seen);
      if(dead)return;
      row=r;seen.add(r[0]);
    }catch{if(dead)return;panel.replaceChildren(el("p",{class:"text-destructive text-sm",style:{textAlign:"center"}},tr("Pas assez de cartes pour ces filtres.","Not enough maps for these filters.")),btn(tr("Quitter","Exit"),"btn-seal",()=>props.onExit(),{cursor:"pointer",alignSelf:"center"}));return}
    const x0=row[11],y0=row[12],rw=row[13]-x0,rh=row[14]-y0;
    const im=new Image();im.alt="";im.draggable=false;
    Object.assign(im.style,{position:"absolute",left:0,top:0,transformOrigin:"0 0",zIndex:450,touchAction:"none",cursor:"grab",maxWidth:"none",opacity:sOp.inp.value,boxShadow:"0 0 0 2px var(--primary)",userSelect:"none"});
    im.onerror=()=>{if(dead||im!==img)return;panel.replaceChildren(el("p",{class:"text-sm text-destructive",style:{textAlign:"center"}},tr("Image indisponible.","Image unavailable.")),btn(tr("Changer de carte","Change map"),"btn-seal",()=>nextMap(false),{cursor:"pointer",alignSelf:"center"}))};
    im.onload=()=>{
      if(dead||im!==img)return;
      W=im.naturalWidth;H=im.naturalHeight;im.style.width=W+"px";im.style.height=H+"px";
      const sx=rw/W,sy=rh/H,P=(u,v)=>{const[la,ln]=geo(row,x0+u*sx,y0+v*sy);return Pz(la,ln)};
      const a=P(0,0),b=P(W,0),c=P(0,H),d=P(W,H);
      truth={a,b,c,d,theta:Math.atan2(b.y-a.y,b.x-a.x),s:Math.hypot(b.x-a.x,b.y-a.y)/W,
        center:{x:(a.x+b.x+c.x+d.x)/4,y:(a.y+b.y+c.y+d.y)/4},
        diagKm:Math.max(50,L.latLng(Lz(a.x,a.y)).distanceTo(L.latLng(Lz(d.x,d.y)))/1000)};
      const size=map.getSize(),k=map.getZoomScale(map.getZoom(),0),ctr=map.project(map.getCenter(),0);
      const c0=Pz(map.getCenter().lat,map.getCenter().lng);
      s0=(0.55*Math.min(size.x,size.y*W/H))/(W*k);
      const th0=((Math.random()<.5?-1:1)*(20+Math.random()*40))*Math.PI/180;
      pose={cx:c0.x,cy:c0.y,s:s0,th:th0,th0};
      sSz.inp.value=0;sRo.inp.value=0;syncSliders();
      phase="play";status("");playPanel();redraw()};
    img=im;attach(im);cont.append(im);
    im.src=baseUrl(row[0])+"/"+x0+","+y0+","+rw+","+rh+"/!1000,1000/0/default.jpg"}

  function reveal(res,gaveUp){
    phase="reveal";
    const pts=res.pts;total+=pts;results.push({title:row[1],year:row[2],pts});setHeader();
    img.style.opacity=.3;img.style.cursor="default";img.style.boxShadow="0 0 0 2px var(--primary)";
    truthImg=img.cloneNode();truthImg.removeAttribute("src");truthImg.src=img.src;
    Object.assign(truthImg.style,{opacity:.8,pointerEvents:"none",cursor:"default",boxShadow:"0 0 0 2px oklch(42% .07 200)",zIndex:451});
    cont.append(truthImg);svg.style.display="block";
    const b=L.latLngBounds([truth.a,truth.b,truth.c,truth.d].map(p=>Lz(p.x,p.y)));
    map.fitBounds(b,{padding:[30,30],animate:false});redraw();
    const last=round+1>=ROUNDS;
    panel.replaceChildren(
      el("p",{class:"font-display text-2xl text-primary",style:{textAlign:"center"}},"+"+pts.toLocaleString("fr-FR")+" pts"),
      el("p",{class:"text-sm text-muted-foreground",style:{textAlign:"center"}},
        gaveUp?tr("Abandon","Gave up"):
        tr("Position : ","Position: ")+fmtKm(res.km)+" · "+tr("taille : ","size: ")+"×"+res.ratio.toFixed(2)+" · "+tr("rotation : ","rotation: ")+Math.round(res.rot)+"°"),
      el("p",{class:"font-display text-lg leading-tight",style:{textAlign:"center"}},row[1]),
      el("p",{class:"text-sm text-muted-foreground",style:{textAlign:"center"}},(row[3]||tr("Auteur inconnu","Unknown author"))+" · "+(row[2]||tr("date inconnue","unknown date"))+" · ",
        el("a",{href:srcUrl(row[4]||""),target:"_blank",rel:"noreferrer",class:"underline"},tr("Voir la source ↗","View source ↗"))),
      el("div",{style:{display:"flex",justifyContent:"center"}},
        btn(last?tr("Résultats","Results"):tr("Manche suivante","Next round"),"btn-seal",()=>nextMap(true),{cursor:"pointer"})))}

  function validate(){if(phase!=="play"||!pose)return;reveal(score(pose,truth,hint),false)}
  function giveUp(){if(phase!=="play"||!pose)return;if(!window.confirm(tr("Abandonner cette carte ? (0 point)","Give up on this map? (0 points)")))return;
    const s=score(pose,truth,false);reveal({...s,pts:0},true)}

  function end(){
    phase="end";
    mapDiv.style.display="none";
    body.replaceChildren(el("div",{style:{maxWidth:"36rem",margin:"0 auto",padding:"24px 12px",display:"flex",flexDirection:"column",gap:"16px",alignItems:"center",textAlign:"center"}},
      el("h1",{class:"text-5xl text-ink"},tr("Fin du voyage","Journey's end")),
      el("p",{class:"font-display text-4xl text-primary"},total.toLocaleString("fr-FR")+" / "+(ROUNDS*5000).toLocaleString("fr-FR")),
      el("div",{class:"w-full divide-y divide-border text-left"},results.map(r=>el("div",{style:{display:"flex",justifyContent:"space-between",gap:"12px",padding:"8px 4px"}},
        el("span",{class:"truncate"},r.title),el("span",{class:"font-display text-primary"},r.pts.toLocaleString("fr-FR")+" pts")))),
      el("div",{style:{display:"flex",gap:"8px"}},
        btn(tr("Rejouer","Play again"),"btn-seal",()=>{round=0;total=0;results=[];seen=new Set();body.replaceChildren(mapDiv,panel);mapDiv.style.display="";map.invalidateSize();nextMap(false)},{cursor:"pointer"}),
        btn(tr("Quitter","Exit"),"chip",()=>props.onExit(),{cursor:"pointer"}))))}

  setHeader();nextMap(false);
  return()=>{dead=true;try{map.remove()}catch{}root.replaceChildren()};
}

export default function Overlay(props){
  const{lang}=__yi();
  const ref=R.useRef(null);
  R.useEffect(()=>{const stop=mount(ref.current,props,lang);return stop},[]);
  return R.createElement("div",{ref,className:"page-turn",style:{display:"flex",flexDirection:"column",minHeight:"calc(100vh - 28px)"}});
}
