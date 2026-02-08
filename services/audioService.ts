export class AudioSynth {
  ctx: AudioContext | null = null;
  
  constructor() {
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn("AudioContext not supported");
    }
  }

  playNote(note: string) {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const freq = this.getFrequency(note);
    if (!freq) return;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.5);
  }

  getFrequency(note: string): number {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const regex = /^([a-gA-G]#?)(\d)$/;
    const match = note.match(regex);
    
    if (!match) return 0;
    
    const key = match[1].toUpperCase();
    const octave = parseInt(match[2]);
    const semitone = notes.indexOf(key);

    if (semitone === -1) return 0;

    // A4 is 440Hz, which is the 57th semitone (C0 is 0)
    // Formula: f = 440 * 2^((n - 57)/12)
    // Absolute semitone index = octave * 12 + semitone_index
    // A4 is at 4 * 12 + 9 = 48 + 9 = 57. Correct.

    const n = octave * 12 + semitone;
    return 440 * Math.pow(2, (n - 57) / 12);
  }
}

export const synth = new AudioSynth();