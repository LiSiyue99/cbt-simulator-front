"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth";
import { getClassHomeworkSets, getHomeworkSetProgress, getHomeworkSetFeedback, getPackageCompliance } from "@/services/api/assistantClass";

// 行政助教：仅保留“按作业包查看”的集中表格
export default function ClassMonitorPage() {
  const { state } = useAuth();
  const [homeworkSets, setHomeworkSets] = useState<any[]>([]);
  const [selectedSetId, setSelectedSetId] = useState<string>("");
  const [setProgress, setSetProgress] = useState<any[]>([]);
  const [showChat, setShowChat] = useState(false);
  const [chatStudent, setChatStudent] = useState<{ id: string; name?: string } | null>(null);
  const [chatItems, setChatItems] = useState<{ speaker: 'assistant' | 'student'; content: string; timestamp: string }[]>([]);
  const [chatPage, setChatPage] = useState(1);
  const [chatTotal, setChatTotal] = useState(0);
  const [pkgCompliance, setPkgCompliance] = useState<{ items: Array<{ setId: string; sequenceNumber: number; title?: string; studentStartAt: string; studentDeadline: string; assistantStartAt: string; assistantDeadline: string; totalStudents: number; sessionsStarted: number; submissions: number; feedbacks: number }> } | null>(null);
  const [pkgFilter, setPkgFilter] = useState<'all'|'open'|'upcoming'|'closed'>('all');

  useEffect(() => {
    async function loadSets() {
      try {
        if (!state.me) return;
        const roles = (state.me as any).roles && Array.isArray((state.me as any).roles)
          ? ((state.me as any).roles as string[])
          : [state.me.role];
        const allowed = state.me.role === "assistant_class" || state.me.role === "admin" || roles.includes("assistant_class");
        if (!allowed) return;
        const res = await getClassHomeworkSets();
        setHomeworkSets(res.items || []);
        try { const pc = await getPackageCompliance(); setPkgCompliance(pc as any); } catch {}
      } catch {}
    }
    loadSets();
  }, [state.me]);

  async function refreshSetProgress() {
    try {
      if (!selectedSetId) return;
      const res = await getHomeworkSetProgress(selectedSetId);
      setSetProgress(res.items || []);
    } catch { setSetProgress([]); }
  }

  async function openChatView(studentId: string, name?: string) {
    if (!selectedSetId) return;
    setChatStudent({ id: studentId, name });
    setShowChat(true);
    setChatItems([]);
    setChatPage(1);
    await loadChatPage(1, studentId);
  }

  async function loadChatPage(page: number, studentId?: string) {
    if (!selectedSetId) return;
    const sid = studentId || chatStudent?.id;
    if (!sid) return;
    const res = await getHomeworkSetFeedback(selectedSetId, sid, page, 50);
    setChatItems(res.items || []);
    setChatTotal(res.total || 0);
    setChatPage(res.page || page);
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6 min-h-screen">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">行政助教 - 作业包进度</h1>
      </div>

      <div className="bg-card/80 rounded-xl border border-border p-4">
        {/* 作业包合规概览 */}
        <div className="bg-card rounded border border-border">
          <div className="p-3 border-b border-border font-semibold flex items-center justify-between">
            <span>作业包合规概览</span>
            <div className="text-xs flex items-center gap-2">
              <FilterChip active={pkgFilter==='all'} onClick={()=>setPkgFilter('all')}>全部</FilterChip>
              <FilterChip active={pkgFilter==='open'} onClick={()=>setPkgFilter('open')}>进行中</FilterChip>
              <FilterChip active={pkgFilter==='upcoming'} onClick={()=>setPkgFilter('upcoming')}>未开始</FilterChip>
              <FilterChip active={pkgFilter==='closed'} onClick={()=>setPkgFilter('closed')}>已截止</FilterChip>
            </div>
          </div>
          <div className="p-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {(pkgCompliance?.items || []).filter(it=>{
              const now = Date.now();
              const s = new Date(it.studentStartAt).getTime();
              const d = new Date(it.studentDeadline).getTime();
              const status = now < s ? 'upcoming' : (now > d ? 'closed' : 'open');
              if (pkgFilter==='all') return true; return status===pkgFilter;
            }).map((it)=>{
              const total = it.totalStudents || 1;
              const started = it.sessionsStarted || 0;
              const submitted = it.submissions || 0;
              const feedbacks = it.feedbacks || 0;
              const ring = ringByRate(submitted/total);
              return (
                <button key={it.setId} className={`text-left rounded-lg ring-1 bg-white shadow-sm p-3 hover:shadow-md transition ${ring}`} onClick={()=>{ setSelectedSetId(it.setId); refreshSetProgress(); }}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-xs text-muted-foreground">班级 { (pkgCompliance?.items||[]).find(x=>x.setId===it.setId)?.classId || '-' } · 第 {it.sequenceNumber} 次作业</div>
                    <span className="text-xs underline text-primary">查看进度</span>
                  </div>
                  <div className="font-semibold truncate mb-2">{it.title || '未命名作业包'}</div>
                  <div className="text-xs text-muted-foreground mb-2">学生窗口：{fmt(it.studentStartAt)} ~ {fmt(it.studentDeadline)}</div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <div className="text-muted-foreground mb-1">开始</div>
                      <Bar percent={started/total} colorClass={barColor(started/total)} />
                      <div className="mt-1 text-muted-foreground">{started}/{total}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground mb-1">提交</div>
                      <Bar percent={submitted/total} colorClass={barColor(submitted/total)} />
                      <div className="mt-1 text-muted-foreground">{submitted}/{total}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground mb-1">反馈</div>
                      <Bar percent={feedbacks/total} colorClass={barColor(feedbacks/total)} />
                      <div className="mt-1 text-muted-foreground">{feedbacks}/{total}</div>
                    </div>
                  </div>
                </button>
              );
            })}
            {!(pkgCompliance?.items || []).length && (
              <div className="text-sm text-muted-foreground">暂无作业包</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="font-medium">按作业包（package）查看</h2>
          <select value={selectedSetId} onChange={(e)=>setSelectedSetId(e.target.value)} className="border rounded px-2 py-1">
            <option value="">选择作业包</option>
            {homeworkSets.map((s:any)=> (
              <option key={s.id} value={s.id}>班级{s.classId} · 第{s.sequenceNumber}次 {s.title || ''}</option>
            ))}
          </select>
          <button onClick={refreshSetProgress} className="px-3 py-1 bg-primary text-primary-foreground rounded">查看</button>
        </div>
        {selectedSetId ? (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-4">学生</th>
                  <th className="py-2 pr-4">会话序号</th>
                  <th className="py-2 pr-4">是否提交</th>
                  <th className="py-2 pr-4">对话时长(分钟)</th>
                  <th className="py-2 pr-4">助教反馈内容</th>
                  <th className="py-2 pr-0 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {setProgress.map((row:any)=> (
                  <tr key={row.studentId} className="border-b last:border-0">
                    <td className="py-2 pr-4">{row.name || row.studentId} {row.userId ? `#${row.userId}` : ''}</td>
                    <td className="py-2 pr-4">{row.sessionNumber}</td>
                    <td className="py-2 pr-4">
                      <span
                        className={row.hasSubmission
                          ? 'inline-flex items-center px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-xs font-medium'
                          : 'inline-flex items-center px-2.5 py-1 rounded-md bg-red-500 text-white text-xs font-medium'}
                      >
                        {row.hasSubmission ? '是' : '否'}
                      </span>
                    </td>
                    <td className="py-2 pr-4">{row.sessionDurationMinutes ?? '—'}</td>
                    <td className="py-2 pr-4 whitespace-pre-wrap max-w-[28rem]">
                      {row.assistantFeedback ? (
                        <div className="line-clamp-2 text-ellipsis">{row.assistantFeedback}</div>
                      ) : '—'}
                    </td>
                    <td className="py-2 pr-0 text-right">
                      <button
                        className="inline-flex items-center px-3 py-1 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition"
                        onClick={()=>openChatView(row.studentId, row.name)}
                      >
                        查看互动
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-muted-foreground text-sm">选择一个作业包以查看班级完成情况（即使无人提交/反馈也会显示学生清单）。</div>
        )}
      </div>

      {/* Sliding chat panel */}
      {showChat && (
        <div className="fixed inset-0 bg-black/40 flex justify-end" onClick={()=>setShowChat(false)}>
          <div className="w-full max-w-2xl h-full bg-white shadow-xl" onClick={(e)=>e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between">
              <div className="font-semibold">对话记录 {chatStudent?.name ? `- ${chatStudent.name}` : ''}</div>
              <button className="text-sm text-muted-foreground" onClick={()=>setShowChat(false)}>关闭</button>
            </div>
            <div className="p-4 space-y-3 h-[calc(100%-120px)] overflow-auto">
              {chatItems.map((m, idx) => (
                <div key={idx} className={m.speaker==='assistant' ? 'text-sm p-3 rounded bg-blue-50' : 'text-sm p-3 rounded bg-gray-50'}>
                  <div className="text-xs text-muted-foreground mb-1">{m.speaker==='assistant' ? '技术助教' : '学生'} · {new Date(m.timestamp).toLocaleString('zh-CN')}</div>
                  <div className="whitespace-pre-wrap">{m.content}</div>
                </div>
              ))}
              {chatItems.length===0 && (<div className="text-muted-foreground text-sm">暂无聊天记录</div>)}
            </div>
            <div className="p-4 border-t flex items-center justify-between">
              <div className="text-sm text-muted-foreground">共 {chatTotal} 条</div>
              <div className="space-x-2">
                <button className="px-3 py-1 border rounded disabled:opacity-50" disabled={chatPage<=1} onClick={()=>loadChatPage(chatPage-1)}>上一页</button>
                <button className="px-3 py-1 border rounded disabled:opacity-50" disabled={(chatPage*50)>=chatTotal} onClick={()=>loadChatPage(chatPage+1)}>下一页</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Bar({ percent, colorClass = 'bg-primary', height = 'h-2' }: { percent: number; colorClass?: string; height?: string }) {
  const w = `${Math.max(0, Math.min(1, percent)) * 100}%`;
  return (
    <div className={`w-full ${height} bg-muted rounded`}>
      <div className={`${height} ${colorClass} rounded`} style={{ width: w }} />
    </div>
  );
}

function fmt(s: string) {
  try { return new Date(s).toLocaleString('zh-CN'); } catch { return s; }
}

function barColor(rate: number) {
  if (rate >= 0.8) return 'bg-emerald-600';
  if (rate >= 0.5) return 'bg-amber-500';
  return 'bg-rose-600';
}

function ringByRate(rate: number) {
  if (rate >= 0.8) return 'ring-emerald-300';
  if (rate >= 0.5) return 'ring-amber-300';
  return 'ring-rose-300';
}

function FilterChip({ active, children, onClick }: { active: boolean; children: any; onClick: ()=>void }) {
  return (
    <button onClick={onClick} className={`px-2 py-0.5 rounded-full border text-xs ${active? 'bg-primary text-primary-foreground border-primary':'border-border text-muted-foreground hover:bg-muted'}`}>{children}</button>
  );
}
