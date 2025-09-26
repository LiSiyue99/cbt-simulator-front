"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth";
import { getAssignmentsList } from "@/services/api/assignments";
import { createThoughtRecord, listThoughtRecords } from "@/services/api/thoughtRecords";
import { listAssistantChat, sendAssistantChat, markAssistantChatRead } from "@/services/api/assistant";
import {
  ClipboardCheck,
  MessageSquare,
  Calendar,
  CheckCircle2,
  Circle,
  User,
  Send,
  FileText,
  MessageCircle,
  AlertCircle,
  Clock
} from "lucide-react";

interface Assignment {
  sessionId: string;
  sessionNumber: number;
  createdAt: string;
  homework?: any[];
  thoughtRecordCount: number;
  chatCount: number;
}

interface ThoughtRecord {
  id: string;
  sessionId: string;
  triggeringEvent: string;
  thoughtsAndBeliefs: string;
  consequences: string;
  createdAt: string;
}

// 旧版问题/反馈已移除

export default function AssignmentsPage() {
  const { state } = useAuth();
  const [visitorInstanceId, setVisitorInstanceId] = useState<string | null>(null);
  const [items, setItems] = useState<Assignment[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<Assignment | null>(null);

  // 三联表表单
  const [trEvent, setTrEvent] = useState("");
  const [trThoughts, setTrThoughts] = useState("");
  const [trCons, setTrCons] = useState("");

  // 数据状态
  const [trList, setTrList] = useState<ThoughtRecord[]>([]);
  const [chatList, setChatList] = useState<{ id: string; senderRole: string; content: string; createdAt: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!state.me || state.me.role !== "student") return;
    const vid = state.me.currentVisitor?.instanceId ||
               (state.me.visitorInstanceIds && state.me.visitorInstanceIds[0]);
    setVisitorInstanceId(vid || null);
  }, [state.me]);

  useEffect(() => {
    async function load() {
      if (!visitorInstanceId) return;
      setLoading(true);
      setMsg(null);
      try {
        const res = await getAssignmentsList(visitorInstanceId);
        setItems(res.items || []);
        // 自动选择最新的session
        if (res.items && res.items.length > 0) {
          const latest = res.items[0];
          setSelectedSessionId(latest.sessionId);
          setSelectedSession(latest);
        }
      } catch (e: any) {
        setMsg(e?.message || "加载失败");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [visitorInstanceId]);

  useEffect(() => {
    async function refreshDetails() {
      if (!selectedSessionId) return;
      try {
        const [tr, chat] = await Promise.all([
          listThoughtRecords(selectedSessionId),
          listAssistantChat(selectedSessionId),
        ]);
        setTrList(tr.items || []);
        setChatList((chat.items || []).reverse());
        // 拉取后立即将未读标记为已读
        try { await markAssistantChatRead(selectedSessionId); } catch {}
      } catch (e: any) {
        console.error("Failed to load session details:", e);
      }
    }
    refreshDetails();
  }, [selectedSessionId]);

  const handleSelectSession = (session: Assignment) => {
    setSelectedSessionId(session.sessionId);
    setSelectedSession(session);
  };

  const submitTR = async () => {
    if (!selectedSessionId || !trEvent || !trThoughts) return;
    setLoading(true);
    setMsg(null);
    try {
      const result = await createThoughtRecord({
        sessionId: selectedSessionId,
        triggeringEvent: trEvent,
        thoughtsAndBeliefs: trThoughts,
        consequences: trCons
      });

      // Optimistically add the new thought record
      const newTR = {
        id: result.id,
        sessionId: selectedSessionId,
        triggeringEvent: trEvent,
        thoughtsAndBeliefs: trThoughts,
        consequences: trCons,
        createdAt: new Date().toISOString()
      };
      setTrList(prev => [...prev, newTR]);

      setTrEvent("");
      setTrThoughts("");
      setTrCons("");

      // Update assignments list to reflect new count
      setItems(prev => prev.map(item =>
        item.sessionId === selectedSessionId
          ? { ...item, thoughtRecordCount: item.thoughtRecordCount + 1 }
          : item
      ));

      setMsg("已成功提交三联表");
    } catch (e: any) {
      setMsg(e?.message || "提交失败");
    } finally {
      setLoading(false);
    }
  };

  // 发送助教聊天消息（学生端）——放在 return 之前，避免在 JSX 中引用未定义
  const sendChat = async () => {
    if (!selectedSessionId || !chatInput.trim()) return;
    try {
      const { id } = await sendAssistantChat({ sessionId: selectedSessionId, content: chatInput.trim() });
      const newMsg = { id, senderRole: 'student', content: chatInput.trim(), createdAt: new Date().toISOString() };
      setChatList(prev => [...prev, newMsg]);
      setChatInput("");
    } catch (e:any) {
      setMsg(e?.message || '发送失败');
    }
  };

  if (!visitorInstanceId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">未找到学习实例，请联系管理员</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Session List Sidebar */}
      <div className="w-96 border-r border-border bg-card">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">学习档案</h2>
            <Calendar className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="text-sm text-muted-foreground">
            按对话会话管理三联表和助教互动
          </div>
        </div>

        <div className="p-4 space-y-3 max-h-[calc(100vh-120px)] overflow-y-auto">
          {items.map((session) => (
            <div
              key={session.sessionId}
              onClick={() => handleSelectSession(session)}
              className={`p-4 rounded-lg cursor-pointer transition-all border ${
                selectedSessionId === session.sessionId
                  ? 'bg-primary/10 border-primary/20 text-primary shadow-sm'
                  : 'bg-background border-border hover:bg-accent/50 hover:border-accent'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">第 {session.sessionNumber} 次对话</span>
                <div className="flex items-center space-x-1">
                  {session.thoughtRecordCount > 0 ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>

              <div className="text-sm text-muted-foreground mb-3">
                {new Date(session.createdAt).toLocaleString('zh-CN')}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center space-x-1">
                  <FileText className="h-3 w-3" />
                  <span>三联表 {session.thoughtRecordCount}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <MessageSquare className="h-3 w-3" />
                  <span>聊天 {session.chatCount}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <ClipboardCheck className="h-3 w-3" />
                  <span>作业 {session.homework?.length || 0}</span>
                </div>
              </div>

              {session.thoughtRecordCount === 0 && (
                <div className="mt-2 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                  待提交三联表
                </div>
              )}
            </div>
          ))}

          {items.length === 0 && !loading && (
            <div className="text-center py-8 text-muted-foreground">
              <ClipboardCheck className="h-12 w-12 mx-auto mb-4" />
              <p>暂无对话记录</p>
              <p className="text-xs">完成AI对话后可在此提交作业</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-16 border-b border-border bg-card px-6 flex items-center">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <ClipboardCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">
                {selectedSession ? `第 ${selectedSession.sessionNumber} 次对话档案` : '选择对话会话'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {selectedSession ?
                  new Date(selectedSession.createdAt).toLocaleDateString('zh-CN') :
                  '从左侧选择要处理的对话会话'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Content Area */}
        {!selectedSession ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <ClipboardCheck className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">选择对话会话</h3>
              <p className="text-muted-foreground">
                从左侧列表中选择一个对话会话来填写三联表和与助教互动
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto space-y-8">

              {/* 三联表部分 */}
              <div className="bg-card rounded-lg border border-border p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-6 w-6 text-primary" />
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">CBT 三联表</h3>
                      <p className="text-sm text-muted-foreground">分析对话中的情境、想法和后果</p>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    已提交: {trList.length} 份
                  </div>
                </div>

                <div className="space-y-6">
                  {trList.length === 0 ? (
                    <>
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* 第一列：情境 */}
                        <div className="space-y-3">
                          <div className="text-center">
                            <h4 className="text-lg font-semibold text-primary mb-1">情境 (Situation)</h4>
                            <p className="text-xs text-muted-foreground">触发情绪反应的具体事件</p>
                          </div>
                          <div className="bg-background rounded-lg border border-border p-4 min-h-[200px]">
                            <label className="text-sm font-medium text-foreground block mb-2">触发事件</label>
                            <textarea
                              value={trEvent}
                              onChange={(e) => setTrEvent(e.target.value)}
                              placeholder="具体描述发生了什么事情？何时？何地？涉及哪些人？"
                              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                              rows={6}
                            />
                          </div>
                        </div>

                        {/* 第二列：想法 */}
                        <div className="space-y-3">
                          <div className="text-center">
                            <h4 className="text-lg font-semibold text-primary mb-1">想法 (Thoughts)</h4>
                            <p className="text-xs text-muted-foreground">当时脑海中的自动化思维</p>
                          </div>
                          <div className="bg-background rounded-lg border border-border p-4 min-h-[200px]">
                            <label className="text-sm font-medium text-foreground block mb-2">自动化思维与信念</label>
                            <textarea
                              value={trThoughts}
                              onChange={(e) => setTrThoughts(e.target.value)}
                              placeholder="当时你心里在想什么？有什么担心、判断或预测？"
                              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                              rows={6}
                            />
                          </div>
                        </div>

                        {/* 第三列：后果 */}
                        <div className="space-y-3">
                          <div className="text-center">
                            <h4 className="text-lg font-semibold text-primary mb-1">后果 (Consequences)</h4>
                            <p className="text-xs text-muted-foreground">产生的情绪反应和行为</p>
                          </div>
                          <div className="bg-background rounded-lg border border-border p-4 min-h-[200px]">
                            <label className="text-sm font-medium text-foreground block mb-2">情绪和行为反应</label>
                            <textarea
                              value={trCons}
                              onChange={(e) => setTrCons(e.target.value)}
                              placeholder="你感受到了什么情绪？做了什么行为？对身体有什么影响？"
                              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                              rows={6}
                            />
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={submitTR}
                        disabled={loading || !trEvent || !trThoughts}
                        className="w-full bg-primary text-primary-foreground rounded-lg py-3 px-4 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                      >
                        {loading ? "提交中..." : "提交CBT三联表"}
                      </button>
                    </>
                  ) : (
                    <div className="space-y-4">
                    {trList.map((tr, index) => (
                      <div key={tr.id} className="p-4 bg-background rounded-lg border border-border">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-primary">三联表 #{index + 1}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(tr.createdAt).toLocaleString('zh-CN')}
                          </span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="font-medium text-foreground">情境：</span>
                            <span className="text-muted-foreground">{tr.triggeringEvent}</span>
                          </div>
                          <div>
                            <span className="font-medium text-foreground">想法：</span>
                            <span className="text-muted-foreground">{tr.thoughtsAndBeliefs}</span>
                          </div>
                          <div>
                            <span className="font-medium text-foreground">后果：</span>
                            <span className="text-muted-foreground">{tr.consequences}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 助教互动部分（双向聊天） */}
              <div className="bg-card rounded-lg border border-border p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <MessageSquare className="h-6 w-6 text-primary" />
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">助教互动</h3>
                      <p className="text-sm text-muted-foreground">与助教双向聊天</p>
                    </div>
                  </div>
                </div>

                {/* 聊天窗口 */}
                <div className="mb-6">
                  <div className="h-64 border border-border rounded p-3 bg-background overflow-y-auto">
                    {chatList.length === 0 ? (
                      <div className="text-xs text-muted-foreground">暂无消息</div>
                    ) : (
                      <div className="space-y-2">
                        {chatList.map(m => (
                          <div key={m.id} className={`p-2 rounded border max-w-[80%] ${m.senderRole==='student' ? 'bg-blue-50 border-blue-200 ml-auto' : 'bg-green-50 border-green-200'}`}>
                            <div className="text-xs text-muted-foreground mb-1">{new Date(m.createdAt).toLocaleString('zh-CN')} · {m.senderRole==='student'?'我':'助教'}</div>
                            <div className="text-sm text-foreground whitespace-pre-wrap">{m.content}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <textarea value={chatInput} onChange={e=>setChatInput(e.target.value)} rows={2} placeholder="输入消息..." className="flex-1 rounded border border-border px-3 py-2 text-sm" />
                    <button onClick={sendChat} className="px-4 py-2 bg-primary text-primary-foreground rounded">发送</button>
                  </div>
                </div>

                {/* 旧反馈/提问区域已移除 */}
              </div>

            </div>
          </div>
        )}

        {/* Status Message */}
        {msg && (
          <div className={`p-4 text-sm border-t ${
            msg.includes('成功')
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            {msg}
          </div>
        )}
      </div>
    </div>
  );
}