import { httpGet } from "@/services/http";

export type HomeworkFormField = {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "date" | "boolean";
  placeholder?: string;
  helpText?: string;
};

export function getHomeworkSetBySession(sessionId: string) {
  return httpGet<{ item: { id: string; classId: number; title?: string; description?: string; sequenceNumber: number; formFields: HomeworkFormField[]; studentStartAt: string; studentDeadline: string; assistantStartAt: string; assistantDeadline: string; status: string } | null }>("/homework/sets/by-session", {
    query: { sessionId },
  });
}
