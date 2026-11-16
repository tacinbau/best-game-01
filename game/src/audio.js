// Every voice is synthesized; no assets or context are created until a gesture.
export function createAudio(gestureTarget = globalThis.window) {
  let context, master, ambience, timer;
  let muted = false, scene = 'title', disposed = false;
  const lastCue = new Map();
  const voices = new Set();
  function tone(frequency, duration, volume = 0.06, delay = 0, type = 'sine', end = frequency, bus = master) {
    if (!context || disposed) return;
    const at = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, at);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, end), at + duration);
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(volume, at + Math.min(bus === ambience ? 1.6 : 0.025, duration / 4));
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    oscillator.connect(gain).connect(bus);
    voices.add(oscillator);
    oscillator.onended = () => { voices.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
    oscillator.start(at); oscillator.stop(at + duration + 0.03);
  }
  function loop() {
    if (!context || muted || context.state !== 'running') return;
    if (scene === 'title') {
      [130.81, 196, 261.63, 329.63].forEach((note, i) => tone(note, 5.8, 0.018, i * 0.12, 'sine', note, ambience));
    } else if (scene === 'playing' || scene === 'waveclear') {
      // Detuned low tones swell like a gentle tide under the combat voices.
      [73.42, 74.1, 110].forEach((note, i) => tone(note, 5.8, 0.012, i * 0.25, 'sine', note * 1.015, ambience));
    }
  }
  function rebuildLoop() {
    clearInterval(timer);
    if (!context) return;
    if (ambience) { ambience.disconnect(); }
    ambience = context.createGain();
    ambience.connect(master);
    loop(); timer = setInterval(loop, 5000);
  }
  function unlock() {
    if (disposed) return;
    const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioContext) return;
    if (!context) {
      try {
        context = new AudioContext();
        master = context.createGain(); master.gain.value = muted ? 0 : 0.7;
        master.connect(context.destination);
        rebuildLoop();
      } catch { return; }
    }
    if (context.state === 'suspended') context.resume().then(() => rebuildLoop()).catch(() => {});
  }
  gestureTarget?.addEventListener('pointerdown', unlock, true);
  gestureTarget?.addEventListener('keydown', unlock, true);
  function cue(name, towerType) {
    if (!context || muted || context.state !== 'running' || disposed) return;
    const key = name === 'shoot' ? `${name}:${towerType}` : name;
    const now = context.currentTime;
    if (now - (lastCue.get(key) ?? -Infinity) < (name === 'shoot' ? 0.07 : name === 'hit' || name === 'kill' ? 0.045 : 0.1)) return;
    lastCue.set(key, now);
    const melody = (notes, beat, length, volume = 0.055) => notes.forEach((n, i) => tone(n, length, volume, i * beat));
    switch (name) {
      case 'build': tone(420, 0.13, 0.07, 0, 'sine', 700); break;
      case 'upgrade': melody([523.25, 659.25, 783.99], 0.09, 0.3); break;
      case 'shoot': {
        const pitch = { harpoon: 620, cannon: 100, frost: 1100 }[towerType] || 500;
        tone(pitch, 0.065, towerType === 'cannon' ? 0.045 : 0.025, 0, 'triangle', pitch * 0.5); break;
      }
      case 'hit': tone(260, 0.045, 0.025, 0, 'sine', 160); break;
      case 'kill': tone(480, 0.1, 0.045, 0, 'triangle', 850); break;
      case 'breach': melody([220, 164.81, 220], 0.16, 0.22, 0.085); break;
      case 'wave': melody([196, 293.66], 0.22, 0.5); break;
      case 'clear': melody([392, 493.88, 587.33, 783.99], 0.13, 0.45); break;
      case 'defeat': melody([261.63, 233.08, 196, 130.81], 0.38, 0.8); break;
      case 'victory': melody([261.63, 329.63, 392, 523.25, 392, 523.25, 659.25], 0.18, 0.65); break;
    }
  }
  return {
    cue, unlock,
    setScene(value) { if (scene !== value) { scene = value; rebuildLoop(); } },
    setMuted(value) {
      muted = Boolean(value);
      if (master) { master.gain.cancelScheduledValues(context.currentTime); master.gain.setTargetAtTime(muted ? 0 : 0.7, context.currentTime, 0.02); }
    },
    destroy() {
      disposed = true; clearInterval(timer);
      gestureTarget?.removeEventListener('pointerdown', unlock, true);
      gestureTarget?.removeEventListener('keydown', unlock, true);
      for (const voice of voices) { try { voice.stop(); } catch { /* Already ended. */ } }
      if (context) context.close().catch(() => {});
    },
  };
}
