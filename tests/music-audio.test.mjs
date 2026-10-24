import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const { parseOnly } = require('abcjs');
const exports = {};
runInNewContext(ts.transpileModule(readFileSync('app/editor/plugins/music-audio.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports });

function schedule(abc) {
  const notes = [], gains = [];
  const context = {
    currentTime: 0, destination: {},
    createGain: () => {
      const values = [];
      gains.push(values);
      return { gain: { setValueAtTime: (...args) => values.push(args), linearRampToValueAtTime: (...args) => values.push(args) }, connect() {} };
    },
    createOscillator: () => {
      const note = { frequency: { value: 0 }, connect() {}, start: time => { note.startTime = time; }, stop: time => { note.endTime = time; } };
      notes.push(note);
      return note;
    },
  };
  const duration = exports.scheduleScore(context, parseOnly(abc)[0]);
  return { notes, gains, duration };
}

test('ABC playback preserves pitches and tempo without soundfont requests', () => {
  const score = schedule('X:1\nM:4/4\nL:1/4\nQ:1/4=120\nK:C\nCDEF|');
  expect(score.notes).toHaveLength(4);
  expect(score.notes[0].frequency.value).toBeCloseTo(261.626, 2);
  expect(score.notes[0].startTime).toBeCloseTo(0.05);
  expect(score.notes[1].startTime - score.notes[0].startTime).toBeCloseTo(0.5);
  expect(score.duration).toBeGreaterThan(1.9);
});

test('chords, rests and a slower tempo are sequenced by abcjs', () => {
  const score = schedule('X:1\nM:4/4\nL:1/4\nQ:1/4=60\nK:C\n[CEG] z D E|');
  expect(score.notes).toHaveLength(5);
  expect(score.notes.slice(0, 3).map(note => note.startTime)).toEqual([0.05, 0.05, 0.05]);
  expect(score.notes[3].startTime).toBeCloseTo(2.05);
});
