import { httpGet, httpPost } from "@/services/http";
import { httpPut } from "@/services/http";

/**
 * getAssistantVisitors - 助教负责实例概览
 */
export function getAssistantVisitors() {
  return httpGet<{ items: { visitorInstanceId: string; studentCount: number; visitorName?: string; templateKey?: string }[] }>("/assistant/visitors");
}

/**
 * getStudentsByVisitor - 某 visitor 实例下的学生列表
 */
export function getStudentsByVisitor(visitorInstanceId: string) {
  return httpGet<{ items: { studentId: string; studentEmail: string; studentName: string; userId: number | null; sessionCount: number; lastSessionAt: string | null }[] }>("/assistant/students", {
    query: { visitorInstanceId },
  });
}

/**
 * getAllAssistantStudents - 获取助教负责的所有学生（跨visitor）
 */
export function getAllAssistantStudents() {
  return httpGet<{ items: { studentId: string; studentEmail: string; studentName: string; userId: number | null; sessionCount: number; lastSessionAt: string | null; visitorInstanceId: string }[] }>("/assistant/all-students");
}

/**
 * getAssistantStudentBrief - 按 studentId 获取单个学生简要信息
 */
export function getAssistantStudentBrief(studentId: string) {
  return httpGet<{ studentId: string; studentEmail: string; studentName: string; userId: number | null; sessionCount: number; lastSessionAt: string | null; visitorInstanceId: string | null }>(`/assistant/students/${studentId}/brief`);
}

/**
 * getStudentSessions - 助教按学生查看所有会话
 */
export function getStudentSessions(studentId: string) {
  return httpGet<{ items: { sessionId: string; sessionNumber: number; createdAt: string }[] }>(`/assistant/students/${studentId}/sessions`);
}

/**
 * getStudentHistory - 学生历史（diary/activity/homework/ltm）
 */
export function getStudentHistory(studentId: string) {
  return httpGet<{ diary: any[]; activity: any[]; homework: any[]; ltm: any[] }>(`/assistant/students/${studentId}/history`);
}

/**
 * createAssistantFeedback - 助教创建反馈
 */
export function createAssistantFeedback(input: { sessionId: string; content: string }) {
  return httpPost<{ id: string }>("/assistant/feedback", input);
}

/**
 * listAssistantFeedback - 列出会话反馈
 */
export function listAssistantFeedback(sessionId: string) {
  return httpGet<{ items: { id: string; sessionId: string; assistantId?: string; content: string; status?: string; createdAt: string }[] }>("/assistant/feedback", { query: { sessionId } });
}

// Assistant-Student Chat
export function listAssistantChat(sessionId: string, page = 1, pageSize = 50) {
  return httpGet<{ items: { id: string; sessionId: string; senderRole: string; senderId: string; content: string; status: string; createdAt: string }[]; unreadCount: number; page: number; pageSize: number; total: number }>("/assistant/chat", { query: { sessionId, page, pageSize } });
}

export function sendAssistantChat(input: { sessionId: string; content: string }) {
  return httpPost<{ id: string }>("/assistant/chat", input);
}

export function markAssistantChatRead(sessionId: string) {
  return httpPost<{ ok: true }>("/assistant/chat/read", { sessionId });
}

/**
 * getAssistantDashboardStats - 获取助教仪表板统计数据
 */
export function getAssistantDashboardStats() {
  return httpGet<{
    totalStudents: number;
    pendingThoughtRecords: number;
    completedFeedbacks: number;
    weeklyDeadline: string | null;
    unreadMessages: number;
  }>("/assistant/dashboard-stats");
}

/**
 * getThoughtRecordsBySession - 获取会话的三联表记录（助教权限）
 */
export function getThoughtRecordsBySession(sessionId: string) {
  return httpGet<{
    items: {
      id: string;
      sessionId: string;
      triggeringEvent: string;
      thoughtsAndBeliefs: string;
      consequences: string;
      createdAt: string;
      updatedAt: string;
    }[];
  }>(`/thought-records/by-session/${sessionId}`);
}

export function listEditableTemplates() {
  return httpGet<{ items: { templateKey: string; name: string; brief: string; corePersona: any; updatedAt: string }[] }>("/assistant/templates");
}

export function updateTemplate(templateKey: string, payload: { name?: string; brief?: string; corePersona?: any }) {
  return httpPut<{ ok: boolean; item: { templateKey: string; name: string; brief: string; corePersona: any; updatedAt: string } }>(`/assistant/templates/${templateKey}`, payload as any);
}

// 历史接口已移除

export function getPendingThoughtRecords() {
  return httpGet<{ items: { studentId: string; studentName: string; sessionId: string; sessionNumber: number; submittedAt: string | null }[] }>("/assistant/pending-thought-records");
}

export function getUnreadMessageSessions() {
  return httpGet<{ items: { sessionId: string; sessionNumber: number; studentId: string; studentName: string; unreadCount: number }[] }>("/assistant/unread-message-sessions");
}

export function getAdminOverview() {
  return httpGet<{ weekStart: string; weekEnd: string; sessionsThisWeek: number; trSubmitRate: number; taFeedbackRate: number; coverageByClass: Record<string, number>; alerts: { type: string; message: string }[] }>("/admin/overview");
}

// Admin Users CRUD
export function getAdminUsers(params?: { role?: string; status?: string; q?: string }) {
  return httpGet<{ items: any[] }>("/admin/users", { query: params as any });
}
export function createAdminUser(body: { name?: string; email: string; role: string; userId?: number; classId?: number; status?: string }) {
  return httpPost<{ ok: boolean; id: string }>("/admin/users", body);
}
export function updateAdminUser(id: string, body: Partial<{ name: string; email: string; role: string; userId: number; classId: number; status: string }>) {
  return httpPut<{ ok: boolean }>(`/admin/users/${id}`, body);
}
export function deleteAdminUser(id: string) {
  return httpRequest("DELETE", `/admin/users/${id}`);
}

// Admin Assignments
export function getAssignmentStudents(params?: { classId?: string; q?: string }) {
  return httpGet<{ items: any[] }>("/admin/assignments/students", { query: params as any });
}
export function assignTemplate(payload: { studentId: string; templateKey: string }) {
  return httpPost<{ ok: boolean; visitorInstanceId: string }>("/admin/assignments/assign-template", payload);
}
export function assignAssistant(payload: { studentId: string; assistantId: string; visitorInstanceId?: string; templateKey?: string }) {
  return httpPost<{ ok: boolean; visitorInstanceId: string }>("/admin/assignments/assign-assistant", payload);
}
export function bulkAssign(payload: { items: Array<{ studentId: string; templateKey?: string; assistantId?: string; visitorInstanceId?: string }> }) {
  return httpPost<{ items: any[] }>("/admin/assignments/bulk", payload);
}

// Admin Assistant-Students CRUD
export function getAssistantStudentsAdmin(assistantId?: string) {
  return httpGet<{ items: any[] }>("/admin/assistant-students", { query: assistantId ? { assistantId } : undefined });
}
export function addAssistantStudentAdmin(payload: { assistantId: string; studentId: string; visitorInstanceId?: string; templateKey?: string }) {
  return httpPost<{ ok: boolean; id: string }>("/admin/assistant-students", payload);
}
export function removeAssistantStudentAdmin(id: string) {
  return httpRequest("DELETE", `/admin/assistant-students/${id}`);
}

// Admin Templates (full access)
export function getAdminTemplates() {
  return httpGet<{ items: { templateKey: string; name: string; brief: string; corePersona: any; updatedAt: string }[] }>("/admin/templates");
}
export function updateAdminTemplate(templateKey: string, payload: { name?: string; brief?: string; corePersona?: any }) {
  return httpPut<{ ok: boolean; item: { templateKey: string; name: string; brief: string; corePersona: any; updatedAt: string } }>(`/admin/templates/${templateKey}`, payload as any);
}
