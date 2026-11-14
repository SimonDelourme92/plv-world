const ROOT = new URL("./vehicle/", import.meta.url);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// Échantillons CC0 + couches de combustion, roulement, vent et pneus.
// Aucune écriture dans les réglages historiques, IndexedDB ou les sauvegardes.
export class VehicleAudio {
  constructor({ context = null, onError = () => {} } = {}) {
    this.context = context;
    this.onError = onError;
    this.ready = null;
    this.samplesReady = false;
    this.enabled = true;
    this.volume = 0.65;
    this.driving = false;
    this.stoppingUntil = 0;
    this.disposed = false;
    this.sources = [];
    this.lastRpm = 850;
    this.parameters = new WeakMap();
    this.active = false;
  }
  async unlock() {
    if (this.disposed) return;
    try {
      if (!this.context) {
        const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!AC) throw Error("Web Audio indisponible");
        this.context = new AC();
      }
      if (this.context.state === "suspended" && this.context.resume)
        this.context.resume().catch(this.onError);
      if (!this.ready) {
        this.buildGraph();
        this.ready = this.loadSamples().catch((e) => {
          this.onError(e);
          return false;
        });
      }
      return await this.ready;
    } catch (e) {
      this.onError(e);
      return false;
    }
  }
  buildGraph() {
    const c = this.context;
    this.output = c.createGain();
    this.output.gain.value = 0;
    const limiter = c.createDynamicsCompressor();
    limiter.threshold.value = -12;
    limiter.knee.value = 12;
    limiter.ratio.value = 8;
    limiter.attack.value = 0.004;
    limiter.release.value = 0.18;
    this.analyser = c.createAnalyser();
    this.analyser.fftSize = 512;
    this.analysis = new Float32Array(512);
    this.output.connect(limiter).connect(this.analyser).connect(c.destination);
    this.engineBus = c.createGain();
    this.engineBus.gain.value = 0;
    this.engineBus.connect(this.output);
    this.oneshotBus = c.createGain();
    this.oneshotBus.gain.value = 0.7;
    this.oneshotBus.connect(this.output);
    // Quatre cylindres : deux combustions par tour, spectre doux et échappement filtré.
    const real = new Float32Array(17),
      imag = new Float32Array(17);
    for (let i = 1; i < 17; i++)
      imag[i] = (i % 2 ? 1 : 0.58) / Math.pow(i, 1.4);
    const wave = c.createPeriodicWave(real, imag);
    this.combustion = c.createOscillator();
    this.combustion.setPeriodicWave(wave);
    this.combustion.frequency.value = 28.33;
    this.engineFilter = c.createBiquadFilter();
    this.engineFilter.type = "lowpass";
    this.engineFilter.frequency.value = 350;
    this.engineFilter.Q.value = 0.65;
    const pulseGain = c.createGain();
    pulseGain.gain.value = 0.075;
    this.combustion
      .connect(this.engineFilter)
      .connect(pulseGain)
      .connect(this.engineBus);
    this.combustion.start();
    this.sources.push(this.combustion);
    const noise = c.createBuffer(1, c.sampleRate * 7, c.sampleRate),
      data = noise.getChannelData(0);
    let seed = 392071;
    for (let i = 0; i < data.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      data[i] = seed / 2147483648 - 1;
    }
    const layer = (type, freq, Q) => {
      const source = c.createBufferSource(),
        filter = c.createBiquadFilter(),
        gain = c.createGain();
      source.buffer = noise;
      source.loop = true;
      filter.type = type;
      filter.frequency.value = freq;
      filter.Q.value = Q;
      gain.gain.value = 0;
      source.connect(filter).connect(gain).connect(this.output);
      source.start();
      this.sources.push(source);
      return { source, filter, gain };
    };
    this.road = layer("lowpass", 480, 0.5);
    this.wind = layer("bandpass", 1400, 0.6);
    this.tyres = layer("bandpass", 1900, 1.8);
    this.idleGain = c.createGain();
    this.idleGain.gain.value = 0;
    this.idleGain.connect(this.engineBus);
    this.revGain = c.createGain();
    this.revGain.gain.value = 0;
    this.revGain.connect(this.engineBus);
    this.hornGain = c.createGain();
    this.hornGain.gain.value = 0;
    this.hornGain.connect(this.output);
  }
  async loadSamples() {
    const c = this.context,
      names = ["idle", "engine", "start", "stop", "horn"];
    const results = await Promise.all(
      names.map(async (name) => {
        const response = await fetch(new URL(name + ".ogg", ROOT));
        if (!response.ok)
          throw Error("Audio " + name + " : HTTP " + response.status);
        return c.decodeAudioData(await response.arrayBuffer());
      }),
    );
    if (this.disposed) return false;
    this.buffers = Object.fromEntries(
      names.map((name, i) => [name, results[i]]),
    );
    const loop = (name, gain) => {
      const s = c.createBufferSource();
      s.buffer = this.buffers[name];
      s.loop = true;
      s.connect(gain);
      s.start();
      this.sources.push(s);
      return s;
    };
    this.idle = loop("idle", this.idleGain);
    this.rev = loop("engine", this.revGain);
    this.horn = loop("horn", this.hornGain);
    this.samplesReady = true;
    if (this.driving && this.active) this.oneShot("start", c.currentTime);
    return true;
  }
  oneShot(name, time) {
    if (!this.buffers?.[name] || this.disposed) return;
    const source = this.context.createBufferSource();
    source.buffer = this.buffers[name];
    source.connect(this.oneshotBus);
    source.onended = () => source.disconnect();
    source.start(time);
  }
  update(
    state,
    { driving = false, active = false, visible = true, horn = false } = {},
    time = this.context?.currentTime || 0,
  ) {
    if (this.disposed) return;
    const c = this.context,
      previous = this.driving;
    this.driving = driving;
    this.active = active && driving && visible;
    this.lastRpm = state.rpm;
    if (!c || !this.output) return;
    this.time = time;
    if (driving !== previous) {
      if (driving) {
        this.oneShot("start", time);
        this.stoppingUntil = 0;
      } else {
        this.oneShot("stop", time);
        this.stoppingUntil = time + 1.8;
      }
    }
    const allowed =
      this.enabled &&
      visible &&
      (active || (!driving && time < this.stoppingUntil));
    this.smooth(this.output.gain, allowed ? this.volume * 0.65 : 0, 0.07);
    this.smooth(this.engineBus.gain, this.active ? 1 : 0, 0.18);
    const rpm = clamp(state.rpm || 850, 650, 6500),
      mix = clamp((rpm - 1350) / 2200, 0, 1),
      speed = Math.abs(state.speed || 0),
      load = state.throttle || 0;
    this.smooth(this.combustion.frequency, rpm / 30, 0.09);
    this.smooth(
      this.engineFilter.frequency,
      300 + rpm * 0.25 + load * 500,
      0.12,
    );
    if (this.idle) {
      this.smooth(this.idle.playbackRate, clamp(rpm / 1000, 0.65, 2.8), 0.14);
      this.smooth(this.rev.playbackRate, clamp(rpm / 2400, 0.5, 2.6), 0.14);
    }
    this.smooth(
      this.idleGain.gain,
      0.62 * Math.cos((mix * Math.PI) / 2) * (0.75 + load * 0.25),
      0.12,
    );
    this.smooth(
      this.revGain.gain,
      0.48 * Math.sin((mix * Math.PI) / 2) * (0.65 + load * 0.35),
      0.12,
    );
    const motion = this.active ? 1 : 0;
    this.smooth(
      this.road.gain.gain,
      motion * Math.min(0.12, speed * 0.004),
      0.18,
    );
    this.smooth(this.road.filter.frequency, 350 + speed * 30, 0.2);
    this.smooth(
      this.wind.gain.gain,
      motion * Math.min(0.11, Math.pow(speed / 35, 2) * 0.09),
      0.3,
    );
    this.smooth(this.tyres.gain.gain, motion * (state.slip || 0) * 0.12, 0.055);
    this.smooth(
      this.tyres.filter.frequency,
      1450 + (state.slip || 0) * 600,
      0.1,
    );
    this.smooth(this.hornGain.gain, this.active && horn ? 0.45 : 0, 0.025);
  }
  smooth(parameter, value, tau = 0.12) {
    if (this.parameters.get(parameter) === value) return;
    this.parameters.set(parameter, value);
    parameter.setTargetAtTime(value, this.time, tau);
  }
  get statistics() {
    let sum = 0;
    if (this.analyser) {
      this.analyser.getFloatTimeDomainData(this.analysis);
      for (const v of this.analysis) sum += v * v;
    }
    return {
      context: this.context?.state || "awaiting-gesture",
      samplesReady: this.samplesReady,
      active: this.active,
      enabled: this.enabled,
      volume: this.volume,
      rpm: this.lastRpm,
      rms: this.analysis ? Math.sqrt(sum / this.analysis.length) : 0,
    };
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (const s of this.sources) {
      try {
        s.stop();
        s.disconnect();
      } catch {}
    }
    this.output?.disconnect();
    if (this.context?.close) this.context.close().catch(() => {});
  }
}
