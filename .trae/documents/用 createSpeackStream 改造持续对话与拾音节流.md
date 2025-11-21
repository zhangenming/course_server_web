## 目标
- 在持续对话（聊天模式）中使用 `createSpeackStream`，通过可靠的 `onStart/onEnd` 事件精确暂停/恢复 ASR 与语音按钮动画，确保“数字人说完再拾音”。
- 与手动模式已实现的逻辑兼容：手动点击/长按仍会关闭连续流式模式并打断播报。

## 设计要点
- 统一封装流式播报：新增 `speakStream(text)` 包装 `cas.createSpeackStream()`，按句切分文本，通过 `stream.next()` 逐段发送，末段调用 `stream.last()`。
- 节流联动（聊天模式）：
  - `onStart`：`asrStop()` 与 `isListening=false`，隐藏按钮动画、停止拾音。
  - `onEnd`：`asrStart()` 与 `isListening=true`，恢复按钮动画、开始拾音。
- `cas.on('reply')` 的对话播报：
  - 在聊天模式下拿到 `data.data.content`，调用 `speakStream(content)`；调用前执行 `cas.stopAct()` 防止可能存在的内部播报并发。
- 兼容与回退：
  - 保留现有 `speakCas(...)`，用于短提示或非聊天场景；聊天模式的对话回复优先走 `speakStream(...)` 以获得可靠事件。

## 具体改动（src/App.vue）
1) 初始化后创建并缓存一个流式播报构造器：`createSpeakStream()`，暴露 `speakStream(text)`。
2) `speakStream(text)`：
- 切分文本（句号、问号、叹号等），逐段 `next()`，最后 `last()`；
- 绑定 `onStart/onEnd` 执行聊天模式下的 ASR/动画节流；
- 接收可选 `onStart/onEnd` 回调并串联。
3) `cas.on('reply')`：在 `chatMode` 下用 `speakStream(content)` 代替可能的内部播报，调用前 `cas.stopAct()`；保持原有分支（如进入聊天模式、课程相关指令）。
4) 其他播报点：保持现有 `speakCas(...)` 不变，后续可逐步迁移到 `speakStream(...)`（优先聊天对话）。

## 验证
- 聊天模式：ASR 识别→收到 `reply` 文本→开始流式播报时按钮动画隐藏、ASR 停止；播报结束后按钮动画显示、ASR 恢复；期间不再触发拾音事件打断播报。
- 手动模式：点击/长按仍然立即 `cas.stopAct()` 并停止连续 ASR；松开识别结果按既有逻辑处理。
- 回归：随机触发各类固定提示（选择视频/问卷等），确保不受影响；无并发播报或动画状态异常。

## 风险与兼容
- 若 SDK 的 `cas.ask(...)` 自带自动播报且无法关闭：在 `reply` 到达时先 `cas.stopAct()` 再用 `speakStream(...)` 统一播报，避免双播；如仍存在自动播报，需要进一步查阅 SDK 以禁用或改用纯文本接口。
- 无新增依赖；保持与 pnpm 管理一致。