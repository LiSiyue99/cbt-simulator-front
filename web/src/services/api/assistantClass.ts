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
  return httpGet<{ items: { id: string; title?: string; description?: string; sequenceNumber: number; studentStartAt: string; studentDeadline: string; assistantStartAt: string; assistantDeadline: string; status: string }[] }>("/assistant-class/homework/sets");
}

export function getHomeworkSetProgress(setId: string) {
  return httpGet<{ items: { studentId: string; name?: string; userId?: number; sessionNumber: number; hasSubmission: number; submittedAt?: string | null; hasAssistantReplyAfterSubmission: number; assistantRepliedAt?: string | null }[] }>(`/assistant-class/homework/sets/${setId}/progress`);
}

export async function getHomeworkSetFeedback(setId: string, studentId: string, page = 1, pageSize = 50) {
  const params = new URLSearchParams({ studentId, page: String(page), pageSize: String(pageSize) });
  return httpGet<{ items: { id: string; title?: string; description?: string; sequenceNumber: number; studentStartAt: string; studentDeadline: string; assistantStartAt: string; assistantDeadline: string; status: string }[] }>(`/assistant-class/homework/sets/${setId}/feedback?${params.toString()}`);
}
