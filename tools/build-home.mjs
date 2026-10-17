import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const comparison=await readFile(new URL('comparison.md',root),'utf8');
const prompt=comparison.split(/## 完整提示词\s*\r?\n/)[1]?.trim();
if(!prompt)throw new Error('Missing original prompt');
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
await writeFile(new URL('prompt.txt',root),prompt+'\n');
const block=`<!-- PROMPT:START -->
<details class="full-prompt" id="full-prompt"><summary><strong>完整提示词</strong><span class="closed-label">展开查看与复现 ＋</span><span class="open-label">收起 －</span></summary><p class="prompt-context">双方收到的原始提示词如下。没有额外要求仅制作单个 HTML 文件，也没有指定工程目录或交付格式。</p><pre>${escape(prompt)}</pre><p class="prompt-download"><a href="./prompt.txt" download>下载完整提示词.txt ↓</a></p></details>
<!-- PROMPT:END -->`;
const indexPath=new URL('index.html',root);
const html=await readFile(indexPath,'utf8');
if(!/<!-- PROMPT:START -->[\s\S]*?<!-- PROMPT:END -->/.test(html))throw new Error('Missing homepage prompt markers');
await writeFile(indexPath,html.replace(/<!-- PROMPT:START -->[\s\S]*?<!-- PROMPT:END -->/,()=>block));
console.log('Updated homepage prompt and prompt.txt');
