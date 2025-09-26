import { httpGet, httpPost } from "@/services/http";

export type PlaygroundInstance = {
  instanceId: string;
  templateKey: string;
  name: string;
  createdAt: string;
};

export async function ensurePlayground() {
  return httpPost<{ ok: boolean }>("/playground/ensure", {});
}

export async function listPlaygroundInstances() {
  return httpGet<{ items: PlaygroundInstance[] }>("/playground/instances");
}

export async function getPlaygroundLtm(visitorInstanceId: string) {
  return httpGet<{ instanceId: string; visitor?: { templateKey: string; name: string }; currentLtm?: any; ltmHistory: { createdAt: string; content: any }[]; sessions: { id: string; sessionNumber: number; createdAt: string; sessionDiary?: string; preSessionActivity?: any }[] }>("/playground/ltm", { query: { visitorInstanceId } });
}


