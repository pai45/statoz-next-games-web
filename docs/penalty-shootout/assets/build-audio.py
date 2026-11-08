"""Original deterministic synthesized foley; CC0 crowd adaptation stays separately credited."""
from pathlib import Path
import math,random,wave,struct,subprocess,json,hashlib,shutil,array
import imageio_ffmpeg
ROOT=Path(__file__).resolve().parent;OUT=ROOT/'stage/public/assets/games/penalty-shootout';AUDIO=OUT/'audio';AUDIO.mkdir(parents=True,exist_ok=True)
sr=44100
for index,(name,duration) in enumerate([('kick',.22),('glove',.2),('frame',.75),('whistle',.5),('goal',.65),('result',.35)]):
    random.seed(100+index);samples=[];low=0
    for i in range(int(sr*duration)):
        t=i/sr;noise=random.uniform(-1,1);low=.82*low+.18*noise
        if name=='kick':v=(.62*math.sin(2*math.pi*(100*t-100*t*t))+.55*low)*math.exp(-t*22)
        elif name=='glove':v=(.65*low+.13*noise)*math.exp(-t*28)
        elif name=='frame':v=(.32*math.sin(2*math.pi*720*t)+.18*math.sin(2*math.pi*1423*t)+.1*noise*math.exp(-t*60))*math.exp(-t*7)
        elif name=='whistle':v=.32*math.sin(2*math.pi*2300*t+1.3*math.sin(2*math.pi*32*t))*min(1,t/.025)*min(1,(duration-t)/.05)
        else:
            freq=660 if name=='goal' else 330;v=.22*(math.sin(2*math.pi*freq*t)+.5*math.sin(2*math.pi*freq*1.5*t))*math.exp(-t*6)
        v*=min(1,t/.003)*min(1,(duration-t)/.012);samples.append(max(-.95,min(.95,v)))
    with wave.open(str(AUDIO/(name+'.wav')),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(sr);w.writeframes(struct.pack('<'+'h'*len(samples),*[round(x*32767) for x in samples]))
ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
pcm=subprocess.run([ffmpeg,'-v','error','-i',str(ROOT/'tools/crowd-source.mp3'),'-ar',str(sr),'-ac','2','-f','f32le','-'],capture_output=True,check=True)
source_samples=array.array('f');source_samples.frombytes(pcm.stdout)
mid=(len(source_samples)//4)*2;head=source_samples[:mid];tail=source_samples[mid:];fade_frames=round(.5*sr);fade_samples=fade_frames*2
if min(len(head),len(tail))<=fade_samples:raise RuntimeError('Source crowd recording is too short for a loop')
loop=tail[:-fade_samples]
for i in range(fade_samples):
    t=(i//2)/fade_frames;loop.append(tail[len(tail)-fade_samples+i]*(1-t)+head[i]*t)
loop.extend(head[fade_samples:]);peak=max(abs(x) for x in loop)
if peak<.00001:raise RuntimeError('Crowd source decoded to silence')
gain=.75/peak
with wave.open(str(ROOT/'tools/crowd-loop.wav'),'wb') as w:
    w.setnchannels(2);w.setsampwidth(2);w.setframerate(sr)
    w.writeframes(array.array('h',(round(max(-1,min(1,x*gain))*32767) for x in loop)).tobytes())
subprocess.run([ffmpeg,'-v','error','-y','-i',str(ROOT/'tools/crowd-loop.wav'),'-c:a','libvorbis','-q:a','4',str(AUDIO/'crowd.ogg')],check=True)
decoded=subprocess.run([ffmpeg,'-v','error','-i',str(AUDIO/'crowd.ogg'),'-f','f32le','-'],capture_output=True,check=True)
if len(decoded.stdout)<44100*4:raise RuntimeError('Crowd loop has no usable decoded audio samples')
files=[]
for f in sorted(OUT.rglob('*')):
    if f.is_file() and f.suffix not in ['.blend','.blend1'] and f.name!='manifest.json':files.append({'path':str(f.relative_to(OUT)).replace('\\','/'),'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()})
manifest={'schemaVersion':1,'assetVersion':'football-original-v1','runtimeVersion':'vita-inspired-1','model':{'file':'athlete.glb','foundation':'Blender Studio Human Base Meshes v1.4.1, GEO-body_male_realistic','sourceUrl':'https://www.blender.org/download/demo-files/','archiveUrl':'https://download.blender.org/demo/asset-bundles/human-base-meshes/human-base-meshes-bundle-v1.4.1.zip','archiveSha256':hashlib.sha256((ROOT/'tools/human-base-meshes.zip').read_bytes()).hexdigest(),'license':'CC0-1.0','licenseUrl':'https://creativecommons.org/publicdomain/zero/1.0/','adaptation':'Original StatOz rig, vertex weights, kit materials, UVs, gloves and football clips; Blender 4.5.9 LTS','approval':'approved for this requested local game'},'audio':{'effects':'Original deterministic StatOz synthesis; build-audio.py','crowd':{'title':'Stadium Crowd','creator':'stomachache','sourceUrl':'https://freesound.org/people/stomachache/sounds/274516/','downloadUrl':'https://cdn.freesound.org/previews/274/274516_177850-hq.mp3','sourceSha256':hashlib.sha256((ROOT/'tools/crowd-source.mp3').read_bytes()).hexdigest(),'license':'CC0-1.0','licenseUrl':'https://creativecommons.org/publicdomain/zero/1.0/','adaptation':'High-quality preview converted to Vorbis with a 0.5-second loop crossfade','approval':'approved by user for local game'}},'environment':'Original code-authored pitch, goal, stadium, seats, ball and textures','files':files}
manifest['audio']['crowd']['durationSeconds']=len(loop)/(sr*2)
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
docs=ROOT/'stage/docs/penalty-shootout/assets';docs.mkdir(parents=True,exist_ok=True)
shutil.copyfile(ROOT/'build-audio.py',docs/'build-audio.py')
shutil.copyfile(ROOT/'build-athlete.py',docs/'build-athlete.py')
(docs/'LICENSES.md').write_text('# Asset provenance\n\nBlender Studio Human Base Meshes v1.4.1: CC0-1.0. Source: https://www.blender.org/download/demo-files/\n\nStadium Crowd by stomachache: CC0-1.0. Source: https://freesound.org/people/stomachache/sounds/274516/\n\nOriginal StatOz rig, football animation, kits, environment and synthesized effects were made for this game. FIFA footage and EA manual are reference-only and are not included in runtime assets.\n\nRuntime file hashes and adaptation details: public/assets/games/penalty-shootout/manifest.json.\n')
print('Audio and asset manifest complete',sum(f['bytes'] for f in files),'runtime asset bytes')
