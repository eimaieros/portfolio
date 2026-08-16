/* Harness: corre o script do site em jsdom, com e sem WebGL, e reporta
   qualquer excepção. É o teste que teria apanhado o bug de âmbito. */
const fs=require('fs');const {JSDOM}=require('jsdom');
const file=process.argv[2], webgl=process.argv[3]==='webgl';
const dom=new JSDOM(fs.readFileSync(file,'utf8'),{runScripts:'outside-only',url:'https://x.test/site/index.html'});
const w=dom.window;const noop=()=>{};
w.gsap={ticker:{add:noop,wake:noop,sleep:noop,lagSmoothing:noop},to:noop,from:noop,set:noop,
 timeline:()=>({to:noop,from:noop}),quickTo:()=>()=>{},registerPlugin:noop,utils:{toArray:()=>[]}};
w.ScrollTrigger={create:()=>({progress:0,kill:noop}),refresh:noop,update:noop,addEventListener:noop,defaults:noop,getAll:()=>[]};
w.Lenis=function(){return{raf:noop,on:noop,stop:noop,start:noop,scrollTo:noop,scroll:0}};
const g2d=new Proxy({},{get:(t,k)=>k==='canvas'?{width:9,height:9}:(...a)=>({addColorStop:noop,data:[]}),set:()=>true});
const gl=new Proxy({},{get:()=>()=>null});
w.HTMLCanvasElement.prototype.getContext=t=>t==='2d'?g2d:(webgl?gl:null);
w.requestAnimationFrame=cb=>{setTimeout(()=>cb(1),0);return 1};
w.cancelAnimationFrame=noop;
w.matchMedia=q=>({matches:false,addEventListener:noop,addListener:noop,removeEventListener:noop});
w.setInterval=()=>1;w.clearInterval=noop;
/* jsdom não tem IntersectionObserver e o site usa-o. Sem este duplo, o caminho
   real nunca era exercitado e um erro lá dentro passava despercebido. */
w.IntersectionObserver=class{
  constructor(cb){this.cb=cb;this.els=[]}
  observe(el){this.els.push(el);
    /* entrega uma entrada logo, como um browser faz na primeira observação */
    this.cb([{target:el,isIntersecting:true,intersectionRatio:1}],this)}
  unobserve(){} disconnect(){} takeRecords(){return []}
};
w.ResizeObserver=w.ResizeObserver||class{observe(){}unobserve(){}disconnect(){}};
if(webgl){
  const V=function(x,y,z){this.x=x||0;this.y=y||0;this.z=z||0;
    this.set=function(){return this};this.copy=function(){return this};this.normalize=function(){return this};
    this.setRGB=function(){return this};this.setScalar=function(){return this}};
  const O=function(){return new Proxy(function(){},{get:(t,k)=>{
    if(['position','rotation','scale','material','uniforms','instanceMatrix','matrix','userData','children','value','color','fog'].includes(k))return O();
    if(k==='length')return 0; if(k===Symbol.iterator)return [][Symbol.iterator].bind([]);
    return O();},apply:()=>O(),construct:()=>O(),set:()=>true})};
  w.THREE=new Proxy({Vector2:V,Vector3:V,Color:V,Object3D:O,Clock:function(){this.getElapsedTime=()=>0}},
    {get:(t,k)=>k in t?t[k]:O()});
}
const sc=[...w.document.querySelectorAll('script:not([src])')].pop().textContent;
const errs=[];
const oc=w.console.error; w.console.error=(...a)=>errs.push(a.map(String).join(' '));
try{ w.eval(sc); console.log((webgl?'[COM WebGL] ':'[SEM WebGL] ')+'OK — módulo executou até ao fim'); }
catch(e){ console.log((webgl?'[COM WebGL] ':'[SEM WebGL] ')+'EXCEPÇÃO FATAL: '+e.message);
  const m=/<anonymous>:(\d+):/.exec(e.stack||''); if(m){const L=sc.split('\n'),n=+m[1];
    for(let i=Math.max(0,n-2);i<Math.min(L.length,n+1);i++)console.log((i+1===n?'  >> ':'     ')+L[i].trim().slice(0,90));}}
setTimeout(()=>{ if(errs.length){console.log('   avisos isolados por safe():'); errs.slice(0,6).forEach(e=>console.log('     · '+e.slice(0,120)));}
  process.exit(0);},1200);
