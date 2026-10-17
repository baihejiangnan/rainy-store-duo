# 两份原始产出归档

归档日期为 2026-10-18。两个目录来自各自原任务的最终可构建工程，未修改场景源码或 HTML 成品。

## DSH

`dsh/` 保留原工程的 `src/`、`dist/`、`preview/`、`tools/`、构建脚本、依赖声明和锁文件、根目录离线 HTML、README 与 TEAM_CONTEXT。

`REPRODUCTION.md` 为本次补充的复现说明，`THREE-LICENSE.txt` 从原工程安装的 Three.js 依赖中补入。`node_modules/` 不入库。

## Codex

`codex/` 保留原工程的 `src/`、`public/`、构建脚本、依赖声明和锁文件、本地 HTTP 服务，以及原始交付的场景预览图。README 为本次归档时补充。

Codex 最初在工作目录内生成完整 Three.js 工程，最终交付自包含离线 HTML 与预览图。旧 `dist/` 是被最终 `src/`、`public/` 取代的中间版本，没有收录。发布平台配置、Git 元数据和本地缓存也没有收录。

## 构建验证

验证环境为 Node.js v24.19.0。将两份归档分别复制到独立临时目录，执行 `npm ci` 后构建，结果如下。

| 项目 | 构建命令 | 与原成品对比 |
| --- | --- | --- |
| DSH | `node build.mjs --minify` | HTML SHA-256 完全一致 |
| Codex | `npm run build` | HTML SHA-256 完全一致 |

原成品及独立重新构建的成品，对应 SHA-256 均为以下值。

```text
DSH 雨夜便利店.html
9f03a0c8af8508d2f451531958c41c3802da3ad43769c2db6295cf5bc50ca224

Codex public/index.html
704cdeafb0ab1fe3b1a91f6e3a939f44e98eb87ffc8857c87152ab56dfb47e56
```

仓库根目录的 `dsh/index.html`、`codex/index.html` 为这些相同成品的展示副本，保留原有观看地址。
