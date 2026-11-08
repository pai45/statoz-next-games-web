"""Original garment topology, anatomical refinements and continuous goalkeeper gloves."""
import bpy,math,argparse,sys,json
from pathlib import Path
from mathutils import Vector
p=argparse.ArgumentParser();p.add_argument('--source',required=True);p.add_argument('--output',required=True);a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);out=Path(a.output).resolve();out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(Path(a.source).resolve()));scene=bpy.context.scene;rig=bpy.data.objects['FootballRig'];assert len(rig.data.bones)==60;rig.animation_data.action=None
for b in rig.pose.bones:b.location=(0,0,0);b.rotation_euler=(0,0,0);b.scale=(1,1,1)
def smoothstep(a,b,x):
 t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
def gauss(x,c,w):return math.exp(-((x-c)/w)**2)
def rebuild(ob,points,faces,materials,indices,weights,uvs):
 mesh=bpy.data.meshes.new(ob.data.name+'_authored');mesh.from_pydata(points,[],faces);mesh.update()
 for m in materials:mesh.materials.append(m)
 ob.data=mesh;ob.vertex_groups.clear();groups={}
 for ws in weights:
  for name,w in ws:
   if name not in groups:groups[name]=ob.vertex_groups.new(name=name)
 for i,ws in enumerate(weights):
  for name,w in ws:groups[name].add([i],w,'REPLACE')
 uv=mesh.uv_layers.new(name='GarmentUV')
 for i,f in enumerate(mesh.polygons):
  f.use_smooth=True;f.material_index=indices[i]
  for n,loop in enumerate(f.loop_indices):uv.data[loop].uv=uvs[i][n]
 return mesh
for ob in list(scene.objects):
 if ob.type!='MESH':continue
 lod=int(ob.get('lod',0))
 if ob.name.startswith('Jersey'):
  old=ob.data;points=[v.co.copy() for v in old.vertices];weights=[[(ob.vertex_groups[g.group].name,g.weight) for g in v.groups] for v in old.vertices];faces=[];indices=[];uvs=[]
  for face in old.polygons:
   c=sum((points[i] for i in face.vertices),Vector())/len(face.vertices)
   if 1.07<c.z<1.45 and abs(c.x)<.218:continue
   faces.append(tuple(face.vertices));indices.append(face.material_index);uvs.append([tuple(old.uv_layers.active.data[i].uv) for i in face.loop_indices])
  segments=64 if lod==0 else 40
  heights=sorted(set([1.07+i*(1.45-1.07)/(32 if lod==0 else 22) for i in range((32 if lod==0 else 22)+1)]+[1.10,1.30,1.32,1.37,1.45]))
  profiles=[(1.07,.158,.117),(1.10,.16,.119),(1.20,.173,.131),(1.30,.187,.144),(1.40,.204,.145),(1.45,.211,.134)]
  start=len(points)
  for z in heights:
   for first,second in zip(profiles,profiles[1:]):
    if first[0]<=z<=second[0]:
     t=(z-first[0])/(second[0]-first[0]);rx=first[1]*(1-t)+second[1]*t;ry=first[2]*(1-t)+second[2]*t;break
   for k in range(segments):
    theta=2*math.pi*k/segments;c=math.cos(theta);s=math.sin(theta);x=rx*math.copysign(abs(c)**.9,c)
    gather=gauss(z,1.10,.04);fold=.0018*gather*math.sin(k/segments*math.pi*14+z*14)+.0007*gauss(abs(x),.14,.045)*math.sin(z*65+abs(x)*20)
    y=(ry+fold)*math.copysign(abs(s)**.85,s);points.append(Vector((x,y,z)))
    blend=max(0,min(1,(z-1.08)/.22));weights.append([('spine',1-blend),('chest',blend)])
  for row in range(len(heights)-1):
   for k in range(segments):
    n=(k+1)%segments;i=start+row*segments+k;j=start+row*segments+n;face=(i,j,j+segments,i+segments);faces.append(face)
    z=(heights[row]+heights[row+1])/2;x=sum(points[t].x for t in face)/4
    indices.append(1 if 1.30<z<1.32 else 2 if abs(x)>.185 and z<1.37 else 0)
    u=k/segments;un=(k+1)/segments;uvs.append([(u,heights[row]*2),(un,heights[row]*2),(un,heights[row+1]*2),(u,heights[row+1]*2)])
  # Sew retained sleeve/shoulder cut edges to the new torso loft.
  # Bridge faces share the original edge and actual loft vertices; no floating panels.
  boundary={}
  for f in faces:
   if all(i<start for i in f):
    for n,i in enumerate(f):
     j=f[(n+1)%len(f)];edge=tuple(sorted((i,j)))
     if edge in boundary:boundary[edge]=None
     else:boundary[edge]=(i,j)
  def nearest_loft(index):
   co=points[index];row=min(range(len(heights)),key=lambda r:abs(heights[r]-co.z));ring=[start+row*segments+k for k in range(segments)]
   return min(ring,key=lambda n:(points[n]-co).length_squared)
  for edge in boundary.values():
   if edge is None:continue
   i,j=edge;c=(points[i]+points[j])*.5
   if not(1.069<c.z<1.451 and abs(c.x)<.245):continue
   n,m=nearest_loft(i),nearest_loft(j);bridge=(j,i,n,m) if n!=m else (j,i,n)
   if len(set(bridge))<3:continue
   faces.append(bridge);indices.append(1 if 1.30<c.z<1.32 else 0)
   uvs.append([(.5+math.atan2(points[k].y,points[k].x)/(2*math.pi),points[k].z*2) for k in bridge])
  rebuild(ob,points,faces,list(old.materials),indices,weights,uvs)
 if ob.name.startswith('Glove_'):
  side=ob.name.split('_')[1];sign=1 if side=='L' else -1;points=[];faces=[];indices=[];weights=[];uvs=[]
  segments=20 if lod==0 else 12
  def face(indices_,material=0):faces.append(tuple(indices_));indices.append(material);uvs.append([(0,0),(1,0),(1,1),(0,1)][:len(indices_)])
  def ellipsoid(center,scale,bone,material,rings=None):
   rings=rings or (14 if lod==0 else 10)
   start=len(points)
   for j in range(rings+1):
    phi=math.pi*j/rings
    for k in range(segments):
     theta=2*math.pi*k/segments;points.append(Vector((center[0]+scale[0]*math.sin(phi)*math.cos(theta),center[1]+scale[1]*math.sin(phi)*math.sin(theta),center[2]+scale[2]*math.cos(phi))));weights.append([(bone,1)])
   for j in range(rings):
    for k in range(segments):a=start+j*segments+k;b=start+j*segments+(k+1)%segments;face((a,b,b+segments,a+segments),material)
  # Curved padded latex palm and shaped back; both follow the actual hand bone.
  ellipsoid((sign*.438,-.123,.843),(.040,.026,.048),'hand_'+side,0)
  ellipsoid((sign*.438,-.101,.846),(.037,.014,.043),'hand_'+side,1)
  ellipsoid((sign*.435,-.112,.904),(.054,.040,.055),'forearm_'+side,1)
  for finger in range(5):
   bones=[rig.data.bones[f'finger_{finger}_{j}_{side}'] for j in range(3)];start=len(points);rows=17 if lod==0 else 13
   for row in range(rows):
    q=row/(rows-1)*3;j=min(2,int(q));t=q-j;b=bones[j];center=b.head_local.lerp(b.tail_local,t);axis=(b.tail_local-b.head_local).normalized();across=axis.cross(Vector((0,1,0))).normalized();depth=axis.cross(across).normalized()
    radius=(.0102 if finger==0 else .0083)*(1-.18*row/(rows-1));tip=1-smoothstep(.88,1,row/(rows-1));radius*=max(.08,tip)
    ws=[(b.name,1)]
    if j<2 and t>.65:blend=(t-.65)/.35;ws=[(b.name,1-blend),(bones[j+1].name,blend)]
    for k in range(segments):
     theta=2*math.pi*k/segments;points.append(center+across*(math.cos(theta)*radius)+depth*(math.sin(theta)*radius*.94));weights.append(ws)
   for row in range(rows-1):
    for k in range(segments):a=start+row*segments+k;b=start+row*segments+(k+1)%segments;face((a,b,b+segments,a+segments),0 if k<segments//2 else 1)
   # Rounded tips are closed, so no detached padded beads are visible.
   face(tuple(start+(rows-1)*segments+k for k in reversed(range(segments))),0);uvs[-1]=[(.5+.5*math.cos(k*2*math.pi/segments),.5+.5*math.sin(k*2*math.pi/segments)) for k in range(segments)]
  rebuild(ob,points,faces,[bpy.data.materials['Gloves'],bpy.data.materials['GloveBack']],indices,weights,uvs)
 if ob.name.startswith('Body') and ob.data.shape_keys:
  for key in ob.data.shape_keys.key_blocks:
   for v in key.data:
    x,y,z=v.co;front=max(0,min(1,(-y-.055)/.06))
    # Subtle chin projection and cheek contour, preserving sockets and facial targets.
    if z>1.59:
     v.co.y-=.0027*gauss(z,1.626,.016)*gauss(x,0,.035)*front
     v.co.x*=1+.018*gauss(z,1.68,.018)*front
 if ob.name.startswith('Brow_') and ob.data.shape_keys:
  for key in ob.data.shape_keys.key_blocks:
   for i,v in enumerate(key.data):
    u=(i//2%20)/19;taper=.22+.78*math.sin(math.pi*u)**.65;center=1.721+.0035*math.sin(u*math.pi)-.003*u;v.co.z=center+(v.co.z-center)*taper
 if ob.name.startswith('HairPreset_') and ob.data.shape_keys:
  preset=int(ob.name.split('_')[1]);segments=64 if lod==0 else 40;rings=18 if lod==0 else 12;cap_count=(rings+1)*segments
  for key in ob.data.shape_keys.key_blocks:
   for i,v in enumerate(key.data):
    x,y,z=v.co;top=smoothstep(1.76,1.825,z)
    if preset==1:v.co.x+=.008*top;v.co.z-=.002*top*max(0,-x/.09)
    if i<cap_count:
     q=(i//segments)/rings
     if q>.86:
      theta=2*math.pi*(i%segments)/segments;v.co.z+=(q-.86)/.14*.0012*math.sin(theta*9+.7)
# The CC0 skin fingers have a different rest silhouette from the football finger rig.
# Preserve them for takers in separate meshes; keepers show only the fitted gloves.
for ob in list(scene.objects):
 if ob.type!='MESH' or not ob.name.startswith('Body'):continue
 old=ob.data;points=[v.co.copy() for v in old.vertices];ws=[[(ob.vertex_groups[g.group].name,g.weight) for g in v.groups] for v in old.vertices]
 subsets={'body':[],'L':[],'R':[]}
 for f in old.polygons:
  c=sum((points[i] for i in f.vertices),Vector())/len(f.vertices)
  hand=abs(c.x)>.35 and c.z<.9
  subsets[('L' if c.x>0 else 'R') if hand else 'body'].append(f.index)
 keys={key.name:[v.co.copy() for v in key.data] for key in old.shape_keys.key_blocks} if old.shape_keys else {}
 for part,selection in subsets.items():
  mesh=bpy.data.meshes.new(old.name+'_'+part);mesh.from_pydata(points,[],[tuple(old.polygons[i].vertices) for i in selection]);mesh.update()
  for m in old.materials:mesh.materials.append(m)
  for name in old.uv_layers.keys():
   uv=mesh.uv_layers.new(name=name)
   for face,index in zip(mesh.polygons,selection):
    for new_loop,old_loop in zip(face.loop_indices,old.polygons[index].loop_indices):uv.data[new_loop].uv=old.uv_layers[name].data[old_loop].uv
  for attr in old.color_attributes:
   if attr.domain=='POINT':
    col=mesh.color_attributes.new(name=attr.name,type=attr.data_type,domain=attr.domain)
    for i,value in enumerate(attr.data):col.data[i].color=value.color
    mesh.color_attributes.active_color=col
  for face,index in zip(mesh.polygons,selection):face.material_index=old.polygons[index].material_index;face.use_smooth=True
  if part=='body':target=ob;target.data=mesh
  else:
   target=bpy.data.objects.new('HandSkin_'+part+('_LOD1' if ob.get('lod')==1 else ''),mesh);scene.collection.objects.link(target);target.parent=rig;target['lod']=ob.get('lod');mod=target.modifiers.new('Football skin','ARMATURE');mod.object=rig
  target.vertex_groups.clear();groups={}
  for index,weights in enumerate(ws):
   for name,w in weights:
    if name not in groups:groups[name]=target.vertex_groups.new(name=name)
    groups[name].add([index],w,'REPLACE')
  if part=='body':
   for name,coords in keys.items():
    key=target.shape_key_add(name=name)
    for index,co in enumerate(coords):key.data[index].co=co

scene.frame_set(0);rig.animation_data.action=bpy.data.actions.get('prepare')
bpy.ops.wm.save_as_mainfile(filepath=str(out/'athlete-source.blend'),compress=True)
for lod in [0,1]:
 bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
 for ob in scene.objects:
  if ob.type=='MESH':ob.select_set(ob.get('lod')==lod)
 bpy.context.view_layer.objects.active=rig
 bpy.ops.export_scene.gltf(filepath=str(out/('athlete.glb' if lod==0 else 'athlete-low.glb')),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_nla_strips=True,export_force_sampling=True,export_frame_range=False,export_anim_slide_to_zero=True,export_materials='EXPORT',export_vertex_color='ACTIVE',export_active_vertex_color_when_no_material=True)
(out/'model-refinement.json').write_text(json.dumps({'version':'character-construction-7','originalFeatures':['continuous authored jersey torso topology','articulated continuous glove fingers and curved palms','tapered brows, restrained chin/cheek sculpt','asymmetric quiff and irregular hairline','role-specific bare-hand meshes and enclosed keeper cuffs'],'preserved':['60-bone skeleton','35 animation clip names','physical dimensions and contacts','input and progression contracts'],'limits':'Original generic footballers; visual parity with FIFA 14 is not established'},indent=2))
print('CONSTRUCTION_V7_COMPLETE')
