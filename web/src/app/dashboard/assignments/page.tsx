"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth";
import { getAssignmentsList } from "@/services/api/assignments";
import { getHomeworkSetBySession } from "@/services/api/homeworkSets";
import { createHomeworkSubmission, getHomeworkSubmission, updateHomeworkSubmission, type HomeworkFormData } from "@/services/api/homeworkSubmissions";
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

type ThoughtRecord = never; // 三联表已移除

// 旧版问题/反馈已移除

export default function AssignmentsPage() {
  const { state } = useAuth();
  const [visitorInstanceId, setVisitorInstanceId] = useState<string | null>(null);
  const [items, setItems] = useState<Assignment[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<Assignment | null>(null);

  // 动态作业表单
  const [formFields, setFormFields] = useState<{ key: string; label: string; type: string; placeholder?: string; helpText?: string }[]>([]);
  const [formData, setFormData] = useState<HomeworkFormData>({});
  const [studentWindow, setStudentWindow] = useState<{ start?: string; end?: string }>({});

  // 数据状态
  const [trList, setTrList] = useState<ThoughtRecord[]>([]);
  const [chatList, setChatList] = useState<{ id: string; senderRole: string; content: string; createdAt: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // 聊天分页
  const [chatPage, setChatPage] = useState<number>(1);
  const [chatPageSize] = useState<number>(50);
  const [chatTotal, setChatTotal] = useState<number>(0);
  const [chatLoadingMore, setChatLoadingMore] = useState<boolean>(false);

  useEffect(() => {
    if (!state.me) return;
    const hasStudentRole = state.me.role === 'student' || (state.me.roles || []).includes('student');
    const hasStudentContext = !!state.me.currentVisitor?.instanceId;
    if (!hasStudentRole && !hasStudentContext) return;
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
        const [setRes, subRes, chat] = await Promise.all([
          getHomeworkSetBySession(selectedSessionId),
          getHomeworkSubmission(selectedSessionId),
          listAssistantChat(selectedSessionId, 1, chatPageSize),
        ]);
        const setItem = (setRes as any)?.item;
        setFormFields(setItem?.formFields || []);
        setStudentWindow({ start: setItem?.studentStartAt, end: setItem?.studentDeadline });
        if ((subRes as any)?.item?.formData) setFormData((subRes as any).item.formData);
        setChatList((chat.items || []).reverse());
        setChatPage(1);
        setChatTotal((chat as any).total || (chat.items||[]).length);
        // 拉取后立即将未读标记为已读
        try { await markAssistantChatRead(selectedSessionId); } catch {}
      } catch (e: any) {
        console.error("Failed to load session details:", e);
      }
    }
    refreshDetails();
  }, [selectedSessionId]);

  // 加载更多聊天
  const loadMoreChat = async () => {
    if (!selectedSessionId) return;
    if (chatList.length >= chatTotal) return;
    setChatLoadingMore(true);
    try {
      const next = chatPage + 1;
      const res = await listAssistantChat(selectedSessionId, next, chatPageSize);
      const older = (res.items || []).reverse();
      setChatList(prev => [...older, ...prev]);
      setChatPage(next);
      setChatTotal((res as any).total || chatTotal);
    } catch (e) {
      // ignore
    } finally {
      setChatLoadingMore(false);
    }
  };

  const handleSelectSession = (session: Assignment) => {
    setSelectedSessionId(session.sessionId);
    setSelectedSession(session);
  };

  const submitHomework = async () => {
    if (!selectedSessionId) return;
    setLoading(true);
    setMsg(null);
    try {
      const setRes = await getHomeworkSetBySession(selectedSessionId);
      const setItem = (setRes as any)?.item;
      if (!setItem) {
        setMsg('当前会话暂无作业集');
        setLoading(false);
        return;
      }
      // 所有字段必填
      for (const f of formFields) {
        const v: any = (formData as any)[f.key];
        if (v === undefined || v === null || (typeof v === 'string' && v.trim() === '')) {
          setMsg(`请填写：${f.label}`);
          setLoading(false);
          return;
        }
      }
      const r = await createHomeworkSubmission({ sessionId: selectedSessionId, homeworkSetId: setItem.id, formData });
      // 更新列表计数为 1（只允许一次提交）
      setItems(prev => prev.map(item =>
        item.sessionId === selectedSessionId
          ? { ...item, thoughtRecordCount: 1 }
          : item
      ));
      setMsg('作业已提交');
    } catch (e:any) {
      const code = e?.code;
      if (code === 'submission_exists') setMsg('你已提交过该次作业'); else setMsg(e?.message || '提交失败');
    } finally {
      setLoading(false);
    }
  };

  const updateHomework = async () => {
    if (!selectedSessionId) return;
    setLoading(true);
    setMsg(null);
    try {
      // 字段校验
      for (const f of formFields) {
        const v: any = (formData as any)[f.key];
        if (v === undefined || v === null || (typeof v === 'string' && v.trim() === '')) {
          setMsg(`请填写：${f.label}`);
          setLoading(false);
          return;
        }
      }
      await updateHomeworkSubmission(selectedSessionId, formData);
      setMsg('已更新，助教已收到提醒');
    } catch (e:any) {
      const code = e?.code;
      if (code === 'package_missing') setMsg('缺少作业包，无法更新');
      else if (code === 'package_window_closed') setMsg('已过提交时间，无法更新');
      else if (code === 'submission_not_found') setMsg('尚未提交作业，无法更新');
      else setMsg(e?.message || '更新失败');
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
            按会话管理作业与助教互动
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
                  <span>作业 {session.thoughtRecordCount}</span>
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
                  待提交作业
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
                从左侧列表中选择一个对话会话来完成作业并与助教互动
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto space-y-8">

              {/* 动态作业表单 */}
              <div className="bg-card rounded-lg border border-border p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-6 w-6 text-primary" />
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">本次作业</h3>
                      {studentWindow.start && studentWindow.end && (
                        <p className="text-sm text-muted-foreground">窗口：{new Date(studentWindow.start).toLocaleString('zh-CN')} ~ {new Date(studentWindow.end).toLocaleString('zh-CN')}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {selectedSession && (selectedSession.thoughtRecordCount > 0 ? '已提交' : '未提交')}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-4">
                    {formFields.length === 0 ? (
                      <div className="text-sm text-muted-foreground">本次作业暂未配置字段</div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {formFields.map((f) => (
                          <div key={f.key} className="space-y-2">
                            <label className="text-sm font-medium text-foreground block">{f.label}</label>
                            {f.type === 'textarea' ? (
                              <textarea
                                value={(formData as any)[f.key] as any || ''}
                                onChange={(e)=> setFormData(prev => ({ ...prev, [f.key]: e.target.value }))}
                                placeholder={f.placeholder || ''}
                                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                                rows={6}
                                
                              />
                            ) : f.type === 'number' ? (
                              <input type="number"
                                value={String((formData as any)[f.key] ?? '')}
                                onChange={(e)=> setFormData(prev => ({ ...prev, [f.key]: Number(e.target.value) }))}
                                placeholder={f.placeholder || ''}
                                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                
                              />
                            ) : f.type === 'date' ? (
                              <input type="date"
                                value={String((formData as any)[f.key] ?? '')}
                                onChange={(e)=> setFormData(prev => ({ ...prev, [f.key]: e.target.value }))}
                                placeholder={f.placeholder || ''}
                                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                
                              />
                            ) : f.type === 'boolean' ? (
                              <select
                                value={String((formData as any)[f.key] ?? '')}
                                onChange={(e)=> setFormData(prev => ({ ...prev, [f.key]: e.target.value === 'true' }))}
                                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                                
                              >
                                <option value="">请选择</option>
                                <option value="true">是</option>
                                <option value="false">否</option>
                              </select>
                            ) : (
                              <input
                                value={String((formData as any)[f.key] ?? '')}
                                onChange={(e)=> setFormData(prev => ({ ...prev, [f.key]: e.target.value }))}
                                placeholder={f.placeholder || ''}
                                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                
                              />
                            )}
                            {f.helpText && <p className="text-xs text-muted-foreground">{f.helpText}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedSession?.thoughtRecordCount > 0 ? (
                      <button
                        onClick={updateHomework}
                        disabled={loading || formFields.length === 0}
                        className="w-full bg-amber-600 text-white rounded-lg py-3 px-4 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                      >
                        {loading ? '保存中...' : '保存修改'}
                      </button>
                    ) : (
                      <button
                        onClick={submitHomework}
                        disabled={loading || formFields.length === 0}
                        className="w-full bg-primary text-primary-foreground rounded-lg py-3 px-4 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                      >
                        {loading ? '提交中...' : '提交作业'}
                      </button>
                    )}
                  </div>
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
                    {chatList.length < chatTotal && (
                      <div className="mb-2 text-center">
                        <button onClick={loadMoreChat} disabled={chatLoadingMore} className="text-xs px-2 py-1 border rounded">
                          {chatLoadingMore ? '加载中...' : '加载更多'}
                        </button>
                      </div>
                    )}
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