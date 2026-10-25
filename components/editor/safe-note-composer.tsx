'use client';

import { Component, useMemo, type ReactNode } from 'react';
import { LexicalComposer, type InitialConfigType } from '@lexical/react/LexicalComposer';
import { sanitizeNoteContent } from '@/app/editor/note-content';

type Props = {
  initialConfig: InitialConfigType;
  children: ReactNode;
  fallback?: ReactNode;
  onError?: () => void;
};

type State = { failed: boolean; input: InitialConfigType['editorState'] };

function NoteComposer({ initialConfig, children }: Props) {
  const input = initialConfig.editorState;
  const editorState = useMemo(() => typeof input === 'string' && input
    ? sanitizeNoteContent(input) : input, [input]);
  return <LexicalComposer initialConfig={{ ...initialConfig, editorState, onError: error => { throw error; } }}>
    {children}
  </LexicalComposer>;
}

export class SafeNoteComposer extends Component<Props, State> {
  state: State = { failed: false, input: this.props.initialConfig.editorState };

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    return props.initialConfig.editorState !== state.input
      ? { failed: false, input: props.initialConfig.editorState } : null;
  }

  static getDerivedStateFromError(): Partial<State> {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError?.();
  }

  render() {
    if (this.state.failed) return this.props.fallback ?? <p role="alert" className="px-7 py-4 text-sm text-destructive">
      Could not display this note.
    </p>;
    return <NoteComposer {...this.props} />;
  }
}
