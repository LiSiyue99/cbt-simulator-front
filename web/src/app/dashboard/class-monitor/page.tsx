"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth";
import { getClassStudents, getClassStudentSessions, getClassCompliance, getProgressBySession } from "@/services/api/assistantClass";

/**
 * 行政助教 - 班级监控：学生列表 → 会话列表；周合规报告
 */
export default function ClassMonitorPage() {
  const { state } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [week, setWeek] = useState("");
  const [weekDate, setWeekDate] = useState<string>("");
  const [compliance, setCompliance] = useState<any[]>([]);
  const [sessionNumber, setSessionNumber] = useState<number | ''>('');
  const [bySession, setBySession] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      try {
        if (!state.me) return;
        const roles = (state.me as any).roles && Array.isArray((state.me as any).roles)
          ? ((state.me as any).roles as string[])
          : [state.me.role];
        const allowed = state.me.role === "assistant_class" || state.me.role === "admin" || roles.includes("assistant_class");
        if (!allowed) return;
        const res = await getClassStudents();
        setStudents(res.items || []);
      } catch (e) {
        // 未登录或无权限时静默忽略，避免在非授权用户页面抛出错误
        setStudents([]);
      }
    }
    load();
  }, [state.me]);

  useEffect(() => {
    async function loadSessions() {
      try {
        if (!selectedStudentId) return;
        const res = await getClassStudentSessions(selectedStudentId);
        setSessions(res.items || []);
      } catch (e) {
        setSessions([]);
      }
    }
    loadSessions();
  }, [selectedStudentId]);

  function formatWeekKeyFromDate(dateStr: string): string {
    // 根据所选日期计算 ISO 周（近似北京时间）。
    // dateStr: YYYY-MM-DD
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-").map(Number);
    const local = new Date(y, (m || 1) - 1, d || 1);
    // 转为 UTC 进行 ISO 周计算
    const utc = new Date(Date.UTC(local.getFullYear(), local.getMonth(), local.getDate()));
    const dayNum = utc.getUTCDay() || 7; // 周一=1..周日=7
    utc.setUTCDate(utc.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((utc.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${utc.getUTCFullYear()}-${String(weekNo).padStart(2, '0')}`;
  }

  async function refreshCompliance() {
    try {
      const weekKey = weekDate ? formatWeekKeyFromDate(weekDate) : (week || undefined);
      const res = await getClassCompliance(weekKey);
      setCompliance(res.items || []);
    } catch (e) {
      setCompliance([]);
    }
  }

  async function refreshBySession() {
    try {
      if (sessionNumber === '' || Number.isNaN(Number(sessionNumber))) return;
      const res = await getProgressBySession(Number(sessionNumber));
      setBySession(res.items || []);
    } catch (e) {
      setBySession([]);
    }
  }

  const notAllowed = state.me && !["assistant_class", "admin"].includes(state.me.role);

  // 统计卡
  const stats = (() => {
    const byStu = new Map<string, any>();
    for (const c of compliance) byStu.set(c.studentId, c);
    const total = students.length;
    const notSession = students.filter(s => !(byStu.get(s.studentId)?.hasSession === 1)).length;
    const notTR = students.filter(s => !(byStu.get(s.studentId)?.hasThoughtRecordByFri === 1)).length;
    const missOver = students.filter(s => (byStu.get(s.studentId)?.missCountUptoWeek || 0) >= 1).length;
    return { total, notSession, notTR, missOver };
  })();

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6 min-h-screen">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">行政助教 - 班级监控</h1>
        <div className="flex gap-2">
          <input type="date" value={weekDate} onChange={(e)=>setWeekDate(e.target.value)} className="border rounded px-2 py-1" />
          <button onClick={refreshCompliance} className="px-3 py-1 bg-primary text-primary-foreground rounded">按周刷新</button>
          <input value={sessionNumber} onChange={(e)=>setSessionNumber(e.target.value ? Number(e.target.value) : '')} placeholder="会话序号 N" className="border rounded px-2 py-1 w-28" />
          <button onClick={refreshBySession} className="px-3 py-1 bg-primary text-primary-foreground rounded">按会话刷新</button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card/80 rounded-xl border border-border p-4"><div className="text-xs text-muted-foreground">班级人数</div><div className="text-2xl font-bold">{stats.total}</div></div>
        <div className="bg-card/80 rounded-xl border border-border p-4"><div className="text-xs text-muted-foreground">当周未完成AI对话</div><div className="text-2xl font-bold">{stats.notSession}</div></div>
        <div className="bg-card/80 rounded-xl border border-border p-4"><div className="text-xs text-muted-foreground">当周未完成三联表</div><div className="text-2xl font-bold">{stats.notTR}</div></div>
        <div className="bg-card/80 rounded-xl border border-border p-4"><div className="text-xs text-muted-foreground">累计未完成≥1</div><div className="text-2xl font-bold">{stats.missOver}</div></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="font-medium mb-2">学生列表</h2>
          <div className="space-y-2 max-h-[70vh] overflow-auto pr-2">
            {students.map((s) => {
              const c = compliance.find((x) => x.studentId === s.studentId);
              const byN = bySession.find((x)=> x.studentId === s.studentId);
              const sessionOk = byN ? byN.hasSession === 1 : (c?.hasSession === 1);
              const trOk = byN ? byN.hasThoughtRecord === 1 : (c?.hasThoughtRecordByFri === 1);
              const miss = byN ? (byN.missCountUptoSession || 0) : (c?.missCountUptoWeek || 0);
              return (
                <div key={s.studentId} className="p-3 rounded border flex items-center justify-between cursor-pointer hover:bg-primary/5" onClick={() => setSelectedStudentId(s.studentId)}>
                  <div>
                    <div className="font-medium">{s.name || s.email} {s.userId ? `#${s.userId}` : ''}</div>
                    <div className="text-xs text-muted-foreground">最近会话：{s.lastSessionAt ? new Date(s.lastSessionAt).toLocaleDateString('zh-CN') : '—'} • 模板：{s.visitorTemplateName || s.visitorTemplateKey || '—'}</div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`${sessionOk ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} px-2 py-1 rounded-full`}>AI对话{sessionOk ? '✅' : '❌'}</span>
                    <span className={`${trOk ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} px-2 py-1 rounded-full`}>三联表{trOk ? '✅' : '❌'}</span>
                    <span className={`${miss >= 1 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'} px-2 py-1 rounded-full`}>累计未完成 {miss}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div>
          <h2 className="font-medium mb-2">{selectedStudentId ? '会话列表' : '选择学生查看会话'}</h2>
          <div className="space-y-2 max-h-[70vh] overflow-auto pr-2">
            {selectedStudentId ? sessions.map((it) => (
              <div key={it.sessionId} className="w-full text-left border rounded p-3">
                <div className="text-sm">第 {it.sessionNumber} 次会话</div>
                <div className="text-xs text-muted-foreground">{new Date(it.createdAt).toLocaleDateString('zh-CN')}</div>
              </div>
            )) : (
              <div className="text-muted-foreground text-sm">暂无</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
