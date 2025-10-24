import { httpGet } from "@/services/http";

/**
 * getClassStudents - 行政助教：本班学生列表
 */
export function getClassStudents() {
  return httpGet<{ items: { studentId: string; name: string; email: string; userId: number; visitorTemplateKey?: string | null; visitorTemplateName?: string | null; lastSessionAt?: string | null; totalSessions?: number }[] }>("/assistant-class/students");
}

/**
 * getClassStudentSessions - 行政助教：按学生查看会话
 */
export function getClassStudentSessions(studentId: string) {
  return httpGet<{ items: { sessionId: string; sessionNumber: number; createdAt: string }[] }>(`/assistant-class/students/${studentId}/sessions`);
}

/**
 * getClassCompliance - 行政助教：周合规报告
 */
export function getClassCompliance(week?: string) {
  return httpGet<{ items: { weekKey: string; classId: number; studentId: string; hasSession: number; hasThoughtRecordByFri: number; hasAnyFeedbackBySun: number; locked: number; computedAt: string; missCountUptoWeek: number }[] }>("/assistant-class/compliance", { query: week ? { week } : undefined });
}

/**
 * getProgressBySession - 按第N次会话查看完成情况
 */
export function getProgressBySession(sessionNumber: number) {
  return httpGet<{ items: { studentId: string; hasSession: number; hasThoughtRecord: number; missCountUptoSession: number }[] }>("/assistant-class/progress-by-session", { query: { sessionNumber } });
}

// 新增：行政助教按 package 查看作业集与进度
export function getClassHomeworkSets() {
  return httpGet<{ items: any[] }>("/assistant-class/homework/sets");
}

export function getHomeworkSetProgress(id: string) {
  return httpGet<{ items: any[] }>(`/assistant-class/homework/sets/${id}/progress`);
}

export function getHomeworkSetFeedback(id: string, studentId: string, page = 1, pageSize = 50) {
  return httpGet<{ items: any[]; page: number; pageSize: number; total: number }>(`/assistant-class/homework/sets/${id}/feedback`, { query: { studentId, page, pageSize } as any });
}

export function getPackageCompliance() {
  return httpGet<{ items: Array<{ setId: string; classId: number; sequenceNumber: number; title?: string; studentStartAt: string; studentDeadline: string; assistantStartAt: string; assistantDeadline: string; totalStudents: number; sessionsStarted: number; submissions: number; feedbacks: number }> }>("/assistant-class/compliance");
}
