// Only navigation/product choices are stored here. Never include order forms or customer data.
type Entry<T>={owner:string;depth:number;view:T;scrollY:number};
const key='dfdsStoreNavigation';
export function createStoreHistory<T>(win:Window,initial:T,restore:(view:T)=>void){
 const owner='store-'+Date.now()+'-'+Math.random().toString(36).slice(2);
 let entry:Entry<T>={owner,depth:0,view:initial,scrollY:win.scrollY},pending=false,token=0;
 const oldRestoration=win.history.scrollRestoration;
 win.history.scrollRestoration='manual';
 const write=(method:'replaceState'|'pushState',value:Entry<T>,url?:string)=>win.history[method]({...win.history.state,[key]:value},'',url);
 write('replaceState',entry);
 const pop=(event:PopStateEvent)=>{
  const next=event.state?.[key] as Entry<T>|undefined;
  if(!next||next.owner!==owner)return;
  entry=next;pending=false;const generation=++token;restore(next.view);
  // React must reveal the destination before restoring its scroll position.
  win.requestAnimationFrame(()=>win.requestAnimationFrame(()=>{if(generation===token)win.scrollTo({top:next.scrollY,behavior:'instant' as ScrollBehavior})}));
 };
 win.addEventListener('popstate',pop);
 return {
  push(view:T,url?:string){
   ++token;pending=false;entry={...entry,scrollY:win.scrollY};write('replaceState',entry);
   entry={owner,depth:entry.depth+1,view,scrollY:0};write('pushState',entry,url);
  },
  back(){if(entry.depth===0)return false;if(!pending){pending=true;win.history.back()}return true},
  dispose(){++token;win.removeEventListener('popstate',pop);win.history.scrollRestoration=oldRestoration},
 };
}

export function lastVisibleStepBack(panel:Element|undefined){
 return [...(panel?.querySelectorAll<HTMLElement>('[data-step-back]')||[])].filter(el=>{
  if(el.hasAttribute('disabled'))return false;
  for(let p:HTMLElement|null=el;p;p=p.parentElement){
   if(p.hidden||p.style.display==='none'||p.getAttribute('aria-hidden')==='true')return false;
  }
  return true;
 }).at(-1);
}
