"""Render a simplified north-up shop map from the retained OSM geometry."""
import argparse, json, math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

p=argparse.ArgumentParser()
p.add_argument('--font',default='/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc')
p.add_argument('--bold',default='/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc')
a=p.parse_args()
root=Path(__file__).resolve().parents[1]
data=json.loads((root/'scripts/data/location-map-roads.json').read_text())
S=2; W,H=680,850
im=Image.new('RGB',(W*S,H*S),'#fffefa'); d=ImageDraw.Draw(im)
def pt(x,y):return (round(x*S),round(y*S))
def rect(x0,y0,x1,y1):return (*pt(x0,y0),*pt(x1,y1))
def font(n,bold=False):return ImageFont.truetype(a.bold if bold else a.font,n*S,index=1)
def text(x,y,s,n,c='#26323a',bold=False,anchor='la'):
 d.text(pt(x,y),s,fill=c,font=font(n,bold),anchor=anchor)
def line(points,c,w):d.line([pt(*p) for p in points],fill=c,width=round(w*S),joint='curve')
def poly(points,c):d.polygon([pt(*p) for p in points],fill=c)
def box(x0,y0,x1,y1,c,r=10,outline=None):
 d.rounded_rectangle(rect(x0,y0,x1,y1),r*S,fill=c,outline=outline,width=S)
def dot(x,y,r,c):d.ellipse(rect(x-r,y-r,x+r,y+r),fill=c)
def xy(x,y):return (30+(x-127.4509)/.0087*620,151+(36.3131-y)/.0091*576)
# All road geometry and marker feet use the same transform; only illustrations and labels are offset.
map_layer=Image.new('RGB',im.size,'#f4f2eb'); d=ImageDraw.Draw(map_layer)
priority={'대전로','동구청로','은어송로'}
roads=[]
for r in data['roads']:
 n=r['name']; major=n in priority and r['type'] in ('primary','secondary')
 if major or n in priority or n=='은어송로51번길' or r['type'] in ('primary','secondary') or ('번길' in n and len(r['points'])>=4):
  w=22 if major else 11 if n=='은어송로51번길' else 8 if r['type'] in ('primary','secondary') else 5
  roads.append((w,[xy(*p) for p in r['points']],n))
for w,points,n in sorted(roads):
 line(points,'#fffefa' if w<20 else '#e1ddd1',w+4)
 line(points,'#c2c3bf' if w<10 else '#878e8d' if w<20 else '#5b6468',w)
def dash(points):
 left=0
 for (x,y),(xx,yy) in zip(points,points[1:]):
  length=math.hypot(xx-x,yy-y)
  if not length:continue
  pos=0
  while pos<length:
   piece=min(length-pos,(12 if left<7 else 12)-left if left>=7 else 7-left)
   if left<7:line([(x+(xx-x)*i/length,y+(yy-y)*i/length) for i in (pos,pos+piece)],'#b7bebf',1.1)
   pos+=piece;left=(left+piece)%12
for w,points,n in roads:
 if w>=20:dash(points)
im.paste(map_layer.crop(rect(22,140,658,741)),pt(22,140));d=ImageDraw.Draw(im)
def road_label(x,y,label,angle):
 tile=Image.new('RGBA',(150*S,34*S))
 ImageDraw.Draw(tile).text((75*S,17*S),label,font=font(17,True),fill='white',anchor='mm',stroke_width=0)
 tile=tile.rotate(angle,expand=True,resample=Image.Resampling.BICUBIC)
 im.paste(tile,(round(x*S-tile.width/2),round(y*S-tile.height/2)),tile)
road_label(81,567,'대전로',-48)
road_label(354,310,'동구청로',76)
road_label(408,568,'은어송로',33)
# An anchored base gives the location; the side and roof give each landmark an easy-to-spot silhouette.
def building(x,y,w,h,depth,front,side,roof,kind='office'):
 l=x-w/2; r=x+w/2; t=y-h; dx=depth; dy=depth*.59
 poly([(l-8,y+1),(r+6,y+7),(r+dx+11,y-dy+5),(l+dx,y-dy-2)],'#d7d5ca')
 poly([(r,t),(r+dx,t-dy),(r+dx,y-dy),(r,y)],side)
 poly([(l,t),(r,t),(r,y),(l,y)],front)
 poly([(l,t),(l+dx,t-dy),(r+dx,t-dy),(r,t)],roof)
 if kind=='store':
  box(l+6,t+9,r-6,t+33,'#8a3c5a',6)
  text(x,t+20,'대전꽃백화점',12,'white',True,'mm')
  box(l+7,t+44,r-7,y-4,'#fff8f3',5)
  for i,col in enumerate(['#da7397','#fff1ee','#da7397','#fff1ee','#da7397','#fff1ee']):
   f=l+5+i*(w-10)/6;poly([(f,t+39),(f+(w-10)/6,t+39),(f+(w-10)/6-2,t+51),(f-2,t+51)],col)
  box(x-10,t+55,x+10,y-1,'#9a5970',4)
  for xx in [l+12,r-12]:
   box(xx-7,y-5,xx+7,y+3,'#b77985',3)
   for off,height,color in [(-5,15,'#df729d'),(0,24,'#e98bac'),(5,16,'#f5bbd1')]:
    bx,by=xx+off,y-height
    line([(xx,y-4),(bx,by)],'#537f60',1.5)
    for dx,dy in [(-2,0),(2,0),(0,-2),(0,2)]:dot(bx+dx,by+dy,2.5,color)
    dot(bx,by,1.4,'#f4d184')
 elif kind=='mall':
  box(l+4,t+4,r-4,t+18,'#bc4d3f',2)
  for i in range(3):box(l+6+i*(w-12)/3,y-12,l+12+i*(w-12)/3,y-5,'#788d97',1)
 else:
  for yy in range(round(t+8),round(y-7),10):
   for xx in range(round(l+5),round(r-4),9):box(xx,yy,xx+4,yy+5,'#7793a0',1)
def label(x,y,words,anchor,align='center'):
 f=font(17,True); tw=max(d.textlength(s,font=f)/S for s in words)+24; ht=12+len(words)*22
 l=x-tw/2 if align=='center' else x
 end=(max(l+6,min(l+tw-6,anchor[0])),max(y,min(y+ht,anchor[1])))
 line([anchor,end],'#8c948b',1.5)
 box(l,y,l+tw,y+ht,'#fffefa',9,'#d8d9cf')
 for i,s in enumerate(words):text(l+tw/2,y+16+i*22,s,17,'#33414a',True,'mm')
def point(i):return xy(*data['landmarks'][i]['point'])
x,y=point(1);building(x,y,52,30,15,'#e7e6dd','#aab7b7','#92afb0');label(304,153,['대전 동구청'],(x,y-37))
x,y=point(3);building(x-11,y,27,41,9,'#eee8dc','#b8b4a5','#c5a577');building(x+11,y+2,25,50,8,'#f2ece0','#b7af9e','#d9b88e');label(124,465,['가오주공','아파트'],(x-10,y-43))
x,y=point(0);building(x,y,58,33,16,'#eee6da','#c1b2a4','#deb190','mall');label(552,560,['홈플러스','대전가오점'],(x,y))
x,y=point(2);building(x-9,y,27,48,10,'#ede8e0','#b9b7b0','#a7b4c3');building(x+14,y+3,25,58,9,'#f0ede5','#b5bbb8','#b2c8cd');label(475,688,['풍림아이원 1단지'],(x,y+3))
# Highlight the exact shop anchor below the larger storefront pictogram.
x,y=xy(*data['store']);dot(x,y,8,'#fffefa');dot(x,y,5,'#9b4364')
line([(x,y),(x,y-13)],'#9b4364',3)
building(x,y-13,96,75,20,'#efbccb','#c9829a','#f9d9e2','store')
line([(x,y-103),(x,y-123)],'#8a3c5a',2)
box(x-125,y-178,x+125,y-121,'#8a3c5a',11)
text(x,y-158,'대전꽃백화점',26,'white',True,'mm')
text(x,y-135,'가오동 584 · 1층',15,'#fff0dc',True,'mm')
text(648,161,'N',15,'#303d44',True,'mm')
poly([(648,176),(641,194),(648,190),(655,194)],'#303d44')
text(25,21,'VISIT  /  DAEJEON FLOWER',14,'#8e3d36',True)
text(24,48,'대전꽃백화점 오시는 길',37,'#213831',True)
text(26,106,'대전광역시 동구 가오동 584 · 1층',20,'#415550')
box(22,756,658,804,'#e8eee8',12)
text(340,780,'약도를 누르면 네이버 매장정보가 열려요 ↗',19,'#264d42',True,'mm')
text(23,825,'위치 안내용 약도  ·  © OpenStreetMap contributors',12,'#535e5b')
im.save(root/'public/optimized-media/store-location-map-pink.webp',quality=90,method=6)
