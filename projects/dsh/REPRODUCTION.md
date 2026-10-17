# DSH 项目复现说明

此说明在归档到比较仓库时补充。原始 `README.md`、源码、构建脚本、成品、预览图和团队工作说明均保留。

## 直接观看

双击 `雨夜便利店.html`，或者打开 `dist/index.html`。两者均为自包含离线成品。

## 重新构建

在本目录打开终端，执行以下命令。

```sh
npm ci
node build.mjs --minify
```

脚本会输出 `dist/index.html`、`dist/rainy-night-store.html`，并更新根目录的 `雨夜便利店.html`。不带 `--minify` 时输出体积会更大。

`tools/` 是原任务留下的检查和截图脚本，`TEAM_CONTEXT.md` 是原任务的团队协作说明。重新构建成品只需要上面的两条命令。

原始提示词没有限定只能生成单个 HTML 文件。DSH 自行采用模块化工程结构，并提供了可直接打开的单文件成品。

`THREE-LICENSE.txt` 在归档时从原工程依赖中补入，用于保留 Three.js 的许可证。依赖缓存 `node_modules/` 不入库，可由 `npm ci` 恢复。
