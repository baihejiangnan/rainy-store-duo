# Codex · 雨待ち / AME MART

此说明在归档到比较仓库时补充。场景源码、构建脚本和最终 HTML 保留原文件。

本次 Codex 实际生成了一个可构建的 Three.js 工程，最终向用户交付自包含离线 HTML 和场景预览图。原始提示词没有限定只能生成单个 HTML 文件。

## 文件

- `src/scene.js`：模型、材质、灯光、降雨、反射、动效和交互源码。
- `src/index.html`：HTML 源模板，需要通过构建使用。
- `src/THREE-LICENSE.txt`：Three.js 许可证。
- `build.mjs`：将场景代码及依赖打包进单个 HTML。
- `package.json`、`package-lock.json`：依赖声明及锁定版本。
- `public/index.html`：原始最终成品，可以直接双击离线观看。
- `preview.png`：原始交付的场景预览图。
- `server.cjs`：可选的本地 HTTP 预览服务。

## 重新构建

在本目录打开终端，执行以下命令。

```sh
npm ci
npm run build
```

输出为 `public/index.html`。需要 HTTP 预览时运行 `node server.cjs`，打开 `http://127.0.0.1:4173/`。

仓库没有收录本地依赖缓存、Git 元数据、发布平台配置或已废弃的中间构建目录。
