"""Original FIFA-14-era model refinement on the maintained 60-bone football rig.
Run with Blender 4.5 LTS. Geometry/material refinement only; no EA data or motion changes.
"""
import bpy,bmesh,math,json,argparse,sys
import numpy as np
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

p=argparse.ArgumentParser();p.add_argument('--source',required=True);p.add_argument('--output',required=True);p.add_argument('--foundation',required=True)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);OUT=Path(a.output).resolve();OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(Path(a.source).resolve()))
rig=bpy.data.objects['FootballRig'];scene=bpy.context.scene
assert len(rig.data.bones)==60
if rig.animation_data:rig.animation_data.action=None
for pb in rig.pose.bones:pb.rotation_euler=(0,0,0);pb.location=(0,0,0);pb.scale=(1,1,1)
bpy.context.view_layer.update()
body=next(o for o in scene.objects if o.type=='MESH' and o.name.startswith('Body') and o.get('lod')==0)
# Restore the original eye-region polygons removed by the previous authoring pass.
# The natural socket loops below them are retained; new eyes fit those apertures.
body.shape_key_clear()
with bpy.data.libraries.load(a.foundation,link=False) as (source,data):data.objects=['GEO-body_male_realistic']
foundation=data.objects[0];lo=min(v.co.z for v in foundation.data.vertices);scale=1.82/(max(v.co.z for v in foundation.data.vertices)-lo)
original=[Vector((v.co.x*scale,v.co.y*scale,(v.co.z-lo)*scale)) for v in foundation.data.vertices]
bm=bmesh.new();bm.from_mesh(body.data);bm.verts.ensure_lookup_table();tree=KDTree(len(bm.verts))
for i,v in enumerate(bm.verts):tree.insert(v.co,i)
tree.balance();original_bm_verts=list(bm.verts);restored_vertices={};deform=bm.verts.layers.deform.verify();head_index=body.vertex_groups['head'].index
for face in foundation.data.polygons:
    center=sum((original[i] for i in face.vertices),Vector())/len(face.vertices)
    if not(abs(abs(center.x)-.033)<.014 and abs(center.z-1.711)<.006 and center.y<-.11):continue
    restored=[]
    for index in face.vertices:
        co=original[index];near,n,distance=tree.find(co)
        if index in restored_vertices:v=restored_vertices[index]
        elif distance<.00001:v=original_bm_verts[n]
        else:v=bm.verts.new(co);v[deform][head_index]=1
        restored_vertices[index]=v;restored.append(v)
    try:
        repaired_face=bm.faces.new(restored);repaired_face.smooth=True
    except ValueError:pass
bm.to_mesh(body.data);bm.free();bpy.data.objects.remove(foundation,do_unlink=True)
# Recreate the mobile skin from the repaired foundation, not the defective sockets.
for ob in list(scene.objects):
    if ob.type=='MESH' and ob.name.startswith('Body') and ob.get('lod')==1:bpy.data.objects.remove(ob,do_unlink=True)
low=body.copy();low.data=body.data.copy();scene.collection.objects.link(low);low.name='Body_LOD1';low['lod']=1
bpy.context.view_layer.objects.active=low;mod=low.modifiers.new('Mobile skin topology','DECIMATE');mod.ratio=.58;bpy.ops.object.modifier_apply(modifier=mod.name)
verts=[v.co.copy() for v in body.data.vertices]
faces=[list(f.vertices) for f in body.data.polygons if all(verts[i].z>1.58 for i in f.vertices)]
head_bvh=BVHTree.FromPolygons(verts,faces)
materials={m.name:m for m in bpy.data.materials}
# Original directional strand normal map. No EA textures or photo atlas.
size=512;yy,xx=np.mgrid[0:size,0:size];height=.11*np.sin(xx*math.pi/3+.7*np.sin(yy/45))+.025*np.sin(xx*math.pi/1.8+yy/29)
dy,dx=np.gradient(height);normals=np.stack((-dx,-dy,np.ones_like(height)),axis=-1);normals/=np.linalg.norm(normals,axis=-1,keepdims=True)
pixels=np.ones((size,size,4),dtype=np.float32);pixels[:,:,:3]=normals*.5+.5
image=bpy.data.images.new('hair-strands-normal',width=size,height=size,is_data=True);image.pixels.foreach_set(pixels.ravel());image.filepath_raw=str(OUT/'hair-strands-normal.png');image.file_format='PNG';image.save();image.pack()
mat=materials['Hair'];tree=mat.node_tree;tex=tree.nodes.new('ShaderNodeTexImage');tex.image=image;normal=tree.nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.8;tree.links.new(tex.outputs['Color'],normal.inputs['Color']);tree.links.new(normal.outputs['Normal'],tree.nodes.get('Principled BSDF').inputs['Normal'])

def clamp(v,a=0,b=1):return max(a,min(b,v))
def gaussian(v,center,width):return math.exp(-((v-center)/width)**2)
def sculpt(co):
    v=co.copy();x,y,z=v
    front=clamp((-y-.065)/.05)
    if z>1.59:
        jaw=gaussian(z,1.635,.025)*front
        v.x*=1+.035*jaw
        v.y-=front*(.0015*gaussian(x,0,.018)*gaussian(z,1.702,.030)+.0015*gaussian(x,0,.025)*gaussian(z,1.641,.017))
    return v

def face_variant(co,i):
    v=co.copy();x,y,z=v
    if z<1.59:return v
    face=clamp((-y-.015)/.09);jaw=gaussian(z,1.638,.033)*face;cheek=gaussian(z,1.689,.026)*face;nose=gaussian(x,0,.021)*gaussian(z,1.687,.025)*face
    if i==1:v.x*=1+.095*jaw+.018*cheek;v.y-=.002*nose
    elif i==2:v.x*=1-.065*jaw-.025*cheek;v.z+=.003*gaussian(z,1.64,.06)*face;v.y-=.004*nose
    elif i==3:v.x*=1+.045*jaw+.055*cheek;v.y+=.003*nose;v.z-=.002*gaussian(z,1.66,.04)*face
    return v

def tint(co):
    x,y,z=co;front=clamp((-y-.07)/.055);c=Vector((1,1,1))
    if z>1.59:
        lip=gaussian(x,0,.027)*gaussian(z,1.650,.006)*front
        cheek=gaussian(abs(x),.048,.025)*gaussian(z,1.68,.025)*front
        socket=gaussian(abs(x),.033,.021)*gaussian(z,1.718,.014)*front
        nostril=gaussian(abs(x),.013,.006)*gaussian(z,1.681,.005)*front
        stubble=gaussian(z,1.631,.018)*clamp(abs(x)/.026)*front
        c-=Vector((.20,.38,.36))*lip+Vector((.005,.045,.05))*cheek+Vector((.08,.10,.11))*socket+Vector((.32,.34,.32))*nostril+Vector((.055,.06,.055))*stubble
    return (*c,1)

def colors(ob,fn):
    layer=ob.data.color_attributes.get('SkinTones') or ob.data.color_attributes.new(name='SkinTones',type='FLOAT_COLOR',domain='POINT')
    for i,v in enumerate(ob.data.vertices):layer.data[i].color=fn(v.co)
    ob.data.color_attributes.active_color=layer

def facial_keys(ob,blink=False):
    if not ob.data.shape_keys:ob.shape_key_add(name='Basis')
    base=ob.data.shape_keys.key_blocks[0]
    for i in range(1,4):
        key=ob.data.shape_keys.key_blocks.get('FacePreset_'+str(i)) or ob.shape_key_add(name='FacePreset_'+str(i))
        for n,v in enumerate(base.data):key.data[n].co=face_variant(v.co,i)
    if blink:
        key=ob.shape_key_add(name='Blink')
        for n,v in enumerate(base.data):key.data[n].co.z=1.7005+(v.co.z-1.7005)*.04

# Refine every existing expression shape, then author genuinely distinct face presets.
for ob in list(scene.objects):
    if ob.type!='MESH':continue
    if ob.name.startswith('Body'):
        if ob.data.shape_keys:
            for key in ob.data.shape_keys.key_blocks:
                for v in key.data:v.co=sculpt(v.co)
            for n,v in enumerate(ob.data.shape_keys.key_blocks[0].data):ob.data.vertices[n].co=v.co
        else:
            for v in ob.data.vertices:v.co=sculpt(v.co)
        facial_keys(ob);colors(ob,tint)
        for name in ['Blink','Smile','Tension']:
            key=ob.shape_key_add(name=name)
            for v in key.data:
                x,y,z=v.co
                if y<-.09:
                    if name=='Blink' and abs(abs(x)-.033)<.022 and abs(z-1.7005)<.010:v.co.z=1.7005+(z-1.7005)*.18
                    if name=='Smile':v.co.z+=.0025*gaussian(abs(x),.022,.012)*gaussian(z,1.652,.012)
                    if name=='Tension':v.co.z-=.0015*gaussian(abs(x),.020,.018)*gaussian(z,1.721,.010)
    elif ob.name.startswith('Jersey'):
        # Preserve the cut planes in X/Z; soften only chest/waist depth.
        bm=bmesh.new();bm.from_mesh(ob.data)
        inside=[v for v in bm.verts if not v.is_boundary and abs(v.co.x)<.205 and 1.10<v.co.z<1.45]
        for _ in range(3):bmesh.ops.smooth_vert(bm,verts=inside,factor=.32,use_axis_x=False,use_axis_y=True,use_axis_z=False)
        bm.to_mesh(ob.data);bm.free()
        for face in ob.data.polygons:
            face.use_smooth=True
            v=sum((ob.data.vertices[n].co for n in face.vertices),Vector())/len(face.vertices);x,y,z=v;x/=1.035
            face.material_index=1 if z>1.45 and abs(x)>.08001 or 1.30001<z<1.31999 else 2 if abs(x)>.17001 and 1.10<z<1.37 else 0
            s=1 if x>=0 else -1;h=Vector((s*.19,0,1.48));d=Vector((s*.155,0,-.28));along=(Vector((x,y,z))-h).dot(d)/d.length_squared
            if abs(x)>.20 and .62001<along<.67999:face.material_index=3
    elif ob.name.startswith(('Boot','Sole_','Stud_')):
        for v in ob.data.vertices:
            side=1 if v.co.x>0 else -1;v.co.x=side*.186+(v.co.x-side*.186)*.90
            # Slim heel/upper while retaining the authored front contact surface.
            v.co.y=-.235+(v.co.y+.235)*.87
            if v.co.z>.055:v.co.z=.055+(v.co.z-.055)*.86

for ob in list(scene.objects):
    if ob.type=='MESH' and ob.name.startswith(('HairPreset_','Eye_','Iris_','Brow_')):bpy.data.objects.remove(ob,do_unlink=True)

# All accessories share the original head pivot and facial preset deformation.
def mesh_object(name,points,faces,material,lod):
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(points,[],faces);mesh.update();ob=bpy.data.objects.new(name,mesh);scene.collection.objects.link(ob);ob['lod']=lod;ob.data.materials.append(materials[material]);ob.parent=rig
    group=ob.vertex_groups.new(name='head');group.add(list(range(len(points))),1,'REPLACE');mod=ob.modifiers.new('Football skin','ARMATURE');mod.object=rig
    for f in mesh.polygons:f.use_smooth=True
    return ob

def ellipsoid(name,center,radius,material,lod,segments=24,rings=12):
    points=[];faces=[]
    for j in range(rings+1):
        phi=math.pi*j/rings
        for k in range(segments):
            t=2*math.pi*k/segments;points.append((center[0]+radius[0]*math.sin(phi)*math.cos(t),center[1]+radius[1]*math.sin(phi)*math.sin(t),center[2]+radius[2]*math.cos(phi)))
    for j in range(rings):
        for k in range(segments):a=j*segments+k;b=j*segments+(k+1)%segments;faces.append((a,b,b+segments,a+segments))
    return mesh_object(name,points,faces,material,lod)

def scalp(direction,offset):
    origin=Vector((0,-.028,1.728));hit,normal,face,distance=head_bvh.ray_cast(origin,direction,1)
    if hit is None:hit=origin+Vector((direction.x*.087,direction.y*.119,direction.z*.092));normal=direction
    return sculpt(hit)+normal.normalized()*offset

for lod in [0,1]:
    suffix='' if lod==0 else '_LOD1';segments=64 if lod==0 else 40;rings=18 if lod==0 else 12
    for preset in range(4):
        points=[];faces=[];hair_colors=[]
        for j in range(rings+1):
            q=j/rings
            for k in range(segments):
                theta=2*math.pi*k/segments;front=max(0,-math.sin(theta));back=max(0,math.sin(theta))
                boundary=1.719+.046*front-.018*back+.003*math.cos(theta*2)
                polar=q*math.acos(clamp((boundary-1.728)/.092,-1,1));direction=Vector((math.sin(polar)*math.cos(theta),math.sin(polar)*math.sin(theta),math.cos(polar)))
                lift=[.003,.005,.006,.0018][preset]
                if preset==1:lift+=.021*max(0,direction.z)**2*max(.2,front)*(.7+.3*math.cos(theta))
                if preset==2:lift+=.005*(.5+.5*math.sin(theta*13+polar*7))*(.5+.5*math.cos(polar*23))
                p=scalp(direction,lift);points.append(p)
                strand=.84+.12*(.5+.5*math.sin(theta*22+polar*13))
                hair_colors.append((strand,strand*.94,strand*.88,1))
        for j in range(rings):
            for k in range(segments):a=j*segments+k;b=j*segments+(k+1)%segments;faces.append((a,a+segments,b+segments,b))
        hair=mesh_object('HairPreset_'+str(preset)+suffix,points,faces,'Hair',lod);facial_keys(hair)
        uv=hair.data.uv_layers.new(name='StrandUV')
        for poly in hair.data.polygons:
            seam=any(hair.data.loops[n].vertex_index%segments==segments-1 for n in poly.loop_indices)
            for n in poly.loop_indices:
                index=hair.data.loops[n].vertex_index;k=index%segments;j=index//segments;u=k/segments
                if seam and k==0:u=1
                uv.data[n].uv=(u,j/rings)
        layer=hair.data.color_attributes.new(name='HairTone',type='FLOAT_COLOR',domain='POINT')
        for n,c in enumerate(hair_colors):layer.data[n].color=c
        hair.data.color_attributes.active_color=layer
    for side,s in [('L',1),('R',-1)]:
        eye=ellipsoid('Eye_'+side+suffix,(s*.034,-.1325,1.7005),(.014,.0115,.0048),'Eyes',lod)
        iris=ellipsoid('Iris_'+side+suffix,(s*.034,-.1445,1.7005),(.0057,.0012,.0046),'Iris',lod)
        for ob in [eye,iris]:facial_keys(ob,True)
        for name,shift in [('LookLeft',-.0017),('LookRight',.0017)]:
            key=iris.shape_key_add(name=name)
            for v in key.data:v.co.x+=shift
    # Skin-coloured eyelid rims and curved brows follow the face instead of rods.
    points=[];faces=[];browpoints=[];browfaces=[]
    for s in [1,-1]:
        for upper in [True,False]:
            start=len(points)
            for j in range(25):
                a=-math.pi/2+math.pi*j/24;x=s*.033+.0145*math.sin(a);z=1.711+(1 if upper else -1)*.0052*math.cos(a)
                y=-.147+.007*abs(math.sin(a))
                for dz,dy in [(-.0011,0),(.0011,0),(0,.0012)]:points.append((x,y+dy,z+dz))
            for j in range(24):
                for k in range(3):a=start+j*3+k;b=start+j*3+(k+1)%3;faces.append((a,b,b+3,a+3))
        start=len(browpoints)
        for j in range(20):
            u=j/19;x=s*(.012+.046*u);z=1.721+.0035*math.sin(u*math.pi)-.003*u
            hit,normal,face,distance=head_bvh.ray_cast(Vector((x,-1,z)),Vector((0,1,0)),2);y=hit.y-.0012 if hit else -.151+.024*u*u
            for dz in [-.0014,.0014]:browpoints.append((x,y,z+dz))
        for j in range(19):a=start+j*2;browfaces.append((a,a+1,a+3,a+2))
    # Original repaired body geometry supplies the anatomical eyelids.
    brows=mesh_object('Brow_Arched'+suffix,browpoints,browfaces,'Hair',lod);facial_keys(brows)

for name in ['Eyes','Iris']:
    if name in materials:materials[name].node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.62
# Original iris rings use a warm brown tone with a small dark pupil.
materials['Eyes'].node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.62,.64,.59,1)
materials['Iris'].node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.14,.079,.032,1)
pupil_material=bpy.data.materials.new('Pupil');pupil_material.use_nodes=True;pupil_material.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.006,.006,.005,1);pupil_material.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.6;materials['Pupil']=pupil_material
for lod in [0,1]:
    pupils=[];suffix='' if lod==0 else '_LOD1'
    for side,sign in [('L',1),('R',-1)]:
        ob=ellipsoid('Pupil_'+side+suffix,(sign*.034,-.1458,1.7005),(.0024,.0007,.0030),'Pupil',lod,16,8);facial_keys(ob,True)
        for name,shift in [('LookLeft',-.0017),('LookRight',.0017)]:
            key=ob.shape_key_add(name=name)
            for v in key.data:v.co.x+=shift
# The skeleton, inverse bind matrices and clips are intentionally unchanged.
scene.frame_set(0);rig.animation_data.action=bpy.data.actions.get('prepare')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'athlete-source.blend'),compress=True)
for lod in [0,1]:
    bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
    for ob in scene.objects:
        if ob.type=='MESH':ob.select_set(ob.get('lod')==lod)
    bpy.context.view_layer.objects.active=rig
    bpy.ops.export_scene.gltf(filepath=str(OUT/('athlete.glb' if lod==0 else 'athlete-low.glb')),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_nla_strips=True,export_force_sampling=True,export_frame_range=False,export_anim_slide_to_zero=True,export_materials='EXPORT',export_vertex_color='ACTIVE',export_active_vertex_color_when_no_material=True)
(OUT/'model-refinement.json').write_text(json.dumps({'version':'character-model-5','deformBones':60,'source':'CC0 Human Base Meshes; original refinement; no EA meshes/textures','presets':['scalp crop / balanced face','swept quiff / square jaw','textured curls / narrow jaw','close cut / broad cheekbones'],'unchanged':['skeleton','gameplay dimensions','animation clips','contact markers','controls'],'features':['scalp-conforming hair with directional strand normals','anatomical face presets','repaired anatomical eye sockets and fitted eyes','curved eyebrows','skin vertex tones','clean panel boundaries','slim boots'],'authoring':'Blender 4.5 LTS; deterministic original geometry and vertex colours'},indent=2))
print('MODEL_REFINEMENT_COMPLETE',len(rig.data.bones),OUT)

