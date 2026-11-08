from pathlib import Path
from PIL import Image,ImageDraw
import json,hashlib,subprocess,imageio_ffmpeg
root=Path('test-results/retro-hoops-movement-v2');records=[];exe=imageio_ffmpeg.get_ffmpeg_exe()
for folder in sorted((root/'family-loops').iterdir()):
 if not folder.is_dir():continue
 frames=sorted(folder.glob('[0-9][0-9][0-9][0-9].png'));assert len(frames)==36;assert all(Image.open(f).size==(288,128)for f in frames)
 video=folder/'review.mp4';subprocess.run([exe,'-hide_banner','-loglevel','error','-y','-framerate','30','-i',str(folder/'%04d.png'),'-c:v','libx264','-pix_fmt','yuv420p',str(video)],check=True);subprocess.run([exe,'-hide_banner','-loglevel','error','-i',str(video),'-f','null','-'],check=True)
 sheet=Image.new('RGB',(884,480),'#14223a');d=ImageDraw.Draw(sheet)
 for i,n in enumerate([0,4,8,12,16,20,24,28,32]):
  x=4+i%3*294;y=4+i//3*158;sheet.paste(Image.open(folder/f'{n:04}.png'),(x,y+20));d.text((x,y),f'{folder.name} / {n/30:.2f}s',fill='white')
 sheet.save(folder/'contact-sheet.png');records.append({'clip':folder.name,'frames':36,'fps':30,'seconds':1.2,'audio':False,'decoded':True,'sha256':hashlib.sha256(video.read_bytes()).hexdigest()})
(root/'family-motion-checks.json').write_text(json.dumps({'records':records,'scope':'Pose workshop: prior pose reuse vs authored candidate; not a captured source replay'},indent=2)+'\n',encoding='utf-8');print('Decoded',len(records),'before/after movement loops')
