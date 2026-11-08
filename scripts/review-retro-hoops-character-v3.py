import runpy
from pathlib import Path
from PIL import Image,ImageDraw
import json
scope=runpy.run_path('scripts/build-retro-hoops-authored.py')
globals().update(scope)
# Compare original v2 tiles with complete v3 figures without altering either pack.
oldPath=ROOT/'public/games/retro-hoops/authored-v2/manifest.json'
if oldPath.exists():
 old=json.loads(oldPath.read_text());oldPages={}
 for name in old['atlases']:oldPages[name]=Image.open(oldPath.parent/name).convert('RGBA')
 comparisons=Image.new('RGB',(8*144,2*154),'#343a32');cd=ImageDraw.Draw(comparisons)
 for col,kind in enumerate(selected):
  index=3 if kind in ['run','dribble-body','defend']else 8 if kind=='shot'else 5 if kind=='throw'else 7 if kind=='finish'else 6 if kind=='jump-block'else 0
  key='navy-'+kind+('-'+str(index).zfill(2)if kind in CLIPS else '')+'-source'
  x,y,w,h,page=old['regions'][key];tile=oldPages[old['atlases'][page]].crop((x,y,x+w,y+h));comparisons.paste(tile,(col*144,20),tile)
  im,a=render('navy',kind,index,CLIPS.get(kind,1))
  # Compare the same body-layer abstraction; complete poses appear in specimens.png.
  comparisons.paste(im,(col*144,174),im);cd.text((col*144+3,4),kind+' / before',fill='#eee4c8');cd.text((col*144+3,158),kind+' / after',fill='#eee4c8')
 comparisons.save(review/'before-after.png')
