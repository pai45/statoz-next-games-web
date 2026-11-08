"""Original handheld-era surface and silhouette pass on the v5 athlete. No EA asset data."""
import bpy,math,json,argparse,sys
import numpy as np
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
p=argparse.ArgumentParser();p.add_argument('--source',required=True);p.add_argument('--output',required=True);a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);out=Path(a.output).resolve();out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(Path(a.source).resolve()));scene=bpy.context.scene;rig=bpy.data.objects['FootballRig'];assert len(rig.data.bones)==60
rig.animation_data.action=None
for bone in rig.pose.bones:bone.location=(0,0,0);bone.rotation_euler=(0,0,0);bone.scale=(1,1,1)
rng=np.random.default_rng(1406);size=512;v,u=np.mgrid[0:size,0:size]/(size-1);theta=(u-.5)*2*math.pi;x=np.sin(theta)*.09;z=1.59+v*.25;front=np.exp(-(theta/1.14)**8)
def g(value,center,width):return np.exp(-((value-center)/width)**2)
def texture(name,values,data=False):
    image=bpy.data.images.new(name,width=size,height=size,is_data=data);rgba=np.ones((size,size,4),dtype=np.float32)
    rgba[:,:,:3]=values[:,:,None] if values.ndim==2 else values;image.pixels.foreach_set(rgba.ravel());image.filepath_raw=str(out/(name+'.png'));image.file_format='PNG';image.save();image.pack();return image
noise=rng.normal(0,1,(size,size));mottle=(np.sin(u*173+np.sin(v*83))*np.sin(v*151+u*91)+np.sin(u*331-v*137))*.5
lip=g(x,0,.031)*g(z,1.651,.007)*front;cheek=g(abs(x),.049,.025)*g(z,1.685,.023)*front
socket=g(abs(x),.033,.018)*g(z,1.710,.012)*front;beard=(g(z,1.628,.024)+.55*g(abs(x),.059,.018)*g(z,1.655,.025))*front
colour=np.ones((size,size,3))*.96;colour+=noise[:,:,None]*.006+mottle[:,:,None]*.008
colour-=lip[:,:,None]*np.array([.14,.29,.26])+socket[:,:,None]*np.array([.07,.085,.09])+beard[:,:,None]*np.array([.065,.075,.073]);colour-=cheek[:,:,None]*np.array([.003,.035,.033])
# Sparse original follicles with stable seeded placement, plus pores and shallow creases.
follicles=(rng.random((size,size))>.94)*beard;colour-=follicles[:,:,None]*.08
albedo=texture('face-pigment-v6',np.clip(colour,0,1));rough=texture('face-roughness-v6',np.clip(.72-.10*g(x,0,.022)*g(z,1.69,.06)*front+.035*noise,.45,.85),True)
height=noise*.005+np.sin(u*1600)*np.sin(v*1450)*.003
height-=.012*g(abs(x),.035,.021)*g(z,1.695,.0014)*front
height-=.009*g(x,0,.027)*g(z,1.65,.0015)*front
dy,dx=np.gradient(height);normal=np.stack((-dx*4,-dy*4,np.ones_like(height)),axis=-1);normal/=np.linalg.norm(normal,axis=-1,keepdims=True);norm=texture('face-pores-v6',normal*.5+.5,True)
mat=bpy.data.materials['Skin'].copy();mat.name='SkinFace';nodes=mat.node_tree.nodes;links=mat.node_tree.links;bsdf=nodes.get('Principled BSDF')
for socket in ['Base Color','Normal','Roughness']:
    for link in list(bsdf.inputs[socket].links):links.remove(link)
uvnode=nodes.new('ShaderNodeUVMap');uvnode.uv_map='FaceSurfaceUV'
for image,target in [(albedo,'Base Color'),(rough,'Roughness'),(norm,'Normal')]:
    tex=nodes.new('ShaderNodeTexImage');tex.image=image;links.new(uvnode.outputs['UV'],tex.inputs['Vector'])
    if target=='Normal':
        n=nodes.new('ShaderNodeNormalMap');n.inputs['Strength'].default_value=.45;links.new(tex.outputs['Color'],n.inputs['Color']);links.new(n.outputs['Normal'],bsdf.inputs['Normal'])
    else:links.new(tex.outputs['Color'],bsdf.inputs[target])
bsdf.inputs['Roughness'].default_value=.68
for ob in list(scene.objects):
    if ob.type!='MESH':continue
    if ob.name.startswith('Body'):
        index=len(ob.data.materials);ob.data.materials.append(mat);uv=ob.data.uv_layers.new(name='FaceSurfaceUV')
        for f in ob.data.polygons:
            if all(ob.data.vertices[i].co.z>1.585 for i in f.vertices):f.material_index=index
            for loop in f.loop_indices:
                co=ob.data.vertices[ob.data.loops[loop].vertex_index].co;uv.data[loop].uv=(.5+math.atan2(co.x,-co.y+.01)/(2*math.pi),(co.z-1.59)/.25)
        # Taper the neck where it joins the jaw; keep all face shapes in register.
        if ob.data.shape_keys:
            for key in ob.data.shape_keys.key_blocks:
                for vert in key.data:
                    if 1.49<vert.co.z<1.61:vert.co.x*=1-.045*math.exp(-((vert.co.z-1.55)/.045)**2)
    if ob.name.startswith(('Jersey','Shorts')):
        # Attenuate tiny triangulated depth noise without changing cuffs or silhouette cut planes.
        mesh=ob.data;neighbors=[set() for _ in mesh.vertices]
        for edge in mesh.edges:i,j=edge.vertices;neighbors[i].add(j);neighbors[j].add(i)
        original=[v.co.copy() for v in mesh.vertices]
        for i,vert in enumerate(mesh.vertices):
            co=original[i];torso=ob.name.startswith('Jersey') and abs(co.x)<.19 and 1.09<co.z<1.44
            shorts=ob.name.startswith('Shorts') and .78<co.z<1.055
            if (torso or shorts) and neighbors[i]:
                average=sum(original[n].y for n in neighbors[i])/len(neighbors[i]);vert.co.y=co.y*.38+average*.62
        for face in mesh.polygons:face.use_smooth=True
        if mesh.has_custom_normals:mesh.normals_split_custom_set([(0,0,0)]*len(mesh.loops))
    if ob.name.startswith('HairPreset_'):
        # Rebuild the existing primitive with original layered, tapered hair locks.
        mesh=ob.data;points=[v.co.copy() for v in mesh.vertices];faces=[tuple(f.vertices) for f in mesh.polygons]
        old_count=len(points);old_keys={k.name:[v.co.copy() for v in k.data] for k in mesh.shape_keys.key_blocks} if mesh.shape_keys else {}
        old_uv=[tuple(loop.uv) for loop in mesh.uv_layers.active.data] if mesh.uv_layers.active else []
        old_col=[tuple(c.color) for c in mesh.color_attributes.active_color.data] if mesh.color_attributes.active_color else [(1,1,1,1)]*old_count
        preset=int(ob.name.split('_')[1]);lod=int(ob.get('lod',0));segments=64 if lod==0 else 40;rings=18 if lod==0 else 12
        surface=BVHTree.FromPolygons(points,faces)
        count=[80,96,110,32][preset] if lod==0 else [40,48,56,16][preset];extra_uv=[]
        for lock in range(count):
            k=(lock*17+lock//segments*7)%segments;j=2+(lock*7)%(rings-3);idx=j*segments+k;center=points[idx];normal=(center-Vector((0,-.028,1.728))).normalized()
            tangent=Vector((.7 if preset==1 else .20,.8,-.15));tangent-=normal*tangent.dot(normal)
            if tangent.length<.01:tangent=normal.cross(Vector((1,0,0)))
            tangent.normalize();cross=normal.cross(tangent).normalized();length=[.022,.036,.017,.012][preset];width=[.0018,.0028,.0025,.0013][preset];start=len(points)
            for step in range(5):
                t=step/4;target=center+tangent*length*t;hit,n,face,distance=surface.find_nearest(target);mid=hit+n*(.0004+math.sin(t*math.pi)*.0012);w=width*(1-t*.94)
                for sign in [-1,1]:points.append(mid+cross*w*sign);extra_uv.append(((k/segments)+sign*.002,(j/rings)+t*.04))
            for step in range(4):b=start+step*2;faces.append((b,b+1,b+3,b+2))
        new=bpy.data.meshes.new(mesh.name+'_layered');new.from_pydata(points,[],faces);new.update()
        for material in mesh.materials:new.materials.append(material)
        ob.data=new;uv=new.uv_layers.new(name='StrandUV');old_loops=len(old_uv)
        for i,loop in enumerate(new.loops):uv.data[i].uv=old_uv[i] if i<old_loops else extra_uv[loop.vertex_index-old_count]
        col=new.color_attributes.new(name='HairTone',type='FLOAT_COLOR',domain='POINT')
        for i in range(len(points)):
            shade=.70+.27*((i*71)%113)/113;col.data[i].color=old_col[i] if i<old_count else (shade,shade*.92,shade*.84,1)
        new.color_attributes.active_color=col
        # Rigid head weights are valid for the scalp and authored locks alike.
        vg=ob.vertex_groups.get('head') or ob.vertex_groups.new(name='head');vg.add(list(range(len(points))),1,'REPLACE')
        for name,coords in old_keys.items():
            key=ob.shape_key_add(name=name)
            for i,co in enumerate(coords):key.data[i].co=co
            for i in range(old_count,len(points)):
                # Accessory preset displacement follows the nearest original scalp point.
                near=min(range(old_count),key=lambda n:(points[n]-points[i]).length_squared);key.data[i].co=points[i]+coords[near]-points[near]
        for face in new.polygons:face.use_smooth=True
hair=bpy.data.materials['Hair'].node_tree.nodes.get('Principled BSDF');hair.inputs['Roughness'].default_value=.66;hair.inputs['Base Color'].default_value=(.055,.034,.021,1)
for name in ['Eyes','Iris','Pupil']:
    bsdf=bpy.data.materials[name].node_tree.nodes.get('Principled BSDF');bsdf.inputs['Roughness'].default_value=.24 if name=='Eyes' else .38
scene.frame_set(0);rig.animation_data.action=bpy.data.actions.get('prepare')
bpy.ops.wm.save_as_mainfile(filepath=str(out/'athlete-source.blend'),compress=True)
for lod in [0,1]:
    bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
    for ob in scene.objects:
        if ob.type=='MESH':ob.select_set(ob.get('lod')==lod)
    bpy.context.view_layer.objects.active=rig
    bpy.ops.export_scene.gltf(filepath=str(out/('athlete.glb' if lod==0 else 'athlete-low.glb')),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_nla_strips=True,export_force_sampling=True,export_frame_range=False,export_anim_slide_to_zero=True,export_materials='EXPORT',export_vertex_color='ACTIVE',export_active_vertex_color_when_no_material=True)
(out/'model-refinement.json').write_text(json.dumps({'version':'character-surface-6','foundation':'CC0 Human Base Meshes; preserved v5 rig and clips','originalFeatures':['512-square face pigment, pores and regional roughness textures','layered tapered hair locks in existing scalp primitives','smoothed garment depth and neck transition'],'limits':'Original generic humans; no EA data; no claim of 1:1 FIFA player scans'},indent=2))
print('SURFACE_V6_COMPLETE')
