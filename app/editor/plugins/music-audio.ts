import type { TuneObject } from 'abcjs';

let abcjsModule: Promise<typeof import('abcjs')> | null = null;

export function loadAbcjs() {
  abcjsModule ??= import('abcjs');
  return abcjsModule;
}

export function scheduleScore(context: AudioContext, tune: TuneObject): number {
  const sequence = tune.setUpAudio({});
  const meter = tune.getMeterFraction();
  const seconds = tune.millisecondsPerMeasure(sequence.tempo) / 1000 / (meter.num / (meter.den ?? 4));
  const start = context.currentTime + 0.05;
  const output = context.createGain();
  output.gain.value = 0.12 / Math.max(1, sequence.tracks.length);
  output.connect(context.destination);
  let end = start;
  for (const track of sequence.tracks) {
    for (const note of track) {
      if (note.cmd !== 'note' || note.duration <= 0 || note.volume <= 0) continue;
      const from = start + note.start * seconds;
      const to = from + Math.max(0.01, (note.duration - Math.min(note.gap || 0, note.duration * 2 / 3)) * seconds);
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = 440 * 2 ** ((note.pitch - 69) / 12);
      gain.gain.setValueAtTime(0, from);
      gain.gain.linearRampToValueAtTime(Math.min(note.volume / 127, 1), Math.min(from + 0.01, to));
      gain.gain.linearRampToValueAtTime(0, to);
      oscillator.connect(gain);
      gain.connect(output);
      oscillator.start(from);
      oscillator.stop(to);
      end = Math.max(end, to);
    }
  }
  return end - context.currentTime;
}
