"""Original football character and motion authoring; Blender 4.5 LTS, metres/Z-up.
The CC0 source is retained separately. All clothes, equipment, presets and motions
are original. Exported contact markers are part of the gameplay contract.
"""
import bpy, bmesh, math, json, argparse, sys
from pathlib import Path
from mathutils import Vector, Quaternion
import numpy as np

p=argparse.ArgumentParser();p.add_argument('--source',required=True);p.add_argument('--output',required=True)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);OUT=Path(a.output);OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
with bpy.data.libraries.load(a.source,link=False) as (src,dst):dst.objects=['GEO-body_male_realistic']
body=dst.objects[0];bpy.context.collection.objects.link(body);body.name='Body_LOD0'
for m in list(body.modifiers):body.modifiers.remove(m)
lo=min(v.co.z for v in body.data.vertices);scale=1.82/(max(v.co.z for v in body.data.vertices)-lo)
for v in body.data.vertices:v.co=Vector((v.co.x*scale,v.co.y*scale,(v.co.z-lo)*scale))
# Restrained football anatomy: calves, quadriceps and deltoids; shared dimensions.
for v in body.data.vertices:
    x,y,z=v.co
    if .26<z<.82:
        center=(1 if x>0 else -1)*(.18 if z<.52 else .14)
        strength=.045*math.exp(-((z-.36)/.12)**2)+.035*math.exp(-((z-.69)/.13)**2)
        v.co.x=center+(x-center)*(1+strength);v.co.y*=1+strength
body.location=(0,0,0);body.rotation_euler=(0,0,0);body.scale=(1,1,1)

def texture(name,kind):
    size=512;y,x=np.mgrid[0:size,0:size];rng=np.random.default_rng(14)
    noise=rng.random((size,size))-.5
    if kind=='fabric':v=.93+.022*np.sin(x*math.pi/2)*np.cos(y*math.pi/3)+noise*.018
    else:v=.92+noise*.018+.012*np.sin(x/12)*np.cos(y/19)
    px=np.ones((size,size,4),dtype=np.float32);px[:,:,:3]=v[:,:,None]
    im=bpy.data.images.new(name,width=size,height=size);im.pixels.foreach_set(px.ravel());im.filepath_raw=str(OUT/(name+'.png'));im.file_format='PNG';im.save();im.pack();return im
fabric=texture('fabric-weave','fabric');skin=texture('skin-detail','skin')

def normal_texture(name,fabric_detail):
    size=512;y,x=np.mgrid[0:size,0:size]
    h=(np.sin(x*math.pi/2)*np.cos(y*math.pi/3)*.13 if fabric_detail else np.sin(x*1.7)*np.cos(y*1.3)*.035)
    dy,dx=np.gradient(h);normal=np.stack((-dx,-dy,np.ones_like(h)),axis=-1);normal/=np.linalg.norm(normal,axis=-1,keepdims=True)
    pixels=np.ones((size,size,4),dtype=np.float32);pixels[:,:,:3]=normal*.5+.5
    im=bpy.data.images.new(name,width=size,height=size,is_data=True);im.pixels.foreach_set(pixels.ravel());im.filepath_raw=str(OUT/(name+'.png'));im.file_format='PNG';im.save();im.pack();return im
fabric_normal=normal_texture('fabric-normal',True);skin_normal=normal_texture('skin-normal',False)
def mat(name,color,rough=.8,tex=None):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Roughness'].default_value=rough
    if tex:
        n=m.node_tree.nodes.new('ShaderNodeTexImage');n.image=tex
        mult=m.node_tree.nodes.new('ShaderNodeMixRGB');mult.blend_type='MULTIPLY';mult.inputs[0].default_value=1;mult.inputs[2].default_value=(*color,1);m.node_tree.links.new(n.outputs['Color'],mult.inputs[1]);m.node_tree.links.new(mult.outputs[0],bs.inputs['Base Color'])
        # Export a directly readable atlas; runtime applies the kit/skin tint.
        m.node_tree.links.new(n.outputs['Color'],bs.inputs['Base Color'])
        detail=m.node_tree.nodes.new('ShaderNodeTexImage');detail.image=skin_normal if name=='Skin' else fabric_normal
        normal=m.node_tree.nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.38 if name=='Skin' else .55
        m.node_tree.links.new(detail.outputs['Color'],normal.inputs['Color']);m.node_tree.links.new(normal.outputs['Normal'],bs.inputs['Normal'])
    return m
mats={n:mat(n,c,r,t) for n,c,r,t in [
 ('Skin',(.53,.34,.23),.7,skin),('Jersey',(.9,.92,.88),.9,fabric),('JerseyPanel',(.1,.16,.18),.85,fabric),('JerseyVent',(.42,.47,.44),.96,fabric),('Shorts',(.025,.06,.075),.9,fabric),('Socks',(.83,.85,.8),.95,fabric),('Boots',(.025,.035,.045),.42,None),('BootAccent',(.66,.31,.12),.5,None),('Sole',(.09,.12,.13),.7,None),('Trim',(.1,.16,.18),.8,None),('Hair',(.035,.024,.018),.95,None),('Gloves',(.83,.86,.78),.65,None),('GloveBack',(.16,.24,.26),.65,None),('Eyes',(.82,.8,.74),.4,None),('Iris',(.065,.043,.027),.45,None)]}

# Separate fitted garments, with clean geometric boundaries and eased silhouette.
bm=bmesh.new();bm.from_mesh(body.data)
for z in [.145,.49,.76,1.07,1.10,1.30,1.32,1.37,1.45,1.53]:bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),plane_co=(0,0,z),plane_no=(0,0,1),dist=1e-6)
for x in [-.27,-.21,-.17,-.08,.08,.17,.21,.27]:bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),plane_co=(x,0,0),plane_no=(1,0,0),dist=1e-6)
for s in [1,-1]:
    h=Vector((s*.19,0,1.48));d=Vector((s*.155,0,-.28));bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),plane_co=h+d*.68,plane_no=d,dist=1e-6)
    bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),plane_co=h+d*.62,plane_no=d,dist=1e-6)
bm.to_mesh(body.data);bm.free()
def category(c):
    x,y,z=c
    if z<.145:return 'hidden'
    if .145<z<.49 and abs(x)<.24:return 'Socks'
    if .76<z<1.07 and abs(x)<.26:return 'Shorts'
    s=1 if x>=0 else -1;h=Vector((s*.19,0,1.48));d=Vector((s*.155,0,-.28));along=(Vector((x,y,z))-h).dot(d)/d.length_squared
    if 1.07<z<1.53 and abs(x)<.22 or abs(x)>.20 and z<1.53 and -.2<along<.68:return 'Jersey'
    return 'Skin'
parts=[]
for name in ['Skin','Jersey','Shorts','Socks']:
    ob=body.copy();ob.data=body.data.copy();bpy.context.collection.objects.link(ob);ob.name='Body_LOD0' if name=='Skin' else name+'_LOD0'
    bm=bmesh.new();bm.from_mesh(ob.data)
    if name=='Skin':
        remove=[f for f in bm.faces if category(f.calc_center_median())!='Skin']
        remove += [f for f in bm.faces if abs(abs(f.calc_center_median().x)-.033)<.014 and abs(f.calc_center_median().z-1.711)<.006 and f.calc_center_median().y<-.11]
    else:remove=[f for f in bm.faces if category(f.calc_center_median())!=name]
    bmesh.ops.delete(bm,geom=list(set(remove)),context='FACES');bm.to_mesh(ob.data);bm.free()
    ob.data.materials.clear();ob.data.materials.append(mats[name])
    for v in ob.data.vertices:
        if name in ['Jersey','Shorts']:
            ease=.014 if name=='Jersey' else .018;v.co.y+=(1 if v.co.y>0 else -1)*ease
            # Folds gather at waist/armpits and shorts, with a quiet torso silhouette.
            gather=math.exp(-((v.co.z-1.10)/.085)**2) if name=='Jersey' else .6
            v.co.y+=.0035*gather*math.sin(v.co.z*105+v.co.x*38);v.co.x*=1.035
    if name=='Jersey':
        ob.data.materials.append(mats['JerseyPanel']);ob.data.materials.append(mats['JerseyVent']);ob.data.materials.append(mats['Trim'])
        for face in ob.data.polygons:
            c=face.center;points=[ob.data.vertices[i].co for i in face.vertices];x=sum(v.x for v in points)/len(points);z=sum(v.z for v in points)/len(points)
            face.material_index=1 if z>1.45 and abs(x)>.08 or 1.30<z<1.32 else 2 if abs(x)>.17 and 1.10<z<1.37 else 0
            s=1 if x>=0 else -1;h=Vector((s*.19,0,1.48));d=Vector((s*.155,0,-.28));c=sum(points,Vector())/len(points);along=(c-h).dot(d)/d.length_squared
            if abs(x)>.20 and .62<along<.68:face.material_index=3
    for f in ob.data.polygons:f.use_smooth=True
    parts.append(ob)
bpy.data.objects.remove(body,do_unlink=True)

spec={'root':((0,0,0),(0,0,.2),None),'hips':((0,0,.94),(0,0,1.09),'root'),'spine':((0,0,1.09),(0,0,1.30),'hips'),'chest':((0,0,1.30),(0,0,1.49),'spine'),'neck':((0,0,1.49),(0,0,1.60),'chest'),'head':((0,0,1.60),(0,-.01,1.80),'neck')}
for side,s in [('L',1),('R',-1)]:
    spec.update({'clavicle_'+side:((s*.06,0,1.46),(s*.19,0,1.48),'chest'),'upper_arm_'+side:((s*.19,0,1.48),(s*.345,0,1.20),'clavicle_'+side),'forearm_'+side:((s*.345,0,1.20),(s*.437,-.118,.854),'upper_arm_'+side),'hand_'+side:((s*.437,-.118,.854),(s*.43,-.145,.79),'forearm_'+side),'thigh_'+side:((s*.10,0,.94),(s*.17,-.015,.51),'hips'),'shin_'+side:((s*.17,-.015,.51),(s*.186,.06,.12),'thigh_'+side),'foot_'+side:((s*.186,.06,.12),(s*.186,-.15,.065),'shin_'+side),'toe_'+side:((s*.186,-.15,.065),(s*.186,-.245,.055),'foot_'+side)})
    for limb in ['upper_arm','forearm','thigh','shin']:
        h,t,parent=spec[limb+'_'+side];mid=(Vector(h)+Vector(t))*.5;spec[limb+'_twist_'+side]=(tuple(mid),t,limb+'_'+side)
    for f in range(5):
        start=Vector((s*(.408+f*.013),-.13-(.014 if f==0 else 0),.815 if f else .842));direction=Vector((s*(-.018 if f==0 else .004),-.035,-.064 if f else -.038))
        for j in range(3):
            h=start+direction*j/3;t=start+direction*(j+1)/3;spec[f'finger_{f}_{j}_{side}']=(tuple(h),tuple(t),'hand_'+side if j==0 else f'finger_{f}_{j-1}_{side}')
assert len(spec)<=64
arm=bpy.data.armatures.new('FootballRig');rig=bpy.data.objects.new('FootballRig',arm);bpy.context.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
for n,(h,t,parent) in spec.items():
    bone=arm.edit_bones.new(n);bone.head=h;bone.tail=t
    if parent:bone.parent=arm.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT')

def bind(ob,weights=None):
    ob.parent=rig;mod=ob.modifiers.new('Football skin','ARMATURE');mod.object=rig
    groups={n:ob.vertex_groups.new(name=n) for n in spec}
    for v in ob.data.vertices:
        if weights:ws=weights(v.co)
        else:
            x,y,z=v.co;s='L' if x>=0 else 'R';ax=abs(x)
            # Anatomical regions explicitly prevent elbow/torso and left/right bleeding.
            if z>1.58:ws={'head':1}
            elif z>1.48 and ax<.17:ws={'neck':min(1,(z-1.48)/.10),'chest':max(0,1-(z-1.48)/.10)}
            elif (ax>.19 and z>1.28) or ax>.29 and z>.65 or ax>.23 and z>1.1:
                if z>1.10:
                    # Continuous shoulder/elbow weights; no chest/arm threshold seam.
                    candidates=[]
                    for n in ['clavicle_'+s,'upper_arm_'+s,'forearm_'+s]:
                        h,t,_=spec[n];h=Vector(h);d=Vector(t)-h;q=max(0,min(1,(v.co-h).dot(d)/d.length_squared));candidates.append(((v.co-h-d*q).length,n))
                    values=[math.exp(-dist*dist/.0035) for dist,n in candidates];total=max(1e-12,sum(values))
                    arm_weight=max(0,min(1,(ax-.18)/.105)) if z>1.30 else 1;arm_weight=arm_weight*arm_weight*(3-2*arm_weight)
                    ws={n:w/total*arm_weight for (dist,n),w in zip(candidates,values)};ws['chest']=1-arm_weight
                elif z>.9:ws={'forearm_'+s:1}
                elif z>.83:mix=max(0,min(1,(.91-z)/.08));ws={'forearm_'+s:1-mix,'hand_'+s:mix}
                else:
                    nearby=[]
                    for n,(h,t,_) in spec.items():
                        if n.startswith('finger_') and n.endswith(s) or n=='hand_'+s:
                            h=Vector(h);d=Vector(t)-h;fraction=max(0,min(1,(v.co-h).dot(d)/d.length_squared));nearby.append(((v.co-h-d*fraction).length,n))
                    nearby.sort();nearby=nearby[:3];values=[math.exp(-dist*dist/.0003) for dist,n in nearby];total=max(1e-12,sum(values));ws={n:w/total for (dist,n),w in zip(nearby,values)}
            elif z<.90:
                if z<.17:ws={'foot_'+s:1}
                else:mix=max(0,min(1,(.59-z)/.16));ws={'thigh_'+s:1-mix,'shin_'+s:mix}
                if .82<z<.9:mix=(z-.82)/.08;ws={**{k:w*(1-mix) for k,w in ws.items()},'hips':mix}
            elif z<1.08:ws={'hips':1}
            elif z<1.3:mix=(z-1.08)/.22;ws={'spine':1-mix,'chest':mix}
            else:ws={'chest':1}
        for n,w in list(ws.items()):
            if any(n.startswith(limb+'_') for limb in ['upper_arm','forearm','thigh','shin']) and '_twist_' not in n:
                limb,side=n.rsplit('_',1);h,t,_=spec[n];d=Vector(t)-Vector(h);fraction=max(0,min(1,(v.co-Vector(h)).dot(d)/d.length_squared));twist=w*.3*max(0,(fraction-.35)/.65);ws[n]-=twist;ws[limb+'_twist_'+side]=twist
        for n,w in ws.items():
            if w>.0001:groups[n].add([v.index],w,'REPLACE')
    if not ob.data.uv_layers:
        uv=ob.data.uv_layers.new(name='AtlasUV')
        for loop in ob.data.loops:
            v=ob.data.vertices[loop.vertex_index].co;uv.data[loop.index].uv=((v.x+.6)/1.2,v.z/1.82)
    return ob
for ob in parts:bind(ob)
def rigid(ob,name,material,bone):
    ob.name=name;ob.data.materials.clear();ob.data.materials.append(mats[material]);bpy.context.view_layer.objects.active=ob;bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    for f in ob.data.polygons:f.use_smooth=True
    return bind(ob,lambda v:{bone:1})
def ellipsoid(name,loc,scale,material,bone,segments=16,rings=10):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=loc);ob=bpy.context.object;ob.scale=scale;return rigid(ob,name,material,bone)
def box(name,loc,scale,material,bone,bevel=.012):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);ob=bpy.context.object;ob.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    mod=ob.modifiers.new('Rounded construction','BEVEL');mod.width=bevel;mod.segments=2;bpy.context.view_layer.objects.active=ob;bpy.ops.object.modifier_apply(modifier=mod.name);return rigid(ob,name,material,bone)
def ring(name,loc,major,minor,scale,material,bone):
    bpy.ops.mesh.primitive_torus_add(major_segments=24,minor_segments=6,location=loc,major_radius=major,minor_radius=minor);ob=bpy.context.object;ob.scale=scale;return rigid(ob,name,material,bone)
ring('Collar',(0,0,1.53),.082,.007,(1,.85,1),'Trim','chest')
for s,side in [(1,'L'),(-1,'R')]:
    ring('ShortsHem_'+side,(s*.105,0,.765),.081,.007,(1,1.2,1),'Trim','thigh_'+side)
    # A single lofted upper joins the heel/ankle and low-profile toe box.
    verts=[];faces=[];profile=[(.115,.115,.048,.075),(.065,.13,.056,.087),(0,.09,.061,.055),(-.10,.073,.063,.038),(-.20,.06,.048,.022),(-.235,.06,.007,.012)]
    for yy,zz,rx,rz in profile:
        for k in range(20):angle=k/20*math.pi*2;verts.append((s*.186+rx*math.cos(angle),yy,max(.04,zz+rz*math.sin(angle))))
    for row in range(len(profile)-1):
        for k in range(20):a=row*20+k;b=row*20+(k+1)%20;faces.append((a,b,b+20,a+20))
    faces.append(tuple(reversed(range(20))));faces.append(tuple(range(100,120)))
    mesh=bpy.data.meshes.new('BootUpper');mesh.from_pydata(verts,[],faces);boot=bpy.data.objects.new('Boot_'+side,mesh);bpy.context.collection.objects.link(boot);rigid(boot,'Boot_'+side,'Boots','foot_'+side)
    box('Sole_'+side,(s*.186,-.055,.032),(.122,.35,.025),'Sole','foot_'+side,.014)
    # Recessed tongue, alternating lace bars and a small heel counter.
    box('BootTongue_'+side,(s*.186,-.025,.132),(.048,.115,.012),'BootAccent','foot_'+side,.006)
    for j in range(5):
        lace=box('BootLace_'+side,(s*.186,-.075+j*.019,.14+j*.003),(.058,.006,.004),'Trim','foot_'+side,.002)
    box('BootHeel_'+side,(s*.186,.109,.105),(.079,.009,.052),'BootAccent','foot_'+side,.009)
    for xx in [-.037,.037]:
        for yy in [-.20,-.10,.025]:
            bpy.ops.mesh.primitive_cone_add(vertices=8,radius1=.013,radius2=.010,depth=.018,location=(s*.186+xx,yy,.015));rigid(bpy.context.object,'Stud_'+side,'Sole','foot_'+side)
    # Padded palm, back, cuff and five articulated glove digits, grouped per side.
    glove=[]
    glove.append(box('GlovePalm_'+side,(s*.437,-.12,.843),(.075,.042,.085),'Gloves','hand_'+side,.018))
    glove.append(box('GloveBack_'+side,(s*.437,-.098,.845),(.071,.018,.078),'GloveBack','hand_'+side,.009))
    glove.append(box('GloveCuff_'+side,(s*.435,-.11,.89),(.078,.052,.027),'GloveBack','forearm_'+side,.008))
    for ridge in [-1,0,1]:glove.append(box('GloveRidge_'+side,(s*.437+ridge*.017,-.085,.85),(.011,.007,.055),'Gloves','hand_'+side,.003))
    for f in range(5):
        for j in range(3):
            n=f'finger_{f}_{j}_{side}';h,t,_=spec[n];center=(Vector(h)+Vector(t))*.5
            glove.append(ellipsoid('Digit',center,(.0105,.012,.017),'Gloves',n,10,6))
    bpy.ops.object.select_all(action='DESELECT')
    for o in glove:o.select_set(True)
    bpy.context.view_layer.objects.active=glove[0];bpy.ops.object.join();glove[0].name='Glove_'+side

# Four original hair silhouettes; shared anatomy and collision dimensions.
for i in range(4):
    ob=ellipsoid('HairPreset_'+str(i),(0,.008,1.744),(.089,.087,.079 if i==0 else .092 if i==1 else .104 if i==2 else .064),'Hair','head',24,12)
    bm=bmesh.new();bm.from_mesh(ob.data);bmesh.ops.delete(bm,geom=[v for v in bm.verts if v.co.z<1.74+(-.01 if i==2 else .005)],context='VERTS');bm.to_mesh(ob.data);bm.free()
    for v in ob.data.vertices:
        if i==1:v.co.x+=(v.co.z-1.74)*.32
        if i==2:v.co.z+=.005*math.sin(v.co.x*220)*math.cos(v.co.y*190)
for side,s in [('L',1),('R',-1)]:
    # Authored eyebrows keep expressions readable without oversized eyes.
    brow=ellipsoid('Brow_'+side,(s*.034,-.125,1.728),(.025,.005,.0035),'Hair','head',16,6)
    eye=ellipsoid('Eye_'+side,(s*.033,-.129,1.711),(.013,.009,.004),'Eyes','head')
    iris=ellipsoid('Iris_'+side,(s*.033,-.138,1.711),(.006,.002,.004),'Iris','head',12,8)
    for ob in [eye,iris]:
        ob.shape_key_add(name='Basis');key=ob.shape_key_add(name='Blink')
        for v in key.data:v.co.z=1.711+(v.co.z-1.711)*.04
    for name,shift in [('LookLeft',-.002),('LookRight',.002)]:
        key=iris.shape_key_add(name=name)
        for v in key.data:v.co.x+=shift

# Join equipment by material/side to keep draw calls bounded, preserving skin groups.
for prefix in ['Boot','Sole_','Stud_','Collar','ShortsHem','SleeveCuff','Brow_']:
    objects=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.name.startswith(prefix)]
    if len(objects)>1:
        bpy.ops.object.select_all(action='DESELECT')
        for o in objects:o.select_set(True)
        bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join()

# Low mesh has identical bone names, markers and animation clips.
lod0=[o for o in bpy.context.scene.objects if o.type=='MESH']
for ob in lod0:
    ob['lod']=0
    low=ob.copy();low.data=ob.data.copy();bpy.context.collection.objects.link(low);low.name=ob.name.replace('_LOD0','')+'_LOD1';low['lod']=1
    if len(low.data.polygons)>160:
        bpy.context.view_layer.objects.active=low;mod=low.modifiers.new('Mobile topology','DECIMATE');mod.ratio=.48;bpy.ops.object.modifier_apply(modifier=mod.name)
    # Original face presets + small eyelid/jaw reactions, on both detail levels.
for ob in [o for o in bpy.context.scene.objects if o.type=='MESH' and o.name.startswith('Body')]:
    basis=ob.shape_key_add(name='Basis')
    for i in range(1,4):
        key=ob.shape_key_add(name='FacePreset_'+str(i))
        for v in key.data:
            if v.co.z>1.59:
                w=max(0,1-abs(v.co.z-1.68)/.11);v.co.x*=1+([0,.065,-.05,.025][i])*w;v.co.y+=([0,.004,-.003,.006][i])*w
    for name in ['Blink','Tension','Smile']:
        key=ob.shape_key_add(name=name)
        for v in key.data:
            x,y,z=v.co
            if y<-.045 and 1.67<z<1.74:
                if name=='Blink' and abs(abs(x)-.033)<.025 and abs(z-1.711)<.013:v.co.z+=(-1 if z>1.711 else 1)*.007
                if name=='Tension' and z>1.72:v.co.z-=.002
                if name=='Smile' and z<1.69:v.co.z+=.005*min(1,abs(x)/.035)

scene=bpy.context.scene;scene.render.fps=30
def smooth(v):v=max(0,min(1,v));return v*v*(3-2*v)
def blendkeys(t,keys):
    if t<=keys[0][0]:return keys[0][1]
    for (a,x),(b,y) in zip(keys,keys[1:]):
        if t<=b:return x+(y-x)*smooth((t-a)/(b-a))
    return keys[-1][1]
def rot(n,x=0,y=0,z=0):rig.pose.bones[n].rotation_euler=(x,y,z)

def approach_root(t):
    p=smooth(t);return (-.235-1.2*(1-p),11.15+1.7*(1-p))

def approach_foot(t,side):
    # World-space stance anchors counter the runtime root path. Swing feet move
    # between anchors with a low toe-clearance arc instead of cycling in place.
    spans=[(0,.16,.08),(.40,.58,.49),(.84,1.16,.84)] if side=='L' else [(-.12,0,0),(.20,.36,.28),(.64,.78,.71)]
    base=.186 if side=='L' else -.186;rx,rz=approach_root(t)
    def target(mid):
        ax,az=approach_root(mid);return Vector((base+rx-ax,.06+az-rz,.12))
    for start,end,mid in spans:
        if start<=t<=end:return target(mid)
    for (_,end,mid),(start,_,nextmid) in zip(spans,spans[1:]):
        if end<t<start:
            a=(t-end)/(start-end);p=target(mid).lerp(target(nextmid),smooth(a));p.z+=.105*math.sin(a*math.pi);return p
    return target(spans[-1][2])
def pose_matrix(pb,matrix):
    basis=pb.bone.convert_local_to_pose(matrix,pb.bone.matrix_local,parent_matrix=pb.parent.matrix,parent_matrix_local=pb.parent.bone.matrix_local,invert=True)
    loc,q,scale=basis.decompose();pb.location=loc;pb.rotation_euler=q.to_euler('XYZ');pb.scale=scale;bpy.context.view_layer.update()

def aim(n,target):
    pb=rig.pose.bones[n];bpy.context.view_layer.update();m=pb.matrix.copy();direction=(Vector(target)-m.translation).normalized();current=(m.to_3x3()@Vector((0,1,0))).normalized();desired=current.rotation_difference(direction).to_matrix().to_4x4()@m;desired.translation=m.translation;pose_matrix(pb,desired)
def leg(side,target):
    bpy.context.view_layer.update();hip=rig.pose.bones['thigh_'+side].head.copy();ankle=Vector(target);d=ankle-hip;la=rig.data.bones['thigh_'+side].length;lb=rig.data.bones['shin_'+side].length;dist=min(d.length,la+lb-.001);d.normalize();bend=Vector((0,-1,0));bend=(bend-d*bend.dot(d)).normalized();along=(la*la-lb*lb+dist*dist)/(2*dist);knee=hip+d*along+bend*math.sqrt(max(0,la*la-along*along));aim('thigh_'+side,knee);aim('shin_'+side,ankle)
    pb=rig.pose.bones['foot_'+side];m=rig.data.bones['foot_'+side].matrix_local.copy();m.translation=pb.head;pose_matrix(pb,m)

clips={'prepare':2.4,'prepare_shift':2.4,'kick_driven':1.9,'kick_placed':1.9,'kick_chip':1.9,'settle':1.5,'celebrate':2.6,'celebrate_fist':2.6,'disappointed':2.6,'disappointed_hands':2.6,'keeper_ready':2,'keeper_wave':2.2,'keeper_crouch':2.2,'keeper_shuffle_left':.7,'keeper_shuffle_right':.7,'centre_block':1.1,'catch':1.2,'parry_left':.65,'parry_right':.65,'recovery_left':1.3,'recovery_right':1.3}
for level in ['low','mid','high']:
    for side in ['left','right']:clips[f'dive_{level}_{side}']=1.5
# Legacy aliases retained for older tools; runtime uses the specific directional motions.
clips.update({'dive_low':1.5,'dive_mid':1.5,'dive_high':1.5,'recovery':1.3,'idle':2.4,'keeper_shuffle':.7,'follow_through':1.9,'parry':.65})
metadata=[]
for name,duration in clips.items():
    action=bpy.data.actions.new(name);rig.animation_data_create();rig.animation_data.action=None
    for f in range(round(duration*30)+1):
        t=f/30
        for pb in rig.pose.bones:pb.rotation_mode='XYZ';pb.rotation_euler=(0,0,0);pb.location=(0,0,0);pb.scale=(1,1,1)
        rot('spine',.014*math.sin(t*math.pi));rot('upper_arm_L',-.07,0,-.12);rot('upper_arm_R',-.07,0,.12)
        if name.startswith('kick') or name=='follow_through':
            style=name.removeprefix('kick_');plant=smooth((t-.72)/.14);follow=smooth((t-1)/.34);settle=smooth((t-1.35)/.55)
            rig.pose.bones['hips'].location.y=-.025*plant-.075*(1-smooth((t-.72)/.18))+.008*math.sin(t*math.pi*6)*(1-plant)
            rot('chest',.04+.09*plant-.10*follow,0,(-.08 if style=='placed' else .09)*plant*(1-follow));rot('hips',0,0,(.12 if style=='placed' else -.10)*plant*(1-follow))
            # Analytic leg targets make the foot strike anatomically explicit.
            balance=smooth((t-1.2)/.45)
            support=approach_foot(min(t,1),'L');support.y+=.10*balance;support.z+=.045*math.sin(balance*math.pi);leg('L',support)
            yy=blendkeys(t,[(0,.02),(.5,-.12),(.72,.10),(.86,.28),(.94,.02),(1,-.12),(1.16,-.42 if style!='chip' else -.28),(1.38,-.21),(1.9,-.03)])
            zz=blendkeys(t,[(0,.12),(.45,.2),(.72,.16),(.86,.37),(1,.115),(1.16,.40 if style=='driven' else .27),(1.45,.12),(1.9,.12)])
            xx=-.105-(.13 if style!='placed' else .10)*plant*(1-settle)
            right=approach_foot(t,'R') if t<.72 else Vector((xx,yy,zz));leg('R',right)
            rig.pose.bones['foot_R'].rotation_euler.x+=-.08 if style=='chip' else 0;rig.pose.bones['foot_R'].rotation_euler.z+=.24*plant*(1-follow) if style=='placed' else 0
            swing=math.sin(t*math.pi*4.6)*(1-plant)
            rot('upper_arm_L',.12+follow*.2+.23*swing,0,-.14-.34*plant);rot('upper_arm_R',-.25-.23*swing,0,.12+.18*plant);rot('forearm_L',-.36);rot('forearm_R',-.5)
        elif name.startswith('dive'):
            side=-1 if name.endswith('left') else 1;extend=smooth((t-.08)/.38);land=smooth((t-.65)/.65);high='high' in name;low='low' in name
            rot('hips',.08*land,0,.08*side*extend);rot('chest',.12*land,0,-.06*side*extend)
            rot('thigh_L',-.16*extend+.3*land,0,-.18*extend);rot('thigh_R',.28*extend+.12*land,0,.16*extend);rot('shin_L',-.35*extend-.45*land);rot('shin_R',-.55*extend-.25*land)
            rot('upper_arm_L',-.55,0,-.6*extend);rot('upper_arm_R',-.55,0,.6*extend);rot('forearm_L',-.18-.5*land);rot('forearm_R',-.25-.35*land)
            rot('neck',0,.08*side*extend,0)
        elif name.startswith('keeper') or name in ['centre_block','catch'] or name.startswith('parry'):
            shuffle=math.sin(t/.7*math.pi*2)*.13 if 'shuffle' in name else 0;centre=smooth(t/.20) if name=='centre_block' else 0
            rig.pose.bones['hips'].location.y=-.065-centre*.10
            leg('L',(.18+shuffle,-.015,.12+max(0,shuffle)*.12));leg('R',(-.18+shuffle,-.015,.12+max(0,-shuffle)*.12))
            rot('chest',.13+centre*.12);rot('upper_arm_L',-.48,0,-.38);rot('upper_arm_R',-.48,0,.38);rot('forearm_L',-.65);rot('forearm_R',-.65)
            if name in ['keeper_wave','keeper_crouch']:
                gesture=smooth(t/.38)*(1-smooth((t-1.55)/.65))
                if name=='keeper_wave':
                    wave=.12*math.sin(t*math.pi*3.4)*gesture
                    rot('upper_arm_L',-.10,0,-1.72*gesture-.38*(1-gesture)+wave);rot('upper_arm_R',-.10,0,1.72*gesture+.38*(1-gesture)-wave)
                    rot('forearm_L',-.65-.30*gesture);rot('forearm_R',-.65-.30*gesture)
                else:
                    rig.pose.bones['hips'].location.y=-.065-.12*gesture
                    leg('L',(.20,-.015,.12));leg('R',(-.20,-.015,.12));rot('chest',.13+.12*gesture)
            if name=='catch':rot('forearm_L',-1.0*smooth(t/.25));rot('forearm_R',-1.0*smooth(t/.25))
            if name.startswith('parry'):rot('chest',.13-.16*math.sin(min(1,t/.65)*math.pi));rot('forearm_L',-.5);rot('forearm_R',-.4)
        elif name.startswith('recovery'):
            side=-1 if name.endswith('left') else 1;a=smooth(t/1.3)
            fold=1-smooth((a-.25)/.75);drive=math.sin(a*math.pi)
            rot('hips',.35*fold);rot('chest',.42*drive)
            rot('thigh_L',(.72 if side<0 else .32)*fold);rot('thigh_R',(.32 if side<0 else .72)*fold)
            rot('shin_L',-(1.10 if side<0 else .85)*fold);rot('shin_R',-(.85 if side<0 else 1.10)*fold)
            rot('upper_arm_L',-.8*(1-a),0,-.4*(1-a));rot('upper_arm_R',-.3*(1-a),0,.2*(1-a));rot('forearm_L',-.4*(1-a));rot('forearm_R',-.7*(1-a))
        elif name.startswith('celebrate'):
            a=smooth(t/.45)*(1-smooth((t-1.8)/.8));rot('upper_arm_L',0,0,-1.7*a);rot('upper_arm_R',0,0,(.9 if 'fist' in name else 1.7)*a);rot('forearm_L',-.7*a);rot('forearm_R',-1.3*a);rot('chest',-.05*a)
        elif name.startswith('disappointed'):
            a=smooth(t/.5);rot('neck',.24*a);rot('chest',.10*a)
            if 'hands' in name:rot('upper_arm_L',-.5*a,0,-1.4*a);rot('upper_arm_R',-.5*a,0,1.4*a);rot('forearm_L',-1.7*a);rot('forearm_R',-1.7*a)
        else:
            shift=(.012 if name=='prepare_shift' else .004)*math.sin(t/2.4*math.pi*2);rig.pose.bones['hips'].location.x=shift
            breathe=math.sin(t/2.4*math.pi*2);rot('chest',.015*breathe);rot('neck',.025+.018*breathe,0,.025*math.sin(t*1.6));rot('forearm_L',-.18);rot('forearm_R',-.20)
        for side in ['L','R']:
            rig.pose.bones['clavicle_'+side].rotation_euler.z=rig.pose.bones['upper_arm_'+side].rotation_euler.z*.08
            for limb in ['upper_arm','forearm','thigh','shin']:
                rig.pose.bones[limb+'_twist_'+side].rotation_euler.y=rig.pose.bones[limb+'_'+side].rotation_euler.y*.35
            curl=.20 if name.startswith('keeper') else .12
            if name=='catch':curl=.65*smooth(t/.2)
            if 'fist' in name:curl=1.0*smooth(t/.4)
            for finger in range(5):
                for j in range(3):rot(f'finger_{finger}_{j}_{side}',curl)
        # Do not evaluate a partially baked action during analytic IK updates:
        # that would restore frame-zero legs at each view-layer update.
        rig.animation_data.action=action
        for pb in rig.pose.bones:pb.keyframe_insert('rotation_euler',frame=f);pb.keyframe_insert('location',frame=f)
        rig.animation_data.action=None
    rig.animation_data.action=None;track=rig.animation_data.nla_tracks.new();track.name=name;track.strips.new(name,0,action);track.mute=True
    markers={'leftPlant':[0,.16,.40,.58,.84,1.15,1.66,1.9],'rightPlant':[.20,.36,.64,.72,1.46,1.9],'toeOff':[.16,.36,.58,.72],'contact':[1.0]} if name.startswith('kick') else {'pushOff':[.10],'landing':[.78],'recovery':[1.5]} if name.startswith('dive') else {'complete':[duration]}
    metadata.append({'name':name,'duration':duration,'fps':30,'contactSeconds':1 if name.startswith('kick') else None,'blendSeconds':.14,'markers':markers})
scene.frame_set(0);rig.animation_data.action=bpy.data.actions['prepare'];bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'athlete-source.blend'),compress=True)
for lod in [0,1]:
    bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
    for ob in scene.objects:
        if ob.type=='MESH':ob.select_set(ob.get('lod')==lod)
    bpy.context.view_layer.objects.active=rig
    bpy.ops.export_scene.gltf(filepath=str(OUT/('athlete.glb' if lod==0 else 'athlete-low.glb')),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_nla_strips=True,export_force_sampling=True,export_frame_range=False,export_anim_slide_to_zero=True,export_materials='EXPORT')
(OUT/'movement.json').write_text(json.dumps({'version':'character-motion-4','bones':len(spec),'clips':metadata,'ballContactSeconds':1,'aimLockSeconds':.9,'presets':['crop','swept','curls','close'],'source':'CC0 Blender Studio Human Base Meshes 1.4.1; original panelled garments, equipment, rig, face presets, world-anchored approach and animation'},indent=2))
print('CHARACTER UPGRADE EXPORTED',len(spec),'bones',len(clips),'clips',OUT)
