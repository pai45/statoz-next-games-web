"""Original Hoop Legacy uniform, footwear, hair and fitted CC0 eye/card assets.
Offline authored geometry; coordinates match the supplied 19-bone bind pose.
Generated mesh data is dedicated to CC0. MakeHuman proxy notices are preserved.
"""
import os, sys, math, json
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common, mh
from mathutils.kdtree import KDTree

A=common.args(); BUILD=A['build']; CACHE=A['cache']; RIG=common.load_rig(A['rig'])
BONES=[b['name'] for b in RIG['bones']]; IDX={n:i for i,n in enumerate(BONES)}
BODY=np.load(os.path.join(BUILD,'body','lod0_body.npz'))
SHAPES=np.load(os.path.join(BUILD,'body','shapes.npz'))
HEAD=np.load(os.path.join(BUILD,'body','lod0_head.npz'))
V=SHAPES['V'][0]; shape_names=SHAPES['names'].tolist()
KD=KDTree(len(BODY['positions']))
for i,p in enumerate(BODY['positions']): KD.insert(p,i)
KD.balance()
raw=json.load(open(os.path.join(BUILD,'raw','lod0','body.json')))
binary=np.fromfile(os.path.join(BUILD,'raw','lod0','body.bin'),np.uint8)
def attribute(name):
 d=raw['meshes'][0]['attributes'][name];return np.frombuffer(binary.data,dtype=d['dtype'],count=d['count']*d['size'],offset=d['offset']).reshape(-1,d['size'])
BODY_J=attribute('JOINTS_0');BODY_W=attribute('WEIGHTS_0')
BODY_M={}
for target in raw['meshes'][0]['morphs']:
 if target['name'].startswith('build_'):
  d=target['POSITION'];BODY_M[target['name']]=np.frombuffer(binary.data,dtype=d['dtype'],count=d['count']*d['size'],offset=d['offset']).reshape(-1,d['size'])

def normals(p,t):
 n=np.zeros_like(p);f=np.cross(p[t[:,1]]-p[t[:,0]],p[t[:,2]]-p[t[:,0]])
 for k in range(3):np.add.at(n,t[:,k],f)
 return n/np.maximum(1e-12,np.linalg.norm(n,axis=1,keepdims=True))
def part(p,t,uv=None,zone=0,bone=None):
 p=np.asarray(p,float);t=np.asarray(t,int).reshape(-1,3)
 if bone is None:
  ids=np.array([KD.find(x)[1] for x in p]);j=BODY_J[ids];w=BODY_W[ids]
 else:
  j=np.zeros((len(p),4),np.uint16);j[:,0]=IDX[bone];w=np.zeros((len(p),4));w[:,0]=1
 return dict(positions=p,normals=normals(p,t),indices=t,uvs=np.asarray(uv if uv is not None else np.zeros((len(p),2))),joints=j,weights=w,colors=np.tile([zone,0,0,1],(len(p),1)),morphs=[],tangents=False)
def join(parts):
 out={k:np.concatenate([p[k] for p in parts])for k in ['positions','normals','uvs','joints','weights','colors']}
 out['indices']=np.concatenate([p['indices']+sum(len(x['positions'])for x in parts[:i])for i,p in enumerate(parts)])
 morph_names=sorted(set(m[0]for p in parts for m in p.get('morphs',[])))
 morphs=[]
 for name in morph_names:
  deltas=[]
  for p in parts:
   found=next((m[1]for m in p.get('morphs',[])if m[0]==name),None);deltas.append(found if found is not None else np.zeros_like(p['positions']))
  morphs.append((name,np.concatenate(deltas).astype(np.float32),None))
 out.update(name='surface',morphs=morphs,tangents=False);return out
def tube(points,radius,sides=6,zone=0,bone=None):
 points=np.asarray(points,float);ps=[];uv=[];faces=[];previous=None
 for i,c in enumerate(points):
  tangent=points[min(i+1,len(points)-1)]-points[max(0,i-1)];tangent/=max(1e-12,np.linalg.norm(tangent))
  # Parallel transport avoids the frame flips that made curved locks look like ribbons.
  u=np.cross(tangent,[0,0,1]if abs(tangent[2])<.9 else[0,1,0])if previous is None else previous-tangent*np.dot(previous,tangent)
  u/=max(1e-12,np.linalg.norm(u));v=np.cross(tangent,u);previous=u
  for k in range(sides):
   a=k*2*math.pi/sides;ps.append(c+radius*(u*math.cos(a)+v*math.sin(a)));uv.append([k/sides,i/max(1,len(points)-1)])
 for i in range(len(points)-1):
  for k in range(sides):
   a=i*sides+k;b=i*sides+(k+1)%sides;c=a+sides;d=b+sides;faces.extend([[a,b,c],[b,d,c]])
 for ring,reverse in [(0,True),(len(points)-1,False)]:
  centre=len(ps);ps.append(points[ring]);uv.append([.5,ring/max(1,len(points)-1)])
  for k in range(sides):
   f=[centre,ring*sides+k,ring*sides+(k+1)%sides];faces.append(f[::-1]if reverse else f)
 return part(ps,faces,uv,zone,bone)
def emit(name,slot,parts,level,variant=None,extras=None):
 mesh=join(parts);mesh['name']=name
 common.write_raw(os.path.join(BUILD,'raw',level,name),BONES,[mesh])
 dest=os.path.join(BUILD,'meta',name+'.json');meta=json.load(open(dest))if os.path.exists(dest)else dict(name=name,slot=slot,variant=variant,license='CC0-1.0 (original Hoop Legacy toolchain geometry)',levels={},extras=extras or {})
 meta['levels'][level]={'raw':f'raw/{level}/{name}.json'};common.write_meta(BUILD,name,meta)

def uniform(level):
 hero=level=='hero';N=96 if hero else 56;R=42 if hero else 26
 ps=[];uv=[];faces=[]
 # A continuous pattern boundary: shaped V neckline, shoulder bridges and smooth armholes.
 def smooth_lerp(x,xs,vs):
  i=max(0,min(len(xs)-2,int(np.searchsorted(xs,x)-1)));t=np.clip((x-xs[i])/(xs[i+1]-xs[i]),0,1);t=t*t*(3-2*t);return vs[i]*(1-t)+vs[i+1]*t
 for j in range(R+1):
  t=j/R
  for k in range(N+1):
   u=k/N;a=(u-.5)*math.tau;theta=abs(a)
   top=smooth_lerp(theta,[0,.38,.62,.88,1.25,math.pi/2,1.9,2.25,2.55,math.pi],[.802,.828,.851,.842,.774,.737,.779,.848,.854,.84])
   y=.56+(top-.56)*t
   rx=np.interp(y,[.56,.61,.68,.74,.79,.825,.85,.867],[.087,.090,.098,.115,.126,.140,.125,.090])
   rz=np.interp(y,[.56,.61,.68,.74,.79,.825,.85,.867],[.061,.064,.069,.078,.080,.078,.070,.054])
   fold=(.0012*math.sin(a*11+y*60)+.0015*math.sin(a*19-y*32))*(.25+.75*(1-t))
   ps.append([(rx+fold)*math.sin(a),y+.0009*math.sin(a*9)*math.sin(t*math.pi),.018+(rz+fold)*math.cos(a)])
   uv.append([u,(.885-y)/(.885-.528)])
 for j in range(R):
  for k in range(N):
   a=j*(N+1)+k;b=a+1;c=a+N+1;d=c+1;faces.extend([[a,b,c],[b,d,c]])
 jersey=part(ps,faces,uv,0)
 # Bound edges carry raised knit binding, rather than an infinitely thin cut.
 edges={}
 for f in faces:
  for i in range(3):
   key=tuple(sorted((f[i],f[(i+1)%3])));edges[key]=edges.get(key,0)+1
 parts=[jersey]
 # Join the front and back over each shoulder: the garment has a neck and two
 # armholes, rather than leaving the two shoulder edges unattached.
 top=np.asarray(ps[R*(N+1):(R+1)*(N+1)])
 def edge(a):
  a=(a+math.pi)%math.tau-math.pi
  k=(a/math.tau+.5)*N;i=int(k);return top[min(i,N)]*(1-(k-i))+top[min(i+1,N)]*(k-i)
 for lo,hi in [(-.4,.4),(.92,math.pi-.92),(math.pi-.4,math.pi+.4),(-math.pi+.92,-.92)]:
  parts.append(tube([edge(a)for a in np.linspace(lo,hi,40 if hero else 18)],.0011,8 if hero else 6,zone=.5))
 for sign in [-1,1]:
  pp=[];uu=[];tt=[];across=18 if hero else 12;along=18 if hero else 12
  for j in range(along+1):
   s=j/along
   for k in range(across+1):
    t=k/across;a=sign*(.40+.52*t);front=edge(a);back=edge(sign*math.pi-a)
    p=front*(1-s)+back*s
    # Drape the bridge over the real shoulder surface, keeping both stitched
    # edges fixed. A guessed arch floats above this conformed body's shoulders.
    bp=BODY['positions'];bt=BODY['tris'];aa=bp[bt[:,0]];bb=bp[bt[:,1]];cc=bp[bt[:,2]]
    den=(bb[:,2]-cc[:,2])*(aa[:,0]-cc[:,0])+(cc[:,0]-bb[:,0])*(aa[:,2]-cc[:,2]);valid=np.abs(den)>1e-12;den=np.where(valid,den,1)
    u=((bb[:,2]-cc[:,2])*(p[0]-cc[:,0])+(cc[:,0]-bb[:,0])*(p[2]-cc[:,2]))/den
    v=((cc[:,2]-aa[:,2])*(p[0]-cc[:,0])+(aa[:,0]-cc[:,0])*(p[2]-cc[:,2]))/den
    yy=u*aa[:,1]+v*bb[:,1]+(1-u-v)*cc[:,1];hit=valid&(u>=0)&(v>=0)&(u+v<=1)&(yy>.76)&(yy<.89)
    if hit.any():
     blend=math.sin(s*math.pi)**.6;p[1]=p[1]*(1-blend)+(float(yy[hit].max())+.007)*blend
    pp.append(p);uu.append([.5+a/math.tau,(.885-p[1])/(.885-.528)])
  for j in range(along):
   for k in range(across):
    a=j*(across+1)+k;b=a+1;c=a+across+1;d=c+1;tt.extend([[a,b,c],[b,d,c]])
  if sign<0:tt=[f[::-1]for f in tt]
  panel=part(pp,tt,uu,0)
  # Interpolate the radial fabric normal into the shoulder turn to avoid a
  # separate bright patch where the two pattern pieces meet.
  for j in range(along+1):
   s=j/along
   for k in range(across+1):
    a=sign*(.40+.52*k/across);nn=np.array([math.sin(a),1.25*math.sin(s*math.pi),math.cos(a)*(1-2*s)])
    panel['normals'][j*(across+1)+k]=nn/max(1e-12,np.linalg.norm(nn))
  parts.append(panel)
  for k in [0,across]:parts.append(tube([pp[j*(across+1)+k]for j in range(along+1)],.0011,8 if hero else 6,zone=.5))
 for side in[1,-1]:
  ps=[];uv=[];faces=[];nr=18 if hero else 12;ns=64 if hero else 40
  for j in range(nr+1):
   t=j/nr;y=.615-t*.296;cx=side*(.043+.033*t);rad=.059+.005*math.sin(t*math.pi)
   for k in range(ns+1):
    u=k/ns;a=(u-.5)*math.tau;fold=.0015*math.cos(a*10+t*5)*math.sin(t*math.pi)
    ps.append([cx+(rad+fold)*math.sin(a),y+.001*math.cos(a*9)*t,.013+(.069-.012*t+fold)*math.cos(a)])
    uv.append([u,float(np.clip((.612-y)/(.612-.29),0,1))])
  for j in range(nr):
   for k in range(ns):
    a=j*(ns+1)+k;b=a+1;c=a+ns+1;d=c+1;faces.extend([[a,b,c],[b,d,c]])
  parts.append(part(ps,faces,uv,1))
  cuff=[ps[nr*(ns+1)+k]for k in range(ns+1)];parts.append(tube(cuff,.0018,5,zone=.5))
 # Tailored waistband: an actual fabric surface between its two bound edges.
 band_p=[];band_uv=[];band_t=[]
 for j in range(3):
  for k in range(65):
   a=k*math.tau/64;band_p.append([.103*math.sin(a),.604+j*.0065,.013+.077*math.cos(a)]);band_uv.append([k/64,j/2])
 for j in range(2):
  for k in range(64):
   a=j*65+k;b=a+1;c=a+65;d=c+1;band_t.extend([[a,b,c],[b,d,c]])
 parts.append(part(band_p,band_t,band_uv,1))
 for y in[.605,.617]:
  points=[[.104*math.sin(a),y,.015+.075*math.cos(a)]for a in np.linspace(0,math.tau,65)]
  parts.append(tube(points,.0026 if y>.61 else .0012,6,zone=.5))
 mesh=join(parts)
 body_ids=np.array([KD.find(x)[1]for x in mesh['positions']]);shoulder=mesh['positions'][:,1]>.73
 # Build morphs scale cloth around its centre, while keeping the shoulder span stable.
 for name,sx,sz in [('build_lean',.955,.94),('build_heavy',1.085,1.11),('build_muscular',1.04,1.04)]:
  p=mesh['positions'];delta=np.zeros_like(p);delta[:,0]=p[:,0]*(sx-1);delta[:,2]=(p[:,2]-.015)*(sz-1)
  # Shoulder height and width must follow the same build target as the body.
  # Scaling only x/z left muscular shoulders poking through the fitted straps.
  if name in BODY_M:delta[shoulder]=BODY_M[name][body_ids[shoulder]]
  mesh['morphs'].append((name,delta.astype(np.float32),None))
 common.write_raw(os.path.join(BUILD,'raw',level,'uniform'),BONES,[mesh])
 dest=os.path.join(BUILD,'meta','uniform.json');meta=json.load(open(dest))if os.path.exists(dest)else dict(name='uniform',slot='uniform',license='CC0-1.0 (original tailored basketball uniform)',levels={},extras={'printUV':'legacy-world-height-wrap','binding':'raised neck, armhole, waist and cuff piping','wrinkles':'authored rest drape, not runtime cloth simulation'})
 meta['levels'][level]={'raw':f'raw/{level}/uniform.json'};common.write_meta(BUILD,'uniform',meta)

def shoes(level):
 parts=[];hero=level=='hero';n=48 if hero else 32
 for side in['L','R']:
  bone='foot'+side;M=np.array(RIG['byName'][bone]['bindMatrix']).reshape(4,4).T
  def world(p):return(np.c_[np.asarray(p),np.ones(len(p))]@M.T)[:,:3]
  def shell(zone,levels):
   ps=[];uv=[];faces=[]
   for j,(y,w,back,front)in enumerate(levels):
    for k in range(n+1):
     a=k*math.tau/n;z=.5*(front+back)+.5*(front-back)*math.cos(a)
     # An asymmetric, squared toe last and sprung forefoot.
     x=w*math.copysign(abs(math.sin(a))**.8,math.sin(a));spring=.006*max(0,(z-.065)/.067)**2
     ps.append([x,y+spring,z]);uv.append([k/n,j/max(1,len(levels)-1)])
   for j in range(len(levels)-1):
    for k in range(n):
     a=j*(n+1)+k;b=a+1;c=a+n+1;d=c+1;faces.extend([[a,b,c],[b,d,c]])
   if zone==.6:
    centre=len(ps);ps.append([0,levels[0][0],.05]);uv.append([.5,.5])
    for k in range(n):faces.append([centre,k+1,k])
   parts.append(part(world(ps),faces,uv,zone,bone))
  shell(.6,[(-.039,.023,-.032,.134),(-.036,.028,-.034,.136),(-.033,.028,-.033,.134)])
  shell(.4,[(-.033,.028,-.033,.134),(-.024,.028,-.032,.13),(-.021,.025,-.029,.126)])
  shell(0,[(-.021,.025,-.029,.126),(-.014,.027,-.027,.12),(-.006,.023,-.026,.10),(.008,.021,-.025,.035),(.025,.020,-.025,.024)])
  shell(.2,[(-.022,.0255,-.031,.075),(-.015,.0255,-.03,.07),(.012,.022,-.028,.016)])
  # Padded collar, tongue and raised eye-stays.
  collar=[[.0205*math.sin(a),.025,-.001+.024*math.cos(a)]for a in np.linspace(0,math.tau,n+1)]
  parts.append(tube(world(collar),.0033,8,.8,bone))
  tongue=[[-.014,.016,.027],[.014,.016,.027],[-.014,-.008,.082],[.014,-.008,.082]]
  parts.append(part(world(tongue),[[0,2,1],[1,2,3]],[[0,0],[1,0],[0,1],[1,1]],.2,bone))
  for k in range(7 if hero else 5):
   z=.032+k*.007;y=.014-k*.0032
   points=[[-.014,y,z],[0,y+.003,z+.002],[.014,y,z+.004]]
   parts.append(tube(world(points),.0009,6,.8,bone))
  for sign in[-1,1]:
   points=[[sign*.016,.018-k*.0034,.029+k*.0068]for k in range(8)]
   parts.append(tube(world(points),.0015,6,.2,bone))
   # Generic sculpted side panels, no logos or brand marks.
   ps=[[sign*.027,-.014,.013],[sign*.027,-.018,.078],[sign*.024,-.006,.057],[sign*.022,.006,.015]]
   parts.append(part(world(ps),[[0,1,2],[0,2,3]],[[0,0],[1,0],[1,1],[0,1]],.2,bone))
  # Outsole tooling survives the gameplay silhouette.
  for k in range(9 if hero else 5):
   z=-.02+k*.015;points=[[-.023,-.036,z],[0,-.038,z+.003],[.023,-.036,z]]
   parts.append(tube(world(points),.0012,4,.6,bone))
 emit('shoes','shoes',parts,level,extras={'soleY':-.039,'footwear':'original mid-top, layered sole, heel counter, tongue, laces and unbranded side panels'})

def proxy(name,folder,filename,level,slot):
 binding=mh.Mhclo(os.path.join(folder,filename));obj=mh.Obj(binding.obj_file);P=binding.fit(V)
 p=[];uv=[];faces=[];mapping={}
 for fi,f in enumerate(obj.f):
  if len(f)<3:continue
  ids=[]
  for k,vi in enumerate(f):
   key=(vi,obj.ft[fi][k])
   if key not in mapping:
    mapping[key]=len(p);p.append(P[vi]);t=obj.vt[key[1]]if key[1]>=0 else[0,0];uv.append([t[0],1-t[1]])
   ids.append(mapping[key])
  for k in range(1,len(ids)-1):faces.append([ids[0],ids[k],ids[k+1]])
 mesh=part(p,faces,uv,0,'head')
 for i,shape in enumerate(shape_names):
  if not shape.startswith('face_'):continue
  target=binding.fit(SHAPES['V'][i]);d=np.array([target[key[0]]-P[key[0]]for key in mapping]);mesh['morphs'].append((shape,d.astype(np.float32),None))
 mesh['name']=name;common.write_raw(os.path.join(BUILD,'raw',level,name),BONES,[mesh])
 dest=os.path.join(BUILD,'meta',name+'.json');meta=json.load(open(dest))if os.path.exists(dest)else dict(name=name,slot=slot,license='CC0-1.0 (fitted MakeHuman system asset)',levels={},extras={})
 meta['levels'][level]={'raw':f'raw/{level}/{name}.json'};common.write_meta(BUILD,name,meta)
 return mesh

def hair(style,level):
 if style in ['afro','hightop']:
  mesh=proxy('hair-'+style,os.path.join(CACHE,'mhsys','hair','afro01'),'afro01.mhclo',level,'hair')
  if style=='hightop':
   p=mesh['positions'];p[:,0]*=.88;p[:,2]=.025+(p[:,2]-.025)*.88
   p[:,1]=np.where(p[:,1]>.976,.976+np.minimum((p[:,1]-.976)*1.5,.048),p[:,1])
   mesh['normals']=normals(p,mesh['indices']);common.write_raw(os.path.join(BUILD,'raw',level,'hair-'+style),BONES,[mesh])
  dest=os.path.join(BUILD,'meta','hair-'+style+'.json');meta=json.load(open(dest));meta.update(variant=style,license='CC0-1.0 (fitted MakeHuman afro01 hair cards)',extras={'source':'mhsys/hair/afro01','alphaTest':.35});common.write_meta(BUILD,'hair-'+style,meta)
  return
 hero=level=='hero';n=64 if hero else 40;rows=20 if hero else 12;parts=[]
 ps=[];uv=[];faces=[]
 for j in range(rows+1):
  v=j/rows
  for k in range(n+1):
   u=k/n;a=u*math.tau;maxpolar=1.38+.13*math.cos(a);pol=.025+maxpolar*v
   rx=.0505;ry=.061;rz=.0575;cy=.948;cz=.025
   if style=='afro':rx+=.017;ry+=.021;rz+=.017
   if style=='hightop':rx+=.006;ry+=.032;rz+=.006;cy+=.004
   wobble=(.0004 if style in['buzz','fade','waves']else .0018)*math.sin(a*19+v*15)*math.sin(v*math.pi)
   y=cy+(ry+wobble)*math.cos(pol)
   if style=='hightop':y=min(y,1.035+.0008*math.sin(a*17))
   ps.append([(rx+wobble)*math.sin(pol)*math.sin(a),y,cz+(rz+wobble)*math.sin(pol)*math.cos(a)])
   uv.append([u,v])
 for j in range(rows):
  for k in range(n):
   a=j*(n+1)+k;b=a+1;c=a+n+1;d=c+1;faces.extend([[a,b,c],[b,d,c]])
 faces=[list(reversed(f))for f in faces]
 if style in ['buzz','fade','waves','twists','braids','locs','bun']:
  source=HEAD;pp=source['positions'].copy();nn=source['normals'];front=np.clip((pp[:,2]-.018)/.055,0,1)
  line=.942+.029*front
  mask=pp[:,1]>line
  tt=source['tris'][mask[source['tris']].all(1)]
  pp+=nn*(.0010 if style in ['buzz','fade']else .0017)
  if style=='waves':pp+=nn*(.00035*np.sin(pp[:,1:2]*1100+pp[:,0:1]*150))
  if style not in ['braids','locs','twists']:parts.append(part(pp,tt,source['uv'],0,'head'))
 else:
  parts.append(part(ps,faces,uv,0,'head'))
 def crown(x,z):
  # Intersect the actual scalp triangles; nearest vertices can be on the far side.
  p=HEAD['positions'];t=HEAD['tris'];a=p[t[:,0]];b=p[t[:,1]];c=p[t[:,2]]
  denominator=(b[:,2]-c[:,2])*(a[:,0]-c[:,0])+(c[:,0]-b[:,0])*(a[:,2]-c[:,2]);valid=np.abs(denominator)>1e-12
  denominator=np.where(valid,denominator,1)
  u=((b[:,2]-c[:,2])*(x-c[:,0])+(c[:,0]-b[:,0])*(z-c[:,2]))/denominator
  v=((c[:,2]-a[:,2])*(x-c[:,0])+(a[:,0]-c[:,0])*(z-c[:,2]))/denominator
  hit=valid&(u>=-.0001)&(v>=-.0001)&(u+v<=1.0001)
  yy=u*a[:,1]+v*b[:,1]+(1-u-v)*c[:,1]
  return max(.955,float(yy[hit].max())+.002) if hit.any() else .955
 if style in['twists','locs']:
  count=86 if style=='twists' else 60
  for k in range(count):
   a=k*2.39996;rad=.047*math.sqrt((k+.5)/count);x=rad*math.cos(a);z=.025+rad*1.05*math.sin(a)
   rooty=crown(x,z);length=(.020 if style=='twists'else .055)*(1+.15*math.sin(k*17))
   if z>.05:length*=.7
   points=[]
   for t in np.linspace(0,1,20 if hero else 14):
    outward=.018*t*t
    points.append([x+outward*math.cos(a)+.00065*math.sin(t*24+a),rooty+.014*math.sin(t*math.pi*.9)-length*t*t,z+outward*math.sin(a)+.00065*math.cos(t*24+a)])
   parts.append(tube(points,.0028 if style=='twists'else .0032,8,1,'head'))
 if style=='braids':
  for k in range(11):
   x=(k-5)*.008
   for strand in range(3):
    points=[]
    for t in np.linspace(0,1,54 if hero else 40):
     z=.069-.097*t;yy=crown(x,z)+.003;phase=t*math.pi*22+strand*math.tau/3
     points.append([x+.0013*math.cos(phase),yy+.0013*math.sin(phase),z])
    parts.append(tube(points,.0013,6,1,'head'))
 if style=='bun':
  for k in range(18):
   a=k*math.tau/18;points=[]
   for t in np.linspace(0,math.tau,18):points.append([.020*math.sin(t)*math.cos(a),1.007+.018*math.cos(t),-.013+.020*math.sin(t)*math.sin(a)])
   parts.append(tube(points,.0025,6,0,'head'))
 emit('hair-'+style,'hair',parts,level,variant=style)

def gear(level):
 def band(n,ys,rx,rz,cz,bone,M=None):
  ps=[];uv=[];faces=[]
  for j,y in enumerate(ys):
   for k in range(n+1):
    a=k*math.tau/n;ps.append([rx*math.sin(a),y,cz+rz*math.cos(a)]);uv.append([k/n,j/(len(ys)-1)])
  if M is not None:ps=(np.c_[ps,np.ones(len(ps))]@M.T)[:,:3]
  for j in range(len(ys)-1):
   for k in range(n):
    a=j*(n+1)+k;b=a+1;c=a+n+1;d=c+1;faces.extend([[a,b,c],[b,d,c]])
  return part(ps,faces,uv,0,bone)
 head=[band(64,[.951,.955,.961,.966],.0525,.0585,.025,'head')];wrist=[]
 for side in['L','R']:
  b=RIG['byName']['forearm'+side];M=np.array(b['bindMatrix']).reshape(4,4).T
  wrist.append(band(32,[-.124,-.118,-.110],.0175,.0175,0,'forearm'+side,M))
 for p in wrist:p['colors'][:,0]=1
 emit('gear','gear',head+wrist,level)

for level in['lod1','lod0','hero']:
 uniform(level);shoes(level);gear(level)
 proxy('eyes',os.path.join(CACHE,'makehuman','eyes','high-poly'),'high-poly.mhclo',level,'eyes')
 brows=proxy('brows',os.path.join(CACHE,'mhsys','eyebrows','eyebrow001'),'eyebrow001.mhclo',level,'brows')
 lashes=proxy('lashes',os.path.join(CACHE,'mhsys','eyelashes','eyelashes01'),'eyelashes01.mhclo',level,'lashes')
 lashes['colors'][:,0]=1
 emit('faceCards','faceCards',[brows,lashes],level)
 for style in['buzz','fade','waves','afro','hightop','twists','braids','locs','bun']:hair(style,level)
 print('[outfit]',level,'complete',flush=True)
