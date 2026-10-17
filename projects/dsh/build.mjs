import fs from 'node:fs';
import path from 'node:path';
import esbuild from 'esbuild';

const minify = process.argv.includes('--minify');
const outDir = path.resolve('dist');
const root = path.resolve('.');

const result = await esbuild.build({
  entryPoints: [path.join(root, 'src/main.js')],
  bundle: true,
  format: 'iife',
  target: 'es2020',
  minify,
  sourcemap: false,
  write: false,
  legalComments: 'none',
  loader: { '.glsl': 'text' },
  logLevel: 'warning',
});

let js = result.outputFiles[0].text;
// make sure the inline script cannot terminate early
js = js.replace(/<\/script/gi, '<\\/script');

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
<meta name="theme-color" content="#0a0d1e" />
<title>雨夜便利店 · 街角微缩模型</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  html, body { width: 100%; height: 100%; margin: 0; overflow: hidden; background: #06070f; }
  body { -webkit-user-select: none; user-select: none; -webkit-tap-highlight-color: transparent; }
  #app { position: fixed; inset: 0; opacity: 0; transition: opacity 1.6s ease; }
  body.ready #app { opacity: 1; }
  #scene-canvas { display: block; width: 100%; height: 100%; touch-action: none; cursor: grab; outline: none; }
  #scene-canvas:active { cursor: grabbing; }
  #veil { position: fixed; inset: 0; background: #06070f; pointer-events: none; transition: opacity 1.6s ease; }
  body.ready #veil { opacity: 0; }
</style>
</head>
<body>
<div id="app"></div>
<div id="veil"></div>
<script>
${js}
</script>
</body>
</html>
`;

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'index.html'), html);
fs.writeFileSync(path.join(outDir, 'rainy-night-store.html'), html);
// convenience copy at the project root for direct opening
fs.writeFileSync(path.join(root, '雨夜便利店.html'), html);
console.log(`built ${minify ? 'minified' : 'dev'} bundle: ${(html.length / 1024 / 1024).toFixed(2)} MB`);
