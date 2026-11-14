// Parvis Méridien — géométries originales, sans modèle ni texture tiers.
// Toutes les coordonnées restent dans la cellule centrale déjà réservée (0–100 m).
export function createPilotDistrict({THREE,scene,mergeGeometries,onChange=()=>{}}){
 const root=new THREE.Group();root.name='Quartier pilote · Parvis Méridien';scene.add(root);
 const collisions=[];let resources=null,pending=null,releaseAt=0,disposed=false,gardenModels=false;
 const collision=(x,z,w,d,h,minY=0)=>collisions.push({min:{x:x-w/2,y:minY,z:z-d/2},max:{x:x+w/2,y:h,z:z+d/2}});
 // Les emprises restent disponibles indépendamment des ressources graphiques.
 const buildings=[
  {x:19,z:17,w:22,d:22,h:43,flip:1},
  {x:76,z:17,w:29,d:20,h:59,flip:-1},
  {x:12,z:38,w:13,d:16,h:27,flip:1},
  {x:87,z:39,w:16,d:19,h:37,flip:-1},
  {x:15,z:83,w:20,d:20,h:17,flip:1},
  {x:86,z:84,w:19,d:19,h:23,flip:-1}
 ];
 for(const b of buildings)collision(b.x,b.z,b.w+1,b.d+1,b.h);
 const gardens=[[29,31,10,5],[67,30,12,5],[31,75,7,5],[70,76,7,5]];
 for(const [x,z,w,d] of gardens)collision(x,z,w,d,.65);
 // Bases des deux lames ; le vide central du portique reste traversable.
 collision(41.6,50.25,5.6,3,7);collision(58.4,48.25,5.6,3,7);
 // Volumes hauts du portique : les collisions respectent son ouverture au sol.
 collision(43.2,50.25,6.4,3,17,7);collision(56.8,48.25,6.4,3,17,7);
 collision(45.6,50.25,7.2,3,25,17);collision(54.4,48.25,7.2,3,25,17);
 collision(50,49.25,13,6,32.2,25);
 const lamps=[];for(const x of [35,65])for(const z of [7,23,77,94])lamps.push([x,z]);
 for(const [x,z] of lamps)collision(x,z,.24,.24,7);
 for(const x of [45,55])collision(x,28,.15,.15,3.6);
 collision(5.3,63,.15,.15,1.8);collision(94,62,.15,.15,1.8);
 function build(){
  if(resources||disposed)return;
  const geometries=new Set(),materials=new Set(),textures=new Set(),instanceMeshes=[];
  const geo=g=>(geometries.add(g),g),material=params=>{const m=new THREE.MeshStandardMaterial(params);materials.add(m);return m;};
  const mats={
   shell:material({color:'#e9edf0',roughness:.38,metalness:.16}),
   dark:material({color:'#172531',roughness:.45,metalness:.48}),
   glass:material({color:'#4d8297',roughness:.13,metalness:.72}),
   metal:material({color:'#8cabb7',roughness:.3,metalness:.8}),
   light:material({color:'#b4ecf1',emissive:'#55d9e8',emissiveIntensity:.5,roughness:.35,metalness:.3}),
   paving:material({color:'#cbd5db',roughness:.82,metalness:.08,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}),
   road:material({color:'#263746',roughness:.76,metalness:.12,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}),
   joint:material({color:'#7c959f',roughness:.72,metalness:.25,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3}),
   foliage:material({color:'#476e5d',roughness:.95}),
   bark:material({color:'#4e5149',roughness:.96}),
   soil:material({color:'#31433c',roughness:1})
  };
  mats.gardenFoliage=mats.foliage;mats.gardenBark=mats.bark;
  const box=geo(new THREE.BoxGeometry(1,1,1));
  const leaf=geo(new THREE.SphereGeometry(1,12,8));
  const cyl=geo(new THREE.CylinderGeometry(.5,.5,1,10));
  const base=new THREE.Group(),detail=new THREE.Group();base.name='Volumes et silhouette';detail.name='Détails proches';root.add(base,detail);
  const batches=new Map(),carrier=new THREE.Object3D(),architecturalGeos=[];
  function part(mat,x,y,z,w,h,d,near=false,rotation=0,geometry=box,tilt=0){
   const key=mat+':'+near+':'+geometry.id;
   if(!batches.has(key))batches.set(key,{mat,near,geometry,matrices:[]});
   carrier.position.set(x,y,z);carrier.rotation.set(0,rotation,tilt);carrier.scale.set(w,h,d);carrier.updateMatrix();
   batches.get(key).matrices.push(carrier.matrix.clone());
  }
  // Dalle affleurante : pas de marche invisible pour le contrôleur de déplacement.
  part('paving',50,.012,50,91,.004,91);
  part('road',50,.03,50,13,.004,91);
  // La croix est découpée : aucune dalle coplanaire en double à l’intersection.
  part('road',24,.03,52,39,.004,11);part('road',76,.03,52,39,.004,11);
  for(const x of [42.9,57.1])part('joint',x,.05,50,.12,.008,91);
  for(const z of [45.9,58.1])part('joint',50,.05,z,91,.008,.12);
  // Calepinage architectural, partagé et instancié (pas une grille mondiale).
  for(let n=8;n<=92;n+=4){
   part('joint',n,.05,27,.025,.008,36,true);
   part('joint',n,.05,76,.025,.008,35,true);
   part('joint',25,.05,n,35,.008,.025,true);
   part('joint',76,.05,n,34,.008,.025,true);
  }
  // Cheminements lumineux fins et bandes de traversée, sans bloom.
  for(const z of [4,96])for(let x=44;x<=56;x+=2)part('joint',x,.06,z,.8,.008,3,true);
  for(const z of [44,60])for(const x of [15,85])part('light',x,.07,z,19,.012,.07);
  // Chaque édifice possède socle, atrium vitré, aile pleine, retrait et couronnement.
  for(const b of buildings){
   const {x,z,w,d,h,flip}=b;
   part('dark',x,.55,z,w+1,1.1,d+1);
   part('glass',x,h*.42+1,z,w*.91,h*.76,d*.93);
   // Noyau latéral et volume supérieur décalé : silhouette distincte depuis le sol.
   // Noyau biseauté : la toiture et les pans ne sont pas des boîtes génériques.
   const coreShape=new THREE.Shape();coreShape.moveTo(-w*.155,0);coreShape.lineTo(w*.155,0);coreShape.lineTo(w*.155,h*.85);coreShape.lineTo(0,h);coreShape.lineTo(-w*.155,h*.94);coreShape.closePath();
   const coreGeo=geo(new THREE.ExtrudeGeometry(coreShape,{depth:d,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.12,bevelThickness:.12}));coreGeo.translate(x+flip*w*.32,0,z-d/2);architecturalGeos.push(coreGeo);
   part('shell',x-flip*w*.07,h*.87,z-d*.11,w*.91,h*.16,d*.78);
   part('dark',x-flip*w*.07,h*.97,z-d*.11,w*.94,.5,d*.81);
   part('shell',x-flip*w*.18,h*.50,z+d*.34,w*.52,h*.16,d*.34);
   part('shell',x,h*.13,z+d*.49,w+1,.45,1.4);
   // Grands auvents et galeries, leurs poteaux sont dans l'emprise des bâtiments.
   part('shell',x,4.8,z+d*.5,w+1,.5,3.0);
   for(const s of [-1,1])part('metal',x+s*w*.42,2.65,z+d*.48,.2,4.3,.2);
   for(let y=7;y<h*.82;y+=4.2){
    part('metal',x,y,z,w*.94,.12,d*.96,true);
    part('shell',x,y+.22,z+d*.48,w*.96,.18,.5,true);
    part('dark',x+flip*w*.32,y,z+d*.506,w*.27,.07,.04,true);
   }
   for(let u=-.4;u<=.41;u+=.13){
    part('shell',x+w*u,h*.43,z+d*.49,.22,h*.73,.45,true);
    part('metal',x+w*u,h*.43,z-d*.49,.10,h*.73,.14,true);
   }
   for(const s of [-1,1])part('light',x+s*w*.46,4.12,z+d*.51,.055,2.8,.08);
   // Persiennes de toiture et jardin suspendu sur le retrait.
   part('soil',x-flip*w*.14,h*.595,z+d*.34,w*.45,.15,d*.26,true);
   for(let k=0;k<6;k++)part('foliage',x-flip*w*.14+(k-2.5)*w*.07,h*.62,z+d*.34,w*.07,.8,d*.18,true,0,leaf);
   for(let k=0;k<5;k++)part('metal',x+(k-2)*w*.14,h*.99,z-d*.15,.22,.35,d*.64,true);
  }
  // Portique Méridien : deux lames pliées biseautées, géométrie originale.
  const bladePoints=[[-11,0],[-7,0],[-3,21],[1,29],[-3,32],[-7,23]];
  const bladeGeos=architecturalGeos;
  for(const side of [-1,1]){
   const shape=new THREE.Shape();bladePoints.forEach(([x,y],i)=>i?shape.lineTo(side*x,y):shape.moveTo(side*x,y));shape.closePath();
   const blade=geo(new THREE.ExtrudeGeometry(shape,{depth:2.5,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.18,bevelThickness:.18}));
   blade.translate(50,0,side<0?47:49);bladeGeos.push(blade);
  }
  const sculptureGeometry=geo(mergeGeometries(bladeGeos,false));
  const sculpture=new THREE.Mesh(sculptureGeometry,mats.shell);sculpture.castShadow=sculpture.receiveShadow=true;base.add(sculpture);
  // Socle sombre affleurant et inserts cyan encastrés, pas d'anneaux flottants.
  part('dark',40.5,.045,50.25,5,.09,4);part('dark',59.5,.045,48.25,5,.09,4);
  for(const side of [-1,1]){
   part('metal',50+side*9.3,10.4,side<0?49.75:46.75,.2,21.4,.10,false,0,box,side*.19);
   part('light',50+side*9.08,10.4,side<0?49.81:46.69,.07,21.1,.06,false,0,box,side*.19);
  }
  // Jardins géométriques : essences homogènes, houppiers ellipsoïdes lissés.
  for(const [x,z,w,d] of gardens){
   part('shell',x,.3,z,w,.6,d);
   part('soil',x,.62,z,w-.55,.08,d-.55);
   part('metal',x,.67,z+d*.5,w,.08,.12,true);
   for(const s of [-1,0,1]){
    const tx=x+s*w*.29;
    part('gardenBark',tx,2.2,z,.2,3.2,.2,false,0,cyl);
    part('gardenFoliage',tx,4.1,z,1.6,2.3,1.3,false,0,leaf);
    part('gardenFoliage',tx+.8,3.6,z+.3,.95,1.4,.9,true,0,leaf);
   }
   part('dark',x,.42,z+d*.5+1.15,w*.68,.72,.55);
   part('metal',x,.82,z+d*.5+1.15,w*.7,.08,.64,true);
  }
  for(const [x,z] of lamps){
   part('dark',x,3.5,z,.16,7,.22);
   part('shell',x,7,z,.4,.22,2.4);
   part('light',x,6.86,z,.24,.04,2.15);
  }
  // Signalétique sobre, une seule texture atlas générée localement.
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#172531';ctx.fillRect(0,0,1024,512);
  const labels=[['MÉRIDIEN','PARVIS CENTRAL  /  01'],['EXPOSITIONS','PRODUCTIONS PLV  /  ÉCHELLE 1:1'],['GALERIE EST','LES PRODUCTIONS DE L’ANNÉE'],['PLV WORLD','CITÉ DES PRODUCTIONS']];
  labels.forEach(([title,sub],i)=>{const y=i*128;ctx.fillStyle='#79d8e5';ctx.fillRect(28,y+24,4,80);ctx.font='20px sans-serif';ctx.fillText(sub,56,y+43);ctx.fillStyle='#edf2f5';ctx.font='500 48px sans-serif';ctx.fillText(title,56,y+102);});
  for(const x of [45,55])part('metal',x,1.8,28,.12,3.6,.12);
  part('metal',5.3,.9,63,.12,1.8,.12);part('metal',94,.9,62,.12,1.8,.12);
  const atlas=new THREE.CanvasTexture(canvas);atlas.colorSpace=THREE.SRGBColorSpace;textures.add(atlas);
  const signMat=new THREE.MeshBasicMaterial({map:atlas,side:THREE.DoubleSide});materials.add(signMat);
  const signGeos=[];const signs=[[50,4.2,28,0],[5.3,2.2,63,Math.PI/2],[94,2.2,62,-Math.PI/2],[76,8,27.15,0]];
  signs.forEach(([x,y,z,rot],i)=>{const g=geo(new THREE.PlaneGeometry(i===0?10:5.4,i===0?1.25:.675));const uv=g.attributes.uv;for(let j=0;j<uv.count;j++)uv.setY(j,(3-i+uv.getY(j))/4);g.rotateY(rot);g.translate(x,y,z);signGeos.push(g);});
  base.add(new THREE.Mesh(geo(mergeGeometries(signGeos,false)),signMat));
  // Un appel de dessin par combinaison matière / géométrie / niveau de détail.
  for(const {mat,near,geometry,matrices} of batches.values()){
   const mesh=new THREE.InstancedMesh(geometry,mats[mat],matrices.length);mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
   matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();
   mesh.receiveShadow=!['light','foliage','gardenFoliage'].includes(mat);mesh.castShadow=!near&&['shell','dark','foliage','bark','gardenFoliage','gardenBark'].includes(mat);
   mesh.userData.gardenTree=mat.startsWith('garden');if(mesh.userData.gardenTree)mesh.visible=!gardenModels;(near?detail:base).add(mesh);instanceMeshes.push(mesh);
  }
  resources={base,detail,mats,geometries,materials,textures,instanceMeshes};onChange();
 }
 function release(){
  if(!resources)return;
  const r=resources;r.base.removeFromParent();r.detail.removeFromParent();
  r.instanceMeshes.forEach(m=>m.dispose());r.geometries.forEach(g=>g.dispose());r.materials.forEach(m=>m.dispose());r.textures.forEach(t=>t.dispose());resources=null;releaseAt=0;onChange();
 }
 function update(active,quality='medium',hour=16.5,map=false,now=0){
  if(disposed)return;
  const dx=active.position.x-50,dz=active.position.z-50,distance=Math.hypot(dx,dz);
  root.visible=map||distance<430;
  if(resources){resources.detail.visible=!map&&quality!=='low'&&distance<(quality==='high'?220:150);resources.mats.light.emissiveIntensity=hour<8.5||hour>=19?1.25:.5;}
  if(distance>600&&!map){if(!releaseAt)releaseAt=now+10000;if(resources&&now>=releaseAt&&!pending)pending=setTimeout(()=>{pending=null;release();},0);}
  else{releaseAt=0;if(pending){clearTimeout(pending);pending=null;}if(!resources)pending=setTimeout(()=>{pending=null;build();},0);}
 }
 build();
 return {root,collisions,update,setGardenModels(value){gardenModels=value;for(const m of resources?.instanceMeshes||[])if(m.userData.gardenTree)m.visible=!value;},get loaded(){return !!resources;},dispose(){disposed=true;if(pending)clearTimeout(pending);release();root.removeFromParent();}};
}
