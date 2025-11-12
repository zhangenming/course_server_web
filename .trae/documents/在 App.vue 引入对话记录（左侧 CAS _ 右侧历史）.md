## 目标
- 在 `App.vue` 中加入对话记录：左侧显示数字人 `cas`，右侧显示对话历史。
- 对话历史记录包含两类消息：`cas` 的话（左对齐）与用户的选择（右对齐）。

## 现状定位
- `cas.speak` 初始问候在 `src/App.vue:184`，另有一次调用在 `src/App.vue:164`。
- 问卷交互：选项点击在 `src/App.vue:223-228` 调用 `selectAnswer`，答案记录在 `src/App.vue:135-137`。
- 参考实现：对话历史的结构与渲染已在 `src/Demo.vue:19-24、230-235` 实现，可复用。

## 数据结构
- 在 `App.vue` 增加 `const chatHistory = ref<{ source: 'nexthuman' | 'guest'; content: string }[]>([])`。
- 统一通过两类入口写入历史：
  - `cas` 侧：包装 `cas.speak(text, options)` 为 `speakCas(text, options)`，在 `onStart` 推入 `{ source: 'nexthuman', content: text }`。
  - 用户侧：在用户选择与按钮点击时推入 `{ source: 'guest', content: 文本 }`。

## 采集规则
- 初始问候：`src/App.vue:184` 的文案在 `onStart` 推入历史（`nexthuman`）。
- 巡检按钮：`src/App.vue:163-166` 推入用户选择“日常巡检”（`guest`），同时保留原 `cas.speak('欢迎光临', {})` 并通过包装记录 `nexthuman`。
- 体验课程按钮：`src/App.vue:202-208` 点击后推入“体验课程”（`guest`）。
- 问卷选项：将模板的 `@click="selectAnswer(option.value)"` 改为携带文案 `@click="selectAnswer(option.value, option.text)"`，方法签名改为 `(value: number, text: string)`，在选择时推入 `{ source: 'guest', content: text }` 并保留现有分数逻辑。

## 模板与布局
- 将页面根容器改为双栏布局：
  - 左栏：保留 `#container`（`src/App.vue:199`），宽度沿用现有 `500px`；数字人固定在左。
  - 右栏：包含当前的开始/问卷/结果界面，并在其下或侧边新增“对话历史”面板。
- 对话历史渲染复用 `src/Demo.vue:230-235` 的结构，依据 `chat.source` 决定左右对齐：`nexthuman` 左、`guest` 右。

## 样式
- 增加 `.page { display:flex }` 布局；左栏固定宽度，右栏 `flex:1`。
- 为历史面板增加 `.chat-history`、`.chat-item`、`.left`、`.right` 等样式，分别控制对齐与气泡色彩（与 `src/Demo.vue:240-271` 风格一致）。

## 校验
- 加载完成后，确认初始问候在历史中出现（`nexthuman`）。
- 点击“体验课程”“日常巡检”，历史面板出现相应 `guest` 记录；`cas.speak('欢迎光临')` 通过包装后显示 `nexthuman` 记录。
- 在问卷中选择任意选项，历史面板显示该选项文案的 `guest` 记录，完成到最后显示结果界面不影响历史展示。

## 变更点清单
- 添加 `chatHistory` 状态（`App.vue` `<script setup>`）。
- 新增包装函数 `speakCas` 并替换现有 `cas.speak` 调用点（`src/App.vue:164、184`）。
- 修改 `selectAnswer` 签名与模板绑定（`src/App.vue:135-137、223-228`）。
- 更新模板为双栏布局并加入历史面板（`src/App.vue:199-272` 附近）。
- 增加对应样式（`src/App.vue` `<style scoped>`）。

请确认以上方案，确认后我将按清单实施并验证效果。