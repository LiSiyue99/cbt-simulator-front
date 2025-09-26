import { httpGet } from "@/services/http";

/**
 * getAssignmentsList - 学生端作业汇总（按实例）
 */
export function getAssignmentsList(visitorInstanceId: string) {
  return httpGet<{ items: { sessionId: string; sessionNumber: number; createdAt: string; homework: any[]; thoughtRecordCount: number; chatCount: number }[] }>("/assignments/list", {
    query: { visitorInstanceId },
  });
}
