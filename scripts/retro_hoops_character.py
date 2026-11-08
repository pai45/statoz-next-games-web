"""Original basketball-specific pixel construction, not traced reference sprites.
Canvas and authoritative contact origin remain compatible with the game.
"""
import math
from PIL import Image,ImageDraw
from retro_hoops_volume import vol_arm,vol_leg,vol_seat,vol_neck,vol_torso
HEAD_SCALE=.9;HK=1.12;SHOE_SCALE=.8

RIG={'nativeArtwork':[144,128],'exportScale':1.0,'canvas':[144,128],'feet':[72,116],'hipY':76,'shoulderY':51,
 'shoulderSpan':22,'waistSpan':18,'headHeight':13,'upperArmLength':21,'forearmLength':20,
 'thighLength':20,'shinLength':19,'armWidths':[11,8,4.5],'legWidths':[15,10,6],
 'construction':'V28 held shot follow-through, one-arm block; V27 shot follow-through arm, cloth creases; V26 in-front dribble, upright pumping run, receiver-facing pass; V25 venue pass (characters unchanged); V24 tank straps over bare shoulders, hip-height front hands; V23 measured source colour ramps (near-black outlines, deep saturated skin and cloth shadows); V22 fuller upper body, baggier shorts, larger heads, V-tapered front torso; V21 volume-lit heads; V20 waist-length jersey and crotch seat; V19 volume-shaded lean in-game figure (continuous limb volumes, 5-tone lit ramps, single outlines, slimmer limbs, smaller head and shoes); V18 hanging-leg dunk; V17 arms-out defence; V16 team-select bulk build (thick arms, broad shoulders, square front stance, chest band, shades/moustaches); V15 reference crouch, hanging airborne legs; V14 original forward-leaning arcade basketball build: spine-aligned short jersey with rounded back, contrasting loose knee-length shorts, high-top shoes with socks, larger hands and six distinct head identities; authored approximate reference study, no tracing',
 'gait':{'classification':'Authored displacement-driven poses','footRollDegrees':[0,0,5,12,24,38,28,8,-15,-10,-4,0]}}
class PixelDraw:
 """Author deliberate hard pixel clusters directly on144x128; no export rescale or antialiasing."""
 def __init__(self,image):self.im=image;self.d=ImageDraw.Draw(image)
 def xy(self,points):return[(round(p[0]),round(p[1]))for p in points]
 def polygon(self,points,fill=None,outline=None):self.d.polygon(self.xy(points),fill=fill,outline=outline)
 def line(self,points,fill=None,width=1):self.d.line(self.xy(points),fill=fill,width=max(1,round(width)))
 def point(self,point,fill=None):self.d.point(self.xy([point])[0],fill=fill)
def export(image):return image.copy()
def pt(p):return tuple(round(v)for v in p)
def mix(a,b,t):return(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t)
def clamp(v,a,b):return max(a,min(b,v))
def hinge(a,b,l1=21,l2=20,bend=1):
 dx,dy=b[0]-a[0],b[1]-a[1];distance=max(.01,math.hypot(dx,dy));r=clamp(distance,abs(l1-l2)+.1,l1+l2-.1)
 u=(l1*l1-l2*l2+r*r)/(2*r);h=math.sqrt(max(0,l1*l1-u*u))
 return(a[0]+dx/distance*u-dy/distance*h*bend,a[1]+dy/distance*u+dx/distance*h*bend)
def poly(d,points,fill,outline=None):d.polygon([pt(p)for p in points],fill=fill,outline=outline)
def blend(c,o,t=.35):return '#'+''.join(f'{round(int(c[i:i+2],16)*(1-t)+int(o[i:i+2],16)*t):02x}'for i in [1,3,5])
def segment(d,a,b,wa,wb,color,shadow,light,near=True):
 # Original rounded muscle envelope: shoulder cap/belly taper into the joint, not straight rods.
 dx,dy=b[0]-a[0],b[1]-a[1];l=max(.01,math.hypot(dx,dy));nx,ny=-dy/l,dx/l
 def q(t,w):return(a[0]+dx*t+nx*w,a[1]+dy*t+ny*w)
 poly(d,[q(0,wa*.28),q(.1,wa*.43),q(.26,wa*.52),q(.46,wa*.5),q(.7,wb*.49),q(.9,wb*.43),q(1,wb*.27),q(1,-wb*.27),q(.86,-wb*.43),q(.58,-wa*.43),q(.3,-wa*.5),q(.1,-wa*.4),q(0,-wa*.25)],color,shadow)
 poly(d,[q(.1,wa*.18),q(.3,wa*.42),q(.52,wa*.36),q(.85,wb*.3),q(.95,wb*.06),q(.62,0),q(.25,-wa*.03)],blend(color,shadow))
 if near:poly(d,[q(.13,-wa*.14),q(.28,-wa*.31),q(.43,-wa*.29),q(.65,-wb*.25),q(.77,-wb*.09),q(.55,-wb*.02),q(.25,-wa*.01)],light)

def hand(d,wrist,skin,towards=(1,0)):
 # Larger arcade hand cluster: palm, knuckle crease, thumb and warm highlight.
 x,y=wrist;poly(d,[(x-4,y-3),(x,y-4),(x+4,y-2),(x+4,y+2),(x+1,y+4),(x-3,y+3)],skin[2],skin[0])
 d.line([pt((x-1,y+1)),pt((x+3,y+1))],fill=skin[1]);d.line([pt((x-2,y-2)),pt((x,y-2))],fill=skin[3]);d.point(pt((x+2,y-2)),fill=skin[4]if len(skin)>4 else skin[3])
def arm(d,shoulder,wrist,skin,far=False,bend=-1,sleeve=False,elbow=None):
 elbow=elbow or hinge(shoulder,wrist,21,20,bend)
 vol_arm(d.im,shoulder,elbow,wrist,{'skin':skin},far,sleeve if isinstance(sleeve,(list,tuple))else(['#6a6e80','#ced1dc','#f6f7fa']if sleeve else None));return elbow
def arm_v18(d,shoulder,wrist,skin,far=False,bend=-1,sleeve=False,elbow=None):
 elbow=elbow or hinge(shoulder,wrist,21,20,bend);shade=skin[1]if far else skin[2]
 segment(d,shoulder,elbow,13,9.5,shade,skin[0],skin[2 if far else 3],not far)
 x,y=elbow;poly(d,[(x-4,y-2),(x+1,y-4),(x+4,y),(x+1,y+4),(x-3,y+2)],shade)
 segment(d,elbow,wrist,9.5,6,shade,skin[0],skin[2 if far else 3],not far)
 if sleeve:
  tones=sleeve if isinstance(sleeve,(list,tuple))else['#6a6e80','#ced1dc','#f6f7fa']
  cuff=mix(shoulder,elbow,.4 if not far else .3);segment(d,shoulder,cuff,14 if not far else 11,13 if not far else 10,tones[1]if far else tones[2],tones[0],tones[2],not far)
  d.line([pt(mix(shoulder,elbow,.42)),pt(cuff)],fill=tones[1])
 hand(d,wrist,skin);return elbow
SHOE={'body':'#141a2e','ink':'#06080f','accent':'#2f62d6','farAccent':'#203a7c','collar':'#323d62','sole':'#dfe1e8','lace':'#c3cbe2'}
def shoe(d,ankle,far=False,view='side',roll=0):
 # High-top basketball shoe: padded collar, side accent, laces and white sole.
 angle=math.radians(roll if view=='side'else 0);cs,sn=math.cos(angle),math.sin(angle)
 shape=[(-4,-8),(2,-8),(3,-4),(7,-2),(9,0),(9,4),(-5,4),(-5,1)]if view=='side'else[(-4,-8),(4,-8),(5,-1),(5,3),(3,4),(-3,4),(-5,3),(-5,-1)]
 def rot(p):p=(p[0]*SHOE_SCALE,p[1]*SHOE_SCALE);return(ankle[0]+p[0]*cs-p[1]*sn,ankle[1]+p[0]*sn+p[1]*cs)
 shift=min(0,116-max(rot(p)[1]for p in shape))
 def q(x,y):a,b=rot((x,y));return(a,b+shift)
 poly(d,[q(*p)for p in shape],SHOE['body'],SHOE['ink'])
 accent=SHOE['farAccent']if far else SHOE['accent']
 if view=='side':
  poly(d,[q(-3,-7),q(1,-7),q(1,-5),q(-3,-5)],SHOE['collar'])
  poly(d,[q(-4,-2),q(1,-3),q(4,-1),q(-4,0)],accent)
  d.line([pt(q(-4,3)),pt(q(8,3))],fill=SHOE['sole'],width=2)
  d.line([pt(q(2,-5)),pt(q(5,-2))],fill=SHOE['lace'],width=1)
 else:
  poly(d,[q(-3,-7),q(3,-7),q(3,-5),q(-3,-5)],SHOE['collar'])
  d.line([pt(q(-4,-2)),pt(q(-4,0))],fill=accent);d.line([pt(q(4,-2)),pt(q(4,0))],fill=accent)
  d.line([pt(q(-4,3)),pt(q(4,3))],fill=SHOE['sole'],width=2)
  d.line([pt(q(-1,-4)),pt(q(1,-4))],fill=SHOE['lace']);d.line([pt(q(-1,-2)),pt(q(1,-2))],fill=SHOE['lace'])
 return{'toe':q(9,2)if view=='side'else q(0,4),'heel':q(-5,2)if view=='side'else q(0,-3)}
def leg(d,hip,knee,ankle,skin,kit,far=False,view='side',roll=0):
 vol_leg(d.im,hip,knee,ankle,{'skin':skin,'short':kit},far);return shoe(d,ankle,far,view,roll)
def leg_v18(d,hip,knee,ankle,skin,kit,far=False,view='side',roll=0):
 shade=skin[1]if far else skin[2]
 segment(d,hip,knee,15,10,shade,skin[0],skin[2 if far else 3],not far)
 segment(d,knee,ankle,10,6,shade,skin[0],skin[2 if far else 3],not far)
 x,y=knee;poly(d,[(x-3,y-2),(x+1,y-3),(x+4,y),(x+2,y+3),(x-2,y+2)],shade,skin[0]);d.line([pt((x-1,y-1)),pt((x+2,y))],fill=skin[2 if far else 3],width=1)
 # Loose knee-length shorts: a flared tube from hip to just above the knee.
 hem=mix(hip,knee,.84);dx,dy=hem[0]-hip[0],hem[1]-hip[1];l=max(.01,math.hypot(dx,dy));nx,ny=-dy/l,dx/l
 def s(t,w):return(hip[0]+dx*t+nx*w,hip[1]+dy*t+ny*w)
 fill,dark,light=(kit[1],kit[0],kit[2])if far else(kit[2],kit[0],kit[3])
 poly(d,[s(-.05,-5.5),s(.5,-5.8),s(1,-6.3),s(1.04,0),s(1,6.3),s(.5,5.8),s(-.05,5.5)],fill,dark)
 poly(d,[s(.05,3),s(.6,4.5),s(.98,5.5),s(.98,2.5),s(.55,1.5)],kit[1]if not far else blend(kit[1],kit[0]))
 if not far:poly(d,[s(.1,-4),s(.55,-5),s(.85,-4),s(.6,-2),s(.25,-2)],light)
 d.line([pt(s(.97,-5.5)),pt(s(.97,5.5))],fill=kit[1]if not far else kit[0],width=1)
 d.line([pt(s(.35,1)),pt(s(.8,3))],fill=kit[1],width=1)
 cuff=mix(knee,ankle,.74);segment(d,cuff,ankle,6.5,6,'#e9ece8','#7d848c','#ffffff',not far)
 return shoe(d,ankle,far,view,roll)
IDENTITIES={'navy':['shades-bandana','headband-spikes','buzz-goatee'],'amber':['blond-shades','backwards-cap','red-ponytail']}
HAIR={'black':('#15161d','#3e4459'),'blond':('#d9a630','#fff09c'),'blondDark':('#9a6a1c',),'auburn':('#a8401c','#e27a3c'),'auburnDark':('#5c1e10',)}
def head(d,center,skin,view,team,identity=0):
 """V21 volume-lit head: rounded lit skull, lit hair/headwear masses, then small pixel features."""
 from retro_hoops_volume import Capsule,render_group,skin_tones,ramp5
 import numpy as np
 im=d.im;W,H=im.size;x,y=center;side=view=='side';style=IDENTITIES[team][identity]
 st=skin_tones(skin);ink=skin[0]
 ys,xs=np.mgrid[0:H,0:W];py=ys+.5;px=xs+.5
 def above(v):return py<y+HK*v
 def behind(u):return px<x+HK*u
 # Skull and jaw: one lit volume, face slightly forward in profile.
 if side:render_group(im,[Capsule((x+HK*(-.5),y+HK*(-2.6)),(x+HK*(+.6),y+HK*(+2.2)),[(0,HK*4.5),(.6,HK*4.6),(1,HK*3.6)]),Capsule((x+HK*(+1.2),y+HK*(+1.6)),(x+HK*(+3.2),y+HK*(+2.4)),[(0,HK*2.6),(1,HK*2.0)])],st,ink)
 else:render_group(im,[Capsule((x+HK*(0),y+HK*(-2.6)),(x+HK*(0),y+HK*(+2.4)),[(0,HK*4.5),(.6,HK*4.6),(1,HK*3.7)])],st,ink)
 def dome(color3,clip,radius=4.9,dy=-2.4,extra=None):
  caps=[Capsule((x-HK*.8,y+HK*dy),(x+HK*.4,y+HK*dy),[(0,HK*radius),(1,HK*radius)])]+(extra or [])
  render_group(im,caps,ramp5(*color3),color3[0],clip=clip)
 def P(u,v,c):d.point((x+HK*u,y+HK*v),fill=c)
 def L(pts,c,w=1):d.line([(x+HK*u,y+HK*v)for u,v in pts],fill=c,width=w)
 black=('#0d0e14','#262a36','#4a5068')
 if style=='shades-bandana':
  dome(('#141a44','#2c3c8c','#5a74d0'),above(-1.4)|(behind(-2)&above(1)if side else above(-1.4)))
  if side:L([(-5,-2),(-8,-1),(-8,1)],'#2c3c8c',2);P(-8,2,'#141a44')
 elif style=='headband-spikes':
  dome(black,above(-1.5)|(behind(-1.5)&above(2)if side else above(-1.5)))
  render_group(im,[Capsule((x+u,y-5.2),(x+u-1.2,y-8.4),[(0,HK*1.6),(1,HK*.6)])for u in(-3.5,-1.2,1.2,3.2)],ramp5(*black),black[0])
  L([(-4.5,-3),(4.5,-3)],'#f2f2ec',2)
 elif style=='buzz-goatee':
  dome(('#1a161e','#2e2934','#4a4352'),above(-2.4)|(behind(-2.5)&above(0)if side else above(-2.4)),radius=4.7)
 elif style=='blond-shades':
  dome(('#7a4e12','#d9a630','#fff09c'),above(-1)|(behind(-1)&above(3)if side else above(-1)),radius=5.3,dy=-2.2)
  if side:L([(-5,1),(-4,3)],'#9a6a1c')
 elif style=='backwards-cap':
  dome(('#5a0a12','#c81f2b','#ff6a58'),above(-2.2),radius=4.9)
  if side:L([(-5,-2.5),(-9,-2)],'#7a1018',2)
  elif view=='back':L([(-3.5,-1.5),(3.5,-1.5)],'#7a1018',2)
 else:
  dome(('#4a160a','#a8401c','#e27a3c'),above(-1.6)|(behind(-2)&above(1)if side else above(-1.6)))
  tail=[Capsule((x+HK*(-3.5),y+HK*(-1)),(x+HK*(-6),y+HK*(+5)),[(0,HK*2.2),(1,HK*1.6)])]if side else([Capsule((x+HK*(0),y+HK*(0)),(x+HK*(0),y+HK*(+6)),[(0,HK*2.2),(1,HK*1.6)])]if view=='back'else[])
  if tail:render_group(im,tail,ramp5('#4a160a','#a8401c','#e27a3c'),'#4a160a')
  L([(-4.5,-2.6),(4.5,-2.6)],'#f0c22e',2)
 if view=='back':
  if style in('shades-bandana','headband-spikes','buzz-goatee','blond-shades','red-ponytail'):
   colors={'shades-bandana':('#141a44','#2c3c8c','#5a74d0'),'headband-spikes':black,'buzz-goatee':('#1a161e','#2e2934','#4a4352'),'blond-shades':('#7a4e12','#d9a630','#fff09c'),'red-ponytail':('#4a160a','#a8401c','#e27a3c')}[style]
   render_group(im,[Capsule((x+HK*(0),y+HK*(-2.5)),(x+HK*(0),y+HK*(+1.5)),[(0,HK*4.6),(1,HK*3.8)])],ramp5(*colors),colors[0],clip=above(2.5))
   if style=='headband-spikes':L([(-4.5,-3),(4.5,-3)],'#f2f2ec',2)
   if style=='red-ponytail':
    render_group(im,[Capsule((x+HK*(0),y+HK*(0)),(x+HK*(0),y+HK*(+6)),[(0,HK*2.2),(1,HK*1.6)])],ramp5('#4a160a','#a8401c','#e27a3c'),'#4a160a');L([(-4.5,-2.6),(4.5,-2.6)],'#f0c22e',2)
   if style=='shades-bandana':L([(-1,1),(0,4)],'#2c3c8c',2)
  return
 shades=style in['shades-bandana','blond-shades','headband-spikes','backwards-cap'];stache=style in['blond-shades','buzz-goatee','backwards-cap'];sc='#0b0c12'
 if side:
  if shades:L([(0.5,-.8),(4.6,-.8)],sc,2);L([(-2.5,-1),(0.5,-1)],sc);P(3,-1,'#7e9ccc')
  else:P(3,-.6,skin[0]);L([(2,-1.8),(4,-1.6)],skin[1])
  P(5,.4,skin[3]);P(4.6,1.4,skin[1]);L([(-1.4,.2),(-1.4,1.4)],skin[1]);P(-1.4,.6,skin[0])
  if stache:L([(2.6,2.6),(4.4,2.6)],'#9a6a1c'if style=='blond-shades'else'#2a1810')
  else:L([(3,3),(4,3)],skin[1])
  if style=='buzz-goatee':L([(2.6,4.4),(3.6,4.4)],'#1a161e')
 else:
  if shades:L([(-3.8,-.8),(-.6,-.8)],sc,2);L([(.6,-.8),(3.8,-.8)],sc,2);P(-2.5,-1,'#7e9ccc');P(2,-1,'#7e9ccc')
  else:P(-2,-.6,skin[0]);P(2,-.6,skin[0]);L([(-3,-1.8),(-1,-1.8)],skin[1]);L([(1,-1.8),(3,-1.8)],skin[1])
  L([(0,HK*0),(0,HK*1.4)],skin[1]);P(.6,1,skin[3])
  if stache:L([(-1.6,2.6),(1.6,2.6)],'#9a6a1c'if style=='blond-shades'else'#2a1810')
  else:L([(-1,3),(1,3)],skin[1])
  if style=='buzz-goatee':L([(-.8,4.4),(.8,4.4)],'#1a161e')
def head_v20(d,center,skin,view,team,identity=0):
 # Original profile anatomy: skull, brow, projecting nose, jaw, cheek and ear clusters.
 x,y=center;hi=skin[4]if len(skin)>4 else skin[3]
 def q(u,v):return(x+u*HEAD_SCALE,y+v*.88*HEAD_SCALE)
 profile=[(-6,-5),(-4,-8),(2,-8),(5,-6),(6,-3),(6,-1),(8,0),(7,2),(5,2),(5,5),(2,7),(-2,7),(-5,4),(-6,0)]
 frontal=[(-6,-5),(-4,-8),(3,-8),(6,-5),(6,0),(5,4),(3,7),(-3,7),(-6,4),(-6,-1)]
 poly(d,[q(*p)for p in(profile if view=='side'else frontal)],skin[2],skin[0])
 if view=='side':
  poly(d,[q(-5,-3),q(-2,-2),q(-1,1),q(2,3),q(4,4),q(2,6),q(-1,6),q(-4,3)],skin[1])
  poly(d,[q(0,-6),q(3,-5),q(4,-3),q(3,-1),q(1,-2)],skin[3]);d.point(q(2,-5),fill=hi);d.point(q(6,0),fill=hi)
  poly(d,[q(-4,-1),q(-2,-2),q(-1,0),q(-2,2),q(-4,1)],skin[1],skin[0]);d.point(q(-2,0),fill=skin[3])
 else:
  poly(d,[q(-5,-3),q(-3,-1),q(-3,2),q(0,5),q(2,5),q(0,6),q(-3,4),q(-5,1)],skin[1])
  poly(d,[q(0,-5),q(3,-4),q(4,-1),q(2,0),q(1,-2)],skin[3]);d.point(q(2,-4),fill=hi)
 style=IDENTITIES[team][identity];black,blackShine=HAIR['black']
 shades=style in['shades-bandana','blond-shades','headband-spikes','backwards-cap'];stache=style in['blond-shades','buzz-goatee','backwards-cap']
 def headband(color='#f1f1ec',shade='#a9adb6',v=-4):
  if view=='side':d.line([q(-6,v),q(6,v)],fill=color,width=2);d.line([q(-6,v+1),q(-2,v+1)],fill=shade)
  elif view=='front':d.line([q(-6,v),q(6,v)],fill=color,width=2);d.line([q(-5,v+1),q(5,v+1)],fill=shade)
  else:d.line([q(-6,v),q(6,v)],fill=color,width=2)
 if style=='shades-bandana':
  cloth,lite='#232c62','#4d61b0'
  poly(d,[q(-6,-1),q(-7,-5),q(-5,-9),q(0,-10),q(4,-9),q(6,-6),q(5,-4),q(-3,-4),q(-4,-2)],cloth,skin[0]);d.line([q(-4,-8),q(0,-9),q(3,-8)],fill=lite)
  if view=='side':poly(d,[q(-6,-4),q(-10,-3),q(-11,1),q(-9,0),q(-7,-1)],cloth,skin[0]);d.point(q(-9,-2),fill=lite)
  if view=='back':poly(d,[q(-6,-5),q(6,-5),q(6,-1),q(2,1),q(-2,1),q(-6,-1)],cloth,skin[0]);poly(d,[q(-1,0),q(1,0),q(3,5),q(-2,5)],cloth,skin[0])
 elif style=='headband-spikes':
  poly(d,[q(-6,-1),q(-7,-5),q(-9,-9),q(-5,-8),q(-4,-12),q(-2,-9),q(0,-12),q(2,-9),q(4,-11),q(5,-7),q(6,-5),q(3,-4),q(-3,-4),q(-4,-1)],black,skin[0])
  d.line([q(-4,-9),q(-3,-7)],fill=blackShine);d.line([q(0,-10),q(1,-8)],fill=blackShine)
  if view=='back':poly(d,[q(-6,-5),q(6,-5),q(6,0),q(2,4),q(-2,4),q(-6,0)],black,skin[0])
  headband()
 elif style=='buzz-goatee':
  poly(d,[q(-6,-1),q(-6,-6),q(-3,-9),q(2,-9),q(5,-7),q(5,-5),q(2,-5),q(-2,-5),q(-4,-2)],'#25212b',skin[0]);d.point(q(-2,-7),fill='#4a4452');d.point(q(1,-8),fill='#4a4452')
  if view=='back':poly(d,[q(-6,-5),q(5,-5),q(5,0),q(2,3),q(-2,3),q(-6,0)],'#25212b',skin[0])
 elif style=='blond-shades':
  blond,shine=HAIR['blond'];dark=HAIR['blondDark'][0]
  poly(d,[q(-6,0),q(-8,-3),q(-7,-7),q(-4,-10),q(1,-11),q(5,-9),q(7,-6),q(5,-4),q(2,-5),q(-1,-4),q(-3,-2),q(-4,1)],blond,dark);d.line([q(-4,-9),q(0,-10),q(3,-9)],fill=shine,width=1);d.line([q(-6,-4),q(-5,-1)],fill=dark)
  if view=='back':poly(d,[q(-7,-6),q(-4,-10),q(1,-11),q(6,-8),q(7,-3),q(5,1),q(3,0),q(1,3),q(-1,1),q(-3,3),q(-5,0),q(-7,1)],blond,dark);d.line([q(-4,-8),q(0,-9),q(4,-7)],fill=shine);d.point(q(-2,-5),fill=shine);d.point(q(3,-4),fill=dark)
 elif style=='backwards-cap':
  cap,lite,dark='#c81f2b','#ff5f4e','#6a0e14'
  d.line([q(-6,-3),q(-6,0)],fill=black,width=2)
  poly(d,[q(-6,-4),q(-6,-7),q(-3,-10),q(2,-10),q(5,-7),q(5,-4)],cap,skin[0]);d.line([q(-3,-8),q(1,-9),q(3,-7)],fill=lite)
  if view=='side':poly(d,[q(-6,-6),q(-11,-5),q(-11,-3),q(-6,-4)],dark,skin[0])
  elif view=='front':d.line([q(-1,-6),q(1,-6)],fill=dark);d.line([q(-6,-4),q(5,-4)],fill=dark)
  else:poly(d,[q(-6,-4),q(5,-4),q(6,-2),q(-7,-2)],dark,skin[0]);d.line([q(-2,-6),q(1,-6)],fill='#f2e9d0')
 else:
  hair,shine=HAIR['auburn'];dark=HAIR['auburnDark'][0]
  poly(d,[q(-6,-1),q(-7,-5),q(-5,-9),q(0,-10),q(4,-9),q(6,-6),q(5,-4),q(-3,-4),q(-4,-1)],hair,dark);d.line([q(-3,-8),q(1,-9)],fill=shine)
  if view=='side':poly(d,[q(-6,-4),q(-10,-2),q(-11,3),q(-9,7),q(-8,2),q(-6,0)],hair,dark);d.line([q(-9,-1),q(-10,3)],fill=shine)
  if view=='back':poly(d,[q(-6,-5),q(6,-5),q(6,0),q(2,3),q(-2,3),q(-6,0)],hair,dark);poly(d,[q(-1,2),q(2,2),q(2,9),q(0,10),q(-2,8)],hair,dark)
  headband('#f0c22e','#a07818')
 if view=='back':return
 if view=='side':
  if shades:d.line([q(1,-2),q(6,-2)],fill='#0d0f16',width=2);d.line([q(-3,-2),q(1,-2)],fill='#0d0f16');d.point(q(4,-2),fill='#7e9ccc')
  else:d.line([q(2,-2),q(5,-2)],fill=skin[0],width=1);d.point(q(4,-1),fill=skin[0])
  d.line([q(6,0),q(6,1)],fill=skin[3],width=1);d.line([q(2,4),q(3,4)],fill=skin[1],width=1)
  if stache:d.line([q(3,3),q(6,3)],fill='#3a2216' if style!='blond-shades' else '#9a6a1c',width=1)
  if style=='buzz-goatee':d.line([q(3,5),q(4,5)],fill='#25212b');d.point(q(4,6),fill='#25212b')
 else:
  if shades:d.line([q(-5,-2),q(-1,-2)],fill='#0d0f16',width=2);d.line([q(1,-2),q(5,-2)],fill='#0d0f16',width=2);d.point(q(-3,-2),fill='#7e9ccc');d.point(q(3,-2),fill='#7e9ccc')
  else:d.line([q(-4,-2),q(-2,-2)],fill=skin[0],width=1);d.line([q(2,-2),q(4,-2)],fill=skin[0],width=1);d.point(q(-3,-1),fill=skin[0]);d.point(q(3,-1),fill=skin[0])
  d.line([q(0,-1),q(1,2)],fill=skin[1],width=1);d.point(q(1,1),fill=skin[3]);d.line([q(0,4),q(1,4)],fill=skin[1],width=1)
  if stache:d.line([q(-3,3),q(3,3)],fill='#3a2216' if style!='blond-shades' else '#9a6a1c',width=1)
  if style=='buzz-goatee':d.line([q(-1,5),q(1,5)],fill='#25212b');d.point(q(0,6),fill='#25212b')

def torso_side(d,chest,hip,palette):
 # Spine-aligned jersey: rounded upper back, short loose hem, light on the leading chest.
 kit=palette['shirt'];sx,sy=chest[0]-hip[0],chest[1]-hip[1];l=max(1,math.hypot(sx,sy));nx,ny=-sy/l,sx/l
 def p(t,w):return(hip[0]+sx*t+nx*w,hip[1]+sy*t+ny*w)
 poly(d,[p(-.08,7.5),p(.2,8),p(.55,7),p(.85,6.5),p(1.02,4),p(1.08,0),p(1.05,-3),p(.98,-6.5),p(.8,-9.5),p(.55,-9.5),p(.3,-8.5),p(.05,-8),p(-.1,-7.5)],kit[2],kit[0])
 poly(d,[p(.95,-6),p(.8,-8.5),p(.55,-8.5),p(.3,-7.5),p(.05,-7),p(-.06,-6.5),p(-.06,-3),p(.3,-4),p(.6,-5),p(.85,-4.5)],kit[1])
 poly(d,[p(.97,1),p(.85,5),p(.6,5.5),p(.4,4.5),p(.55,2),p(.8,1)],kit[3])
 d.line([pt(p(-.06,6.5)),pt(p(-.08,-6.5))],fill=kit[1],width=1);d.line([pt(p(.38,3)),pt(p(.14,5))],fill=kit[1],width=1)
 if palette.get('band'):
  bd=palette['band'];poly(d,[p(.36,-8.3),p(.36,7),p(.52,6.8),p(.52,-8.6)],bd[1],bd[0]);d.line([pt(p(.49,-7.5)),pt(p(.49,5.8))],fill=bd[2])
 if palette.get('sleeve'):
  # Raglan shoulder panel in the contrasting sleeve colour.
  s=palette['sleeve'];poly(d,[p(1.05,-3),p(.98,-6.5),p(.8,-9),p(.66,-6),p(.82,-1.5),p(1.03,1)],s[2],s[0]);d.line([pt(p(.8,-8)),pt(p(.7,-5.5))],fill=s[1])
 else:
  # Tank top: deep scoop neck and dark armhole trim.
  t=palette['trim'];d.line([pt(p(1.0,-3)),pt(p(.93,0)),pt(p(1.02,3))],fill=t,width=1);d.line([pt(p(.97,-6)),pt(p(.76,-7)),pt(p(.62,-4.5))],fill=t,width=1)
def torso(d,center,hip,palette,view,roll):
 return vol_torso(d.im,center,hip,palette,view)
def torso_v18(d,center,hip,palette,view,roll):
 if view=='side':return torso_side(d,center,hip,palette)
 x,y=center;hx,hy=hip;kit=palette['shirt'];width=16
 def q(u,v):t=clamp(v/max(1,hy-y),0,1);return(x+(hx-x)*t+u,y+v)
 h=hy-y;waist=12
 poly(d,[q(-width+2,-3),q(-5,-5),q(4,-5),q(width-2,-3),q(width,2),q(width-2,10),q(waist+1,h+1),q(2,h+2),q(-waist,h+1),q(-width+2,10),q(-width,2)],kit[2],kit[0])
 poly(d,[q(-width+1,1),q(-width+4,3),q(-width+4,12),q(-waist+3,h-1),q(-waist,h),q(-width+2,10)],kit[1])
 poly(d,[q(width-4,-1),q(width-1,3),q(width-3,12),q(waist,h),q(waist-3,h-1),q(width-6,8)],kit[1])
 if view=='front':poly(d,[q(-7,1),q(-3,2),q(-2,6),q(-3,12),q(-4,h-5),q(-7,h-3),q(-6,11),q(-7,7)],kit[3])
 d.line([q(-waist,h),q(-1,h+1),q(waist,h)],fill=kit[1],width=2)
 if palette.get('band'):b=palette['band'];poly(d,[q(-width+1,7),q(width-1,7),q(width-2,12),q(-width+2,12)],b[1],b[0]);d.line([q(-width+3,8),q(width-3,8)],fill=b[2])
 if palette.get('sleeve'):
  s=palette['sleeve']
  for side in(-1,1):poly(d,[q(side*(width-1),-3),q(side*(width-5),-5),q(side*(width-6),-1),q(side*(width-3),4),q(side*width,2)],s[2],s[0])
  if view=='front':d.line([q(-4,-4),q(-2,-1),q(2,-1),q(4,-4)],fill=kit[0],width=2)
  else:d.line([q(-4,-3),q(3,-3)],fill=kit[0],width=2)
 else:
  t=palette['trim'];sk=palette['skin']
  for side in(-1,1):poly(d,[q(side*5,-6),q(side*(width-3),-4),q(side*(width-1),0),q(side*(width-5),1),q(side*6,-2)],sk[2],sk[0])
  if view=='front':d.line([q(-5,-5),q(-3,0),q(0,2),q(3,0),q(5,-5)],fill=t,width=2)
  else:d.line([q(-4,-4),q(0,-2),q(4,-4)],fill=t,width=2)
  for side in(-1,1):d.line([q(side*(width-3),-3),q(side*(width-1),4),q(side*(width-2),9)],fill=t,width=1)

def render_character(team,kind,index,count,view,palettes,identity=0,includeHead=True):
 palette=palettes[team];skin=palette['skin'];short=palette['short'];sleeve=palette.get('sleeve')or False;phase=index/max(1,count);stride=math.sin(phase*math.tau);im=Image.new('RGBA',(144,128));d=PixelDraw(im)
 bob=0;hips=[(66,76),(77,76)];chest=(79,55);roll=1;headOffset=0;ankles=[(56,112),(86,112)];knees=[(60,95),(90,94)];hands=[(91,78),(97,73)];elbows=[(72,73),(95,62)];footRoll=[0,0]
 overlay=kind in ['dribble-arm','dribble-switch'];dynamic=kind in ['dribble-body','shot','throw','finish','fake','catch']
 if kind in ['run','dribble-body'] or overlay:
  # V14 deeper forward lean over the ball; feet/hand endpoints unchanged from V13.
  bob=round(-2*math.sin(phase*math.tau*2))if not overlay else 0;running=kind=='run';chest=(83,54+bob)if running else(88,57+bob);hips=[(67,77+bob),(78,77+bob)];roll=0 if not running else 2*stride;headOffset=3 if running else 4
  feet=[(94,112),(87,112),(76,112),(65,112),(53,109),(49,100),(56,86),(67,83),(81,88),(92,96),(98,106),(98,112)]
  kneesPath=[(88,95),(84,95),(79,94),(75,92),(71,87),(71,82),(77,78),(85,80),(92,84),(96,89),(97,94),(94,96)]
  step=index%12;ankles=[feet[(step+6)%12],feet[step]];knees=[(kneesPath[(step+6)%12][0]-9,kneesPath[(step+6)%12][1]+bob),(kneesPath[step][0],kneesPath[step][1]+bob)]
  footRoll=[RIG['gait']['footRollDegrees'][(step+6)%12],RIG['gait']['footRollDegrees'][step]]
  hands=[(81-15*stride,72-8*max(0,stride)),(96+11*stride,69+6*max(0,-stride))];elbows=[(66-5*stride,72-2*stride),(99+4*stride,65+4*stride)]
  if running:
   # V26 reference sprint: elbows bent ~90 degrees, fists pumping opposite to the legs.
   pump=[]
   for sh,th in(((chest[0]-8,chest[1]),.95*stride),((chest[0]+9,chest[1]),-.95*stride)):
    e=(sh[0]+14*math.sin(th),sh[1]+14*math.cos(th));pump.append((e,(e[0]+12*math.cos(th*.45),e[1]-12*math.sin(th*.45)+1)))
   elbows=[pump[0][0],pump[1][0]];hands=[pump[0][1],pump[1][1]]
 elif kind in ['defend','backpedal','neutral-a','neutral-b']:
  t=1-phase if kind=='backpedal'else phase;shuffle=math.sin(t*math.tau)*4 if kind in ['defend','backpedal']else 0
  # V15 reference crouch: hips pushed back, both thighs angled forward, knees together over narrow feet, hands hanging by the knees.
  hips=[(63,82),(71,82)];chest=(82,61);headOffset=6;ankles=[(65+shuffle,112),(80+shuffle,112)];knees=[(70+shuffle*.5,96),(84+shuffle*.5,95)];hands=[(90,84),(98,81)];elbows=[(76,76),(92,73)];footRoll=[0,-4]
  if kind=='neutral-b':chest=(82,62);hips=[(63,83),(71,83)];hands=[(90,85),(98,82)]
  if kind in ['defend','backpedal']:
   # V17 reference defence: arms reach forward at chest height toward the ball, alternating slightly with the shuffle.
   wave=math.sin(t*math.tau)*3;hands=[(104,74+wave),(112,66-wave)];elbows=[(90,71),(102,64)]
 elif kind in ['brake','pivot']:
  t=index/max(1,count-1);chest=(88-4*t,62+3*t);headOffset=3;hips=[(66,81),(78,81)];ankles=[(58+3*t,112),(89-4*t,112)];knees=[(64+3*t,98),(91-3*t,95)];hands=[(91,82),(100,74)];elbows=[(73,77),(99,65)]
 elif kind in ['shot','s-ready','s-rise','s-release','s-follow']:
  # Held wrists follow the authoritative low/high phases; only torso anticipation is smoothed.
  age=index*2 if kind=='shot'else{'s-ready':4,'s-rise':16,'s-release':24,'s-follow':34}[kind];lift=clamp((age-8)/10,0,1);hips=[(65,78-5*lift),(77,78-5*lift)];chest=(78,55-7*lift);roll=-1
  extendT=clamp((age-18)/4,0,1);hands=[(90,54)if age<10 else(82+17*extendT,21-9*extendT),(85,56)if age<10 else(80+17*extendT,24-9*extendT)]
  # V28 reference follow-through: the released arm stays extended through the descent, then lowers.
  if age>26:hands=[mix((99,12),(86,65),clamp((age-36)/14,0,1)),mix((93,15),(92,70),clamp((age-36)/14,0,1))]
  # V15: airborne legs hang straight and together with pointed toes, as in the reference jump shot.
  hang=lift if 10<=age<=48 else 0;ankles=[mix((60,112),(67,106),hang),mix((85,112),(74,107),hang)];knees=[mix((66,95),(68,91),hang),mix((87,93),(75,92),hang)];footRoll=[48*hang,40*hang];elbows=[None,None]
 elif kind in ['throw','p-pass-gather-left','p-pass-extend-left']:
  # V26: drawn facing the receiver (stepping into a two-hand push) and mirrored at the end, so the
  # ball-holding hand endpoints stay exactly where the simulation expects them.
  age=index*2 if kind=='throw'else 4 if kind=='p-pass-gather-left'else 12;t=clamp((age-8)/6,0,1);chest=mix((80,57),(86,55),t);roll=0;headOffset=2;hips=[(66,78),(77,78)];hands=[mix((98,55),(104,44),t),mix((93,58),(99,47),t)];ankles=[(58,112),(90,112)];knees=[(62,96),(87,95)];elbows=[None,None]
 elif kind in ['finish','dunk-gather','dunk-contact']:
  # V11 bounded correction: keep shoulder over the low held ball until its existing age15 lift.
  age=index*3 if kind=='finish'else 9 if kind=='dunk-gather'else 21;t=0 if age<15 else 1;chest=mix((92,62),(85,51),t);hips=[mix((68,78),(65,74),t),mix((79,78),(76,74),t)];roll=-3;headOffset=1;hands=[(117,89)if age<15 else(100,47),(109,92)if age<15 else(92,51)];# V18 reference dunk: legs hang together, slightly bent, toes pointed; arms/shoulders keep the V11 contract.
  ankles=[(64,105),(72,106)]if age<40 else[(60,112),(85,112)];knees=[(67,90),(75,91)]if age<40 else[(64,85),(89,89)];footRoll=[40,34]if age<40 else[0,0];elbows=[None,None]
 elif kind in ['jump-block','a-overhead','a-reach']:
  age=index*2 if kind=='jump-block'else 14 if kind=='a-overhead'else 4;t=clamp((age-28)/16,0,1);chest=(73,48);hips=[(65,73),(77,73)];hands=[mix((77,12),(90,53),t),mix((62,17),(55,62),t)];ankles=[(66,105),(74,106)];knees=[(67,89),(75,90)];footRoll=[46,38];elbows=[None,None]
  # V28 reference block: one straight arm reaches up, the other stays out at shoulder height (no ball held).
  if kind=='jump-block':hands=[mix((79,10),(90,53),t),mix((53,42),(55,62),t)]
 elif kind in ['reach','collect','d-low','d-down']:
  chest=(87,67);hips=[(65,86),(77,86)];hands=[(104,88)if kind=='reach'else(59,103),(93,85)];ankles=[(46,112),(98,112)];knees=[(51,99),(98,97)];elbows=[None,(98,76)];roll=4;headOffset=3
 elif kind in ['recover','land-recover']:
  t=1-index/max(1,count-1);chest=(78,54+9*t);hips=[(65,76+6*t),(77,76+6*t)];hands=[(87,85),(98,80)];elbows=[(69,77),(99,68)];knees=[(58,97),(92,95)];headOffset=round(2*t)
 elif kind=='fake':
  t=math.sin(phase*math.pi);chest=(79,55-3*t);hands=[(83+12*t,77-45*t),(76+12*t,80-45*t)];elbows=[None,None]
 elif kind=='catch':
  chest=(79,55);hands=[mix((96,61),(72,77),min(1,index/5)),mix((89,63),(80,77),min(1,index/5))];elbows=[None,None]
 elif kind in ['carry-front','carry-low','d-push']:
  chest=(82,58);headOffset=2;hands=[(72,77),(80,77)];elbows=[(63,73),(96,73)]
 if view in ['front','back']:
  chest=(72,chest[1]);headOffset=0;roll=0
  if kind in ['run','dribble-body']or overlay:
   ankles=[(62+4*stride,112-max(0,stride)*24),(82-4*stride,112-max(0,-stride)*24)];knees=[(62+4*stride,96-13*max(0,stride)),(84-4*stride,96-13*max(0,-stride))];hands=[(52,76+8*stride),(94,76-8*stride)];elbows=[(52,67+4*stride),(93,67-4*stride)]
  elif kind in ['neutral-a','neutral-b','defend','backpedal']:
   # V16 team-select stance: hips centred, legs straight under them, arms hanging close with hands at hip height.
   sway=(math.sin(phase*math.tau)*2 if kind in ['defend','backpedal']else 0)
   hips=[(65,81),(79,81)];knees=[(63+sway,97),(81+sway,97)];ankles=[(62+sway,112),(82+sway,112)];hands=[(52,86),(92,86)];elbows=[(54,74),(90,74)];chest=(72,62)
   if kind in ['defend','backpedal']:wave=math.sin(phase*math.tau)*3;hands=[(42,70+wave),(102,70-wave)];elbows=[(48,64),(96,64)];knees=[(61+sway,97),(83+sway,97)];ankles=[(58+sway,112),(86+sway,112)]
 nearShoulder=(chest[0]-8,chest[1]-roll);farShoulder=(chest[0]+9,chest[1]+roll)
 if view in ['front','back']:nearShoulder=(chest[0]-13,chest[1]);farShoulder=(chest[0]+13,chest[1])
 if overlay:
  tick=index//4 if kind=='dribble-switch'else index;mixT=[-1,-.5,0,.5][index%4]if kind=='dribble-switch'else 1;j=tick//6;t=(tick%6)/6;e=t*t*(3-2*t);offsets=[14,22,10,14];bx=(offsets[j]+(offsets[j+1]-offsets[j])*e)*mixT;bz=6+30*abs(1-tick/9);wrist=(72+bx,116-max(29,bz+4));elbow=arm(d,nearShoulder,wrist,skin,sleeve=sleeve)
  return export(im),{'feet':[72,116],'hands':[list(wrist)],'ball':[72+bx,116-bz],'shoulder':list(nearShoulder),'elbows':[list(elbow)]}
 farFoot=leg(d,hips[0],knees[0],ankles[0],skin,short,True,view,footRoll[0]);farElbow=arm(d,farShoulder,hands[1],skin,True,-1 if hands[1][1]<farShoulder[1]else 1,sleeve if view!='side'else False,elbows[1])
 hx,hy=mix(hips[0],hips[1],.5);vol_seat(d.im,hips,palette,view)
 nearFoot=leg(d,hips[1],knees[1],ankles[1],skin,short,False,view,footRoll[1]);torso(d,chest,(hx,hy),palette,view,roll)
 compact=kind in ['run','dribble-body','defend','backpedal','neutral-a','neutral-b','brake','pivot','dribble-arm','dribble-switch'];neck=(chest[0]+headOffset,chest[1]-(5 if compact else 8));headCenter=(neck[0]+1,chest[1]-(11 if compact else 14));vol_neck(d.im,(chest[0]+headOffset*.4,chest[1]-1),(headCenter[0],headCenter[1]+3),palette);
 if includeHead:head(d,headCenter,skin,view,team,identity)
 nearElbow=elbows[0]or hinge(nearShoulder,hands[0],21,20,1 if hands[0][1]<nearShoulder[1]else-1)
 # V27: after the shot release the live grip arm stops, so the atlas draws the near (shooting) arm.
 if not dynamic or(kind=='shot'and index*2>=22):nearElbow=arm(d,nearShoulder,hands[0],skin,False,1 if hands[0][1]<nearShoulder[1]else-1,sleeve,nearElbow)
 res=export(im),{'feet':[72,116],'hips':[hx,hy],'shoulders':[list(nearShoulder),list(farShoulder)],'hands':[list(p)for p in hands],'ankles':[list(p)for p in ankles],'knees':[list(p)for p in knees],'toes':[list(farFoot['toe']),list(nearFoot['toe'])],'heels':[list(farFoot['heel']),list(nearFoot['heel'])],'elbows':[list(nearElbow),list(farElbow)],'neck':list(neck),'head':list(headCenter)}
 if view=='side'and kind in['throw','p-pass-gather-left','p-pass-extend-left']:
  from PIL import ImageOps
  img,an=res;img=ImageOps.mirror(img).transform((144,128),Image.Transform.AFFINE,(1,0,-1,0,1,0)) # same 144-x convention as the pack builder
  def fx(v):return[[144-q[0],q[1]]for q in v]if isinstance(v[0],(list,tuple))else[144-v[0],v[1]]
  an={k:(v if k=='feet'else fx(v))for k,v in an.items()};res=(img,an)
 return res
