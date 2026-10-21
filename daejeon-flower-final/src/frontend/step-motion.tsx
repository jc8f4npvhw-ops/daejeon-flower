import React,{useLayoutEffect,useRef} from 'react';
export const reduceMotion=()=>typeof window!=='undefined'&&!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
function enter(node:HTMLElement){node.dataset.stepMotion='shown';}
export function observeStep(node:HTMLElement){
 if(reduceMotion()||typeof IntersectionObserver==='undefined'){enter(node);return()=>{}}
 node.dataset.stepMotion='pending';
 const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){enter(node);observer.disconnect()}},{threshold:0,rootMargin:'0px 0px -24px 0px'});
 observer.observe(node);return()=>{observer.disconnect();enter(node)};
}
export function StepReveal({as='div',children,className='',motionKey,...props}:any){const ref=useRef<HTMLElement>(null);useLayoutEffect(()=>observeStep(ref.current!),[motionKey]);return React.createElement(as,{...props,ref,className:`flow-step ${className}`,'data-step-motion':'shown'},children)}
export function goToStep(id:string,root:ParentNode=document,block:ScrollLogicalPosition='start'){return window.setTimeout(()=>{const node=[...root.querySelectorAll<HTMLElement>('[id]')].find(el=>{if(el.id!==id)return false;for(let p:HTMLElement|null=el;p;p=p.parentElement)if(p.hidden||p.style.display==='none')return false;return true});if(!node)return;node.scrollIntoView({behavior:reduceMotion()?'auto':'smooth',block});if(node.classList.contains('flow-step')){if(reduceMotion()){enter(node);return}node.classList.remove('flow-step-replay');void node.offsetWidth;node.classList.add('flow-step-replay')}},100)}
