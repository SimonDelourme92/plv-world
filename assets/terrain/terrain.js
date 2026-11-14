import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { PILOT } from "./height.js";
export async function createTerrain({ THREE, scene, heightAt }) {
  const root = new THREE.Group();
  root.name = "Technoparc pilote";
  const loader = new THREE.TextureLoader();
  // Atlases contain only the selected CC0 maps, see sources.json.
  const [color, normal, rough] = await Promise.all(
    ["color.jpg", "normal.jpg", "roughness.jpg"].map((f) =>
      loader.loadAsync(new URL("./textures/atlas-" + f, import.meta.url).href),
    ),
  );
  color.colorSpace = THREE.SRGBColorSpace;
  for (const t of [color, normal, rough]) {
    t.anisotropy = 4;
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  }
  const material = new THREE.MeshStandardMaterial({
    map: color,
    normalMap: normal,
    roughnessMap: rough,
    roughness: 1,
    normalScale: new THREE.Vector2(0.6, 0.6),
  });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vTerrainPosition;varying float vTerrainSlope;",
      )
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvTerrainPosition = position;vTerrainSlope=1.0-abs(normal.y);",
      );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <common>",
      `#include <common>
      varying vec3 vTerrainPosition;varying float vTerrainSlope;
      vec2 atlasUV(vec2 uv,float tile){return (vec2(mod(tile,3.0),2.0-floor(tile/3.0))+.008+fract(uv)*.984)/3.0;}
      vec4 terrainSample(sampler2D tex,vec2 uv,float tile){return mix(textureGrad(tex,atlasUV(uv,tile),dFdx(uv)*.328,dFdy(uv)*.328),textureGrad(tex,atlasUV(uv*.371+vec2(.31,.73),tile),dFdx(uv)*.1217,dFdy(uv)*.1217),.32);}
      float terrainRock;float terrainSoil;float terrainGravel;
    `,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      `
      vec2 tuv=vTerrainPosition.xz/4.0;
      float slope=vTerrainSlope;
      terrainRock=smoothstep(.16,.55,slope);
      terrainSoil=smoothstep(.45,.9,sin(vTerrainPosition.x*.026+sin(vTerrainPosition.z*.019))*.5+.5)*.5;
      float road=min(min(mod(vTerrainPosition.x,100.0),100.0-mod(vTerrainPosition.x,100.0)),min(mod(vTerrainPosition.z,100.0),100.0-mod(vTerrainPosition.z,100.0)));
      terrainGravel=1.0-smoothstep(2.0,7.0,road);
      vec4 grass=mix(terrainSample(map,tuv,0.0),terrainSample(map,tuv,1.0),smoothstep(-.4,.6,sin(vTerrainPosition.z*.021+vTerrainPosition.x*.012)));
      vec4 soil=mix(terrainSample(map,tuv,2.0),terrainSample(map,tuv,4.0),.45);
      vec4 land=mix(mix(grass,soil,terrainSoil),terrainSample(map,tuv,6.0),terrainRock);
      land=mix(land,terrainSample(map,tuv,8.0),terrainGravel);
      diffuseColor*=land;diffuseColor.rgb*=vec3(.91,1.06,.89)*(.91+.09*sin(vTerrainPosition.x*.009+cos(vTerrainPosition.z*.015)));
    `,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <normal_fragment_maps>",
      `
      vec3 nm=mix(terrainSample(normalMap,tuv,0.0).xyz,terrainSample(normalMap,tuv,6.0).xyz,terrainRock)*2.0-1.0;
      nm.xy*=normalScale;normal=normalize(tbn*nm);
    `,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <roughnessmap_fragment>",
      `float roughnessFactor=roughness*mix(terrainSample(roughnessMap,tuv,0.0).g,terrainSample(roughnessMap,tuv,6.0).g,terrainRock);`,
    );
  };
  const chunks = [];
  for (let z = PILOT.minZ; z < PILOT.maxZ; z += 50)
    for (let x = PILOT.minX; x < PILOT.maxX; x += 50) {
      const lod = new THREE.LOD();
      lod.autoUpdate = false;
      for (const [step, distance] of [
        [2, 0],
        [5, 180],
        [10, 380],
      ]) {
        const g = new THREE.PlaneGeometry(50, 50, 50 / step, 50 / step);
        g.rotateX(-Math.PI / 2);
        const a = g.attributes.position;
        for (let i = 0; i < a.count; i++) {
          const wx = a.getX(i) + x + 25,
            wz = a.getZ(i) + z + 25;
          a.setXYZ(i, wx, heightAt(wx, wz) + 0.025, wz);
        }
        g.computeVertexNormals();
        const mesh = new THREE.Mesh(g, material);
        mesh.receiveShadow = true;
        mesh.userData.terrainSurface = true;
        lod.addLevel(mesh, distance);
      }
      lod.position.set(0, 0, 0);
      lod.userData.center = new THREE.Vector3(x + 25, 0, z + 25);
      root.add(lod);
      chunks.push(lod);
    }
  const instances = [];
  const decorations = [],
    grassCenter = new THREE.Vector3(245, 0, 245);
  const gltfLoader = new GLTFLoader();
  for (const [id, count] of [
    ["rock_moss_set_01", 10],
    ["grass_medium_01", 48],
  ]) {
    const model = await gltfLoader.loadAsync(
      new URL("./models/" + id + ".glb", import.meta.url).href,
    );
    model.scene.updateMatrixWorld(true);
    const group = new THREE.Group();
    root.add(group);
    decorations.push({ group, grass: id === "grass_medium_01" });
    let selected = 0;
    model.scene.traverse((mesh) => {
      if (!mesh.isMesh) return;
      if (id === "grass_medium_01" && selected++ > 0) return;
      const geo = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
      const inst = new THREE.InstancedMesh(geo, mesh.material, count);
      const dummy = new THREE.Object3D();
      for (let i = 0; i < count; i++) {
        const x =
            id === "grass_medium_01" ? 225 + (i % 10) * 3.8 : 432 + (i % 4) * 8,
          z =
            id === "grass_medium_01"
              ? 225 + Math.floor(i / 10) * 4.4
              : 428 + Math.floor(i / 4) * 12;
        dummy.position.set(x, heightAt(x, z), z);
        dummy.rotation.y = i * 2.399;
        dummy.scale.setScalar(
          id === "grass_medium_01"
            ? 0.8 + (i % 3) * 0.18
            : 1.4 + (i % 3) * 0.35,
        );
        dummy.updateMatrix();
        inst.setMatrixAt(i, dummy.matrix);
        (inst.userData.transforms ??= []).push(dummy.matrix.clone());
      }
      inst.instanceMatrix.needsUpdate = true;
      inst.receiveShadow = true;
      inst.castShadow = id === "rock_moss_set_01";
      inst.userData.kind = id;
      instances.push(inst);
      group.add(inst);
    });
  }
  scene.add(root);
  return {
    root,
    refresh() {
      const m = new THREE.Matrix4(),
        position = new THREE.Vector3(),
        q = new THREE.Quaternion(),
        scale = new THREE.Vector3();
      for (const inst of instances)
        for (let i = 0; i < inst.count; i++) {
          m.copy(inst.userData.transforms[i]);
          m.decompose(position, q, scale);
          position.y = heightAt(position.x, position.z);
          if (position.y < 0.5) scale.setScalar(0);
          m.compose(position, q, scale);
          inst.setMatrixAt(i, m);
          inst.instanceMatrix.needsUpdate = true;
        }
      root.traverse((o) => {
        if (!o.userData.terrainSurface) return;
        const a = o.geometry.attributes.position;
        for (let i = 0; i < a.count; i++)
          a.setY(i, heightAt(a.getX(i), a.getZ(i)) + 0.025);
        a.needsUpdate = true;
        o.geometry.computeVertexNormals();
      });
    },
    update(camera) {
      for (const d of decorations)
        d.group.visible =
          !d.grass || camera.position.distanceTo(grassCenter) < 85;
      for (const lod of chunks) {
        const d = camera.position.distanceTo(lod.userData.center);
        lod.levels.forEach(
          (l, i) => (l.object.visible = i === (d < 180 ? 0 : d < 380 ? 1 : 2)),
        );
      }
    },
    dispose() {
      root.removeFromParent();
      root.traverse((o) => o.geometry?.dispose());
      const materials = new Set();
      root.traverse((o) => {
        if (o.material)
          for (const m of Array.isArray(o.material) ? o.material : [o.material])
            materials.add(m);
      });
      for (const m of materials) {
        for (const v of Object.values(m)) if (v?.isTexture) v.dispose();
        m.dispose();
      }
    },
  };
}
