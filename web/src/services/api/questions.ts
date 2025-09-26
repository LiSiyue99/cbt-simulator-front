import { httpGet, httpPost } from "@/services/http";

/**
 * createQuestion - 学生创建问题
 */
export function createQuestion(input: { sessionId: string; content: string }) {
  return httpPost<{ id: string }>("/questions", input);
}

/**
 * listQuestions - 按会话查询问题
 */
export function listQuestions(sessionId: string) {
  return httpGet<{ items: any[] }>("/questions", { query: { sessionId } });
}
