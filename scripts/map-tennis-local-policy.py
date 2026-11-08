from pathlib import Path
import struct,json
root=Path.cwd();research=root.parent.parent/'StatOz Designer/output/research';out=root/'.cache/tennis-local-policy';out.mkdir(parents=True,exist_ok=True)
prior=research/'full-game-rea-gap-pass-2026-10-29/unity-layouts/map-crazy-wasm.py';source=prior.read_text();source='\n'.join(('src=Path('+repr(str(root/'public/games/tennis-bits/originals/Build/game.wasm'))+');b=src.read_bytes()') if l.startswith('src=Path(') else l for l in source.splitlines());source=source.replace("needle=b'Assembly-CSharp.dll\\0'","needle=b'CrazyGamesSDK.dll\\0'")
m=(research/'full-game-rea-gap-pass-2026-10-29/browser-games/tennis-bits/webdata/Il2CppData/Metadata/global-metadata.dat').read_bytes();sec=lambda i:struct.unpack_from('<III',m,8+i*12);so,ss,sc=sec(2);mo,ms,mc=sec(5);to,ts,tc=sec(19);string=lambda i:m[so+i:m.index(0,so+i)].decode()
types=[(i,string(struct.unpack_from('<i',m,to+i*76)[0]),string(struct.unpack_from('<i',m,to+i*76+4)[0])) for i in range(tc)];selected=[t for t in types if t[1]=='SiteLock'];print('SiteLock',selected,flush=True)
# Resolve its owning image directly from the exact image records: name i32,
# assembly i16, typeStart i16/typeCount u16 at version39 compact widths.
names=[]
import re
names=re.findall(rb'[A-Za-z0-9_.-]+\.dll',m[so:so+ss]);print('Images',names,flush=True)
wasm=(root/'public/games/tennis-bits/originals/Build/game.wasm').read_bytes()
candidates=[]
for name in names:
 if b'Crazy' not in name and name!=b'Assembly-CSharp.dll':continue
 current=source.replace("needle=b'CrazyGamesSDK.dll\\0'",'needle='+repr(name+b'\0'))
 ns={'__file__':str(out/'map.py'),'__name__':'mapping'};exec(compile(current,str(out/'map.py'),'exec'),ns)
 for c in ns['candidates']:
  if c['invalidNonzeroTableIndices']==0:candidates.append((name,c,ns))
rows=[]
for i in range(mc):
 at=mo+i*30;owner=struct.unpack_from('<h',m,at+4)[0]
 if owner not in [t[0] for t in selected]:continue
 token=struct.unpack_from('<I',m,at+18)[0];rid=token&0xffffff
 for module,c,ns in candidates:
  if not 1<=rid<=c['methodPointerCount']:continue
  ptr=struct.unpack_from('<I',ns['memory'],c['methodPointerTableMemoryAddress']+(rid-1)*4)[0];rows.append({'type':types[owner][1],'name':string(struct.unpack_from('<i',m,at)[0]),'owner':owner,'token':hex(token),'module':module.decode(),'functionIndex':ns['elements'].get(ptr),'candidate':c})
(out/'methods.json').write_text(json.dumps(rows,indent=2));print('METHODS',[(r['name'],r['module'],r['functionIndex']) for r in rows])
