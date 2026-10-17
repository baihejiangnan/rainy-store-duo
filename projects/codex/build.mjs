import {build} from 'esbuild';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const result=await build({entryPoints:['src/scene.js'],bundle:true,minify:true,write:false,format:'iife',target:'es2020',legalComments:'inline'});
let html=await readFile('src/index.html','utf8');
html=html.replace(/\s*<script type="importmap">[\s\S]*?<\/script>/,'').replace('<script type="module" src="./scene.js"></script>',()=>`<script>${result.outputFiles[0].text.replace(/<\/script/gi,'<\\/script')}</script>`);
await mkdir('public',{recursive:true});await writeFile('public/index.html',html);console.log(`Built standalone scene: ${Math.round(Buffer.byteLength(html)/1024)} KB`);
