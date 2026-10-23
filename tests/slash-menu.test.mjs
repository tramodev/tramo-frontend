import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

test('Escape keeps the slash menu closed until its text changes', () => {
  const exports = {}, refs = [], states = [];
  let refIndex = 0, stateIndex = 0, escape;
  const jsx = (type, props) => ({ type, props });
  runInNewContext(ts.transpileModule(readFileSync('app/editor/plugins/SlashMenuPlugin.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, require: name => ({
    react: {
      useRef: initial => refs[refIndex++] ??= { current: initial },
      useState: initial => { const index = stateIndex++; if (!(index in states)) states[index] = initial;
        return [states[index], next => { states[index] = next; }]; },
      useMemo: fn => fn(), useCallback: fn => fn, useEffect: fn => fn(),
    },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    '@lexical/react/LexicalComposerContext': { useLexicalComposerContext: () => [{ registerCommand: (_command, fn) => { escape = fn; return () => {}; } }] },
    '@lexical/react/LexicalTypeaheadMenuPlugin': {
      LexicalTypeaheadMenuPlugin: 'Typeahead', MenuOption: class {},
      useBasicTypeaheadTriggerMatch: () => text => text.startsWith('/') ? { matchingString: text.slice(1) } : null,
    },
  })[name] ?? {} });
  const render = () => {
    refIndex = stateIndex = 0;
    return exports.default().props.children.find(node => node.type === 'Typeahead').props;
  };
  let menu = render();
  expect(menu.triggerFn('/image')).not.toBeNull();
  menu.onQueryChange('image');
  menu = render();
  expect(escape()).toBe(false);
  expect(menu.triggerFn('/image')).toBeNull();
  expect(menu.triggerFn('/images')).not.toBeNull();
});
