import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const component = /\/plugins\/(Image|Equation|Music)Component$/;

await build({
  entryPoints: process.argv.slice(2).length ? process.argv.slice(2) : [`${root}collab/server.ts`],
  outdir: `${root}collab/dist`,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  jsx: 'automatic',
  packages: 'external',
  alias: { '@': root.replace(/\/$/, '') },
  outExtension: { '.js': '.mjs' },
  logLevel: 'warning',
  plugins: [{
    name: 'stub-node-components',
    setup(context) {
      context.onResolve({ filter: component }, args => ({ path: args.path, namespace: 'stub' }));
      context.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: 'export default function Stub() { return null; }', loader: 'js' }));
    },
  }],
});
