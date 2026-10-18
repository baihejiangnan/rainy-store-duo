# 雨夜便利店 · 两种演绎

同一份提示词下的首轮对照与 DSH 独立复测，使用 GitHub Pages 静态托管。首轮两份场景保留，新增第二次 DSH 成品。

- [入口页](https://baihejiangnan.github.io/rainy-store-duo/)
- [DSH 版本](https://baihejiangnan.github.io/rainy-store-duo/dsh/)
- [Codex 版本](https://baihejiangnan.github.io/rainy-store-duo/codex/)
- [个人比较记录](https://baihejiangnan.github.io/rainy-store-duo/comparison/)
- [DSH 第二次独立测试](https://baihejiangnan.github.io/rainy-store-duo/dsh-2/)

`dsh/index.html` 与 `codex/index.html` 均为原始独立 HTML 文件，部署时未修改场景。
`assets/` 包含从两个原始作品截取的入口页预览图。

场景支持拖拽旋转、滚轮缩放、触屏双指缩放。也可直接下载各自的 HTML 文件离线观看。

`comparison.md` 是润色后的个人比较记录，包含完整提示词、耗时与费用说明。两张原始记录截图位于 `assets/record-*.png`。网页正文由 `node tools/build-comparison.mjs` 生成。

## 原始输入与产出形式

双方只收到完整提示词，没有额外要求仅制作单个 HTML 文件，也没有指定工程目录或交付格式。生成过程中没有补充提示或人工调整。单次结果存在随机性。

上述无补充提示、无人工调整的说明对应首轮对照。后来另开工作区新增 DSH 第二次独立测试，耗时约 1 小时 30 分钟，不覆盖首轮内容。第二次费用未提供；第一次原界面耗时保留但标为待核对。

DSH 生成完整模块化工程，并附单文件 HTML。Codex 同样生成可构建的 Three.js 工程，原始交付为自包含 HTML 和场景预览图。两份原始工程现已归档在 `projects/` 下。

## 目录

```text
rainy-store-duo/
├── index.html                 # 展示页、测试摘要、默认收起的完整提示词
├── prompt.txt                 # 可下载的原始提示词
├── comparison.md              # 比较文稿源文件
├── comparison/index.html      # 比较文章网页
├── dsh/index.html             # DSH 原始成品的公开观看入口
├── codex/index.html           # Codex 原始成品的公开观看入口
├── dsh-2/index.html            # DSH 第二次独立测试的原始成品
├── assets/                    # 展示预览和两张测试记录截图
├── projects/
│   ├── README.md              # 归档范围、构建验证和文件校验值
│   ├── dsh/                   # DSH 原始工程与成品
│   │   ├── src/               # 模块化场景源码
│   │   ├── dist/              # 原始构建成品
│   │   ├── preview/           # 原始场景截图
│   │   ├── tools/             # 原始检查、截图工具
│   │   ├── build.mjs
│   │   ├── package.json
│   │   ├── package-lock.json
│   │   ├── README.md          # 原项目说明
│   │   ├── REPRODUCTION.md    # 本次补充的复现说明
│   │   ├── TEAM_CONTEXT.md    # 原任务团队工作说明
│   │   └── 雨夜便利店.html
│   ├── dsh-2/                 # 第二次 DSH 完整工程、成品、精选截图与复现说明
│   └── codex/                 # Codex 原始工程与成品
│       ├── src/               # 场景源码、HTML 模板与许可证
│       ├── public/index.html  # 原始最终成品
│       ├── build.mjs
│       ├── package.json
│       ├── package-lock.json
│       ├── server.cjs
│       ├── preview.png        # 原始交付预览图
│       └── README.md          # 本次补充的复现说明
└── tools/                     # 比较文章与首页提示词的生成脚本
```

## 重新构建

DSH 工程：进入 `projects/dsh/`，运行 `npm ci`，再运行 `node build.mjs --minify`。

Codex 工程：进入 `projects/codex/`，运行 `npm ci`，再运行 `npm run build`。

DSH 第二次工程：进入 `projects/dsh-2/`，运行 `npm ci`，再运行 `node build.mjs --single`。同样已在独立目录验证，重新构建的 HTML 与原成品 SHA-256 一致。两次 DSH 都自行选择模块化完整工程，交付方式及完成耗时均属于本次观察范围。

已在独立目录用 Node.js v24.19.0 验证两份工程。重新构建的 HTML 与各自原始成品 SHA-256 完全一致。原成品未因归档或验证而被覆盖。

归档不包含 `node_modules/`、Git 元数据、发布平台配置、凭据或已废弃的中间构建。依赖由锁文件恢复。项目目录中的源码、原始成品和原任务文档按原字节保留，本次新增说明单独标明。

[下载整个仓库 ZIP](https://github.com/baihejiangnan/rainy-store-duo/archive/refs/heads/main.zip)

## 更新展示页文稿

修改 `comparison.md` 后运行 `node tools/build-comparison.mjs` 生成文章，再运行 `node tools/build-home.mjs` 同步首页默认收起的提示词与 `prompt.txt`。
