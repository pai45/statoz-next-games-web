from pathlib import Path
from PIL import Image,ImageOps
import json,hashlib,math,sys
v3='--v3'in sys.argv;root=Path('public/games/retro-hoops/locomotion-v3'if v3 else 'public/games/retro-hoops/locomotion-v2');m=json.loads((root/'manifest.json').read_text());assert len(m['frames'])==(552 if v3 else 216)
checks=[]
for row in m['frames']:
 file=root/row['file'];assert hashlib.sha256(file.read_bytes()).hexdigest()==row['sha256'];im=Image.open(file).convert('RGBA');assert im.size==(144,128);bounds=im.getbbox();assert bounds and bounds[0]>0 and bounds[1]>0 and bounds[2]<144 and bounds[3]<128,(file,bounds)
 if row['facing']=='mirrored':
  source=Image.open(root/row['file'].replace('-mirrored','-source')).convert('RGBA');expected=ImageOps.mirror(source).transform((144,128),Image.Transform.AFFINE,(1,0,-1,0,1,0),resample=Image.Resampling.NEAREST);assert im.tobytes()==expected.tobytes()
 if row['clip']in ['dribble-arm','dribble-switch']:
  wrist,ball=row['anchors']['wrist'],row['anchors']['ball'];phase=row['frame'];height=116-ball[1]
  if height>=29:assert math.dist(wrist,ball)<=6,(row['file'],wrist,ball)
for team,sha in m['sourceHashes'].items():assert hashlib.sha256((root.parent/'assets'/f'{team}-neutral-a-source.png').read_bytes()).hexdigest()==sha
for clip in ['run','dribble-body','defend','brake']:
 row=next(v for v in m['frames']if v['clip']==clip and v['frame']==0 and v['facing']=='source');im=Image.open(root/row['file']);assert im.getbbox()[3]<=118
checks=[str(len(m['frames']))+' dimensions, bounds and hash checks','Explicit mirror coordinates around feet72,116','High-ball dribble wrist/ball contact within6px in both directions','Retained reference torso source hashes unchanged','No limb/foot clipping; native-sized outputs']
result={'passed':True,'checks':checks,'frames':len(m['frames']),'classification':m['classification'],'visualApproval':False,'note':'Geometry checks do not approve anatomy or full-speed motion'};Path('test-results/retro-hoops-three-points-v1/art-checks.json'if v3 else 'test-results/retro-hoops-movement-v2/art-checks.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8');print(json.dumps(result))
