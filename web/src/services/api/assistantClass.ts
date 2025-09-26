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
