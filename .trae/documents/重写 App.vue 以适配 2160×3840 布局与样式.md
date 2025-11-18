## 目标
- 仅针对 2160×3840 分辨率（竖屏 4K）进行页面与样式重构。
- 保留现有交互与业务逻辑（视频、测评、命令菜单等），重点重写 CSS 与容器布局。
- 统一遮罩与模糊层级，保证弹窗外部点击可关闭。

## 模板结构调整
- 在 `<template>` 外层增加固定画布容器 `.canvas`，大小为 2160×3840，用于承载整页内容并充当定位参考。
- 保留现有 `.left` 与 `.right` 两列结构，但它们作为 `.page` 的两个固定列，填满 `.canvas` 的高度。
- 现有主要块（begin、课程选择、视频播放、测评选择、问卷、结果、命令菜单、列表播放器）保持 DOM 结构和 `v-if` 条件不变，降低对脚本的影响。

## 固定分辨率布局
- 固定画布：
  - `.canvas`: `width: 2160px; height: 3840px; position: relative; margin: 0 auto;`
  - `html, body`: 取消响应式，允许滚动但默认不缩放。
- 页面网格：重写 `.page` 为两列固定宽度栅格，填满高度：
  - `.page`: `display: grid; grid-template-columns: 900px 1260px; gap: 0; width: 2160px; height: 3840px;`
  - `.left`, `.right`: 填满各自网格单元高度，去除最小宽高与自适应相关属性。
- 左列 Avatar 容器 `#container`：固定高度（如 2400–2800px），垂直居中，保证比例友好。

## 弹窗与遮罩
- 统一遮罩 `.modal-overlay` 为全屏固定层（已在 `src/App.vue:1353–1364` 看到样式位点）：
  - `position: fixed; inset: 0; z-index: 1400; backdrop-filter + -webkit-backdrop-filter`。
- 顶部对齐类 `.top-overlay` 保留，用于需要靠上展示的弹窗：`align-items: flex-start; padding-top: 固定值`（如 120px）。
- 提升 "测评选择" 的模糊等级：
  - 覆盖 `.survey-overlay`，设置 `background: rgba(255,255,255,0.14); backdrop-filter: saturate(160%) blur(6px);`（当前覆盖位点在 `src/App.vue:1672–1676`）。
- 所有弹窗主体宽度统一为固定像素：
  - `begin-modal`: 1200px
  - `course-modal`: 1600px
  - `video-modal`: 1800px（高度不超过 3200px）
  - `survey-dialog`: 1600px
  - `survey-container`: 1600px
  - `result-card`: 1200px
  - `video-list-modal`: 1600px

## 关键定位与层级
- 背景图 `.app-bg` 保持固定覆盖层，位于最底层（`z-index: 0`）。
- 页面主体 `.page`、悬浮按钮 `.left-fab`、通知 `.banner` 作为内容层（`z-index: 1`）。
- 遮罩统一区域（弹窗）`z-index: 1400`，命令菜单 `z-index: 1200`，语音按钮 `z-index: 1100` 保留。

## 悬浮与功能按钮
- 左侧 FAB：在固定分辨率下设定绝对位置
  - `.left-fab`: `left: 72px; top: 1920px; transform: translateY(-50%); gap: 32px;`
  - `.fab-btn`: 维持现有风格，但加大尺寸到 `64px` 并适配更大图标。
- 语音按钮 `.voice-button`：
  - `right: 72px; bottom: 72px; padding: 24px 36px; font-size` 适度增大。

## 字体与间距
- 在 `:root` 定义基础尺寸变量：
  - `--fs-base: 24px; --fs-title: 36px; --radius: 18px; --space: 24px;`
- 所有卡片与弹窗统一使用这些变量，移除响应式 clamp/min/max。
- 将现有文本与按钮大小在目标分辨率下整体增 1.2–1.4 倍，匹配远距可读性。

## 清理与简化
- 移除所有 `@media` 响应式分支（如 `src/App.vue:1648–1672`），避免不同尺寸的样式岔路。
- 移除 `--leftWidth` 与相关基于视口的计算（见 `src/App.vue:845–855`），全部改为固定像素。
- 将 `min-width/min-height` 等自适应属性统一为固定 `width/height`。

## 交互保留
- 保留所有现有 JS 方法与 `v-if/v-on` 条件，不改动交互逻辑（如 `openSurveyPicker`、`closeSurveyPick`、`openVideoList`、`closeVideoList`、`openCommandMenu`、`closeCommandMenu`）。
- 遮罩点击关闭基于 `@click.self` 已存在的行为继续有效（例如 `src/App.vue:586`、`764` 等）。

## 交付内容
- 重写 `src/App.vue` 的 `<style scoped>`：引入 `.canvas` 与固定网格、弹窗与模糊统一、按钮定位、变量体系、移除媒体查询与响应式写法。
- 轻微调整 `<template>`：增加 `.canvas` 包裹与 `.page` 尺寸绑定，其他结构保持不变。
- 不修改 `<script setup>` 中的逻辑。

## 验证与回滚
- 启动应用后在目标设备（2160×3840）打开页面，核对：
  - 左右两列宽度、所有弹窗宽度与居中情况
  - 背景模糊效果、遮罩层级与外部点击关闭
  - 悬浮按钮与语音按钮定位
- 若需细调，按变量微调尺寸；如需回滚，保留当前版本为 `App.vue.bak` 或借助版本控制。