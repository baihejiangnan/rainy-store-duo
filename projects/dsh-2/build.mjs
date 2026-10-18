import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
mkdirSync(join(root, 'dist'), { recursive: true });

const t0 = Date.now();
await esbuild.build({
  entryPoints: [join(root, 'src/main.js')],
  bundle: true,
  outfile: join(root, 'dist/bundle.js'),
  format: 'iife',
  target: ['chrome110'],
  sourcemap: false,
  minify: false,
  logLevel: 'warning',
});
console.log(`bundle built in ${Date.now() - t0}ms`);

if (process.argv.includes('--single')) {
  const js = readFileSync(join(root, 'dist/bundle.js'), 'utf8');
  const html = readFileSync(join(root, 'index.html'), 'utf8');
  const out = html.replace('<script src="./dist/bundle.js"></script>', `<script>\n${js}\n</script>`);
  writeFileSync(join(root, '雨夜のコンビニ.html'), out);
  console.log('single-file HTML written:', join(root, '雨夜のコンビニ.html'));
}
