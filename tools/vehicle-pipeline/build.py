"""Blender 4.3 : python build.py -- <sources> <sortie.glb>. Sources hors dépôt."""
import bpy,sys,math
from mathutils import Vector,Matrix
args=sys.argv[sys.argv.index('--')+1:];src,out=args
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=src+'/sedan.fbx');bpy.context.view_layer.update()
scale=4.7/4.90513551235199;center=Vector((-.002226412296295,1.3446107506752,-.2318413257599))
# Les textures de carrosserie sont préparées par prepare-textures.py.
def mat(name,color,metal=0,rough=.5,texture=None):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
 if texture:
  n=m.node_tree.nodes.new('ShaderNodeTexImage');n.image=bpy.data.images.load(src+'/'+texture);m.node_tree.links.new(n.outputs['Color'],p.inputs['Base Color'])
 return m
paint=mat('Anthracite metallic',(1,1,1),.78,.27,'paint.png');p=paint.node_tree.nodes.get('Principled BSDF');p.inputs['Coat Weight'].default_value=.65;p.inputs['Coat Roughness'].default_value=.16
# PBR selon les cartes originales, sans rendre les pneus métalliques.
for slot,filename,invert in [('Metallic','Sedan_Metallic.png',False),('Roughness','Sedan_Glossiness.png',True)]:
 n=paint.node_tree.nodes.new('ShaderNodeTexImage');n.image=bpy.data.images.load(src+'/'+filename);n.image.colorspace_settings.name='Non-Color'
 if invert:
  inv=paint.node_tree.nodes.new('ShaderNodeMath');inv.operation='SUBTRACT';inv.inputs[0].default_value=1;paint.node_tree.links.new(n.outputs['Color'],inv.inputs[1]);paint.node_tree.links.new(inv.outputs[0],p.inputs[slot])
 else:paint.node_tree.links.new(n.outputs['Color'],p.inputs[slot])
glass=mat('Tinted blue glass',(.055,.09,.12),.45,.13);glass.node_tree.nodes.get('Principled BSDF').inputs['Coat Weight'].default_value=.7
wheel=mat('Detailed tyres and alloy',(1,1,1),.12,.65,'Wheel_A_Diffuse.png')
n=wheel.node_tree.nodes.new('ShaderNodeTexImage');n.image=bpy.data.images.load(src+'/Wheel_A_Metallic.png');n.image.colorspace_settings.name='Non-Color';wheel.node_tree.links.new(n.outputs['Color'],wheel.node_tree.nodes.get('Principled BSDF').inputs['Metallic'])
head=mat('Headlights',(1,1,1),.15,.18,'lights.jpg');tail=mat('Tail lamps',(1,1,1),.1,.25,'lights.jpg')
for o in list(bpy.data.objects):
 if o.type!='MESH':continue
 # Géométries en coordonnées mondiales, puis centrage au sol et longueur 4,7 m.
 o.data.transform(o.matrix_world);o.matrix_world=Matrix.Identity(4)
 if 'Body' in o.name:
  # Conserver les UV des optiques, séparer les feux pour freinage et phares.
  indices=[p.material_index for p in o.data.polygons]
  o.data.materials.clear()
  for m in [paint,head,glass,wheel,tail]:o.data.materials.append(m)
  for face,index in zip(o.data.polygons,indices):
   face.material_index=index
   if index==1:
    y=sum(o.data.vertices[i].co.y for i in face.vertices)/len(face.vertices)
    if y<center.y:face.material_index=4
  o.name='sedan_body'
 else:
  for face in o.data.polygons:face.material_index=0
  o.data.materials.clear();o.data.materials.append(wheel)
 for v in o.data.vertices:v.co=(v.co-center)*scale
 if o.name!='sedan_body':
  pts=[v.co for v in o.data.vertices];c=Vector(tuple((min(v[k]for v in pts)+max(v[k]for v in pts))/2 for k in range(3)))
  front=c.y>0;side='L' if c.x<0 else 'R';label=('F'if front else 'R')+side
  for v in o.data.vertices:v.co-=c
  pivot=bpy.data.objects.new('steer_'+label,None);bpy.context.collection.objects.link(pivot);pivot.location=c
  o.parent=pivot;o.location=(0,0,0);o.name='wheel_'+label
 for face in o.data.polygons:face.use_smooth=True
bpy.context.scene['copyright']='Generic passenger car pack by Comrade1280 — CC BY 4.0 https://creativecommons.org/licenses/by/4.0/ ; anthracite/PBR, scale and wheel pivots modified for PLV WORLD.'
bpy.ops.export_scene.gltf(filepath=out,export_format='GLB',export_yup=True,export_extras=True)
