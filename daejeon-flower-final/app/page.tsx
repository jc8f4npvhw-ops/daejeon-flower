import Client from './client';
import {homeHeroImages} from '../src/frontend/home-hero-assets';
import {optimizedMedia} from '../src/frontend/optimized-media';

export default function Page(){
 const hero=homeHeroImages[0];
 const variants=optimizedMedia[hero];
 const initialPhoto=hero;
 const initialSrcSet=variants?.map(v=>v.src+' '+v.width+'w').join(', ');
 return <Client initialPhoto={initialPhoto} initialSrcSet={initialSrcSet}/>;
}
