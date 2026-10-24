"use client";

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { loadAbcjs, scheduleScore } from '@/app/editor/plugins/music-audio';

export default function MusicPlayback({ abc }: { abc: string }) {
  const contextRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [playingAbc, setPlayingAbc] = useState<string | null>(null);
  const [error, setError] = useState('');
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    void contextRef.current?.close();
    contextRef.current = null;
  }, [abc]);

  const stop = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    void contextRef.current?.close();
    contextRef.current = null;
    setPlayingAbc(null);
  };
  const play = async () => {
    if (playingAbc === abc) { stop(); return; }
    setError('');
    let context: AudioContext | null = null;
    try {
      context = new AudioContext();
      contextRef.current = context;
      setPlayingAbc(abc);
      await context.resume();
      const abcjs = await loadAbcjs();
      if (contextRef.current !== context) return;
      const [tune] = abcjs.parseOnly(abc);
      if (!tune) throw new Error('No music to play.');
      const duration = scheduleScore(context, tune);
      timerRef.current = setTimeout(stop, duration * 1000);
    } catch {
      if (contextRef.current !== context) return;
      stop();
      setError('Could not play this score. Check the notation and audio output.');
    }
  };
  return <div className="flex items-center gap-2 text-xs text-muted-foreground" onKeyDown={event => event.stopPropagation()}>
    <Button variant="ghost" size="sm" onMouseDown={event => event.preventDefault()} onClick={() => { void play(); }} onDoubleClick={event => event.stopPropagation()}>
      {playingAbc === abc ? 'Stop' : 'Play score'}
    </Button>
    {error && <span role="alert">{error}</span>}
  </div>;
}
