import katex from 'katex';

type TexNode = { type: string; text?: string; name?: string; family?: string; body?: TexNode | TexNode[]; numer?: TexNode; denom?: TexNode; base?: TexNode | null; sup?: TexNode | null; sub?: TexNode | null; index?: TexNode | null; left?: string; right?: string };
type Fn = (x: number) => number;

const parse = (katex as unknown as { __parse: (source: string, settings: object) => TexNode[] }).__parse;

const FUNCTIONS: Record<string, Fn> = {
  '\\sin': Math.sin, '\\cos': Math.cos, '\\tan': Math.tan, '\\cot': x => 1 / Math.tan(x),
  '\\sec': x => 1 / Math.cos(x), '\\csc': x => 1 / Math.sin(x),
  '\\arcsin': Math.asin, '\\arccos': Math.acos, '\\arctan': Math.atan,
  '\\sinh': Math.sinh, '\\cosh': Math.cosh, '\\tanh': Math.tanh,
  '\\ln': Math.log, '\\log': Math.log10, '\\exp': Math.exp, '\\sqrt': Math.sqrt, '\\abs': Math.abs,
};
const CONSTANTS: Record<string, number> = { e: Math.E, '\\pi': Math.PI };
const TIMES = new Set(['*', '\\cdot', '\\times']);
const DIVIDE = new Set(['/', '\\div']);

class Unsupported extends Error {}

const describe = (node: TexNode | undefined) => node?.text ?? node?.name ?? node?.type ?? 'end of formula';

const WORDS = [...Object.keys(FUNCTIONS).map(name => name.slice(1)), 'pi'].sort((a, b) => b.length - a.length);

function words(nodes: TexNode[]): TexNode[] {
  const result: TexNode[] = [];
  for (let i = 0; i < nodes.length;) {
    const word = WORDS.find(name => [...name].every((letter, k) => {
      const node = nodes[i + k];
      return node?.type === 'mathord' ? node.text === letter
        : k === name.length - 1 && node?.type === 'supsub' && node.base?.type === 'mathord' && node.base.text === letter;
    }));
    if (!word) { result.push(nodes[i++]); continue; }
    const last = nodes[i + word.length - 1];
    const node: TexNode = word === 'pi' ? { type: 'mathord', text: '\\pi' } : { type: 'op', name: `\\${word}` };
    result.push(last.type === 'supsub' ? { ...last, base: node } : node);
    i += word.length;
  }
  return result;
}

function children(node: TexNode | TexNode[] | null | undefined): TexNode[] {
  if (!node) return [];
  if (Array.isArray(node)) return words(node.filter(child => child.type !== 'kern' && child.type !== 'spacing'));
  return node.type === 'ordgroup' ? children(node.body) : [node];
}

function expression(nodes: TexNode[]): Fn {
  let at = 0;
  const peek = () => nodes[at];
  const sign = (node = peek()) => node?.type === 'atom' && node.family === 'bin' ? node.text : node?.type === 'textord' && node.text === '/' ? '/' : undefined;
  const closes = (node = peek()) => !node || node.type === 'atom' && node.family === 'close' || node.type === 'textord' && node.text === '|';

  const sum = (): Fn => {
    let left = product();
    while (sign() === '+' || sign() === '-') {
      const minus = nodes[at++].text === '-';
      const a = left, b = product();
      left = minus ? x => a(x) - b(x) : x => a(x) + b(x);
    }
    return left;
  };

  const product = (): Fn => {
    let left = unary();
    for (;;) {
      const op = sign();
      if (op && (TIMES.has(op) || DIVIDE.has(op))) {
        at++;
        const a = left, b = unary();
        left = DIVIDE.has(op) ? x => a(x) / b(x) : x => a(x) * b(x);
      } else if (!op && !closes()) {
        const a = left, b = factor();
        left = x => a(x) * b(x);
      } else return left;
    }
  };

  const unary = (): Fn => {
    if (sign() === '-') { at++; const a = unary(); return x => -a(x); }
    if (sign() === '+') { at++; return unary(); }
    return factor();
  };

  const argument = (): Fn => {
    let arg = factor();
    while (!sign() && !closes() && peek().type !== 'op' && peek().base?.type !== 'op') {
      const a = arg, b = factor();
      arg = x => a(x) * b(x);
    }
    return arg;
  };

  const factor = (): Fn => {
    const node = nodes[at++];
    if (!node) throw new Unsupported('The formula ends too early.');
    if (node.type === 'textord' && /^[\d.]$/.test(node.text!)) {
      let digits = node.text!;
      while (peek()?.type === 'textord' && /^[\d.]$/.test(peek().text!)) digits += nodes[at++].text;
      const value = Number(digits);
      if (Number.isNaN(value)) throw new Unsupported(`"${digits}" is not a number.`);
      return () => value;
    }
    if (node.type === 'mathord') {
      if (node.text === 'x') return x => x;
      if (node.text! in CONSTANTS) { const value = CONSTANTS[node.text!]; return () => value; }
      throw new Unsupported(`Only x can be a variable, found ${node.text}.`);
    }
    if (node.type === 'atom' && node.family === 'open' || node.type === 'textord' && node.text === '|') {
      const abs = node.text === '|';
      const inner = sum();
      const close = nodes[at++];
      if (abs ? close?.text !== '|' : close?.family !== 'close') throw new Unsupported(`Missing closing ${abs ? '|' : 'parenthesis'}.`);
      return abs ? x => Math.abs(inner(x)) : inner;
    }
    if (node.type === 'op' && node.name! in FUNCTIONS) {
      const f = FUNCTIONS[node.name!], a = argument();
      return x => f(a(x));
    }
    if (node.type === 'supsub' && node.base?.type === 'op' && node.base.name! in FUNCTIONS) {
      const f = node.base.name === '\\log' && node.sub ? (() => { const b = expression(children(node.sub)); return (x: number) => Math.log(x) / Math.log(b(x)); })() : FUNCTIONS[node.base.name!];
      const p = node.sup ? expression(children(node.sup)) : null, a = argument();
      return p ? x => f(a(x)) ** p(x) : x => f(a(x));
    }
    if (node.type === 'supsub' && node.base) {
      if (!node.sup) throw new Unsupported('Subscripts are not supported.');
      const b = expression(children(node.base)), p = expression(children(node.sup));
      return x => b(x) ** p(x);
    }
    if (node.type === 'ordgroup' || node.type === 'styling') return expression(children(node.body));
    if (node.type === 'leftright') {
      const inner = expression(children(node.body));
      if (node.left === '|' || node.left === '\\vert' || node.left === '\\lvert') return x => Math.abs(inner(x));
      return inner;
    }
    if (node.type === 'genfrac' && node.numer && node.denom) {
      const n = expression(children(node.numer)), d = expression(children(node.denom));
      return x => n(x) / d(x);
    }
    if (node.type === 'sqrt') {
      const body = expression(children(node.body));
      if (!node.index) return x => Math.sqrt(body(x));
      const n = expression(children(node.index));
      return x => { const k = n(x), v = body(x); return v < 0 && k % 2 === 1 ? -((-v) ** (1 / k)) : v ** (1 / k); };
    }
    throw new Unsupported(`Cannot graph ${describe(node)}.`);
  };

  const result = sum();
  if (at < nodes.length) throw new Unsupported(`Cannot graph ${describe(nodes[at])}.`);
  return result;
}

export function compileGraph(source: string): { fn: Fn; error: null } | { fn: null; error: string } {
  try {
    const nodes = children(parse(source, { throwOnError: true, trust: false, maxExpand: 1000 }));
    const equals = nodes.findLastIndex(node => node.type === 'atom' && node.family === 'rel');
    if (equals >= 0 && nodes[equals].text !== '=') throw new Unsupported(`Cannot graph ${nodes[equals].text}.`);
    const body = nodes.slice(equals + 1);
    if (!body.length) throw new Unsupported('Write a function of x, like x^2.');
    return { fn: expression(body), error: null };
  } catch (failure) {
    const message = failure instanceof Error ? failure.message : String(failure);
    return { fn: null, error: message.replace(/^KaTeX parse error:\s*/, '') };
  }
}
