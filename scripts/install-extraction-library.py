"""Install all previously recovered editable exports beside their maintained game.
No game input is mutated. These optional local research libraries are not pre-cached.
"""
from pathlib import Path
import os,json,hashlib,shutil
from concurrent.futures import ThreadPoolExecutor
root=Path.cwd(); research=root.parent.parent/'StatOz Designer/output/research';old=research/'full-game-rea-2026-10-29';gap=research/'full-game-rea-gap-pass-2026-10-29';p3=research/'game-dissection-pass-3-2026-10-29'
sources={
 'stick-cricket':[(old/'unity-games/stick-cricket/exported','objects'),(p3/'stick-cricket/exports','portable'),(gap/'unity-layouts/batting-actions.json','batting-actions.json')],
 'football-shooting':[(old/'unity-games/football-strike/exported','objects'),(p3/'football-strike/customization-records.json','customization-records.json'),(p3/'football-strike/keeper-shot-records.json','keeper-shot-records.json'),(p3/'football-strike/customization-locators.json','customization-locators.json'),(p3/'football-strike/enum-values.json','enum-values.json')],
 'f1-racing':[(old/'hosted-games/crazy-grand-prix/exported-assets','objects'),(p3/'crazy-grand-prix/decoded-rcc-objects.json','decoded-rcc-objects.json'),(p3/'crazy-grand-prix/settings-presets.json','settings-presets.json'),(p3/'crazy-grand-prix/car-tuning.csv','car-tuning.csv')],
 'tennis-bits':[(gap/'browser-games/tennis-bits/exported','objects'),(p3/'tennis-bits/audio','audio'),(p3/'tennis-bits/audio-extraction.json','audio-extraction.json')],
 'archery-test':[(p3/'archery-master/images','images'),(p3/'archery-master/animation-curves','animation-curves'),(p3/'archery-master/model-catalog.json','model-catalog.json'),(gap/'inspectable-games/archery-levels-exact.json','levels-exact.json')],
 'penalty-shooters-2':[(p3/'penalty-shooters-2/frames','frames'),(p3/'penalty-shooters-2/sprite-export.json','sprite-export.json'),(old/'javascript-games/penalty-event-sheets','event-sheets'),(old/'javascript-games/penalty-event-map.json','event-map.json')],
 'soccer-real':[(p3/'soccer-real/images','images'),(p3/'soccer-real/animation-curves','animation-curves'),(p3/'soccer-real/model-catalog.json','model-catalog.json'),(p3/'soccer-real/code-atlas.json','code-atlas.json')],
 'retro-innings':[(p3/'retro-innings/code-atlas.json','code-atlas.json')]
}
def sha(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for b in iter(lambda:f.read(1048576),b''):h.update(b)
 return h.hexdigest()
report=[]
for game,items in sources.items():
 dest=root/'.local-game-assets'/game;dest.mkdir(parents=True,exist_ok=True);entries=[];missing=[]
 for source,relative in items:
  if not source.exists():missing.append(str(source));continue
  files=[source] if source.is_file() else [Path(d)/n for d,dirs,names in os.walk(source) for n in names]
  def copy_one(p):
   rel=Path(relative)/(p.relative_to(source) if source.is_dir() else '')
   target=dest/rel;target.parent.mkdir(parents=True,exist_ok=True)
   expected=sha(p)
   if not target.exists() or target.stat().st_size!=p.stat().st_size or sha(target)!=expected:shutil.copyfile(p,target)
   assert sha(target)==expected
   return {'path':rel.as_posix(),'source':str(p.relative_to(research)),'bytes':p.stat().st_size,'sha256':expected}
  with ThreadPoolExecutor(max_workers=12) as pool:entries.extend(pool.map(copy_one,files))
  print(game,relative,len(files),'copied/verified',flush=True)
 manifest={'game':game,'localOnly':True,'method':'Exact copies of recovered editable exports. Optional inspection library; active runtime uses its game-owned native/recovered assets. No original-source or complete-game-fidelity claim.','files':entries,'missingSourceGroups':missing}
 (dest/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf8');public=root/'public/games'/game/'dissection';public.mkdir(parents=True,exist_ok=True);shutil.copyfile(dest/'manifest.json',public/'manifest.json');report.append({'game':game,'files':len(entries),'bytes':sum(e['bytes'] for e in entries),'missing':missing});print(json.dumps(report[-1]),flush=True)
out=root/'docs/local-games';out.mkdir(parents=True,exist_ok=True);(out/'extraction-library.json').write_text(json.dumps(report,indent=2),encoding='utf8')
