"""Original pixel athlete/equipment construction. No input raster or traced sprite.
Run from Future Games Web. Source is this editable geometry and palette file.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageOps
import math, json, hashlib
from retro_hoops_character import render_character,RIG,IDENTITIES,head,PixelDraw

ROOT=Path.cwd(); OUT=ROOT/'public/games/retro-hoops/authored-v28'; OUT.mkdir(parents=True,exist_ok=True)
W,H=144,128
CLIPS={'run':12,'dribble-body':12,'defend':8,'brake':4,'dribble-arm':18,'backpedal':8,'pivot':4,'dribble-switch':72,
       'shot':30,'throw':12,'finish':24,'jump-block':24,'reach':15,'recover':12,'collect':6,'fake':12,'catch':12}
POSES=['d-push','d-low','d-down','s-ready','s-rise','s-release','s-follow','p-pass-gather-left','p-pass-extend-left','a-reach','a-overhead','carry-low','carry-front','dunk-gather','dunk-contact','land-recover','neutral-a','neutral-b']
PALETTES={'navy': {'skin': ['#0a0504', '#62381c', '#ad4d09', '#df750e', '#fea53d'], 'short': ['#120e40', '#463aa8', '#7c6ee0', '#b2a6ff'], 'shirt': ['#0a0f24', '#233b78', '#326cbd', '#629ef7'], 'trim': '#0a1a50'}, 'amber': {'skin': ['#0a0504', '#5c180c', '#b54510', '#e47435', '#feaa61'], 'short': ['#08080c', '#25272f', '#454856', '#737888'], 'shirt': ['#160303', '#7b0d02', '#e2300a', '#ff7550'], 'sleeve': ['#3c4058', '#a8adc4', '#f2f3f8'], 'band': ['#5a3404', '#e8b020', '#ffe27a'], 'trim': '#3a0606'}}
frames=[];images={}
def render(team,kind,index=0,count=1,view='side',identity=0,includeHead=True):
 return render_character(team,kind,index,count,view,PALETTES,identity,includeHead)

def save(key,im,anchors,team,clip,index,view,facing):
 images[key]=im;frames.append({'key':key,'team':team,'clip':clip,'frame':index,'view':view,'facing':facing,'anchors':anchors,'pixelHash':hashlib.sha256(im.tobytes()).hexdigest()})
for team in PALETTES:
 for kind,count in list(CLIPS.items())+[(p,1)for p in POSES]:
  views=['side','front','back']if kind in ['run','dribble-body','defend','backpedal','neutral-a','neutral-b','carry-front','dribble-arm','dribble-switch']else['side']
  for i in range(count):
   for view in views:
    im,anchors=render(team,kind,i,count,view,includeHead=False);pose=kind+('-'+str(i).zfill(2)if kind in CLIPS else '')+(''if view=='side'else '-'+view)
    for facing in ['source','mirrored']:
     mirrored=facing=='mirrored';frame=ImageOps.mirror(im).transform((W,H),Image.Transform.AFFINE,(1,0,-1,0,1,0))if mirrored else im
     a=json.loads(json.dumps(anchors))
     if mirrored:
      for k,v in a.items():
       if isinstance(v[0],list):a[k]=[[144-q[0],q[1]]for q in v]
       else:a[k]=[144-v[0],v[1]]
     save(f'{team}-{pose}-{facing}',frame,a,team,kind,i,view,facing)
# Small independent head layers prevent tripling the complete movement atlas.
headFrames=[]
for team,styles in IDENTITIES.items():
 for identity,style in enumerate(styles):
  for view in ['side','front','back']:
   low=Image.new('RGBA',(32,32));head(PixelDraw(low),(16,16),PALETTES[team]['skin'],view,team,identity);im=low.copy()
   for facing in ['source','mirrored']:
    frame=ImageOps.mirror(im).transform((32,32),Image.Transform.AFFINE,(1,0,-1,0,1,0))if facing=='mirrored'else im
    key=f'{team}-head-{identity}-{view}-{facing}';images[key]=frame
    headFrames.append({'key':key,'team':team,'identity':identity,'style':style,'view':view,'facing':facing,'anchor':[16,16],'pixelHash':hashlib.sha256(frame.tobytes()).hexdigest()})
# Original ball, asymmetric perspective baskets. No historical rasters loaded.
ball=Image.new('RGBA',(13,13));d=ImageDraw.Draw(ball)
# Four-tone shaded ball: dark lower-right, warm mid, lit upper-left and specular pixel, with seams.
d.ellipse((0,0,12,12),fill='#a8481a',outline='#3a1a0e');d.ellipse((1,1,10,10),fill='#de7428');d.ellipse((2,1,7,6),fill='#f6a04a')
d.arc((1,0,11,12),80,280,fill='#4a2410');d.line([(1,6),(11,6)],fill='#4a2410');d.arc((3,-3,9,15),260,100,fill='#4a2410');d.point((4,3),fill='#ffe0a0');images['ball']=ball
for side,size in [('left',(47,75)),('right',(92,75))]:
 im=Image.new('RGBA',size);d=ImageDraw.Draw(im);x=23 if side=='left'else 5
 # V25 reference-venue backboard: perforated grey-white board in a dark steel frame, white net, orange rim.
 d.polygon([(x-14,7),(x+12,3),(x+12,32),(x-14,36)],fill='#d6d8d2',outline='#2a2c30');d.line([(x-12,8),(x+11,4),(x+11,31),(x-12,35),(x-12,8)],fill='#55585c',width=2)
 for gy in range(10,31,3):
  for gx in range(-9,10,3):d.point((x+gx,gy+round((gx+14)*-.15)),fill='#9c9e9a')
 d.rectangle((x-3,22,x+7,32),outline='#1a1a1c',width=2)
 for k in range(5):d.line([(x-1+k*5,36),(x+1+k*4,49)],fill='#f0f0ea');
 d.line([(x,43),(x+10,47),(x+18,42)],fill='#c8c8c0');d.line([(x+1,47),(x+10,50),(x+17,46)],fill='#f0f0ea')
 d.ellipse((x-3,32,x+19,38),outline='#e0561e',width=3);d.arc((x-3,32,x+19,38),200,340,fill='#ff8a4a');images[side]=im
cols=16;pageSize=512;regions={};atlases=[];unique={};imageIds={}
for key,im in images.items():
 digest=(im.size,hashlib.sha256(im.tobytes()).hexdigest());imageIds[key]=digest
 if digest not in unique:unique[digest]=im
for start in range(0,len(unique),pageSize):
 rows=math.ceil(min(pageSize,len(unique)-start)/cols);atlases.append(Image.new('RGBA',(cols*W,rows*H)))
locations={}
for i,(digest,im)in enumerate(unique.items()):
 page=i//pageSize;j=i%pageSize;x=j%cols*W;y=j//cols*H;atlases[page].alpha_composite(im,(x,y));locations[digest]=[x,y,*im.size,page]
for key,digest in imageIds.items():regions[key]=locations[digest]
names=[]
for i,atlas in enumerate(atlases):
 name=f'family-{i}.png';names.append(name);atlas.save(OUT/name,optimize=True)
manifest={'version':'28.0.0','classification':'original authored pixel geometry; no reference rasters','approval':'draft-pending-visual-review','sourceCode':'scripts/build-retro-hoops-authored.py','sourceCodeSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'nativeTimingRecovered':False,'rig':RIG,'anatomySource':'scripts/retro_hoops_character.py','anatomySourceSha256':hashlib.sha256((ROOT/'scripts/retro_hoops_character.py').read_bytes()).hexdigest(),'canvas':[W,H],'feet':[72,116],'atlases':names,'regions':regions,'clips':CLIPS,'palettes':PALETTES,'frames':frames,'headFrames':headFrames,'identities':IDENTITIES,'headLayer':{'canvas':[32,32],'nativeArtwork':[32,32],'anchor':[16,16],'bodyContainsHead':False},'atlasHashes':{name:hashlib.sha256((OUT/name).read_bytes()).hexdigest()for name in names}}
(OUT/'manifest.json').write_text(json.dumps(manifest,separators=(',',':'))+'\n')
review=ROOT/'test-results/retro-hoops-character-v28';review.mkdir(parents=True,exist_ok=True)
sheet=Image.new('RGB',(12*W,10*H),'#393c34')
for row,kind in enumerate(['run','dribble-body','defend','shot','throw','finish','jump-block','fake','recover','catch']):
 count=CLIPS[kind]
 for col in range(12):
  frame=min(count-1,round(col*(count-1)/11));im,a=render('navy',kind,frame,count)
  if kind in ['dribble-body','shot','throw','finish','fake','catch']:
   from retro_hoops_character import arm,PixelDraw,export
   low=im.copy()
   arm(PixelDraw(low),a['shoulders'][0],a['hands'][0],PALETTES['navy']['skin'],bend=1 if kind in ['shot','finish']else -1);im=export(low)
  sheet.paste(im,(col*W,row*H),im)
sheet.save(review/'player-family.png')
print(json.dumps({'frames':len(frames),'atlasPages':[im.size for im in atlases],'referenceRasterInputs':0,'output':str(OUT)}))

# Small comparison specimens, silhouettes and directional views at native and enlarged sizes.
from retro_hoops_character import arm,PixelDraw,export
selected=['neutral-a','run','dribble-body','defend','shot','throw','finish','jump-block']
specimens=Image.new('RGB',(8*144,3*154),'#343a32');sd=ImageDraw.Draw(specimens)
for row,view in enumerate(['side','front','back']):
 for col,kind in enumerate(selected):
  count=CLIPS.get(kind,1);index=3 if kind in ['run','dribble-body','defend']else 8 if kind=='shot'else 5 if kind=='throw'else 7 if kind=='finish'else 6 if kind=='jump-block'else 0
  im,a=render('navy',kind,index,count,view)
  if kind in ['dribble-body','shot','throw','finish']:
   low=im.copy()
   arm(PixelDraw(low),a['shoulders'][0],a['hands'][0],PALETTES['navy']['skin'],bend=1 if kind in ['shot','finish']else -1);im=export(low)
  specimens.paste(im,(col*144,row*154+20),im);sd.text((col*144+3,row*154+4),kind+' / '+view,fill='#eee4c8')
specimens.save(review/'specimens.png')
silhouette=Image.new('RGB',(6*144,154),'#ded9bb')
for col,kind in enumerate(['neutral-a','run','defend','shot','throw','jump-block']):
 im,a=render('navy',kind,0,CLIPS.get(kind,1));mask=im.getchannel('A');silhouette.paste('#25282b',(col*144,20,col*144+144,148),mask)
silhouette.save(review/'silhouettes.png')

# Complete athlete family, using the same authored identity definitions as production.
family=Image.new('RGB',(6*144,3*154),'#30392d');fd=ImageDraw.Draw(family)
for row,view in enumerate(['side','front','back']):
 for actor in range(6):
  team='navy'if actor<3 else'amber';identity=actor%3;im,a=render(team,'neutral-a',view=view,identity=identity)
  family.paste(im,(actor*144,row*154+20),im);fd.text((actor*144+3,row*154+4),('BLUE'if actor<3 else'RED')+' '+str(identity+1)+' / '+view,fill='#e9dfbc')
family.save(review/'six-athletes.png')
