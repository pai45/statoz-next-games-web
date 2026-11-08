"""Editable kit/palette reconstruction from observed GameLog colour relationships.
Retains pre-existing reference silhouettes; no pixels from the new recording are extracted.
"""
from pathlib import Path
from PIL import Image,ImageDraw
import json,hashlib
ROOT=Path.cwd();SOURCE=ROOT/'public/games/retro-hoops/assets';OUT=ROOT/'public/games/retro-hoops/player-look-v1';OUT.mkdir(exist_ok=True)
metadata={'version':'1.0.0','sourceVideo':'https://www.youtube.com/watch?v=_k8IIS9n3dk','classification':'existing reference silhouettes with authored kit and shading adaptation','newVideoPixelsExtracted':False,'canvas':[144,128],'feet':[72,116],'kits':{'navy':'azure vest, violet shorts, dark shoes','amber':'azure shirt, pale sleeves, red shorts, dark shoes'},'frames':[]}
blue=[(20,43,91),(29,79,159),(43,115,211),(76,156,240),(132,190,249)]
purple=[(58,37,119),(82,48,164),(112,66,205),(142,95,232)]
red=[(109,28,27),(164,43,31),(214,62,35),(245,106,57)]
for file in SOURCE.glob('*.png'):
 im=Image.open(file).convert('RGBA');kit=file.name.split('-')[0]
 if kit not in ['navy','amber']:
  im.save(OUT/file.name);continue
 pixels=im.load();greyRows={}
 for yy in range(im.height):
  xs=[xx for xx in range(im.width)if pixels[xx,yy][3]and max(pixels[xx,yy][:3])-min(pixels[xx,yy][:3])<28 and 40<max(pixels[xx,yy][:3])<165]
  if xs:greyRows[yy]=(min(xs),max(xs))
 for y in range(im.height):
  for x in range(im.width):
   r,g,b,a=pixels[x,y]
   if not a:continue
   # Existing shirt grey clusters, excluding near-black outlines and shoe highlights.
   if max(r,g,b)-min(r,g,b)<28 and 40<max(r,g,b)<165:
    level=min(4,max(0,int((max(r,g,b)-35)/26)));color=blue[level]
    lo,hi=greyRows.get(y,(x,x));edge=x<lo+(hi-lo)*.22 or x>hi-(hi-lo)*.22
    if y>96:color=(r,g,b)
    elif kit=='amber' and y<80 and edge and ((r+g+b)/3)>78:color=[(140,164,174),(183,205,209),(224,235,225),(245,246,229)][min(3,max(0,level-1))]
    pixels[x,y]=(*color,a)
   elif kit=='navy' and b>r*1.3 and b>g*1.2 and b>95:
    color=purple[min(3,max(0,int((b-80)/45)))];pixels[x,y]=(*color,a)
   elif kit=='amber' and r>g*1.2 and .58<g/r<.8 and g>b*2 and r>80 and b<70:
    color=red[min(3,max(0,int((r-90)/45)))];pixels[x,y]=(*color,a)
 # Author a fuller jersey edge with new pixel clusters; no image stretching.
 original=Image.open(file).convert('RGBA');base=im.copy();edge=ImageDraw.Draw(im)
 for yy,(lo,hi)in greyRows.items():
  if 38<=yy<=87 and 6<=hi-lo<=24:
   for xx in [lo-2,lo-1,hi+1,hi+2]:
    if 0<xx<143 and original.getpixel((xx,yy))[3]==0:
     edge.point((xx,yy),fill=(*((20,43,91)if xx in [lo-2,hi+2]else (29,79,159)),255))
 im.save(OUT/file.name);metadata['frames'].append({'file':file.name,'sha256':hashlib.sha256((OUT/file.name).read_bytes()).hexdigest(),'sourceSha256':hashlib.sha256(file.read_bytes()).hexdigest()})
(OUT/'manifest.json').write_text(json.dumps(metadata,indent=2)+'\n',encoding='utf-8');print(json.dumps({'frames':len(metadata['frames']),'output':str(OUT)}))
