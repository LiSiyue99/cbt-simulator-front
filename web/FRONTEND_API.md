# 前端 API 文档（Next.js 前端使用说明）

说明：本文件描述前端在 `web/src/services` 目录下封装的 API 使用方式，与后端 `docs/api.md` 对齐。

## 约定
- 所有请求基于 `NEXT_PUBLIC_API_BASE_URL`。
- 统一 HTTP 封装位于 `src/services/http.ts`（超时、错误统一抛出 `ApiError`）。

---

## 认证与当前用户
- POST /auth/request-code → 请求验证码
- POST /auth/verify-code → 校验验证码、获取 token
- GET /me → 当前用户信息（返回 `roles/classScopes` 等增强信息）

---

## 会话（src/services/api/sessions.ts）
- startSession({ visitorInstanceId, auto? }) → POST `/sessions/start` → `{ sessionId, sessionNumber }`
- appendMessage(sessionId, speaker, content) → POST `/sessions/{id}/messages` → `{ ok, aiResponse? }`
- finalizeSession(sessionId, assignment?) → POST `/sessions/{id}/finalize` → `{ diary }`
- getLastSession(visitorInstanceId) → GET `/sessions/last` → `{ sessionId, sessionNumber, chatHistory, finalizedAt? } | null`
- listSessions(visitorInstanceId, page?, pageSize?, includePreview=true) → GET `/sessions/list`
  - 返回字段：`messageCount/hasDiary/hasActivity/hasThoughtRecord/lastMessage?`
- getSessionDetail(sessionId) → GET `/sessions/{id}` → 详情
- prepareNewSession(sessionId) → POST `/sessions/{id}/prepare`（回退用途）
- ensureSessionOutputs(sessionId) → POST `/sessions/{id}/ensure-outputs`（开始新对话前轮询校验）

---

## 学习档案（src/services/api/assignments.ts & thoughtRecords.ts）
- getAssignmentsList(visitorInstanceId) → GET `/assignments/list` → `{ items: [{ sessionId, sessionNumber, createdAt, homework[], thoughtRecordCount, chatCount }] }`
- createThoughtRecord(input) → POST `/thought-records` → `{ id }`
- listThoughtRecords(sessionId) → GET `/thought-records?sessionId=...`
- getDashboardTodos(visitorInstanceId) → GET `/dashboard/todos` → `{ items, summary }`

---

## 助教（技术）（src/services/api/assistant.ts）
- getAssistantVisitors() → GET `/assistant/visitors`
- getStudentsByVisitor(visitorInstanceId) → GET `/assistant/students`
- getAllAssistantStudents() → GET `/assistant/all-students`
- getStudentSessions(studentId) → GET `/assistant/students/{id}/sessions`
- getStudentHistory(studentId) → GET `/assistant/students/{id}/history`
- 助教聊天（统一替代旧 questions/feedbacks）：
  - listAssistantChat(sessionId, page?, pageSize?) → GET `/assistant/chat` → `{ items, unreadCount, page, pageSize, total }`
  - sendAssistantChat({ sessionId, content }) → POST `/assistant/chat` → `{ id }`
  - markAssistantChatRead(sessionId) → POST `/assistant/chat/read` → `{ ok: true }`
- getAssistantDashboardStats() → GET `/assistant/dashboard-stats`（包含 `unreadMessages`）
- getUnreadMessageSessions() → GET `/assistant/unread-message-sessions`
- getPendingThoughtRecords() → GET `/assistant/pending-thought-records`

---

## 行政助教（src/services/api/assistantClass.ts）
- getClassStudents() → GET `/assistant-class/students`（返回扩展字段：`visitorTemplateKey/visitorTemplateName/lastSessionAt/totalSessions`）
- getClassStudentSessions(studentId) → GET `/assistant-class/students/{id}/sessions`
- getClassCompliance(week?) → GET `/assistant-class/compliance?week=YYYY-WW`（返回每条记录带 `missCountUptoWeek`）
- getProgressBySession(sessionNumber) → GET `/assistant-class/progress-by-session?sessionNumber=N`（返回每位学生的 `hasSession/hasThoughtRecord/missCountUptoSession`）

---

## Playground（src/services/api/playground.ts 或 assistant 内封装）
- ensurePlayground() → POST `/playground/ensure`
- listPlaygroundInstances() → GET `/playground/instances`
- getPlaygroundLtm(visitorInstanceId) → GET `/playground/ltm`

---

## Admin（src/services/api/assistant.ts 内封装）
- 概览：getAdminOverview() → GET `/admin/overview`
- 人员与分配：
  - getAdminUsers({ role?, status?, q?, page?, pageSize? }) → GET `/admin/users` → `{ items, page, pageSize, total }`
  - createAdminUser(body) → POST `/admin/users`
  - updateAdminUser(id, body) → PUT `/admin/users/{id}`
  - deleteAdminUser(id) → DELETE `/admin/users/{id}`
  - getAssignmentStudents(params) → GET `/admin/assignments/students`
  - assignTemplate({ studentId, templateKey }) → POST `/admin/assignments/assign-template`
  - assignAssistant({ studentId, assistantId, visitorInstanceId?, templateKey? }) → POST `/admin/assignments/assign-assistant`
  - bulkAssign({ items }) → POST `/admin/assignments/bulk`
  - getAssistantStudentsAdmin(assistantId?) → GET `/admin/assistant-students`
  - addAssistantStudentAdmin(payload) → POST `/admin/assistant-students`
  - removeAssistantStudentAdmin(id) → DELETE `/admin/assistant-students/{id}`
- 规则与日历：
  - getAdminTimeWindow/saveAdminTimeWindow → GET/POST `/admin/policy/time-window`
  - createDdlOverride/listDdlOverrides → POST/GET `/admin/policy/ddl-override`
  - createBatchDdlOverride/listRecentDdlOverrides → POST/GET `/admin/policy/ddl-override/batch|recent`
  - getSessionOverrides/createSessionOverride/listRecentSessionOverrides → GET/POST/GET `/admin/policy/session-override[|/recent]`
- 模板管理（新增）：
  - getAdminTemplates() → GET `/admin/templates` → `{ items: { templateKey, name, brief, corePersona, updatedAt }[] }`
  - updateAdminTemplate(templateKey, { name?, brief?, corePersona? }) → PUT `/admin/templates/{templateKey}` → `{ ok, item }`

---

## 已移除接口（请勿使用）
- `POST/GET /questions`
- `POST/GET /assistant/feedback`

以上与后端实现一致，若新增接口会先更新本文件与 `docs/api.md` 再落地实现。
