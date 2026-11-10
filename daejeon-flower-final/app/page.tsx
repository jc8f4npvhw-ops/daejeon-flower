import Client from './client';
import {catalog} from '../src/frontend/catalog-assets';
import {optimizedMedia} from '../src/frontend/optimized-media';

export default function Page(){
 const hero=catalog.find(photo=>photo.role==='hero');
 const initialPhoto=hero?optimizedMedia[hero.src]?.[0]?.src:undefined;
 return <Client initialPhoto={initialPhoto}/>;
}
