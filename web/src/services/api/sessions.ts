import { httpGet, httpPost } from "@/services/http";

export type ChatTurn = { speaker: "user" | "ai"; content: string; timestamp?: string };

/**
 * startSession - 开始会话
 */
export function startSession(input: { visitorInstanceId: string; auto?: boolean; sessionNumber?: number }) {
  return httpPost<{ sessionId: string; sessionNumber: number }>("/sessions/start", input);
}

/**
 * appendMessage - 追加聊天消息
 */
export function appendMessage(sessionId: string, speaker: "user" | "ai", content: string) {
  return httpPost<{
    ok: boolean;
    aiResponse?: {
      speaker: 'ai';
      content: string;
      timestamp: string;
    }
  }>(`/sessions/${sessionId}/messages`, { speaker, content });
}

/**
 * finalizeSession - 结束会话并生成产出
 */
export function finalizeSession(sessionId: string, assignment?: string) {
  return httpPost<{ diary: string }>(`/sessions/${sessionId}/finalize`, { assignment }, { timeoutMs: 300000 }); // 5分钟以覆盖最慢情况
}

/**
 * getLastSession - 读取最近一条会话（仅聊天）
 */
export function getLastSession(visitorInstanceId: string) {
  return httpGet<{ sessionId: string; sessionNumber: number; chatHistory: ChatTurn[]; finalizedAt?: string } | null>("/sessions/last", {
    query: { visitorInstanceId },
  });
}

/**
 * listSessions - 会话历史列表（分页）
 */
export function listSessions(visitorInstanceId: string, page = 1, pageSize = 20) {
  return httpGet<{ items: { sessionId: string; sessionNumber: number; createdAt: string; completed: boolean; messageCount: number; hasDiary: boolean; hasActivity: boolean; hasThoughtRecord: boolean; lastMessage?: { speaker: 'user' | 'ai'; content: string; timestamp?: string } }[]; page: number; pageSize: number }>("/sessions/list", {
    query: { visitorInstanceId, page, pageSize, includePreview: true },
  });
}

/**
 * getSessionDetail - 单次会话详情
 */
export function getSessionDetail(sessionId: string) {
  return httpGet<{ sessionId: string; sessionNumber: number; chatHistory: ChatTurn[]; sessionDiary?: string; preSessionActivity?: unknown; homework?: unknown }>(`/sessions/${sessionId}`);
}

/**
 * prepareNewSession - 新对话前期准备：生成activity并更新LTM
 */
export function prepareNewSession(sessionId: string) {
  return httpPost<{ activityJson: string }>(`/sessions/${sessionId}/prepare`, {}, { timeoutMs: 180000 }); // 3分钟超时
}

/**
 * ensureSessionOutputs - 补偿：确保指定 session 的 diary/activity/LTM 已生成
 */
export function ensureSessionOutputs(sessionId: string) {
  return httpPost<{ ok: boolean; regenerated: boolean; hasDiary: boolean; hasActivity: boolean; hasLtm: boolean }>(`/sessions/${sessionId}/ensure-outputs`, {});
}

/**
 * getVisitorTemplate - 读取某个访客实例的模板信息（名称/键/brief）
 */
export function getVisitorTemplate(visitorInstanceId: string){
  return httpGet<{ name: string; templateKey: string; brief: string }>(`/visitor/template`, { query: { visitorInstanceId } });
}

/**
 * resetSession - 重置会话
 * mode: 'auto' | 'soft' | 'hard'
 */
export function resetSession(sessionId: string, mode: 'auto'|'soft'|'hard' = 'auto') {
  return httpPost<{ ok: boolean; mode: 'soft'|'hard' }>(`/sessions/${sessionId}/reset`, { mode });
}

/**
 * getStudentOutputs - 学生查看自身实例的历史产出（日记/活动/作业/LTM）
 */
export function getStudentOutputs(visitorInstanceId: string) {
  return httpGet<{
    diary: { sessionNumber: number; sessionId: string; createdAt: string; sessionDiary: string }[];
    activity: { sessionNumber: number; sessionId: string; createdAt: string; preSessionActivity: unknown }[];
    homework: { sessionNumber: number; sessionId: string; createdAt: string; homework: Record<string, unknown> }[];
    ltm: { current: Record<string, unknown>; history: { createdAt: string; content: Record<string, unknown> }[] };
  }>(`/student/outputs`, { query: { visitorInstanceId } });
}

/**
 * retryLastAi - 重试最后一条 AI 回复（学生）
 */
export function retryLastAi(sessionId: string) {
  return httpPost<{ ok: boolean; aiResponse?: { speaker: 'ai'; content: string; timestamp: string } }>(`/sessions/${sessionId}/retry-last`, {});
}

/**
 * rollbackAndReplay - 回到指定用户发言索引，替换为新内容，并继续生成新的AI回复
 */
export function rollbackAndReplay(sessionId: string, userIndex: number, newContent: string) {
  return httpPost<{ ok: boolean; aiResponse?: { speaker: 'ai'; content: string; timestamp: string } }>(`/sessions/${sessionId}/rollback-replay`, { userIndex, newContent });
}
