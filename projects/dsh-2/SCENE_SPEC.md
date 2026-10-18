# 雨夜のコンビニ — 场景制作规范（所有成员必读）

目标：一个「雨夜日本便利店街角」微缩模型，浏览器中可 360° 拖拽/缩放观看，三渲二卡通渲染，
无任何 UI 元素，正方形底座，静态精致 + 细微动态（雨、积水、门、灯）。

---

## 0. 铁律

1. **只管自己的文件**。别人写的文件一行都不要改（core.js / main.js / index.html / build.mjs / package.json
   由 Lead 负责）。需要新增共享工具就写在你自己模块内部，或在汇报里提出。
2. **不要加 DOM / UI / CSS 覆盖层**，不要动相机、渲染器、后期、灯光（主光已在 main.js）。
3. **材质只用 `M.toon / M.emit / M.glass / M.wet / M.flat`**（core.js 里的工厂）。不要用
   MeshStandardMaterial / MeshPhysicalMaterial（toon 风格的统一性靠这个）。
4. **尺寸单位 = 米**，y=0 是底座顶面（= 马路沥青面）。人行道顶面 y=0.12，店内地板 y=0.16。
   所有摆件必须“坐在”对应地面上（用 `boxOn(parent, size, [x, 地面y, z], ...)`）。
5. **不许有悬空/穿模**。建模完自己截图检查。
6. 每个模块导出固定签名（见第 5 节），必须在 Node 里能 `node tools/check.mjs src/你的文件.js` 通过。
7. 命名语义化，代码分小节注释。中文注释可以，标识符用英文。

---

## 1. 世界坐标与底座

- 底座：12 × 12 m 正方形，x ∈ [-6, 6]，z ∈ [-6, 6]。x = 东，z = 南（+z 朝向默认相机）。
- 相机默认：(12.4, 10.4, 14.0) → 看向 (0, 1.15, 0)，fov 35。即从 **东南方高处** 俯视。
- 所以：**+x 面（东）和 +z 面（南）是正面**，东北/西北是背面。背面也必须有内容（屋顶、背墙、天线），
  不能是空洞 —— 用户会转过去看。
- 场景边界外什么都没有（纯夜色）。底座边缘可视作“模型边缘”。

### 1.1 平面分区（来自 core.js 的 LAYOUT，直接 import 用，别写死数字）

| 分区 | 范围 |
|---|---|
| 便利店 | x [-3.2, 2.6]，z [-3.2, 1.0]，外墙厚 0.14，东南角为**斜切入口面** |
| 斜切入口面 | 中心 (1.9, 0.35)，方向从 (2.6, -0.30) 到 (1.2, 1.0)，长 1.91，法线 (0.681, 0.733)，平面 rotation.y = 0.748 |
| 店内饰用空间 | x [-3.06, 2.46]，z [-3.06, 0.86] |
| 南侧人行道 | z [1.0, 2.6]，x [-6, 4.0] |
| 东侧人行道 | x [2.6, 4.0]，z [-6, 2.6] |
| 南侧马路 | z [2.6, 6.0]，x [-6, 6] |
| 东侧马路 | x [4.0, 6.0]，z [-6, 6] |
| 小巷 | x [-4.9, -3.2]，z [-4.4, 1.0]（巷口朝南，开在南人行道上） |
| 后方楼 | x [-6, 2.6]，z [-6, -4.4]，高 3.95 |
| 左侧楼 | x [-6, -4.9]，z [-4.4, 1.0]，高 3.55 |
| 斑马线（南） | x [2.72, 3.92]，z [2.66, 5.96] |
| 斑马线（东） | x [4.04, 5.96]，z [1.14, 2.42] |
| 停车位 | x [-3.0, 1.8]，z [2.92, 4.25]（马路肩部白线车位） |
| 积水（9 处） | `LAYOUT.puddles` = [x, z, rx, rz, rotY] |

### 1.2 高度

`Y.road 0` / `Y.sidewalk 0.12` / `Y.storeFloor 0.16` / `Y.storeCeil 2.56` /
`Y.glassBottom 0.62` / `Y.glassTop 2.42` / `Y.fasciaBottom 2.58` / `Y.fasciaTop 3.22` / `Y.roof 3.28`

便利店总高 3.28，招牌带 2.58–3.22（蓝绿色底 + 白字，24H 灯箱），后面两栋楼比它高，形成层次。

---

## 2. 画面风格（非常关键，直接决定成品好不好看）

- **三渲二**：`M.toon` 用的是 5 阶 ramp，色块分明；颜色要“压暗半档”，因为后期有暗角和冷色调色。
- **描边**：`addOutline(mesh)` 是反向外扩壳（世界尺度 0.014 m）。**只给主要轮廓加**：
  建筑体块、招牌、大设备、货架、贩卖机、自行车、垃圾桶、灯杆、橱窗框。小零件不加（会糊成一团）。
  一个模块里 40–80 个描边对象是合理量级，不要 300 个。
- **光**：夜景靠 **自发光 + Bloom** 出效果。灯箱/招牌/玻璃柜内部/橱窗暖光是 `M.emit(color, {intensity: 1.2~2.6})`。
  地面/墙面上的暖光溢出用 `groundSmear()`（贴地加法拖影）和 `glow()` 精灵，别加真实光源。
- **点光源**：只有 `interior.js` 可以用 ≤4 个 PointLight（暖色，distance 3.5~5，decay 2，不投影）。
  其他模块一律不加光源。
- **湿**：积水/湿路面 = 深色 + `groundSmear` 垂直彩条反射（霓虹色竖向拖影）+ fx 模块统一加波纹。
  任何光滑表面给一点点自发光（`M.wet(color, emissive, 0.15~0.4)`），夜景里才不会死黑。
- **色彩**：室内暖（0xffcf92 / 0xfff3da / 0xf3ead6），室外冷（0x2a3550 / 0x0f1726 系）。
  霓虹点缀：pink 0xff5f8e、cyan 0x54e6ff、green 0x63e0c0、amber 0xffb45e。全部在 `PAL` 里，直接用。
- **破面感**：不要所有东西都完美对称，加一点歪斜、贴纸、污渍、纸箱、锥桶。

---

## 3. 性能预算（软件渲染截图 + 普通显卡都要能跑）

- 全场景 draw call 目标 **< 900**。
- 重复小物件（商品、货架层、砖、栏杆柱、雨棚骨架）必须用 `InstancedMesh` 或复用几何体 + 共享材质。
- 大量小色块（货架商品）用 InstancedMesh + `instanceColor`，一个网格几百个实例。
- 只有大件 `cast: true` 投影；小零件 `cast:false`。`receiveShadow` 默认 true 可以留着。
- 每个模块内部材质数量控制在 40 个以内；颜色变体优先用实例色而不是新材质。

---

## 4. 各模块职责（不要越界）

| 文件 | 负责人 | 内容 |
|---|---|---|
| `src/street.js` | street | 路面/人行道/路缘石/排水沟/斑马线/白线/停车位/积水水面/井盖/盲道砖/坡道 |
| `src/buildings.js` | buildings | 后方楼 + 左楼的外立面（窗、空调、管道、招牌、阳台）、屋顶设备（水塔、栏杆、天线）、小巷内部氛围 |
| `src/props.js` | props | 自动贩卖机、自行车、伞架、垃圾桶、路灯、电线杆+电线、路牌、街角护栏、交通信号灯、公告栏、空调外机（地面）、锥桶、纸箱 |
| `src/store.js` | Lead | 便利店外壳、招牌、玻璃橱窗、自动门、雨棚、地垫、卷帘、屋顶 |
| `src/interior.js` | interior | 店内全部陈设（透过玻璃看得见） |
| `src/fx.js` | Lead | 雨、积水波纹、屋檐滴水、玻璃水痕、招牌/灯管闪烁、信号灯变化、地面湿反光 |

---

## 5. 模块接口（严格照抄）

```js
// street.js / interior.js / props.js
import * as THREE from 'three';
export function buildStreet() { const g = new THREE.Group(); /* ... */ return g; }
export function buildInterior() { const g = new THREE.Group(); return g; }
export function buildProps() { const g = new THREE.Group(); return g; }

// buildings.js
export function buildBuildings() { const group = new THREE.Group(); return { group, update(t, dt) {} }; }
```

- 需要动画：把 `g.userData.update = (t, dt) => {...}`（street/interior/props 由 main.js 自动调用），
  或 buildings/store 返回的 `update`。
- 不要往 scene 里直接 add，返回的 group 会被 main 挂到 world 下。
- 不要 import 别的模块（避免循环依赖）。

---

## 6. 工具链

```powershell
cd C:\Users\ABD18\Documents\deepseek-harness\测试\konbini
node tools/check.mjs src/props.js            # 语法/依赖检查（不写 dist）
node build.mjs                               # 打包到 dist/bundle.js
# shot.mjs 参数: <输出png> <等待ms> <宽> <高> "<query>"
node tools/shot.mjs shots/props-a.png 2500 1400 900 "cam=12.4,10.4,14&target=0,1.15,0"
```

- 截图默认是最新 dist，所以别人同时在改代码时你看到的场景可能不全 —— 只看自己那部分即可。
- **截图文件名带自己的前缀**（`shots/street-1.png`、`shots/props-2.png`、`shots/interior-1.png`、`shots/bldg-1.png`），
  不要删别人的 shots。`node build.mjs` 并发写 dist 极快（80ms），可以容忍。
- 常用观察角度：
  - 默认全景：`cam=12.4,10.4,14&target=0,1.15,0`
  - 贴近看细节：`cam=5.2,3.0,4.6&target=2.2,1.0,0.2`
  - 从正南看店面：`cam=0,4.2,9&target=0,1.6,0`
  - 从东看侧立面：`cam=9,3.6,1.5&target=1.5,1.5,-1`
  - 俯视全景：`cam=0,17,0.1&target=0,0,0`

---

## 7. 汇报要求

完成任务后向 Lead 汇报（简洁、事实）：
1. 写了什么（分小节列内容）；
2. 关键坐标/尺寸表（哪些东西放在哪，Lead 要合成，不许互相穿模）；
3. 用了哪些动画；
4. 截图文件路径（1–3 张）；
5. 已知问题 / 需要 Lead 配合的地方（比如需要某个共享 helper、需要别人让位）。
