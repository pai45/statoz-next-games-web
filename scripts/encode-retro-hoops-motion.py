from pathlib import Path
from PIL import Image,ImageDraw
import json,hashlib,subprocess,imageio_ffmpeg,sys
out=Path.cwd()/'test-results'/(sys.argv[1]if len(sys.argv)>1 else 'retro-hoops-motion-v1');records=[]
for kind in ['dribble','block','dunk','super-dunk','pass','shoot','recoil','dunk-pass']:
 for team in [0,1]:
  folder=out/'actions'/f'{kind}-{team}';frames=sorted(folder.glob('[0-9][0-9][0-9][0-9].png'));assert len(frames)==61
  assert all(Image.open(f).size==(546,252) for f in frames)
  video=folder/'review.mp4';exe=imageio_ffmpeg.get_ffmpeg_exe();subprocess.run([exe,'-hide_banner','-loglevel','error','-y','-framerate','30','-i',str(folder/'%04d.png'),'-c:v','libx264','-pix_fmt','yuv420p',str(video)],check=True);subprocess.run([exe,'-hide_banner','-loglevel','error','-i',str(video),'-f','null','-'],check=True)
  sheet=Image.new('RGB',(1940,1176),'#0d111a');d=ImageDraw.Draw(sheet)
  for i,n in enumerate([0,3,7,10,13,18,25,35,50]):
   x=8+i%3*646;y=8+i//3*390;sheet.paste(Image.open(folder/f'{n:04}.png'),(x,y+20));d.text((x,y),f'{kind} team{team} frame{n} ({n/30:.2f}s)',fill='white')
  sheet.save(folder/'contact-sheet.png');records.append({'kind':kind,'team':team,'frames':61,'fps':30,'decodeVerified':True,'audio':False,'sha256':hashlib.sha256(video.read_bytes()).hexdigest()})
(out/'motion-checks.json').write_text(json.dumps({'records':records,'renderer':'Actual Three production renderer, direct native640x360drawingbuffer capture','scope':'Original proposed poses/holds; neither native source timing nor live performance','audio':False},indent=2),encoding='utf-8')
print(json.dumps({'decodedLoops':len(records)}))
