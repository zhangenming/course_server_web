## 目标
- 扫描并集中系统中的“配置相关常量”到 `src/config.ts`，统一维护，避免散落硬编码。
- 不改变业务逻辑，仅替换引用来源。

## 常量分组与结构
- API：统一端点与前缀，提供静态常量与少量参数化构造函数
  - `API = { BASE: '/api/v1', PROXY_PREFIX: 'vite', courses: { simple: 'vite/api/v1/courses/simple', byId: (id)=>\`/api/v1/courses/${id}\` }, surveys: { list: 'api/v1/surveys', detail: (id)=>\`api/v1/surveys/${id}\`, responses: (sid)=>\`api/v1/surveys/${sid}/responses\` }, videos: { upload, list, download(id), delete(id) }, music: { upload, list, delete(id) }, users: { me, list, create, course_status }, commons: { login: 'vite/commons/login', command: 'vite/commons/' }, records: { export, learning, stats_report } }`
  - 与 `utils/request.ts` 的前缀处理保持一致（`/api` 与 `vite/`）。
- ID：默认 `actorId`、`avatarId` 等
  - `DEFAULT_ACTOR_ID = 'actor_118544'`、`DEFAULT_AVATAR_ID = 'avatar_482790'`
- 资源：测试视频、局域网媒体地址
  - `TEST_VIDEO_URL`，可选 `LOCAL_MEDIA_BASE_URL`
- UI 文案：系统标题、页面标题、按钮标签等
  - 先迁移 `App.vue` 内的标题与提示；后台的菜单/页面标题按模块逐步迁移
- 语音意图：开启课程的关键词数组
  - `VOICE_INTENTS_START_COURSE = ['体验课程','体验课','开始课程','开始体验课程']`
- 列表与菜单：命令菜单 `COMMAND_LIST`
- Mock 数据：`COURSES_MOCK_DATA`（如仍需保留）
- 错误文案：上传类型不支持等（视频/音频）

## 实施步骤
1. 在 `src/config.ts` 中新增上述分组与常量，并保持现有 `spks`、`replys`、`asks` 不变。
2. 替换引用：
   - `src/App.vue`：替换 `课程data`、`commandList`、`TEST_VIDEO`、API 端点、`actorId/avatarId`；引入 `VOICE_INTENTS_START_COURSE`。
   - 后台模块：
     - `admin/videos.vue`、`admin/music.vue`、`admin/surveys*.vue`、`admin/courses.vue`、`admin/students.vue`、`admin/export.vue`、`admin/learning-records.vue`、`login.vue`、`main.ts`
     - 将所有 API 字符串引用改为 `config.ts` 常量/构造函数。
   - `utils/request.ts`：保留现有前缀拼接逻辑，但抽出前缀常量（如需要）从 `config.ts` 引用。
3. 代码风格：
   - 保持命名清晰、扁平化导出；参数化端点使用小型构造函数避免模板字符串散落。
   - 不引入第三方库。
4. 验证：
   - 构建并运行，逐模块触发请求与操作，确认端点正确、功能不变。
   - 搜索仓库确保不再存在散落的 API 硬编码（允许极个别特殊情况保留）。
5. 安全：
   - `token.ts` 中密钥不迁移到 `config.ts`，建议后续改用环境变量；此轮仅设置键名常量占位（如需要）。

## 交付
- 更新后的 `src/config.ts`（新增分组与常量、构造函数）。
- 替换后的相关文件改动（App 与 admin 模块）。
- 简要变更说明与验证结果。