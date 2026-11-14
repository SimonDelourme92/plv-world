// Plan de rivière, en mètres. Les parties profondes restent accessibles à pied.
export const RIVER_AREA = { minX: -500, maxX: 0, minZ: -500, maxZ: 500 };
const main = [
  [-455,-500],[-440,-450],[-385,-410],[-335,-365],[-330,-320],
  [-370,-275],[-420,-230],[-450,-175],[-440,-125],[-385,-80],
  [-330,-40],[-320,5],[-350,55],[-385,105],[-380,150],
  [-330,200],[-275,230],[-220,260],[-180,320],[-160,390],[-120,500],
];
// Un bras court rejoint le cours principal et laisse une île au milieu.
const side = [[-330,200],[-365,240],[-355,285],[-315,315],[-250,335],[-180,320]];
function spline(points) {
  const out=[];
  for(let i=0;i<points.length-1;i++){
    const p0=points[Math.max(0,i-1)],p1=points[i],p2=points[i+1],p3=points[Math.min(points.length-1,i+2)];
    for(let n=0;n<6;n++){
      const t=n/6,t2=t*t,t3=t2*t;
      const axis=k=>.5*((2*p1[k])+(-p0[k]+p2[k])*t+(2*p0[k]-5*p1[k]+4*p2[k]-p3[k])*t2+(-p0[k]+3*p1[k]-3*p2[k]+p3[k])*t3);
      out.push([axis(0),axis(1)]);
    }
  }
  out.push(points.at(-1));return out;
}
const paths=[{points:spline(main),width:12,depth:4},{points:spline(side),width:6,depth:2.5}];
function distToPath(x,z,points){let best=Infinity;for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],dx=b[0]-a[0],dz=b[1]-a[1],length=dx*dx+dz*dz;
  const t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/length));
  best=Math.min(best,(x-a[0]-t*dx)**2+(z-a[1]-t*dz)**2);
}return Math.sqrt(best);}
function smooth(a,b,x){const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);}
export function riverbedHeight(x,z,reservations=[]){
  if(x<RIVER_AREA.minX||x>RIVER_AREA.maxX||z<RIVER_AREA.minZ||z>RIVER_AREA.maxZ)return 0;
  let depth=0;
  for(const p of paths){const d=distToPath(x,z,p.points);depth=Math.max(depth,p.depth*(1-smooth(p.width*.45,p.width+14,d)));}
  const basin=Math.hypot(x+407,z+130);depth=Math.max(depth,2.4*(1-smooth(14,35,basin)));
  // Lac sec relié à la rivière, avec des berges progressives et irrégulières.
  // Son raccord côté nord préserve la bifurcation existante et sa petite île.
  const lx=(x+325)/150,lz=(z-375)/105;
  const angle=Math.atan2(lz,lx);
  const edge=1+0.08*Math.sin(angle*3+.6)+0.045*Math.sin(angle*5-1.2);
  const radial=Math.hypot(lx,lz)/edge;
  const lake=7*(1-smooth(.55,1,radial))*smooth(280,340,z);
  depth=Math.max(depth,lake);
  if(depth===0)return 0;
  // Every lot, collision and future reservation stays flat, with a smooth transition.
  for(const b of reservations){const dx=Math.max(b.min.x-x,0,x-b.max.x),dz=Math.max(b.min.z-z,0,z-b.max.z);depth*=smooth(3,15,Math.hypot(dx,dz));if(depth===0)break;}
  return depth===0 ? 0 : -depth;
}

export function createRiverbed({THREE,scene,ground,reservations}){
  const root=new THREE.Group();root.name='Lit de rivière sans eau';const chunks=[];
  let protectedAreas=reservations();const height=(x,z)=>riverbedHeight(x,z,protectedAreas);
  for(let z=RIVER_AREA.minZ;z<RIVER_AREA.maxZ;z+=100)for(let x=RIVER_AREA.minX;x<RIVER_AREA.maxX;x+=100){
    const g=new THREE.PlaneGeometry(100,100,50,50);g.rotateX(-Math.PI/2);const pos=g.attributes.position,uv=g.attributes.uv;
    for(let i=0;i<pos.count;i++){const wx=x+50+pos.getX(i),wz=z+50+pos.getZ(i);pos.setXYZ(i,wx,height(wx,wz),wz);uv.setXY(i,(wx+1000)/2000,1-(wz+1000)/2000);}
    g.computeVertexNormals();g.computeBoundingSphere();const mesh=new THREE.Mesh(g,ground.material);mesh.receiveShadow=true;root.add(mesh);chunks.push(mesh);
  }
  // Retire seulement le plan plat sous la géométrie du lit.
  ground.material.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vGroundWorld;').replace('#include <begin_vertex>','#include <begin_vertex>\nvGroundWorld=(modelMatrix*vec4(position,1.)).xyz;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vGroundWorld;').replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nif(vGroundWorld.x > -500.0 && vGroundWorld.x < 0.0 && vGroundWorld.z > -500.0 && vGroundWorld.z < 500.0 && vGroundWorld.y > -0.001) discard;');
  };
  // Chunks need their own material: the hole applies only to the original plane.
  const riverMaterial=ground.material.clone();riverMaterial.onBeforeCompile=()=>{};riverMaterial.customProgramCacheKey=()=> 'riverbed-surface';
  for(const mesh of chunks)mesh.material=riverMaterial;
  ground.material.customProgramCacheKey=()=> 'riverbed-hole';ground.material.needsUpdate=true;scene.add(root);
  return {height,root,refresh(){protectedAreas=reservations();for(const mesh of chunks){const p=mesh.geometry.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,height(p.getX(i),p.getZ(i)));p.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingSphere();}},update(){},dispose(){root.removeFromParent();for(const mesh of chunks)mesh.geometry.dispose();riverMaterial.dispose();ground.material.onBeforeCompile=()=>{};ground.material.needsUpdate=true;}};
}
