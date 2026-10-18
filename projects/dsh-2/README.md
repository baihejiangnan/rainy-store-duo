# DSH 第二次独立测试 · 雨夜のコンビニ

本目录是第二次测试的独立归档，保留原始模块化源码、构建脚本、依赖锁文件、场景规范、成品与截图工具。第一次 DSH 工程仍在 `../dsh/`，未被替换。

原任务在全新工作区中执行，用户记录耗时约 1 小时 30 分钟。经用户补充确认，客户端、内核版本、模型与推理档位均与第一次相同，即官方 DSH 客户端、DSH 0.2.1-rc2、DeepSeek-V4.1-Flash 1017、High。第二次费用未提供，不套用第一次费用。原始提示词没有要求模块化工程，也没有限定只制作单个 HTML；两次 DSH 均自行选择完整工程结构。

## 直接观看

- `雨夜のコンビニ.html`：原始自包含单文件成品，可直接打开。
- `index.html` 配合 `dist/bundle.js`：原始项目运行入口。
- [公开观看地址](https://baihejiangnan.github.io/rainy-store-duo/dsh-2/)。

## 重新构建

在本目录运行：

```sh
npm ci
node build.mjs --single
```

输出 `dist/bundle.js` 和根目录的 `雨夜のコンビニ.html`。Node.js v24.19.0 下已在独立目录验证，重新构建的单文件 HTML 与原成品 SHA-256 一致：

```text
64a42dd323f8e0a1c48c9c63e5902cd655494828ab1c1fe7c23608f9eb398342
```

## 归档范围

- `src/`：原始场景模块，雨效位于 `src/fx.js`。
- `dist/`、根目录 HTML：原始构建产物。
- `SCENE_SPEC.md`：原任务的场景与协作规范。
- `tools/`：原始检查与截图脚本。
- `shots/`：保留 `hero-final.png`、`hero-close.png`、`final-single.png`、`qa-high.png` 四张最终或检查截图；其余调试中间截图未收录。
- `THREE-LICENSE.txt`：归档时从原依赖补入的许可证。

不收录依赖缓存、Git 元数据或发布凭据。此 README 为本次归档补充，原场景源码和成品未修改。

## 雨效观察

原源码使用 `PointsMaterial` 加载程序化雨丝图案。点精灵保持屏幕朝向，俯视时雨丝仍明显呈线形。此处只记录原结果，没有为测试成品修正雨效。
