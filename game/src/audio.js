// Synthesized sound only: WebAudio oscillators, no audio files. A soft pad loop plays a slow
// chord progression while the game runs, and every action has its own short blip. Everything
// is guarded: with no audio device, or before the first gesture, the game stays silent.

/** Gentle chords for the night garden, as MIDI note numbers. */
const CHORDS = [
  [57, 60, 64],
  [53, 57, 60],
  [48, 52, 55],
  [55, 59, 62],
];
/** A pentatonic pluck pattern that cycles over the chords, one note a bar. */
const PLUCKS = [69, 72, 76, 74, 71, 76, 79, 74];
const BAR_SECONDS = 2.4;

function midiToFreq(note) {
  return 440 * 2 ** ((note - 69) / 12);
}

export function createAudio() {
  let context = null;
  let master = null;
  let musicTimer = null;
  let bar = 0;
  let muted = false;

  function ensure() {
    if (context !== null) return true;
    try {
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContext) return false;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(context.destination);
      return true;
    } catch {
      return false;
    }
  }

  /** Unlock audio on the first gesture and start the garden's music. */
  function unlock() {
    if (!ensure()) return;
    if (context.state === 'suspended') context.resume().catch(() => {});
    startMusic();
  }

  function tone(freq, when, duration, type, volume, slideTo) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freq, when);
    if (slideTo) oscillator.frequency.exponentialRampToValueAtTime(slideTo, when + duration);
    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(volume, when + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(when);
    oscillator.stop(when + duration + 0.05);
  }

  function playBar() {
    if (context === null || context.state !== 'running') return;
    const now = context.currentTime + 0.05;
    const chord = CHORDS[bar % CHORDS.length];
    for (const note of chord) tone(midiToFreq(note), now, BAR_SECONDS * 1.1, 'triangle', 0.045);
    const pluck = PLUCKS[bar % PLUCKS.length];
    tone(midiToFreq(pluck), now + 0.15, 0.7, 'sine', 0.06);
    bar += 1;
  }

  function startMusic() {
    if (musicTimer !== null || context === null) return;
    playBar();
    musicTimer = window.setInterval(playBar, BAR_SECONDS * 1000);
  }

  function stopMusic() {
    if (musicTimer !== null) {
      window.clearInterval(musicTimer);
      musicTimer = null;
    }
  }

  /** A short effect; ignored when audio is not unlocked yet. */
  function effect(play) {
    if (context === null || context.state !== 'running') return;
    try {
      play(context.currentTime);
    } catch {
      // A failed blip never stops the game.
    }
  }

  return {
    unlock,
    setMuted(value) {
      muted = value;
      if (master !== null) master.gain.value = value ? 0 : 0.5;
    },
    isMuted() {
      return muted;
    },
    stopMusic,
    catchEmber(combo) {
      effect((now) => {
        const base = 660 + Math.min(combo, 10) * 24;
        tone(base, now, 0.12, 'sine', 0.16);
        tone(base * 1.5, now + 0.06, 0.14, 'sine', 0.12);
      });
    },
    catchGolden() {
      effect((now) => {
        tone(880, now, 0.14, 'sine', 0.16);
        tone(1108, now + 0.07, 0.14, 'sine', 0.14);
        tone(1318, now + 0.14, 0.22, 'sine', 0.12);
      });
    },
    hit() {
      effect((now) => {
        tone(160, now, 0.3, 'sawtooth', 0.14, 60);
        tone(90, now, 0.35, 'triangle', 0.16, 45);
      });
    },
    levelUp() {
      effect((now) => {
        [523, 659, 784, 1046].forEach((freq, index) => tone(freq, now + index * 0.09, 0.22, 'triangle', 0.13));
      });
    },
    win() {
      effect((now) => {
        [523, 659, 784, 1046, 784, 1046, 1318].forEach((freq, index) => tone(freq, now + index * 0.13, 0.3, 'triangle', 0.12));
      });
    },
    click() {
      effect((now) => tone(520, now, 0.07, 'sine', 0.1));
    },
  };
}
