// Cache de ressources indépendant de l'inventaire et d'IndexedDB.
const LIBRARY_ROOT = new URL("./", import.meta.url);
const SITE_ROOT = new URL("../../", import.meta.url);
export class AssetLibrary {
  constructor({
    concurrency = 2,
    retentionMs = 15000,
    manifestUrl = new URL("manifest.json", LIBRARY_ROOT),
  } = {}) {
    this.concurrency = concurrency;
    this.retentionMs = retentionMs;
    this.cache = new Map();
    this.queue = [];
    this.active = 0;
    this.disposed = false;
    this.manifest = fetch(manifestUrl)
      .then((r) => {
        if (!r.ok) throw Error("Manifeste : HTTP " + r.status);
        return r.json();
      })
      .then((m) => {
        if (m.format !== "plv-asset-library" || m.version !== 1)
          throw Error("Manifeste incompatible");
        return m;
      });
    this.manifest.catch(() => {});
    this.loader = null;
  }
  async getManifest() {
    return this.manifest;
  }
  async getLoader() {
    if (!this.loader)
      this.loader = Promise.all([
        import("three/addons/loaders/GLTFLoader.js"),
        import(
          "https://cdn.jsdelivr.net/npm/meshoptimizer@1.3.0/meshopt_decoder.mjs"
        ),
      ]).then(async ([{ GLTFLoader }, { MeshoptDecoder }]) => {
        await MeshoptDecoder.ready;
        return new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
      });
    return this.loader;
  }
  async acquire(id, level = 1) {
    if (this.disposed) throw Error("Bibliothèque fermée");
    const manifest = await this.manifest;
    if (this.disposed) throw Error("Bibliothèque fermée");
    const asset = manifest.models.find((a) => a.id === id),
      lod = asset?.lods.find((l) => l.level === level);
    if (!lod) throw Error("Asset ou LOD absent : " + id);
    const key = id + "@" + level;
    let entry = this.cache.get(key);
    if (!entry) {
      entry = {
        id,
        key,
        refs: 0,
        lod,
        asset,
        resource: null,
        timer: null,
        promise: null,
      };
      entry.promise = this.enqueue(() => this.load(entry)).catch((error) => {
        this.cache.delete(key);
        throw error;
      });
      this.cache.set(key, entry);
    }
    clearTimeout(entry.timer);
    entry.timer = null;
    entry.refs++;
    try {
      const resource = await entry.promise;
      if (this.disposed) throw Error("Bibliothèque fermée");
      let released = false;
      return {
        asset,
        lod,
        scene: resource.scene,
        release: () => {
          if (released) return;
          released = true;
          this.release(entry);
        },
      };
    } catch (error) {
      entry.refs = Math.max(0, entry.refs - 1);
      throw error;
    }
  }
  enqueue(run) {
    if (this.disposed) return Promise.reject(Error("Bibliothèque fermée"));
    return new Promise((resolve, reject) => {
      this.queue.push({ run, resolve, reject });
      this.pump();
    });
  }
  pump() {
    while (
      !this.disposed &&
      this.active < this.concurrency &&
      this.queue.length
    ) {
      const task = this.queue.shift();
      this.active++;
      Promise.resolve()
        .then(task.run)
        .then(task.resolve, task.reject)
        .finally(() => {
          this.active--;
          this.pump();
        });
    }
  }
  async load(entry) {
    const loader = await this.getLoader();
    if (this.disposed) throw Error("Bibliothèque fermée");
    const url = new URL(entry.lod.path, SITE_ROOT),
      controller = new AbortController(),
      timer = setTimeout(() => controller.abort(), 15000);
    entry.controller = controller;
    let bytes;
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw Error(entry.id + " : HTTP " + response.status);
      bytes = await response.arrayBuffer();
      if (bytes.byteLength !== entry.lod.bytes)
        throw Error("Poids inattendu : " + entry.id);
    } finally {
      clearTimeout(timer);
      entry.controller = null;
    }
    const gltf = await loader.parseAsync(bytes, new URL("./", url).href);
    entry.resource = gltf;
    if (this.disposed) {
      disposeGLTF(gltf);
      throw Error("Bibliothèque fermée");
    }
    return gltf;
  }
  release(entry) {
    entry.refs = Math.max(0, entry.refs - 1);
    if (entry.refs || this.disposed) return;
    clearTimeout(entry.timer);
    entry.timer = setTimeout(() => {
      if (entry.refs) return;
      disposeGLTF(entry.resource);
      entry.resource = null;
      this.cache.delete(entry.key);
    }, this.retentionMs);
  }
  get statistics() {
    return {
      cached: this.cache.size,
      active: this.active,
      queued: this.queue.length,
      bytes: [...this.cache.values()]
        .filter((e) => e.resource)
        .reduce((n, e) => n + e.lod.bytes, 0),
      references: [...this.cache.values()].reduce((n, e) => n + e.refs, 0),
    };
  }
  dispose() {
    this.disposed = true;
    for (const task of this.queue) task.reject(Error("Bibliothèque fermée"));
    this.queue.length = 0;
    for (const entry of this.cache.values()) {
      clearTimeout(entry.timer);
      entry.controller?.abort();
      disposeGLTF(entry.resource);
    }
    this.cache.clear();
  }
}
function disposeGLTF(gltf) {
  if (!gltf) return;
  const geometries = new Set(),
    materials = new Set(),
    textures = new Set(),
    images = new Set();
  gltf.scene.traverse((node) => {
    if (node.geometry) geometries.add(node.geometry);
    for (const material of node.material
      ? Array.isArray(node.material)
        ? node.material
        : [node.material]
      : []) {
      materials.add(material);
      for (const value of Object.values(material))
        if (value?.isTexture) {
          textures.add(value);
          if (value.source?.data) images.add(value.source.data);
        }
    }
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
  textures.forEach((t) => t.dispose());
  images.forEach((i) => i.close?.());
}
