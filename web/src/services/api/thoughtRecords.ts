import { httpGet, httpPost } from "@/services/http";

/**
 * createThoughtRecord - 创建三联表
 */
export function createThoughtRecord(input: { sessionId: string; triggeringEvent: string; thoughtsAndBeliefs: string; consequences: string }) {
  return httpPost<{ id: string }>("/thought-records", input);
}

/**
 * listThoughtRecords - 按会话查询三联表
 */
export function listThoughtRecords(sessionId: string) {
  return httpGet<{ items: any[] }>("/thought-records", { query: { sessionId } });
}
