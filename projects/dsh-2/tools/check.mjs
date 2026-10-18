// Fast syntax / import check without touching dist/. Usage:
//   node tools/check.mjs src/props.js        (bundles the single module + three)
//   node tools/check.mjs src/main.js         (bundles the whole app, in memory)
import { build } from 'esbuild';

const entry = process.argv[2];
if (!entry) {
  console.error('usage: node tools/check.mjs <entry.js>');
  process.exit(2);
}
try {
  const res = await build({
    entryPoints: [entry],
    bundle: true,
    write: false,
    format: 'iife',
    target: ['chrome110'],
    logLevel: 'silent',
    loader: { '.js': 'js' },
  });
  const bytes = res.outputFiles[0].contents.length;
  console.log(`OK ${entry} -> ${(bytes / 1024).toFixed(1)} kB`);
} catch (err) {
  const msgs = (err.errors || []).map((e) => `${e.location ? e.location.file + ':' + e.location.line + ':' + e.location.column + ' ' : ''}${e.text}`);
  console.error('FAIL ' + (msgs.length ? '\n  ' + msgs.join('\n  ') : err.message));
  process.exit(1);
}
