"""Original volume-shaded pixel figure renderer for Retro Hoops (V19+).

Limbs and torso are rounded, tapered volumes along the existing rig joints. Each pixel's
surface normal is lit from one fixed direction and quantised into hard colour ramps, giving
smooth arcade-style gradients without antialiasing. One continuous outline is drawn around
each part group, so elbows and knees have no seams. Nothing here reads a source raster.
"""
import math
import numpy as np
from PIL import Image

# Light from upper front (facing right); mirrored frames flip with the sprite, as in the reference.
LIGHT=np.array([0.56,-0.58,0.5]);LIGHT=LIGHT/np.linalg.norm(LIGHT)
THRESHOLDS=[-0.15,0.12,0.42,0.72]  # five shade bands: dark, low, mid, light, highlight

def hexrgb(c):return tuple(int(c[i:i+2],16)for i in(1,3,5))
def mixc(a,b,t):
 a,b=hexrgb(a),hexrgb(b);return '#'+''.join(f'{round(a[i]+(b[i]-a[i])*t):02x}'for i in range(3))
def ramp5(*stops):
 """Five shading tones from 2-5 authored stops (dark -> highlight)."""
 if len(stops)==5:return list(stops)
 out=[]
 for k in range(5):
  x=k/4*(len(stops)-1);i=min(len(stops)-2,int(x));out.append(mixc(stops[i],stops[i+1],x-i))
 return out
def skin_tones(skin):return ramp5(skin[1],mixc(skin[1],skin[2],.5),skin[2],skin[3],skin[4]if len(skin)>4 else mixc(skin[3],'#ffffff',.35))
def cloth_tones(kit):return ramp5(kit[1],kit[2],kit[3]if len(kit)>3 else mixc(kit[2],'#ffffff',.35))

class Capsule:
 """Tapered volume from a to b. radii: [(t,r),...]; bow: [(t,offset),...] shifts the centre sideways."""
 def __init__(self,a,b,radii,bow=None):
  self.a=np.array(a,float);self.b=np.array(b,float);self.ts=[p[0]for p in radii];self.rs=[p[1]for p in radii]
  self.bts=[p[0]for p in bow]if bow else[0,1];self.bos=[p[1]for p in bow]if bow else[0,0]
 def extent(self):m=max(self.rs)+max(abs(o)for o in self.bos)+2;return(min(self.a[0],self.b[0])-m,min(self.a[1],self.b[1])-m,max(self.a[0],self.b[0])+m,max(self.a[1],self.b[1])+m)
 def sample(self,px,py):
  ab=self.b-self.a;l2=max(1e-6,ab@ab);l=math.sqrt(l2);ux,uy=ab/l;nx,ny=-uy,ux
  t=np.clip(((px-self.a[0])*ab[0]+(py-self.a[1])*ab[1])/l2,0,1)
  off=np.interp(t,self.bts,self.bos);cx=self.a[0]+ab[0]*t+nx*off;cy=self.a[1]+ab[1]*t+ny*off
  r=np.interp(t,self.ts,self.rs);dx,dy=px-cx,py-cy;d=np.hypot(dx,dy)
  return r-d,dx/np.maximum(r,1e-6),dy/np.maximum(r,1e-6),t,(dx*nx+dy*ny)

def render_group(im,capsules,tones,ink,material=None,rim=True,light=LIGHT,clip=None):
 """Shade a union of capsules onto im (RGBA PIL). material(t,w,index)->tone list override per pixel.
 Returns the boolean mask in full-canvas coordinates."""
 W,H=im.size;ext=[c.extent()for c in capsules]
 x0=max(0,int(math.floor(min(e[0]for e in ext))));y0=max(0,int(math.floor(min(e[1]for e in ext))))
 x1=min(W,int(math.ceil(max(e[2]for e in ext)))+1);y1=min(H,int(math.ceil(max(e[3]for e in ext)))+1)
 full=np.zeros((H,W),bool)
 if x1<=x0 or y1<=y0:return full
 ys,xs=np.mgrid[y0:y1,x0:x1];px=xs+.5;py=ys+.5
 best=np.full(px.shape,-1e9);vx=np.zeros(px.shape);vy=np.zeros(px.shape);tt=np.zeros(px.shape);ww=np.zeros(px.shape);which=np.zeros(px.shape,int)
 for i,c in enumerate(capsules):
  depth,dx,dy,t,w=c.sample(px,py);take=depth>best
  best=np.where(take,depth,best);vx=np.where(take,dx,vx);vy=np.where(take,dy,vy);tt=np.where(take,t,tt);ww=np.where(take,w,ww);which=np.where(take,i,which)
 mask=best>0
 if clip is not None:mask&=clip[y0:y1,x0:x1]
 if not mask.any():return full
 r2=np.clip(vx*vx+vy*vy,0,1);vz=np.sqrt(1-r2);shade=vx*light[0]+vy*light[1]+vz*light[2]
 idx=np.digitize(shade,THRESHOLDS)
 if rim:idx=np.where(r2>.8,np.maximum(idx-1,0),idx)
 arr=np.array(im)
 sets={0:tones}
 if material is not None:
  choice=material(tt,ww,which)
  for k in np.unique(choice[mask]):
   if k!=0:sets[int(k)]=material.tones[int(k)]
 else:choice=np.zeros(px.shape,int)
 region=arr[y0:y1,x0:x1]
 for k,toneset in sets.items():
  rgb=np.array([hexrgb(c)for c in toneset],np.uint8)
  sel=mask&(choice==k);region[sel,:3]=rgb[idx[sel]];region[sel,3]=255
 # One continuous inside-edge outline around the whole group: no seams at joints.
 pad=np.pad(mask,1);edge=mask&~(pad[:-2,1:-1]&pad[2:,1:-1]&pad[1:-1,:-2]&pad[1:-1,2:])
 inkset=ink if isinstance(ink,dict)else{0:ink}
 for k,c in inkset.items():
  sel=edge&(choice==k)if isinstance(ink,dict)else edge
  region[sel,:3]=hexrgb(c);region[sel,3]=255
 arr[y0:y1,x0:x1]=region;im.paste(Image.fromarray(arr))
 full[y0:y1,x0:x1]=mask;return full

class Material:
 """Per-pixel tone-set chooser: fn(t,w,which)->int array; tones: {index:tone list}."""
 def __init__(self,fn,tones):self.fn=fn;self.tones=tones
 def __call__(self,t,w,which):return self.fn(t,w,which)

# Proportions measured from native GameLog frames (approximate, in 144x128 canvas pixels).
UPPER_ARM=[(0,3.9),(.12,4.4),(.5,3.8),(1,2.9)]
FOREARM=[(0,3.0),(.25,3.3),(1,2.3)]
THIGH=[(0,5.4),(.35,4.8),(1,3.4)]
SHIN=[(0,3.4),(.3,3.8),(1,2.4)]

def fold(im,mask,pts,color):
 """Cloth crease: a 1px line kept strictly inside the part (never on its outline)."""
 from PIL import ImageDraw
 tmp=Image.new('L',im.size,0);ImageDraw.Draw(tmp).line([(round(x),round(y))for x,y in pts],fill=255,width=1)
 line=np.array(tmp)>0;pad=np.pad(mask,1);inner=mask&pad[:-2,1:-1]&pad[2:,1:-1]&pad[1:-1,:-2]&pad[1:-1,2:]
 sel=line&inner
 if sel.any():arr=np.array(im);arr[sel,:3]=hexrgb(color);im.paste(Image.fromarray(arr))
def axis(a,b):
 dx,dy=b[0]-a[0],b[1]-a[1];l=max(.01,math.hypot(dx,dy));nx,ny=-dy/l,dx/l
 return lambda t,w:(a[0]+dx*t+nx*w,a[1]+dy*t+ny*w)

def far_tones(t):return [t[0],t[0],t[1],t[2],t[3]]
def mixp(a,b,t):return(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t)
SOCK=['#7e858c','#b9bec2','#e3e6e2','#f6f7f3','#ffffff']

def vol_arm(im,shoulder,elbow,wrist,palette,far=False,sleeve=None):
 """Upper arm, forearm and fist as one shaded volume; optional short sleeve over the upper arm."""
 skin=palette['skin'];t=skin_tones(skin);t=far_tones(t)if far else t
 dx,dy=wrist[0]-elbow[0],wrist[1]-elbow[1];l=max(.01,math.hypot(dx,dy));ux,uy=dx/l,dy/l
 fist=Capsule((wrist[0]-ux*.5,wrist[1]-uy*.5),(wrist[0]+ux*1.6,wrist[1]+uy*1.6),[(0,2.9),(1,2.6)])
 render_group(im,[Capsule(shoulder,elbow,UPPER_ARM),Capsule(elbow,wrist,FOREARM),fist],t,skin[0])
 if sleeve:
  st=ramp5(sleeve[0],sleeve[1],sleeve[2]);st=far_tones(st)if far else st
  cuff=mixp(shoulder,elbow,.42 if not far else .3)
  render_group(im,[Capsule(shoulder,cuff,[(0,4.7),(1,4.4)])],st,sleeve[0])
def vol_leg(im,hip,knee,ankle,palette,far=False):
 skin=palette['skin'];kit=palette['short'];t=skin_tones(skin);ct=cloth_tones(kit)
 if far:t=far_tones(t);ct=far_tones(ct)
 render_group(im,[Capsule(hip,knee,THIGH),Capsule(knee,ankle,SHIN)],t,skin[0])
 cuff=mixp(knee,ankle,.72);render_group(im,[Capsule(cuff,ankle,[(0,3.2),(1,3.0)])],far_tones(SOCK)if far else SOCK,'#5d646b')
 hem=mixp(hip,knee,.9);sm=render_group(im,[Capsule(hip,hem,[(0,5.4),(.6,5.6),(1,6.0)])],ct,kit[0])
 # V27 shorts creases: inner-leg fold and hem fold.
 q=axis(hip,hem);fold(im,sm,[q(.2,1.5),q(.75,3.2)],ct[0]);fold(im,sm,[q(.88,-3.5),q(.92,1)],ct[1])
def vol_seat(im,hips,palette,view):
 kit=palette['short'];hx,hy=mixp(hips[0],hips[1],.5)
 if view=='side':render_group(im,[Capsule((hx-3,hy),(hx+3,hy),[(0,4.4),(1,4.4)])],cloth_tones(kit),kit[0])
 else:render_group(im,[Capsule((hx-6,hy+1),(hx+6,hy+1),[(0,5.2),(1,5.2)]),Capsule((hx,hy-1),(hx,hy+6),[(0,5.5),(1,4.5)])],cloth_tones(kit),kit[0])
def vol_neck(im,base,head,palette):
 skin=palette['skin'];render_group(im,[Capsule(base,head,[(0,3.6),(1,3.0)])],skin_tones(skin),skin[0])
def vol_torso(im,chest,hip,palette,view):
 """Jersey volume along the spine with band, raglan sleeve and tank-shoulder materials."""
 kit=palette['shirt'];skin=palette['skin'];band=palette.get('band');sleeve=palette.get('sleeve')
 tones={1:ramp5(band[0],band[1],band[2])if band else None,2:ramp5(sleeve[0],sleeve[1],sleeve[2])if sleeve else None,3:skin_tones(skin)}
 ink={0:kit[0],1:band[0]if band else kit[0],2:sleeve[0]if sleeve else kit[0],3:skin[0]}
 if view=='side':
  # V20: the jersey volume starts above the hip joint so its hem sits on the waistband (no bustle).
  waist=mixp(hip,chest,.22);caps=[Capsule(waist,chest,[(0,7.8),(.25,7.6),(.65,9.2),(1,8.4)],[(0,0),(.7,-1.6),(1,-.7)])]
  def fn(t,w,i):
   c=np.zeros(t.shape,int)
   if band:c=np.where((t>.36)&(t<.52),1,c)
   if sleeve:c=np.where((t>.72)&(w<-1.5),2,c)
   else:c=np.where((t>.86)&(w<-3.5),3,c)
   return c
 else:
  # V24: tank tops narrow to straps over bare shoulders; tees keep the broad sleeve line.
  top=(chest[0],chest[1]-2);body=[(0,8.2),(.35,8.6),(.75,11.0),(1,10.8)]if sleeve else[(0,8.2),(.35,8.6),(.72,9.8),(1,8.8)]
  caps=[Capsule((hip[0],hip[1]-4),top,body),Capsule((chest[0]-10,chest[1]+1),(chest[0]+10,chest[1]+1),[(0,4.6),(.5,5.6),(1,4.6)])]
  def fn(t,w,i):
   c=np.zeros(t.shape,int)
   t=np.where(i==1,.9,t);w=np.where(i==1,(t*0)+np.abs(w)+6.5,w)
   if band:c=np.where((t>.4)&(t<.56),1,c)
   if sleeve:c=np.where((t>.8)&(np.abs(w)>6.2),2,c)
   else:
    c=np.where((t>.76)&(np.abs(w)>5.4),3,c)
    if view=='front':c=np.where((t>.86)&(np.abs(w)<3.6),3,c)
   return c
 base=cloth_tones(kit)
 m=Material(fn,{k:v for k,v in tones.items()if v})
 tm=render_group(im,caps,base,ink,material=m)
 # V27 jersey creases: diagonal folds from the armpit toward the waist, kept inside the jersey.
 if view=='side':
  q=axis(waist,chest);fold(im,tm,[q(.85,-3.5),q(.35,2.5)],base[0]);fold(im,tm,[q(.6,-5),q(.15,0)],base[1])
 else:
  for sgn in(-1,1):fold(im,tm,[(chest[0]+sgn*5,chest[1]+6),(hip[0]+sgn*3,hip[1]-6)],base[1])
 return tm
