"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth";
import { getClassHomeworkSets, getHomeworkSetProgress, getHomeworkSetFeedback } from "@/services/api/assistantClass";

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
        <div className="flex items-center gap-2 mb-3">
          <h2 className="font-medium">按作业包（package）查看</h2>
          <select value={selectedSetId} onChange={(e)=>setSelectedSetId(e.target.value)} className="border rounded px-2 py-1">
            <option value="">选择作业包</option>
            {homeworkSets.map((s:any)=> (
              <option key={s.id} value={s.id}>第{s.sequenceNumber}次 {s.title || ''}</option>
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
          <div className="text-muted-foreground text-sm">选择一个作业包以查看班级完成情况</div>
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
