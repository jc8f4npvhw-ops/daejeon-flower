"""Render a north-up local overview using retained OpenStreetMap road geometry.
Requires Pillow. python3 scripts/draw-location-map.py --font /path/to/Korean-font.otf
"""
import json,argparse
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
p=argparse.ArgumentParser();p.add_argument('--font',required=True);a=p.parse_args();root=Path(__file__).resolve().parents[1]
data=json.loads((root/'scripts/data/location-map-roads.json').read_text());S=2;W,H=680,900
im=Image.new('RGB',(W*S,H*S),'#faf8f0');d=ImageDraw.Draw(im)
def font(n):return ImageFont.truetype(a.font,int(n*S))
def txt(x,y,t,size=18,color='#56664f',anchor=None):d.text((x*S,y*S),t,font=font(size),fill=color,anchor=anchor)
def box(b,color,r=10,outline=None,width=1):d.rounded_rectangle(tuple(v*S for v in b),radius=r*S,fill=color,outline=outline,width=width*S)
def line(pts,color,width):d.line([(x*S,y*S) for x,y in pts],fill=color,width=width*S,joint='curve')
west,east,south,north=127.4506,127.4598,36.3033,36.3132
def xy(lon,lat):return (24+(lon-west)/(east-west)*632,102+(north-lat)/(north-south)*658)
mapim=Image.new('RGB',im.size,'#eeefe6');md=ImageDraw.Draw(mapim)
for road in data['roads']:
 pts=[tuple(v*S for v in xy(*pt)) for pt in road['points']]
 major=road['type'] in ['primary','secondary'];w=16 if major else 7
 md.line(pts,fill='#d6dbce',width=(w+3)*S,joint='curve');md.line(pts,fill='#fffef8',width=w*S,joint='curve')
for road in data['roads']:
 if road['name']=='은어송로51번길':md.line([tuple(v*S for v in xy(*pt)) for pt in road['points']],fill='#c9d7b8',width=6*S,joint='curve')
im.paste(mapim.crop((24*S,102*S,656*S,760*S)),(24*S,102*S));d=ImageDraw.Draw(im)
txt(28,22,'익숙한 곳을 따라, 꽃집으로.',26,'#36533f');txt(29,64,'대전꽃백화점 · 가오동 584 1층',16,'#7a8b6e')
# Label placement is deliberate; leader lines retain each verified geographic anchor.
def landmark(i,b):
 item=data['landmarks'][i];x,y=xy(*item['point']);left,top,right,bottom=b
 end=(max(left,min(x,right)),max(top,min(y,bottom)))
 line([(x,y),end],'#9cae8d',2)
 d.ellipse(((x-5)*S,(y-5)*S,(x+5)*S,(y+5)*S),fill='#829875')
 box(b,'#fffdf7',12,'#d9e0d0')
 txt(left+13,top+9,item['name'],19,'#52684a')
 off=38
 if item.get('subtitle'):txt(left+13,top+off,item['subtitle'],13,'#809071');off+=21
 txt(left+13,top+off,item['address'],14,'#809071')
landmark(1,(370,146,620,221))
landmark(3,(38,552,265,627))
landmark(0,(383,568,641,643))
landmark(2,(366,685,633,779))
for x,y,label in [(80,236,'대전로'),(358,303,'동구청로'),(215,660,'은어송로')]:
 tw=d.textlength(label,font=font(17))/S;box((x-5,y-1,x+tw+5,y+25),'#faf8f0',5);txt(x,y,label,17)
txt(405,374,'은어송로51번길',14,'#819176')
# Store pin tip remains exactly on the store coordinates.
x,y=xy(*data['store']);tip=y;y-=27
d.ellipse(((x-16)*S,(y-16)*S,(x+16)*S,(y+16)*S),fill='#365b45')
d.polygon([(int(v*S),int(w*S)) for v,w in [(x-11,y+8),(x+11,y+8),(x,y+27)]],fill='#365b45')
d.ellipse(((x-5)*S,(y-5)*S,(x+5)*S,(y+5)*S),fill='#faf8f0')
line([(x,y-16),(x,y-43)],'#365b45',2);box((x-118,y-112,x+116,y-43),'#365b45',16)
txt(x-101,y-102,'대전꽃백화점',24,'#fffdf5');txt(x-100,y-68,'가오동 584 · 1층',15,'#e4ebd9')
px,py=xy(127.45496706,36.3072689);box((px-10,py-10,px+10,py+10),'#8da178',6)
txt(px,py-1,'P',15,'white',anchor='mm');txt(px+16,py-6,'공영주차장',13)
txt(623,106,'N',14);line([(630,139),(630,125)],'#76886c',2)
d.polygon([(624*S,130*S),(636*S,130*S),(630*S,121*S)],fill='#76886c')
box((24,800,656,857),'#e5ecdc',15);txt(43,815,'약도를 누르면 네이버 매장정보로 이동해요 ↗',20,'#45603b')
txt(27,873,'위치 안내용 약도 · 세부 길찾기는 네이버 지도에서 확인',12,'#87917c')
txt(480,875,'© OpenStreetMap contributors',10,'#87917c')
im.save(root/'public/media/store-location-map.png',optimize=True)
print('Rendered',root/'public/media/store-location-map.png')
