"use client";

import { useAuth } from "@/contexts/auth";
import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  MessageCircle,
  ClipboardList,
  BookOpen,
  Activity,
  Brain,
  Clock,
  User
} from "lucide-react";
import {
  getStudentSessions,
  getStudentHistory,
  getThoughtRecordsBySession,
  listAssistantChat,
  sendAssistantChat,
  markAssistantChatRead
} from "@/services/api/assistant";
import { getAssistantStudentBrief } from "@/services/api/assistant";
import { getSessionDetail } from "@/services/api/sessions";

interface Student {
  studentId: string;
  studentName: string;
  userId: number | null;
  sessionCount: number;
  studentEmail: string;
  lastSessionAt: string | null;
  visitorInstanceId: string;
}

export default function StudentDetailPage() {
  const { state } = useAuth();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentId = params.studentId as string;

  const [student, setStudent] = useState<Student | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [history, setHistory] = useState<{ diary: any[]; activity: any[]; homework: any[]; ltm: any[] } | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [thoughtRecords, setThoughtRecords] = useState<any[]>([]);
  const [chatHistory, setChatHistory] = useState<any[] | null>(null);
  const [content, setContent] = useState("");
  const [chatList, setChatList] = useState<{ id: string; senderRole: string; content: string; createdAt: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'sessions' | 'thoughtRecords' | 'chatHistory' | 'diary' | 'activity' | 'ltm'>('sessions');

  // Load student information（改为按ID读取，避免全量列表导致限流）
  useEffect(() => {
    async function loadStudent() {
      if (!state.me || state.me.role !== 'assistant_tech') return;

      try {
        const brief = await getAssistantStudentBrief(studentId);
        if (brief) {
          setStudent(brief as any);
        } else {
          router.push('/dashboard');
        }
      } catch (error) {
        console.error('Failed to load student:', error);
        router.push('/dashboard');
      }
    }
    loadStudent();
  }, [studentId, state.me, router]);

  // Load sessions and history when student is loaded
  useEffect(() => {
    async function loadSessionsAndHistory() {
      if (!student) return;

      try {
        const [sess, hist] = await Promise.all([
          getStudentSessions(student.studentId),
          getStudentHistory(student.studentId),
        ]);
        setSessions(sess.items || []);
        setHistory(hist);
      } catch (error) {
        console.error('Failed to load student data:', error);
      }
    }
    loadSessionsAndHistory();
  }, [student]);

  // pick session by query
  useEffect(() => {
    const sid = searchParams?.get('sessionId');
    if (sid) {
      setSelectedSessionId(sid);
      setActiveTab('sessions');
    }
  }, [searchParams]);

  // Load feedbacks and thought records when session is selected
  useEffect(() => {
    async function loadFeedbacksAndThoughtRecords() {
      if (!selectedSessionId) return;

      try {
        const [thoughtRecordRes, sessionDetail, chat] = await Promise.all([
          getThoughtRecordsBySession(selectedSessionId),
          getSessionDetail(selectedSessionId),
          listAssistantChat(selectedSessionId)
        ]);
        setThoughtRecords(thoughtRecordRes.items || []);
        setChatHistory(sessionDetail.chatHistory || []);
        setChatList((chat.items || []).reverse());
        try { await markAssistantChatRead(selectedSessionId); } catch {}
      } catch (error) {
        console.error('Failed to load session data:', error);
      }
    }
    loadFeedbacksAndThoughtRecords();
  }, [selectedSessionId]);

  async function sendChatMsg() {
    if (!selectedSessionId || !chatInput.trim()) return;
    setLoading(true);
    try {
      const { id } = await sendAssistantChat({ sessionId: selectedSessionId, content: chatInput.trim() });
      const newMsg = { id, senderRole: 'assistant_tech', content: chatInput.trim(), createdAt: new Date().toISOString() };
      setChatList(prev => [...prev, newMsg]);
      setChatInput("");
    } catch (e:any) {
      setMsg(e?.message || '发送失败');
    } finally {
      setLoading(false);
    }
  }

  if (!state.me || state.me.role !== 'assistant_tech') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-primary/5 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-red-600 mb-2">无权限访问</p>
          <p className="text-muted-foreground">您没有访问该页面的权限</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-primary/5 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载学生信息中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-primary/5">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            返回助教工作台
          </button>

          <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-xl border border-blue-200 shadow-sm overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">
                    {student.studentName}同学
                  </h1>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                    <span>学号：{student.userId ? `#${student.userId}` : '未设置'}</span>
                    <span>会话总数：{student.sessionCount}</span>
                    {student.lastSessionAt && (
                      <span>最近活动：{new Date(student.lastSessionAt).toLocaleDateString('zh-CN')}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Left Column - Sessions */}
          <div className="col-span-12 lg:col-span-4">
            <div className="bg-card/80 backdrop-blur-sm rounded-xl border border-border shadow-sm">
              <div className="p-6 border-b border-border">
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-primary" />
                  会话列表
                </h2>
                <p className="text-sm text-muted-foreground mt-1">点击会话查看详细信息</p>
              </div>
              <div className="p-4 space-y-2 max-h-[70vh] overflow-auto pr-2">
                {sessions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">暂无会话记录</p>
                ) : (
                  sessions.map((s) => (
                    <div
                      key={s.sessionId}
                      onClick={() => setSelectedSessionId(s.sessionId)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedSessionId === s.sessionId
                          ? 'bg-primary/10 border-primary/20'
                          : 'bg-background border-border hover:bg-primary/5'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium">第 {s.sessionNumber} 次会话</span>
                        <span className="text-sm text-muted-foreground">
                          {new Date(s.createdAt).toLocaleDateString('zh-CN')}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Details */}
          <div className="col-span-12 lg:col-span-8">
            <div className="bg-card/80 backdrop-blur-sm rounded-xl border border-border shadow-sm">
              {/* Tab Navigation */}
              <div className="border-b border-border">
                <nav className="flex p-6 pb-0 overflow-x-auto">
                  {[
                    { key: 'sessions', label: '反馈管理', icon: MessageCircle },
                    { key: 'thoughtRecords', label: '三联表', icon: ClipboardList },
                    { key: 'chatHistory', label: '聊天记录', icon: MessageCircle },
                    { key: 'diary', label: 'AI日记', icon: BookOpen },
                    { key: 'activity', label: '活动列表', icon: Activity },
                    { key: 'ltm', label: '长期记忆', icon: Brain }
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key as any)}
                      className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
                        activeTab === tab.key
                          ? 'border-primary text-primary bg-primary/5'
                          : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                      }`}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'sessions' && (
                  <div>
                    <h3 className="font-semibold text-foreground mb-4">助教与学生聊天</h3>
                    {!selectedSessionId ? (
                      <p className="text-muted-foreground">请先从左侧选择一个会话</p>
                    ) : (
                      <div className="space-y-6 max-h-[65vh] overflow-auto pr-2">
                        {/* Chat */}
                        <div>
                          <div className="h-60 border border-border rounded p-3 bg-background overflow-y-auto mb-2">
                            {chatList.length === 0 ? (
                              <div className="text-xs text-muted-foreground">暂无消息</div>
                            ) : (
                              <div className="space-y-2">
                                {chatList.map(m => (
                                  <div key={m.id} className={`p-2 rounded border max-w-[80%] ${m.senderRole==='assistant_tech' ? 'bg-blue-50 border-blue-200 ml-auto' : 'bg-green-50 border-green-200'}`}>
                                    <div className="text-xs text-muted-foreground mb-1">{new Date(m.createdAt).toLocaleString('zh-CN')} · {m.senderRole==='assistant_tech'?'我':'学生'}</div>
                                    <div className="text-sm text-foreground whitespace-pre-wrap">{m.content}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <textarea value={chatInput} onChange={e=>setChatInput(e.target.value)} rows={2} placeholder="输入消息..." className="flex-1 rounded border border-border px-3 py-2 text-sm" />
                            <button onClick={sendChatMsg} disabled={loading||!chatInput.trim()} className="px-4 py-2 bg-primary text-primary-foreground rounded">发送</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'thoughtRecords' && (
                  <div>
                    <h3 className="font-semibold text-foreground mb-4">三联表记录</h3>
                    {!selectedSessionId ? (
                      <p className="text-muted-foreground">请先从左侧选择一个会话查看三联表</p>
                    ) : thoughtRecords.length > 0 ? (
                      <div className="space-y-4">
                        {thoughtRecords.map((record) => (
                          <div key={record.id} className="p-4 bg-background/50 rounded-lg border border-border">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <h4 className="font-medium text-foreground mb-2">触发事件</h4>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{record.triggeringEvent}</p>
                              </div>
                              <div>
                                <h4 className="font-medium text-foreground mb-2">想法与信念</h4>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{record.thoughtsAndBeliefs}</p>
                              </div>
                              <div>
                                <h4 className="font-medium text-foreground mb-2">后果</h4>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{record.consequences}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              <span>提交时间: {new Date(record.createdAt).toLocaleString('zh-CN')}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">该会话暂无三联表记录</p>
                    )}
                  </div>
                )}

                {activeTab === 'chatHistory' && (
                  <div>
                    <h3 className="font-semibold text-foreground mb-4">聊天记录</h3>
                    {!selectedSessionId ? (
                      <p className="text-muted-foreground">请先从左侧选择一个会话查看聊天记录</p>
                    ) : chatHistory && chatHistory.length > 0 ? (
                      <div className="space-y-3 max-h-96 overflow-auto">
                        {chatHistory.map((turn: any, index: number) => (
                          <div key={index} className={`p-3 rounded-lg ${
                            turn.speaker === 'user'
                              ? 'bg-blue-50 border border-blue-200 ml-8'
                              : 'bg-green-50 border border-green-200 mr-8'
                          }`}>
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`text-xs font-medium px-2 py-1 rounded ${
                                turn.speaker === 'user' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                              }`}>
                                {turn.speaker === 'user' ? '学生' : 'AI访客'}
                              </span>
                              {turn.timestamp && (
                                <span className="text-xs text-muted-foreground">
                                  {new Date(turn.timestamp).toLocaleTimeString('zh-CN')}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-foreground whitespace-pre-wrap">{turn.content}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">该会话暂无聊天记录</p>
                    )}
                  </div>
                )}

                {activeTab === 'diary' && (
                  <div>
                    <h3 className="font-semibold text-foreground mb-4">AI日记</h3>
                    {!selectedSessionId ? (
                      <p className="text-muted-foreground">请先从左侧选择一个会话</p>
                    ) : (() => {
                      const sn = sessions.find(s => s.sessionId === selectedSessionId)?.sessionNumber;
                      const d = history?.diary?.find(x => x.sessionNumber === sn);
                      return d ? (
                        <div className="p-4 bg-background/50 rounded-lg border border-border max-h-[65vh] overflow-auto pr-2">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium">第 {d.sessionNumber} 次会话</span>
                            <span className="text-sm text-muted-foreground">{new Date(d.createdAt).toLocaleDateString('zh-CN')}</span>
                          </div>
                          <div className="text-sm text-muted-foreground whitespace-pre-wrap">{d.sessionDiary}</div>
                        </div>
                      ) : <p className="text-muted-foreground">该会话暂无AI日记</p>;
                    })()}
                  </div>
                )}

                {activeTab === 'activity' && (
                  <div>
                    <h3 className="font-semibold text-foreground mb-4">活动列表</h3>
                    {!selectedSessionId ? (
                      <p className="text-muted-foreground">请先从左侧选择一个会话</p>
                    ) : (() => {
                      const sn = sessions.find(s => s.sessionId === selectedSessionId)?.sessionNumber;
                      const a = history?.activity?.find(x => x.sessionNumber === sn);
                      if (!a || !a.preSessionActivity) return <p className="text-muted-foreground">该会话暂无活动记录</p>;
                      const act = a.preSessionActivity as any;
                      return (
                        <div className="space-y-4 max-h-[65vh] overflow-auto pr-2">
                          {act.homework_assignment && (
                            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                              <h4 className="font-semibold text-primary mb-2">📝 布置的作业</h4>
                              <p className="text-sm text-foreground">{act.homework_assignment}</p>
                            </div>
                          )}
                          {act.daily_log && (
                            <div className="space-y-3">
                              <h4 className="font-semibold text-foreground">📅 每日记录</h4>
                              {Object.entries(act.daily_log).map(([day, data]: [string, any]) => (
                                <div key={day} className="p-3 bg-gray-50 rounded border">
                                  <div className="flex justify-between mb-2">
                                    <span className="font-medium">{data.date}（{data.day_type}）</span>
                                  </div>
                                  <div className="space-y-2 text-sm">
                                    {Array.isArray(data.main_activities) && (
                                      <div>
                                        <span className="font-medium text-gray-700">主要活动:</span>
                                        <ul className="mt-1 space-y-1">
                                          {data.main_activities.map((it: string, idx: number) => (
                                            <li key={idx} className="text-gray-600 ml-2">• {it}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                    {data.homework_progress && (
                                      <div>
                                        <span className="font-medium text-gray-700">作业进度:</span>
                                        <p className="text-gray-600">{data.homework_progress}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {activeTab === 'ltm' && (
                  <div>
                    <h3 className="font-semibold text-foreground mb-4">长期记忆 (LTM)</h3>
                    {!selectedSessionId ? (
                      <p className="text-muted-foreground">请先从左侧选择一个会话查看长期记忆</p>
                    ) : history?.ltm && history.ltm.length > 0 ? (
                      <div className="space-y-4 max-h-[65vh] overflow-auto pr-2">
                        {(() => {
                          const currentIdx = sessions.findIndex(s => s.sessionId === selectedSessionId);
                          if (currentIdx === -1) return <p className="text-muted-foreground">该会话暂无长期记忆记录</p>;
                          const startTs = new Date(sessions[currentIdx].createdAt).getTime();
                          const endTs = sessions[currentIdx + 1] ? new Date(sessions[currentIdx + 1].createdAt).getTime() : Number.POSITIVE_INFINITY;
                          const items = (history.ltm || []).filter((x: any) => {
                            const t = x.createdAt ? new Date(x.createdAt).getTime() : 0;
                            return t >= startTs && t < endTs;
                          });
                          // 若窗口内没有，取窗口结束前的最新一条兜底
                          const fallback = (history.ltm || [])
                            .filter((x: any) => (x.createdAt ? new Date(x.createdAt).getTime() : 0) < endTs)
                            .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
                          const list = items.length > 0 ? items : (fallback ? [fallback] : []);
                          if (list.length === 0) return <p className="text-muted-foreground">该会话暂无长期记忆记录</p>;
                          return list.map((ltm: any, i: number) => (
                            <div key={i} className="p-4 bg-background/50 rounded-lg border border-border">
                              <div className="flex justify-between items-center mb-3">
                                <div className="flex items-center gap-2">
                                  <Brain className="w-4 h-4 text-purple-600" />
                                  <span className="font-medium">长期记忆</span>
                                </div>
                                {ltm.createdAt && (
                                  <span className="text-sm text-muted-foreground">{new Date(ltm.createdAt).toLocaleDateString('zh-CN')}</span>
                                )}
                              </div>
                              {(() => {
                                const c = (ltm.content || ltm.longTermMemory || {}) as any;
                                return (
                                  <div className="space-y-3 text-sm text-foreground">
                                    {c.thisweek_focus && (
                                      <div>
                                        <span className="font-semibold text-purple-700">本周关注：</span>
                                        <p className="text-muted-foreground whitespace-pre-wrap">{c.thisweek_focus}</p>
                                      </div>
                                    )}
                                    {c.discussed_topics && (
                                      <div>
                                        <span className="font-semibold text-purple-700">讨论主题：</span>
                                        <p className="text-muted-foreground whitespace-pre-wrap">{c.discussed_topics}</p>
                                      </div>
                                    )}
                                    {c.milestones && (
                                      <div>
                                        <span className="font-semibold text-purple-700">里程碑：</span>
                                        <p className="text-muted-foreground whitespace-pre-wrap">{c.milestones}</p>
                                      </div>
                                    )}
                                    {c.recurring_patterns && (
                                      <div>
                                        <span className="font-semibold text-purple-700">复发模式：</span>
                                        <p className="text-muted-foreground whitespace-pre-wrap">{c.recurring_patterns}</p>
                                      </div>
                                    )}
                                    {c.core_belief_evolution && (
                                      <div>
                                        <span className="font-semibold text-purple-700">核心信念演化：</span>
                                        <p className="text-muted-foreground whitespace-pre-wrap">{c.core_belief_evolution}</p>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          ));
                        })()}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">暂无长期记忆记录</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Message Display */}
        {msg && (
          <div className="fixed bottom-4 right-4 bg-card border border-border rounded-lg shadow-lg p-4">
            <p className="text-sm text-foreground">{msg}</p>
          </div>
        )}
      </div>
    </div>
  );
}