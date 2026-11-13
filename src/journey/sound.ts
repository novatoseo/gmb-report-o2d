// Ambiente sonoro generado en el navegador (sin archivos): viento según la altitud,
// pájaros de día, grillos de noche y todo amortiguado cuando nieva. Solo suena si se activa.

export class Ambience {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private muffle!: BiquadFilterNode;
  private wind!: GainNode;
  private windFilter!: BiquadFilterNode;
  private birds!: GainNode;
  private crickets!: GainNode;
  private nextBird = 0;
  on = false;
  private mix = { alt: 2, day: 1, night: 0, snow: 0, speed: 0 };

  private build() {
    const ctx = new AudioContext();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.muffle = ctx.createBiquadFilter();
    this.muffle.type = 'lowpass';
    this.muffle.frequency.value = 12000;
    this.master.connect(this.muffle).connect(ctx.destination);

    // Viento: ruido rosa filtrado que respira despacio
    const len = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + w * 0.029591;
      b1 = 0.985 * b1 + w * 0.032534;
      b2 = 0.95 * b2 + w * 0.048056;
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.5;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    this.windFilter = ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.value = 500;
    this.windFilter.Q.value = 0.6;
    this.wind = ctx.createGain();
    this.wind.gain.value = 0;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.13;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 220;
    lfo.connect(lfoGain).connect(this.windFilter.frequency);
    noise.connect(this.windFilter).connect(this.wind).connect(this.master);
    noise.start();
    lfo.start();

    // Grillos: un tono agudo modulado a pulsos
    this.crickets = ctx.createGain();
    this.crickets.gain.value = 0;
    const cr = ctx.createOscillator();
    cr.frequency.value = 4600;
    const am = ctx.createGain();
    am.gain.value = 0;
    const pulse = ctx.createOscillator();
    pulse.type = 'square';
    pulse.frequency.value = 26;
    const pulseGain = ctx.createGain();
    pulseGain.gain.value = 0.5;
    pulse.connect(pulseGain).connect(am.gain);
    const chirp = ctx.createOscillator();
    chirp.frequency.value = 1.3;
    const chirpGain = ctx.createGain();
    chirpGain.gain.value = 0.5;
    chirp.connect(chirpGain).connect(am.gain);
    cr.connect(am).connect(this.crickets).connect(this.master);
    cr.start();
    pulse.start();
    chirp.start();

    this.birds = ctx.createGain();
    this.birds.gain.value = 0;
    this.birds.connect(this.master);
  }

  private bird() {
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    const f = 2400 + Math.random() * 1800;
    const notes = 2 + Math.floor(Math.random() * 4);
    g.gain.setValueAtTime(0, t);
    for (let i = 0; i < notes; i++) {
      const s = t + i * 0.11;
      o.frequency.setValueAtTime(f * (1 + Math.random() * 0.2), s);
      o.frequency.exponentialRampToValueAtTime(f * (0.7 + Math.random() * 0.5), s + 0.08);
      g.gain.linearRampToValueAtTime(0.18, s + 0.015);
      g.gain.linearRampToValueAtTime(0, s + 0.09);
    }
    const pan = ctx.createStereoPanner();
    pan.pan.value = Math.random() * 1.6 - 0.8;
    o.connect(g).connect(pan).connect(this.birds);
    o.start(t);
    o.stop(t + notes * 0.11 + 0.1);
  }

  /** Pequeño «tic» al cambiar de capítulo. */
  tick() {
    if (!this.on || !this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(880, t);
    o.frequency.exponentialRampToValueAtTime(440, t + 0.12);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.06, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 0.2);
  }

  async toggle(on: boolean) {
    this.on = on;
    if (on && !this.ctx) this.build();
    if (!this.ctx) return;
    if (on) await this.ctx.resume();
    this.master.gain.setTargetAtTime(on ? 0.9 : 0, this.ctx.currentTime, 0.4);
    // Apagado del todo tras el fundido: el contexto deja de consumir.
    if (!on) setTimeout(() => { if (!this.on) void this.ctx?.suspend(); }, 1500);
  }

  /** Pausa el audio (y su consumo) al salir del viaje o con la pestaña oculta. */
  pause(paused: boolean) {
    if (!this.ctx) return;
    if (paused) void this.ctx.suspend();
    else if (this.on) void this.ctx.resume();
  }

  set(m: { alt: number; day: number; night: number; snow: number; speed: number }) {
    this.mix = m;
    if (!this.on || !this.ctx) return;
    const t = this.ctx.currentTime;
    const high = Math.min(1, Math.max(0, (m.alt - 1.2) / 5));
    this.wind.gain.setTargetAtTime(0.12 + high * 0.5 + m.speed * 0.4 + m.snow * 0.15, t, 0.3);
    this.windFilter.Q.value = 0.6 + high;
    this.crickets.gain.setTargetAtTime(m.night * (1 - m.snow) * 0.025, t, 0.6);
    this.birds.gain.setTargetAtTime(m.day * (1 - m.snow) * (1 - high) * 0.5, t, 0.6);
    this.muffle.frequency.setTargetAtTime(12000 - m.snow * 10500, t, 0.5);
    // Pájaros de vez en cuando, solo de día y cerca del suelo
    if (t > this.nextBird) {
      this.nextBird = t + 0.8 + Math.random() * 3;
      if (this.mix.day * (1 - high) * (1 - this.mix.snow) > 0.3) this.bird();
    }
  }
}
