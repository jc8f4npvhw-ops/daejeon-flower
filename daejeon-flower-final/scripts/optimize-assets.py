"""Generate cacheable storefront derivatives and externalize the care guide's embedded assets.
Requires Pillow. Generated files are committed; Cloudflare builds do not need Python.
Original product photos are preserved.
"""
from pathlib import Path
from PIL import Image,ImageOps
import base64,hashlib,io,json,re
ROOT=Path(__file__).resolve().parent.parent
PUBLIC=ROOT/'public'
def write_image(raw,out,width,quality):
 im=ImageOps.exif_transpose(Image.open(io.BytesIO(raw)))
 if im.mode not in ['RGB','RGBA']:im=im.convert('RGBA' if 'transparency' in im.info else 'RGB')
 im.thumbnail((width,100000),Image.Resampling.LANCZOS)
 out.parent.mkdir(parents=True,exist_ok=True)
 tmp=out.with_suffix('.tmp');im.save(tmp,format='WEBP',quality=quality,method=6);tmp.replace(out);assert out.stat().st_size>12
 return im.size
manifest={};summary={'seed_original_bytes':0,'seed_thumbnail_bytes':0,'seed_large_bytes':0,'images':0}
for f in sorted((PUBLIC/'media').iterdir()):
 if f.suffix.lower() not in ['.jpg','.jpeg','.png','.webp']:continue
 raw=f.read_bytes();key=hashlib.sha256(raw+b'flower-webp-v1').hexdigest()[:20];items=[]
 for w,q in [(320,79),(1280,85)]:
  target=PUBLIC/'optimized-media'/f'{key}-{w}.webp';size=write_image(raw,target,w,q)
  items.append({'src':'/optimized-media/'+target.name,'width':size[0],'height':size[1]})
 summary['images']+=1;summary['seed_original_bytes']+=len(raw)
 summary['seed_thumbnail_bytes']+=(PUBLIC/items[0]['src'].lstrip('/')).stat().st_size
 summary['seed_large_bytes']+=(PUBLIC/items[1]['src'].lstrip('/')).stat().st_size
 manifest['/api/media/public/seed/'+f.name]=items
 manifest['/media/'+f.name]=items
(ROOT/'src/frontend/optimized-media.ts').write_text('export const optimizedMedia:Record<string,{src:string;width:number;height:number}[]>='+json.dumps(manifest,separators=(',',':'))+';\n')
guide=PUBLIC/'plant-care.html';s=guide.read_text();summary['care_html_before']=len(s.encode())
if 'data:font/' not in s and (PUBLIC/'performance-assets.json').exists():
 summary['care_html_before']=json.loads((PUBLIC/'performance-assets.json').read_text()).get('care_html_before',len(s.encode()))
asset_map={'/care-assets/'+f.name:f.stat().st_size for f in (PUBLIC/'care-assets').glob('*') if f.is_file()}
def replace(m):
 mime,encoded=m.groups();raw=base64.b64decode(encoded);key=hashlib.sha256(raw).hexdigest()[:24]
 if mime.startswith('image/'):
  target=PUBLIC/'care-assets'/f'{key}-960.webp'
  write_image(raw,target,960,84)
 else:
  ext={'font/woff':'woff','font/woff2':'woff2'}[mime]
  target=PUBLIC/'care-assets'/f'{key}.{ext}';target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(raw)
 url='/care-assets/'+target.name;asset_map[url]=target.stat().st_size
 return url
s=re.sub(r'data:([^;,]+);base64,([A-Za-z0-9+/=]+)',replace,s)
# The list uses small thumbnails; the chosen plant's larger photo is loaded only on entry.
for url in list(asset_map):
 if url.endswith('-960.webp'):
  large=PUBLIC/url.lstrip('/');small=large.with_name(large.name.replace('-960.webp','-320.webp'))
  write_image(large.read_bytes(),small,320,80)
  # Photo strings in JavaScript are reused by the detail hero. Change only literal list <img> tags.
  s=s.replace('<img src="'+url+'"','<img src="/care-assets/'+small.name+'" loading="lazy" decoding="async"')
# Font-display keeps content readable while the selected guide's fonts arrive.
s=re.sub(r'(@font-face\{)(?!font-display:)',r'\1font-display:swap;',s)
s=s.replace("if(photos[id])img.src=photos[id];img.alt=g.name;", "img.loading='lazy';img.decoding='async';img.width=320;img.height=320;if(photos[id])img.src=photos[id].replace(/-960\\.webp$/,'-320.webp');img.alt=g.name;")
s=s.replace("target.innerHTML=buildAglaHTML(g,photos[id]);", "target.innerHTML=buildAglaHTML(g,photos[id]);const hero=target.querySelector('.pg-hero img');if(hero){hero.decoding='async';hero.fetchPriority='high';}")
guide.write_text(s)
summary['care_html_after']=len(s.encode());summary['care_external_assets']=asset_map
(PUBLIC/'performance-assets.json').write_text(json.dumps(summary,indent=2))
print(json.dumps({k:v for k,v in summary.items() if k!='care_external_assets'},indent=2))
