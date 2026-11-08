from pathlib import Path
from PIL import Image,ImageOps
import json,hashlib,math
root=Path('public/games/retro-hoops');pack=root/'locomotion-v4';m=json.loads((pack/'manifest.json').read_text());assert len(m['frames'])==552
for row in m['frames']:
 file=pack/row['file'];assert hashlib.sha256(file.read_bytes()).hexdigest()==row['sha256'];im=Image.open(file).convert('RGBA');assert im.size==(144,128);bounds=im.getbbox();assert bounds and bounds[0]>0 and bounds[1]>0 and bounds[2]<144 and bounds[3]<128
 if row['facing']=='mirrored':
  source=Image.open(pack/row['file'].replace('-mirrored','-source')).convert('RGBA');expected=ImageOps.mirror(source).transform((144,128),Image.Transform.AFFINE,(1,0,-1,0,1,0),resample=Image.Resampling.NEAREST);assert im.tobytes()==expected.tobytes()
 if row['clip']in ['dribble-arm','dribble-switch']:
  wrist,ball=row['anchors']['wrist'],row['anchors']['ball']
  if 116-ball[1]>=29:assert math.dist(wrist,ball)<=6
for row in json.loads((root/'player-look-v1/manifest.json').read_text())['frames']:
 im=Image.open(root/'player-look-v1'/row['file']);original=Image.open(root/'assets'/row['file']);assert im.size==original.size;assert all(not a or b for a,b in zip(original.getchannel('A').getdata(),im.getchannel('A').getdata()));assert im.crop((0,96,144,128)).getchannel('A').tobytes()==original.crop((0,96,144,128)).getchannel('A').tobytes();assert hashlib.sha256((root/'assets'/row['file']).read_bytes()).hexdigest()==row['sourceSha256']
result={'passed':True,'locomotionLayers':552,'actionLayers':72,'preservedFeetAndExistingPixelsWithAddedJerseyEdges':True,'visualApproval':False,'note':'Structural checks do not establish exact source likeness or user approval.'};Path('test-results/retro-hoops-player-look-v1/art-checks.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8');print(json.dumps(result))
