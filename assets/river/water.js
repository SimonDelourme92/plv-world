// Eau de la rivière et du lac. Un niveau unique ; l'eau n'apparaît que là où le lit descend sous ce niveau.
// Transparence et couleur dépendent de la profondeur ; ondulations procédurales animées (aucune texture).
export const WATER_LEVEL = -0.9;

export function createWater({ THREE, scene, bounds, step = 100, segments = 50, height }) {
  const root = new THREE.Group();
  root.name = 'Eau';
  const uniforms = { uTime: { value: 0 } };
  const material = new THREE.MeshStandardMaterial({
    color: 0x2f7f8c, emissive: 0x0f4a5a, emissiveIntensity: 0.55, roughness: 0.08, metalness: 0.0, transparent: true, depthWrite: false, envMapIntensity: 1.4,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aDepth;\nvarying float vDepth;\nvarying vec3 vWater;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvDepth=aDepth;\nvWater=(modelMatrix*vec4(position,1.)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nvarying float vDepth;\nvarying vec3 vWater;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 shallow=vec3(.36,.72,.70), deep=vec3(.06,.32,.42);
        diffuseColor.rgb=mix(shallow,deep,smoothstep(.2,4.5,vDepth));
        diffuseColor.a=mix(.3,.85,smoothstep(.0,2.5,vDepth))*smoothstep(.0,.25,vDepth);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        {
          vec2 p=vWater.xz; float t=uTime;
          float dx=cos(p.x*.9+p.y*.35+t*1.3)*.5+cos(p.x*2.3-p.y*1.7+t*2.1)*.3+cos(p.x*5.1+p.y*3.9-t*3.0)*.15;
          float dz=cos(p.y*.8-p.x*.3+t*1.1)*.5+cos(p.y*2.1+p.x*1.9-t*1.8)*.3+cos(p.y*4.7-p.x*4.3+t*2.7)*.15;
          normal=normalize((viewMatrix*vec4(dx*.07,1.,dz*.07,0.)).xyz);
        }`);
  };
  material.customProgramCacheKey = () => 'plv-water';

  const meshes = [];
  const fill = (g, ox, oz) => {
    const pos = g.attributes.position, d = g.attributes.aDepth;
    let wet = false;
    for (let i = 0; i < pos.count; i++) {
      const wx = ox + pos.getX(i), wz = oz + pos.getZ(i);
      const depth = Math.max(0, WATER_LEVEL - height(wx, wz));
      pos.setXYZ(i, wx, WATER_LEVEL, wz); d.setX(i, depth);
      if (depth > 0) wet = true;
    }
    pos.needsUpdate = true; d.needsUpdate = true; g.computeBoundingSphere();
    return wet;
  };
  for (let z = bounds.minZ; z < bounds.maxZ; z += step) for (let x = bounds.minX; x < bounds.maxX; x += step) {
    const g = new THREE.PlaneGeometry(step, step, segments, segments);
    g.rotateX(-Math.PI / 2);
    g.setAttribute('aDepth', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count), 1));
    const ox = x + step / 2, oz = z + step / 2;
    // Les positions locales du plan sont centrées ; on les décale une seule fois ici.
    const wet = fill(g, ox, oz);
    const mesh = new THREE.Mesh(g, material);
    mesh.userData.origin = [ox, oz];
    mesh.renderOrder = 2; mesh.visible = wet; mesh.frustumCulled = true;
    root.add(mesh); meshes.push(mesh);
  }
  scene.add(root);

  return {
    root,
    level: WATER_LEVEL,
    isWater: (x, z) => height(x, z) < WATER_LEVEL,
    update(seconds) { if (Number.isFinite(seconds)) uniforms.uTime.value = seconds % 3600; },
    refresh() {
      // Après un replacement de lots, le lit change : on recalcule les profondeurs.
      for (const mesh of meshes) {
        const g = mesh.geometry, pos = g.attributes.position, d = g.attributes.aDepth;
        let wet = false;
        for (let i = 0; i < pos.count; i++) {
          const depth = Math.max(0, WATER_LEVEL - height(pos.getX(i), pos.getZ(i)));
          d.setX(i, depth); if (depth > 0) wet = true;
        }
        d.needsUpdate = true; mesh.visible = wet;
      }
    },
    dispose() { root.removeFromParent(); for (const m of meshes) m.geometry.dispose(); material.dispose(); },
  };
}
