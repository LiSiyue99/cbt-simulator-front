import { httpGet, httpPost, httpPut } from "@/services/http";

export type HomeworkFormData = Record<string, string | number | boolean>;

export function createHomeworkSubmission(body: { sessionId: string; homeworkSetId: string; formData: HomeworkFormData }) {
  return httpPost<{ ok: boolean; id: string }>("/homework/submissions", body);
}

export function getHomeworkSubmission(sessionId: string) {
  return httpGet<{ item: { id: string; homeworkSetId: string; sessionId: string; studentId: string; formData: HomeworkFormData; createdAt: string; updatedAt: string } | null }>("/homework/submissions", { query: { sessionId } });
}

export function updateHomeworkSubmission(sessionId: string, formData: HomeworkFormData) {
  return httpPut<{ ok: boolean; id: string; updated: boolean }>("/homework/submissions", { sessionId, formData });
}


