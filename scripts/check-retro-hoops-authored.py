from pathlib import Path
from PIL import Image
import hashlib,json,sys
root=Path.cwd();folder=root/'public/games/retro-hoops'/(sys.argv[1]if len(sys.argv)>1 else 'authored-v28');m=json.loads((folder/'manifest.json').read_text());checks=[]
def check(name,value):
 assert value,name
 checks.append({'name':name,'passed':True})
pages=[Image.open(folder/name).convert('RGBA')for name in m['atlases']]
check('Atlas pages fit 4096-pixel texture dimensions',all(max(im.size)<=4096 for im in pages))
check('Every atlas hash matches editable generator output',all(hashlib.sha256((folder/name).read_bytes()).hexdigest()==digest for name,digest in m['atlasHashes'].items()))
for frame in m['frames']:
 x,y,w,h,page=m['regions'][frame['key']];im=pages[page].crop((x,y,x+w,y+h))
 assert hashlib.sha256(im.tobytes()).hexdigest()==frame['pixelHash'],frame['key']
 assert frame['anchors']['feet']==[72,116],frame['key']
check('All frame crops match pixel hashes and stable ground anchors',True)
for key,(x,y,w,h,page)in m['regions'].items():assert 0<=x and 0<=y and x+w<=pages[page].width and y+h<=pages[page].height,key
check('Every atlas region is inside its page',True)
check('Generator never loads source raster inputs','Image.open(' not in (root/m['sourceCode']).read_text())
check('Mirrored frames have explicit transformed contact metadata',all(f['facing']in['source','mirrored']and'hands'in f['anchors']for f in m['frames']))
if m['version']in['3.0.0','4.0.0','5.0.0','6.0.0','7.0.0','8.0.0','9.0.0','10.0.0','11.0.0','12.0.0','13.0.0','14.0.0','15.0.0','16.0.0','17.0.0','18.0.0','19.0.0','20.0.0','21.0.0','22.0.0','23.0.0','24.0.0','25.0.0','26.0.0','27.0.0','28.0.0']:
 check('Editable anatomy source hash matches the rig module',hashlib.sha256((root/m['anatomySource']).read_bytes()).hexdigest()==m['anatomySourceSha256'])
 for f in m['frames']:
  if f['clip']=='neutral-a' and f['facing']=='source':
   for knee,ankle in zip(f['anchors']['knees'],f['anchors']['ankles']):assert abs(knee[0]-ankle[0])<8,f['key']
 check('Ready stance knees track toes without crossed or bowed shins',True)
if m['version']in['7.0.0','8.0.0','9.0.0','10.0.0','11.0.0','12.0.0','13.0.0','14.0.0','15.0.0','16.0.0','17.0.0','18.0.0','19.0.0','20.0.0','21.0.0','22.0.0','23.0.0','24.0.0','25.0.0','26.0.0','27.0.0','28.0.0']:
 for f in m['frames']:
  if 'toes' not in f['anchors']:continue
  assert all(0<=p[0]<144 and 0<=p[1]<=116 for key in ['toes','heels']for p in f['anchors'][key]),f['key']
  x,y,w,h,page=m['regions'][f['key']];box=pages[page].crop((x,y,x+w,y+h)).getbbox()
  assert box and box[3]<=117,f['key']
 check('Foot anchors and opaque pixels stay above the ground plane',True)
if m['version']in['9.0.0','10.0.0','11.0.0','12.0.0','13.0.0','14.0.0','15.0.0','16.0.0','17.0.0','18.0.0','19.0.0','20.0.0','21.0.0','22.0.0','23.0.0','24.0.0','25.0.0','26.0.0','27.0.0','28.0.0']:
 check('Six identities have all directional and facing head layers',len(m['headFrames'])==36 and all(len(styles)==3 for styles in m['identities'].values()))
 for f in m['headFrames']:
  x,y,w,h,page=m['regions'][f['key']];im=pages[page].crop((x,y,x+w,y+h))
  assert (w,h)==(32,32)and f['anchor']==[16,16],f['key']
  assert hashlib.sha256(im.tobytes()).hexdigest()==f['pixelHash'],f['key']
 check('Head tiles retain centre anchors and verified pixel hashes',True)
 for team in m['identities']:
  for view in ['side','front','back']:
   assert len({f['pixelHash']for f in m['headFrames']if f['team']==team and f['view']==view and f['facing']=='source'})==3,(team,view)
 check('Each team has three visually distinct head tiles in every view',True)
 check('Runtime body atlas contains no baked identity head',m['headLayer']['bodyContainsHead']is False)
unique=len({f['pixelHash']for f in m['frames']});result={'checks':checks,'frameEntries':len(m['frames']),'distinctPixelFrames':unique,'classification':m['classification'],'visualApproval':False,'nativeParityVerified':False,'limits':'Structural checks establish neither source likeness nor animation quality.'}
out=root/'test-results'/(sys.argv[2]if len(sys.argv)>2 else 'retro-hoops-character-v28');out.mkdir(parents=True,exist_ok=True);(out/'art-checks.json').write_text(json.dumps(result,indent=2));print(json.dumps({'checks':len(checks),'frameEntries':len(m['frames']),'distinctPixelFrames':unique}))
