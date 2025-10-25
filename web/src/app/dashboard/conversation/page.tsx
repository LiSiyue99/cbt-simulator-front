"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/auth";
import {
  getLastSession,
  listSessions,
  startSession,
  appendMessage,
  finalizeSession,
  getSessionDetail,
  prepareNewSession,
  ensureSessionOutputs,
  getSessionsOverview,
  ChatTurn
} from "@/services/api/sessions";
import {
  Send,
  Bot,
  User,
  Calendar,
  MessageCircle,
  Loader2,
  Play,
  Clock,
  CheckCircle2,
  Sparkles,
  ArrowLeft,
  RotateCcw
} from "lucide-react";

interface Session {
  sessionId: string;
  sessionNumber: number;
  date: string;
  completed: boolean;
  messageCount: number;
  lastMessage?: { speaker: 'user' | 'ai'; content: string; timestamp?: string };
}

export default function ConversationPage() {
  const searchParams = useSearchParams();
  const playgroundInstanceId = searchParams.get("playgroundInstanceId");
  const { state } = useAuth();
  const [visitorInstanceId, setVisitorInstanceId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionNumber, setSessionNumber] = useState<number | null>(null);
  const [chat, setChat] = useState<ChatTurn[]>([]);
  const [activeSnapshot, setActiveSnapshot] = useState<{ sessionId: string | null; sessionNumber: number | null; chat: ChatTurn[] } | null>(null);
  const [input, setInput] = useState("");
  const [assignment, setAssignment] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [finalizationStep, setFinalizationStep] = useState(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showActivityDetail, setShowActivityDetail] = useState(false);
  const [weeklyActivity, setWeeklyActivity] = useState<any>(null);
  const [showOutputsForStart, setShowOutputsForStart] = useState<boolean>(false);
  const [startingNewSession, setStartingNewSession] = useState(false);
  const [confirmStarting, setConfirmStarting] = useState(false);
  const [selectedHistorySession, setSelectedHistorySession] = useState<string | null>(null);
  const [historyDetail, setHistoryDetail] = useState<any | null>(null);
  const [showOutputs, setShowOutputs] = useState<boolean>(false);
  const [trOpen, setTrOpen] = useState<boolean>(false);
  const [trSubmitted, setTrSubmitted] = useState<boolean>(false);
  const [trForm, setTrForm] = useState<{ triggeringEvent: string; thoughtsAndBeliefs: string; consequences: string }>({ triggeringEvent: "", thoughtsAndBeliefs: "", consequences: "" });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [lastFinalizedSessionId, setLastFinalizedSessionId] = useState<string | null>(null);
  const [allowNext, setAllowNext] = useState<boolean>(false);
  const [nextSessionNumberHint, setNextSessionNumberHint] = useState<number | null>(null);
  const [nextReadyMsg, setNextReadyMsg] = useState<string>("");
  const [cooldownLeftSec, setCooldownLeftSec] = useState<number>(0);
  const visitorName = state.me?.currentVisitor?.name || "AI访客";
  const [templateBrief, setTemplateBrief] = useState<string>("");
  const [templateName, setTemplateName] = useState<string>("");
  const canInteract = useMemo(() => !!sessionId && !selectedHistorySession, [sessionId, selectedHistorySession]);
  const nextSessionNumber = useMemo(() => (sessions.length ? Math.max(...sessions.map(s => s.sessionNumber)) + 1 : 1), [sessions]);

  useEffect(() => {
    if (playgroundInstanceId != null) {
      setVisitorInstanceId(playgroundInstanceId);
    }
  }, [playgroundInstanceId]);

  useEffect(() => {
    // 学生默认实例（当不在 playground 模式时才生效）
    if (playgroundInstanceId != null) return;
    if (!state.me) return;
    const roles: string[] = Array.isArray((state.me as any).roles) ? ((state.me as any).roles as string[]) : [state.me.role];
    const hasStudentRole = state.me.role === 'student' || roles.includes('student');
    const hasStudentContext = !!state.me.currentVisitor?.instanceId;
    if (!hasStudentRole && !hasStudentContext) return;
    const vid = state.me.currentVisitor?.instanceId ||
               (state.me.visitorInstanceIds && state.me.visitorInstanceIds[0]);
    setVisitorInstanceId(vid || null);
  }, [state.me]);

  // 读取模板 brief 展示
  useEffect(() => {
    async function loadTplBrief(){
      try {
        if (!visitorInstanceId) { setTemplateBrief(""); return; }
        const { getVisitorTemplate } = await import('@/services/api/sessions');
        const t = await getVisitorTemplate(visitorInstanceId);
        setTemplateBrief(t?.brief || "");
        setTemplateName(t?.name || "");
      } catch { setTemplateBrief(""); }
    }
    loadTplBrief();
  }, [visitorInstanceId]);

  useEffect(() => {
    async function loadOverview() {
      if (!visitorInstanceId) return;
      setLoading(true);
      setMsg(null);
      try {
        const o = await getSessionsOverview(visitorInstanceId);
        if (o.current) {
          setSessionId(o.current.sessionId);
          setSessionNumber(o.current.sessionNumber);
          setChat(o.current.chatHistory || []);
        } else {
          setSessionId(null);
          setSessionNumber(null);
          setChat([]);
        }
        const sessionsData = (o.history || []).map(h => ({
          sessionId: h.sessionId,
          sessionNumber: h.sessionNumber,
          date: h.createdAt,
          completed: !!h.completed,
          messageCount: h.messageCount ?? 0,
          lastMessage: h.lastMessage,
        }));
        setSessions(sessionsData);
        setLastFinalizedSessionId(o.lastFinalizedSessionId);
        setCooldownLeftSec(o.cooldownRemainingSec || 0);
        setAllowNext(Boolean(o.allowStartNext));
        if (sessionsData.length) {
          const maxN = Math.max(...sessionsData.map(s=>s.sessionNumber));
          setNextSessionNumberHint(maxN + 1);
        } else {
          setNextSessionNumberHint(1);
        }
      } catch (e: any) {
        setMsg(e?.message || "加载失败");
      } finally {
        setLoading(false);
      }
    }
    loadOverview();
  }, [visitorInstanceId]);

  // 冷却倒计时每秒递减（以服务端返回的剩余秒数为准）
  useEffect(() => {
    if (cooldownLeftSec <= 0) return;
    const id = setInterval(() => {
      setCooldownLeftSec(v => Math.max(0, v - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [cooldownLeftSec]);

  // 当切换到新的 playground 实例时，清理历史查看与快照，避免串会话
  useEffect(() => {
    if (playgroundInstanceId != null) {
      setSelectedHistorySession(null);
      setActiveSnapshot(null);
      setChat([]);
      setSessionId(null);
      setSessionNumber(null);
    }
  }, [playgroundInstanceId]);

  // 允许开始下一次对话的轮询提示（每60秒检查一次最新会话产出是否齐备）
  useEffect(() => {
    if (!visitorInstanceId) return;
    const id = setInterval(async () => {
      try {
        // 仅在无进行中会话、未查看历史、且尚未允许时轮询
        if (sessionId || selectedHistorySession || allowNext) return;
        // 冷却期间不轮询（基于剩余秒数判断）
        if (cooldownLeftSec > 0) return;
        const list = await listSessions(visitorInstanceId);
        const items = list.items || [];
        if (items.length === 0) return; // 第一次对话可直接开始，由上游逻辑处理
        const latest = items[0];
        const r = await ensureSessionOutputs(latest.sessionId);
        if (r.hasDiary && r.hasActivity && r.hasLtm) {
          setAllowNext(true);
          setNextSessionNumberHint(latest.sessionNumber + 1);
          setNextReadyMsg(`可以开始第${latest.sessionNumber + 1}次对话`);
        }
      } catch {
        // ignore
      }
    }, 60000);
    return () => clearInterval(id);
  }, [visitorInstanceId, sessionId, selectedHistorySession, allowNext]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  const handleStartNewSession = async () => {
    if (!visitorInstanceId || startingNewSession) return;
    if (cooldownLeftSec > 0) {
      setMsg(`产出生成中，请在 ${cooldownLeftSec} 秒后再试`);
      return;
    }

    setStartingNewSession(true);
    setLoadingActivity(true);
    setShowActivityModal(true);

    try {
      // 先确保“上一条已完成会话”的产物齐备并展示，不立即创建新会话
      const lastCompleted = sessions.find(s => s.completed);
      if (lastCompleted) {
        let ok = false;
        for (let i = 0; i < 8; i++) { // 最多轮询 8 次，每次 1.5s
          try {
            const r = await ensureSessionOutputs(lastCompleted.sessionId);
            if (r.hasDiary && r.hasActivity && r.hasLtm) { ok = true; break; }
          } catch {}
          await new Promise(r => setTimeout(r, 1500));
        }
        if (!ok) throw new Error('上次会话的产物仍在生成中，请稍后再试');

        const detail = await getSessionDetail(lastCompleted.sessionId);
        // 展示完整产出（AI日记/活动/长期记忆）
        setHistoryDetail(detail);
        setShowOutputsForStart(true);
        setShowOutputs(true);
      } else {
        // 没有历史已完成会话，直接创建新会话
        const res = await startSession({ visitorInstanceId, auto: true });
        setSessionId(res.sessionId);
        setSessionNumber(res.sessionNumber);
        setChat([]);
        setLoadingActivity(false);
        setShowActivityModal(false);
        return;
      }
      setLoadingActivity(false);
      setShowActivityModal(false);
    } catch (e: any) {
      setLoadingActivity(false);
      setShowActivityModal(false);
      const code = e?.code || '';
      if (code === 'package_missing') setMsg('请等待管理员安排对话任务（缺少对应作业包）');
      else if (code === 'package_window_closed') setMsg('当前作业包窗口未开放');
      else setMsg(e?.message || '开始会话失败');
    } finally {
      setStartingNewSession(false);
    }
  };

  // 确认开始：在展示完上一周 activity 后，用户点击“开始对话”才真正创建新会话
  const confirmStartSession = async () => {
    if (!visitorInstanceId || confirmStarting) return;
    if (!allowNext) { setMsg('请刷新页面查看最新情况'); return; }
    setConfirmStarting(true);
    try {
      const res = await startSession({ visitorInstanceId, auto: true });
      setSessionId(res.sessionId);
      setSessionNumber(res.sessionNumber);
      setChat([]);
      setShowActivityDetail(false);
      setShowOutputs(false);
      setShowOutputsForStart(false);
      setWeeklyActivity(null);
    } catch (e: any) {
      const code = e?.code || '';
      if (code === 'package_missing') setMsg('请等待管理员安排对话任务（缺少对应作业包）');
      else if (code === 'package_window_closed') setMsg('当前作业包窗口未开放');
      else if (code === 'session_unfinished') setMsg('你有未完成的对话，请先在“历史对话”中完成它');
      else setMsg(e?.message || '创建对话失败');
    } finally {
      setConfirmStarting(false);
    }
  };

  const handleSendMessage = async () => {
    if (!sessionId || !input.trim() || loading) return;

    const userMessage = { speaker: "user" as const, content: input, timestamp: new Date().toISOString() };
    setChat(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput("");
    setLoading(true);

    try {
      const response = await appendMessage(sessionId, "user", currentInput);

      // Check if there's an AI response in the response
      if (response.aiResponse) {
        const aiMessage = {
          speaker: "ai" as const,
          content: response.aiResponse.content,
          timestamp: response.aiResponse.timestamp
        };
        setChat(prev => [...prev, aiMessage]);
      }
    } catch (e: any) {
      const code = e?.code || '';
      if (code === 'student_locked_for_week') setMsg('已过周五24:00，本周对话结束');
      else setMsg(e?.message || "发送失败");
      // 如果发送失败，从聊天中移除消息
      setChat(prev => prev.filter(m => m !== userMessage));
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async () => {
    if (!sessionId) return;

    // Show progress modal immediately
    setShowFinalizeModal(false);
    setLoading(true);
    setFinalizationStep(1); // Start with step 1 immediately


    try {
      // 触发后端生成，等待完成以确保 finalizedAt 已写入，避免来回切换后仍显示“进行中”
      const current = sessionId;
      await finalizeSession(current, assignment);

      // 清理本地进行中状态
      setSessionId(null);
      setSessionNumber(null);
      setChat([]);
      setAssignment("");
      setLastFinalizedSessionId(current);
      // 冷却剩余秒数交由后端 overview 提供，前端不再本地设定终止时刻
      setCooldownLeftSec(120);
      setAllowNext(false);
      setNextReadyMsg("");
      setLoading(false);
      setFinalizationStep(0);
      setShowSuccessModal(true);

      if (visitorInstanceId) {
        try {
          const sessionsList = await listSessions(visitorInstanceId);
          const sessionsData = sessionsList.items.map(item => ({
            sessionId: item.sessionId,
            sessionNumber: item.sessionNumber,
            date: item.createdAt,
            completed: !!item.completed,
            messageCount: item.messageCount ?? 0,
            lastMessage: item.lastMessage
          }));
          setSessions(sessionsData);
        } catch (e) {
          console.error('Failed to refresh sessions:', e);
        }
      }

    } catch (e: any) {
      setMsg(e?.message || "结束失败");
      setLoading(false);
      setFinalizationStep(0);
      setShowFinalizeModal(true); // Show modal again on error
    }
  };

  const handleViewHistorySession = async (session: Session) => {
    // 进入历史查看前，快照当前进行中的会话，便于返回时恢复
    if (!selectedHistorySession && sessionId) {
      setActiveSnapshot({ sessionId, sessionNumber, chat });
    }
    setSelectedHistorySession(session.sessionId);
    setLoading(true);
    setMsg(null);

      try {
        const sessionDetail = await getSessionDetail(session.sessionId);
      setChat(sessionDetail.chatHistory || []);
      setHistoryDetail(sessionDetail);
      // 检查是否已存在作业提交，确定按钮文案
      try {
        const { getHomeworkSubmission, createHomeworkSubmission } = await import('@/services/api/homeworkSubmissions');
        const tr = await getHomeworkSubmission(session.sessionId);
        const items = tr.item ? [tr.item] : [];
        if (items.length > 0) {
          setTrSubmitted(true);
          // 将最新一条作业（从 formData 读取）展示到表单
          const last: any = items[0];
          setTrForm({
            triggeringEvent: last.formData?.triggeringEvent || '',
            thoughtsAndBeliefs: last.formData?.thoughtsAndBeliefs || '',
            consequences: last.formData?.consequences || '',
          });
        } else {
          setTrSubmitted(false);
          setTrForm({ triggeringEvent: '', thoughtsAndBeliefs: '', consequences: '' });
        }
      } catch {}
    } catch (e: any) {
      setMsg(e?.message || "加载历史会话失败");
      setChat([]);
    } finally {
      setLoading(false);
    }
  };

  const handleShowOutputs = async () => {
    if (!selectedHistorySession) return;
    // 冷却期内禁止查看最新一条会话的产出
    if (selectedHistorySession === lastFinalizedSessionId && cooldownLeftSec > 0) {
      setMsg(`产出生成中，请在 ${cooldownLeftSec} 秒后查看`);
      return;
    }
    if (!historyDetail) {
      try {
        const sessionDetail = await getSessionDetail(selectedHistorySession);
        setHistoryDetail(sessionDetail);
      } catch (e: any) {
        setMsg(e?.message || "加载会话详情失败");
        return;
      }
    }
    setShowOutputs(true);
  };

  // 打开某会话的作业：根据是否存在来决定“填写/查看”，并准备表单
  const openThoughtRecord = async (targetSessionId: string) => {
    setSelectedHistorySession(targetSessionId);
    try {
      const { getHomeworkSubmission } = await import('@/services/api/homeworkSubmissions');
      const tr = await getHomeworkSubmission(targetSessionId);
      const items = tr.item ? [tr.item] : [];
      if (items.length > 0) {
        setTrSubmitted(true);
        const last: any = items[0];
        setTrForm({
          triggeringEvent: last.formData?.triggeringEvent || '',
          thoughtsAndBeliefs: last.formData?.thoughtsAndBeliefs || '',
          consequences: last.formData?.consequences || '',
        });
      } else {
        setTrSubmitted(false);
        setTrForm({ triggeringEvent: '', thoughtsAndBeliefs: '', consequences: '' });
      }
    } catch {
      // 忽略错误，默认允许填写
      setTrSubmitted(false);
      setTrForm({ triggeringEvent: '', thoughtsAndBeliefs: '', consequences: '' });
    }
    setTrOpen(true);
  };

  const handleBackToCurrentSession = () => {
    setSelectedHistorySession(null);
    // 恢复进行中会话的快照；若没有快照，则回退到最新会话
    if (activeSnapshot && activeSnapshot.sessionId) {
      setSessionId(activeSnapshot.sessionId);
      setSessionNumber(activeSnapshot.sessionNumber);
      setChat(activeSnapshot.chat || []);
      setActiveSnapshot(null);
    } else {
      // 无快照则尝试重新加载最新进行中会话
      if (visitorInstanceId) {
        getLastSession(visitorInstanceId).then((last) => {
          if (last && !last.finalizedAt) {
            setSessionId(last.sessionId);
            setSessionNumber(last.sessionNumber);
            setChat(last.chatHistory || []);
          }
        }).catch(() => {});
      }
    }
  };

  const isPlayground = playgroundInstanceId != null;
  const isStudent = !isPlayground && !!state.me && (
    state.me.role === 'student' ||
    (Array.isArray((state.me as any).roles) && ((state.me as any).roles as string[]).includes('student')) ||
    !!state.me.currentVisitor?.instanceId
  );

  // 是否显示“开始新对话”的大按钮：
  // - 学生：需要 allowNext（窗口期且产出齐备）
  // - Playground：也需要 allowNext（避免未生成产出时误导）
  // - 助教/管理员：总是允许
  const canShowStartCTA = isStudent ? allowNext : (isPlayground ? allowNext : true);

  return (
    <div className="flex h-screen bg-gradient-to-br from-background to-primary/5">
      {/* Chat History Sidebar */}
      <div className="w-80 bg-card/80 backdrop-blur-sm border-r border-primary/20 shadow-lg">
        <div className="p-6 border-b border-primary/20 bg-gradient-to-r from-primary/10 to-primary/5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">对话历史</h2>
              <p className="text-sm text-muted-foreground">与 {visitorName} 的会话记录</p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-3 max-h-[calc(100vh-120px)] overflow-y-auto">
          {/* Start New Session CTA when none is active */}
          {(!sessionId && canShowStartCTA) && (
            <button
              onClick={handleStartNewSession}
              disabled={loading || startingNewSession}
              className="w-full mb-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              开始新对话
            </button>
          )}
          {/* Current Session */}
          {sessionNumber && !selectedHistorySession && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-foreground">第 {sessionNumber} 次对话</span>
                <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full flex items-center gap-1">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  进行中
                </span>
              </div>
              <div className="text-sm text-muted-foreground mb-2">
                {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' })}
              </div>
              <div className="flex items-center text-xs text-muted-foreground">
                <MessageCircle className="w-3 h-3 mr-1" />
                {chat.length} 条消息
              </div>
            </div>
          )}

          {/* Historical Sessions */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2">
              历史对话
            </h3>
            {sessions.map((session) => (
              <div
                key={session.sessionId}
                onClick={() => handleViewHistorySession(session)}
                className={`p-4 rounded-lg cursor-pointer transition-all duration-200 ${
                  selectedHistorySession === session.sessionId
                    ? 'bg-primary/10 border-primary/20 shadow-md'
                    : 'bg-background/60 border border-border hover:bg-background hover:shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-foreground">第 {session.sessionNumber} 次对话</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${session.completed ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {session.completed ? '已完成' : '未完成'}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mb-1">
                  {new Date(session.date).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' })}
                </div>
                {session.lastMessage && (
                  <div className="text-sm text-foreground/80 line-clamp-2 mb-1">
                    {session.lastMessage.speaker === 'ai' ? '访客' : '我'}：{session.lastMessage.content}
                  </div>
                )}
                <div className="flex items-center text-xs text-muted-foreground gap-3">
                  <span className="inline-flex items-center"><MessageCircle className="w-3 h-3 mr-1" />{session.messageCount} 条消息</span>
                </div>
              </div>
            ))}
          </div>

          {sessions.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">还没有历史对话</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat Interface */}
      <div className="flex-1 flex flex-col bg-white/50 backdrop-blur-sm">
        {/* Chat Header */}
        <div className="h-20 border-b border-primary/20 bg-gradient-to-r from-white/80 to-primary/5 px-6 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-4">
            {selectedHistorySession && (
              <button
                onClick={handleBackToCurrentSession}
                className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-primary" />
              </button>
            )}

            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border-2 border-primary/20">
                  <Bot className="h-6 w-6 text-primary" />
                </div>
                {!selectedHistorySession && sessionId && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">{isPlayground ? (templateName || visitorName) : visitorName}</h3>
                {templateBrief && (
                  <p className="text-xs text-muted-foreground mt-0.5 max-w-[42rem] line-clamp-2">{templateBrief}</p>
                )}
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  {selectedHistorySession ? (
                    <>
                      <Calendar className="w-3 h-3" />
                      历史对话回顾
                    </>
                  ) : sessionId ? (
                    <>
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      正在进行CBT训练对话
                    </>
                  ) : (
                    isPlayground ? null : (
                      <>
                        <Sparkles className="w-3 h-3" />
                        AI访客 · CBT训练伙伴
                      </>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {sessionNumber && !selectedHistorySession && (
              <div className="flex items-center space-x-2 text-sm bg-primary/10 text-primary px-3 py-2 rounded-lg font-medium">
                <Clock className="h-4 w-4" />
                <span>第 {sessionNumber} 次对话</span>
              </div>
            )}


            {canInteract && (
              <button
                onClick={() => setShowFinalizeModal(true)}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium shadow-sm"
              >
                结束对话
              </button>
            )}

            {canInteract && (
              <ResetButton sessionId={sessionId!} onDone={async()=>{
                // 重置成功后，清空本地聊天并重新拉取last
                setChat([]);
                try { if (visitorInstanceId) { const last = await getLastSession(visitorInstanceId); if (last && !last.finalizedAt) { setSessionId(last.sessionId); setSessionNumber(last.sessionNumber); setChat(last.chatHistory||[]); } } } catch {}
              }} />
            )}

            {selectedHistorySession && !isStudent && (
              <>
                <button
                  onClick={handleShowOutputs}
                  disabled={Boolean(selectedHistorySession === lastFinalizedSessionId && cooldownLeftSec > 0)}
                  className="px-3 py-2 text-sm border border-border rounded-lg hover:bg-accent transition-colors disabled:opacity-60"
                >
                  查看产出
                </button>
                <button
                  onClick={() => setTrOpen(true)}
                  className="px-3 py-2 text-sm border border-border rounded-lg hover:bg-accent transition-colors"
                >
                  {trSubmitted ? '查看作业' : '填写作业'}
                </button>
              </>
            )}

            {selectedHistorySession && isStudent && (
              <>
                <button
                  onClick={handleShowOutputs}
                  className="px-3 py-2 text-sm border border-border rounded-lg hover:bg-accent transition-colors"
                >
                  查看产出
                </button>
                <ResetButton sessionId={selectedHistorySession} onDone={async()=>{
                  try {
                    const detail = await getSessionDetail(selectedHistorySession);
                    // 将该历史会话切换为“进行中”当前会话
                    setSelectedHistorySession(null);
                    setSessionId(selectedHistorySession);
                    setSessionNumber(detail.sessionNumber);
                    setChat([]);
                    // 刷新侧边历史状态（已完成→未完成）
                    if (visitorInstanceId) {
                      try {
                        const sessionsList = await listSessions(visitorInstanceId);
                        const sessionsData = sessionsList.items.map(item => ({
                          sessionId: item.sessionId,
                          sessionNumber: item.sessionNumber,
                          date: item.createdAt,
                          completed: !!item.completed,
                          messageCount: item.messageCount ?? 0,
                          lastMessage: item.lastMessage
                        }));
                        setSessions(sessionsData);
                      } catch {}
                    }
                    setMsg('已重置该轮对话，可继续开始此轮对话');
                  } catch (e:any) {
                    setMsg(e?.message || '刷新失败');
                  }
                }} />
              </>
            )}

            {!sessionId && !selectedHistorySession && isPlayground && allowNext && (
              <button
                onClick={handleStartNewSession}
                disabled={loading || startingNewSession}
                className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-accent transition-colors font-medium"
              >
                开始新对话
              </button>
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-transparent to-primary/5">
          {!sessionId && !selectedHistorySession ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-8 shadow-lg border border-primary/20">
                <div className="relative">
                  <MessageCircle className="w-16 h-16 text-primary" />
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                    <Sparkles className="w-3 h-3 text-primary-foreground" />
                  </div>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-3">准备开始新对话</h3>
              <p className="text-muted-foreground mb-8 max-w-lg leading-relaxed">
                点击下方按钮开始本周的CBT对话训练。系统会为你加载<span className="font-medium text-primary">{visitorName}</span>的最新状态和活动记录。
              </p>
              {canShowStartCTA ? (
                <button
                  onClick={handleStartNewSession}
                  disabled={loading || startingNewSession}
                  className="group flex items-center space-x-3 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-8 py-4 rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100 font-medium text-lg"
                >
                  <Play className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span>
                    开始第{nextSessionNumber}次对话
                  </span>
                </button>
              ) : (
                <div className="text-sm text-muted-foreground">{`产出生成中，预计剩余 ${Math.floor(cooldownLeftSec / 60)}:${String(cooldownLeftSec % 60).padStart(2,'0')}`}</div>
              )}
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              <div className="space-y-6">
                {chat.map((message, index) => (
                  <div key={index} className={`flex ${message.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex items-start gap-3 max-w-2xl ${message.speaker === 'user' ? 'flex-row-reverse' : ''}`}>
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm ${
                          message.speaker === 'user'
                            ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground'
                            : 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600'
                        }`}>
                          {message.speaker === 'user' ? (
                            <User className="w-5 h-5" />
                          ) : (
                            <Bot className="w-5 h-5" />
                          )}
                        </div>
                      </div>

                      {/* Message Bubble */}
                      <div className={`relative px-4 py-3 rounded-2xl shadow-sm ${
                        message.speaker === 'user'
                          ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-br-md'
                          : 'bg-white border border-gray-200 text-foreground rounded-bl-md'
                      } ${message.speaker === 'ai' && index === chat.length - 1 && !selectedHistorySession ? 'pb-8 pr-10' : ''} ${message.speaker === 'user' ? 'pr-12 pb-6' : ''}`}>
                        <p className="text-sm leading-relaxed">{message.content}</p>

                        {message.timestamp && (
                          <p className={`text-xs mt-2 ${
                            message.speaker === 'user'
                              ? 'text-primary-foreground/70'
                              : 'text-muted-foreground'
                          }`}>
                            {new Date(message.timestamp).toLocaleTimeString('zh-CN', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        )}
                        {/* Retry button for the last AI message */}
                        {message.speaker === 'ai' && index === chat.length - 1 && !selectedHistorySession && (
                          <div className="absolute bottom-2 right-2">
                            <RetryLastButton sessionId={sessionId!} onRetried={(newContent)=>{
                              // 替换最后一条 AI 消息
                              setChat(prev => {
                                const next = [...prev];
                                const lastIdx = next.length - 1;
                                if (lastIdx >= 0 && next[lastIdx]?.speaker === 'ai') {
                                  next[lastIdx] = { speaker: 'ai', content: newContent, timestamp: new Date().toISOString() } as any;
                                }
                                return next;
                              });
                            }} />
                          </div>
                        )}
                        {message.speaker === 'user' && !selectedHistorySession && (
                          <div className="absolute bottom-1 right-1">
                            <RollbackButton
                              sessionId={sessionId!}
                              userIndex={index}
                              onDone={(updated)=>{
                                setChat(updated);
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <Bot className="w-5 h-5 text-gray-600" />
                      </div>
                      <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-bl-md shadow-sm">
                        <div className="flex items-center space-x-2">
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          <span className="text-sm text-muted-foreground">{visitorName}正在思考...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
              {/* OutputsModal moved to global scope below to ensure it renders regardless of left pane state */}
            </div>
          )}
        </div>

        {/* Message Input */}
        {canInteract && (
          <div className="border-t border-primary/20 bg-gradient-to-r from-white/80 to-primary/5 p-6 backdrop-blur-sm">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="输入你的消息..."
                      className="w-full resize-none rounded-2xl border border-gray-200 bg-white px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm"
                      rows={1}
                      style={{ minHeight: '48px', maxHeight: '120px' }}
                    />
                    <div className="absolute right-3 bottom-3 flex items-center gap-2">
                      <div className="text-xs text-muted-foreground">
                        {input.length}/1000
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || loading}
                  className="group h-12 w-12 rounded-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center transition-all duration-200"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span>按 Enter 发送，Shift+Enter 换行</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    {visitorName}正在线
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {msg && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm">
            {msg}
          </div>
        )}
      </div>

      {/* Activity Loading Modal */}
      {showActivityModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-8 max-w-md w-full mx-4 text-center">
            {loadingActivity ? (
              <>
                <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">正在加载AI状态</h3>
                <p className="text-sm text-muted-foreground">
                  系统正在为你准备{visitorName}的最新活动记录和心理状态...
                </p>
              </>
            ) : (
              <>
                <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">准备就绪</h3>
                <p className="text-sm text-muted-foreground">
                  {visitorName}已经准备好与你进行本周的对话了！
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Finalize Modal */}
      {showFinalizeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-foreground mb-4">结束本次对话</h3>
            <p className="text-sm text-muted-foreground mb-4">
              请简要描述你希望来访者在课后完成的作业或思考内容：
            </p>
            <textarea
              value={assignment}
              onChange={(e) => setAssignment(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              rows={4}
              placeholder="例如：记录一周的自动化思维（场景、想法、情绪、证据、反证）"
            />
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setShowFinalizeModal(false)}
                className="px-4 py-2 text-sm border border-border rounded-md hover:bg-accent transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleFinalize}
                disabled={loading}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {loading ? "处理中..." : "结束对话"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Finalization Progress Modal */}
      {loading && finalizationStep > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-8 max-w-md w-full mx-4 text-center">
            <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">正在结束会话</h3>
            <p className="text-sm text-muted-foreground">
              AI正在生成本次对话的日记记录...
            </p>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-8 max-w-md w-full mx-4 text-center">
            <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">对话已成功结束</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  {isStudent ? '请前往学习档案完成本周作业。' : '您可以前往学习档案查看学生作业，或者开始下一次对话训练。'}
                </p>
                <div className="flex flex-col gap-2">
                  {!isStudent && (
                    <button
                      onClick={async () => { setShowSuccessModal(false); if (lastFinalizedSessionId) { await openThoughtRecord(lastFinalizedSessionId); } }}
                      className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                    >
                      {trSubmitted ? '查看作业' : '填写作业'}
                    </button>
                  )}
                  <button onClick={()=>setShowSuccessModal(false)} className="w-full px-4 py-2 border rounded">知道了</button>
                </div>
          </div>
        </div>
      )}

      {/* 下一次对话就绪提示 */}
      {!sessionId && !selectedHistorySession && nextReadyMsg && allowNext && !isStudent && (
        <div className="fixed bottom-6 right-6 bg-green-50 border border-green-200 rounded-lg shadow-lg p-4 max-w-sm">
          <div className="text-green-800 text-sm mb-2">{nextReadyMsg}</div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setNextReadyMsg("")} className="px-3 py-1 text-sm border border-green-300 rounded">稍后</button>
            <button onClick={handleStartNewSession} className="px-3 py-1 text-sm bg-green-600 text-white rounded">开始第{nextSessionNumberHint || ''}次对话</button>
          </div>
        </div>
      )}

      {/* Outputs Modal (Global) */}
      {showOutputs && historyDetail && (
        <OutputsModal
          onClose={()=>{ setShowOutputs(false); setShowOutputsForStart(false); }}
          detail={historyDetail}
          visitorInstanceId={visitorInstanceId!}
          onConfirm={showOutputsForStart ? async ()=>{ await confirmStartSession(); } : undefined}
          confirmText={showOutputsForStart ? '开始对话' : undefined}
        />
      )}

      {/* Activity Detail Modal */}
      {showActivityDetail && weeklyActivity && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-foreground">
                {visitorName}的一周活动记录
              </h3>
              <button
                onClick={() => {
                  setShowActivityDetail(false);
                  setWeeklyActivity(null);
                }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto max-h-[60vh] pr-2">
              {/* Homework Assignment */}
              {weeklyActivity.homework_assignment && (
                <div className="mb-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <h4 className="font-semibold text-primary mb-2">📝 布置的作业</h4>
                  <p className="text-sm text-foreground">{weeklyActivity.homework_assignment}</p>
                </div>
              )}

              {/* Week Overview - 隐藏不对用户展示 */}

              {/* Daily Log */}
              {weeklyActivity.daily_log && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-foreground mb-3">📅 每日记录</h4>
                  {Object.entries(weeklyActivity.daily_log).map(([day, data]: [string, any]) => (
                    <div key={day} className="p-4 bg-gray-50 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-foreground">
                          {data.date} ({data.day_type})
                        </h5>
                      </div>

                      <div className="space-y-3 text-sm">
                        {/* Main Activities */}
                        <div>
                          <span className="font-medium text-gray-700">主要活动:</span>
                          <ul className="mt-1 space-y-1">
                            {data.main_activities?.map((activity: string, idx: number) => (
                              <li key={idx} className="text-gray-600 ml-2">• {activity}</li>
                            ))}
                          </ul>
                        </div>

                        {/* Homework Progress */}
                        {data.homework_progress && (
                          <div>
                            <span className="font-medium text-gray-700">作业进度:</span>
                            <p className="mt-1 text-gray-600">{data.homework_progress}</p>
                          </div>
                        )}

                        {/* Mood Note - 隐藏不对用户展示 */}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={confirmStartSession}
                disabled={confirmStarting}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-60"
              >
                {confirmStarting ? '正在创建…' : '开始对话'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thought Record Modal (Playground & History) */}
      {trOpen && selectedHistorySession && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 max-w-xl w-full mx-4">
            <h3 className="text-lg font-semibold text-foreground mb-4">{trSubmitted ? '查看作业' : '提交作业'}</h3>
            <div className="space-y-3">
              <textarea
                placeholder="触发事件"
                className="w-full border border-border rounded px-3 py-2 text-sm"
                rows={2}
                value={trForm.triggeringEvent}
                onChange={(e)=>setTrForm({...trForm, triggeringEvent: e.target.value})}
                readOnly={trSubmitted}
              />
              <textarea
                placeholder="想法与信念"
                className="w-full border border-border rounded px-3 py-2 text-sm"
                rows={3}
                value={trForm.thoughtsAndBeliefs}
                onChange={(e)=>setTrForm({...trForm, thoughtsAndBeliefs: e.target.value})}
                readOnly={trSubmitted}
              />
              <textarea
                placeholder="后果"
                className="w-full border border-border rounded px-3 py-2 text-sm"
                rows={2}
                value={trForm.consequences}
                onChange={(e)=>setTrForm({...trForm, consequences: e.target.value})}
                readOnly={trSubmitted}
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={()=>setTrOpen(false)} className="px-4 py-2 border border-border rounded">取消</button>
              {!trSubmitted && (
                <button
                  onClick={async ()=>{
                    try {
                      const { getHomeworkSetBySession } = await import('@/services/api/homeworkSets');
                      const { createHomeworkSubmission } = await import('@/services/api/homeworkSubmissions');
                      const setRes = await getHomeworkSetBySession(selectedHistorySession);
                      const setItem = (setRes as any)?.item;
                      if (!setItem) throw new Error('未找到对应作业集');
                      // 临时将三字段映射到 formData
                      const formData: any = { triggeringEvent: trForm.triggeringEvent, thoughtsAndBeliefs: trForm.thoughtsAndBeliefs, consequences: trForm.consequences };
                      await createHomeworkSubmission({ sessionId: selectedHistorySession, homeworkSetId: setItem.id, formData });
                      setTrSubmitted(true);
                      setTrOpen(false);
                      setMsg('作业已提交');
                    } catch (e:any) {
                      setMsg(e?.message || '提交失败');
                    }
                  }}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded"
                >提交</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ResetButton({ sessionId, onDone }: { sessionId: string; onDone: ()=>void }){
  const [open, setOpen] = useState(false);
  const [forcingHard, setForcingHard] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <button onClick={()=>setOpen(true)} className="px-3 py-2 text-sm border border-red-300 text-red-700 rounded-lg hover:bg-red-50">重置对话</button>
      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-foreground mb-3">重置本轮对话</h3>
            <p className="text-sm text-muted-foreground mb-3">重置后将清空当前轮的聊天记录；若你已布置作业或系统已生成产物，将执行“硬重置”，会清空聊天/作业/日记/活动并回滚长期记忆，且不可撤销。</p>
            <label className="flex items-center gap-2 text-sm mb-3">
              <input type="checkbox" checked={forcingHard} onChange={(e)=>setForcingHard(e.target.checked)} />
              强制执行硬重置
            </label>
            <div className="flex justify-end gap-2">
              <button onClick={()=>setOpen(false)} className="px-3 py-2 border rounded">取消</button>
              <button
                onClick={async ()=>{
                  setBusy(true);
                  try {
                    const { resetSession } = await import('@/services/api/sessions');
                    await resetSession(sessionId, forcingHard ? 'hard' : 'auto');
                    setOpen(false);
                    onDone();
                  } catch (e:any) {
                    alert(e?.message || '重置失败');
                  } finally {
                    setBusy(false);
                  }
                }}
                disabled={busy}
                className="px-4 py-2 bg-red-600 text-white rounded disabled:opacity-60"
              >{busy?'处理中...':'确认重置'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function OutputsModal({ onClose, detail, visitorInstanceId, onConfirm, confirmText }: { onClose: ()=>void; detail: any; visitorInstanceId: string; onConfirm?: ()=>Promise<void>|void; confirmText?: string }) {
  const [tab, setTab] = useState<'diary'|'activity'|'ltm'>('diary');
  const [ltm, setLtm] = useState<{ currentLtm?: any; ltmHistory: any[] }>({ ltmHistory: [] });
  const [pollingMsg, setPollingMsg] = useState<string>('');
  useEffect(() => {
    let mounted = true;
    import('@/services/api/sessions').then(async ({ getStudentOutputs }) => {
      try {
        const res = await getStudentOutputs(visitorInstanceId);
        if (mounted) setLtm({ currentLtm: (res as any)?.ltm?.current, ltmHistory: (res as any)?.ltm?.history || [] });
      } catch {}
    });
    return () => { mounted = false; };
  }, [visitorInstanceId]);

  // 30s 轮询当前会话产出是否就绪
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await getSessionDetail(detail.sessionId);
        const readyDiary = Boolean(res.sessionDiary);
        const readyAct = Boolean(res.preSessionActivity);
        // LTM 通过学生 outputs 的 current 判断
        const { getStudentOutputs } = await import('@/services/api/sessions');
        const out = await getStudentOutputs(visitorInstanceId);
        const curr = (out as any)?.ltm?.current || {};
        const readyLtm = Boolean(curr && Object.keys(curr).length > 0);
        if (!readyDiary || !readyAct || !readyLtm) {
          setPollingMsg('请刷新页面后查看最新情况');
        } else {
          setPollingMsg('');
          // 更新最新产出
          setLtm({ currentLtm: curr, ltmHistory: (out as any)?.ltm?.history || [] });
        }
      } catch {}
    }, 30000);
    return () => clearInterval(id);
  }, [detail.sessionId, visitorInstanceId]);

  const renderActivity = (act: any) => {
    if (!act) return <p className="text-sm text-muted-foreground">AI生成中，请稍后刷新页面查看</p>;
    // 兼容新结构：{ summary: string, details?: any }
    let payload: any = act?.details ?? act;
    if (typeof payload === 'string') {
      try { payload = JSON.parse(payload); } catch { /* 显示原文 */ }
    }
    // 通用 JSON 渲染
    const renderJson = (v: any): any => {
      if (v === null || v === undefined) return <span className="text-muted-foreground">—</span>;
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return <span className="whitespace-pre-wrap text-sm text-foreground">{String(v)}</span>;
      if (Array.isArray(v)) return (
        <ul className="list-disc ml-4 space-y-1">
          {v.map((it, idx) => (<li key={idx}>{renderJson(it)}</li>))}
        </ul>
      );
      if (typeof v === 'object') return (
        <div className="space-y-2">
          {Object.entries(v).map(([k, val]) => (
            <div key={k}>
              <div className="text-xs font-medium text-muted-foreground">{k}</div>
              <div className="text-sm">{renderJson(val)}</div>
            </div>
          ))}
        </div>
      );
      return <span className="text-sm">{String(v)}</span>;
    };
    return (
      <div className="p-2">
        {renderJson(payload)}
      </div>
    );
  };

  const renderLtm = () => {
    const c = ltm.currentLtm || {};
    const item = (label: string, val: any) => (
      val ? (
        <div>
          <div className="font-semibold text-purple-700 text-sm">{label}</div>
          <div className="text-sm text-muted-foreground whitespace-pre-wrap">{val}</div>
        </div>
      ) : null
    );
    return (
      <div className="space-y-3">
        {item('本周关注', c.thisweek_focus)}
        {item('讨论主题', c.discussed_topics)}
        {item('里程碑', c.milestones)}
        {item('复发模式', c.recurring_patterns)}
        {item('核心信念演化', c.core_belief_evolution)}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">会话产出</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <div className="border-b mb-4 flex gap-2">
          {([
            {k:'diary', label:'AI日记'},
            {k:'activity', label:'活动'},
            {k:'ltm', label:'长期记忆'},
          ] as any[]).map(t => (
            <button key={t.k} onClick={()=>setTab(t.k)} className={`px-3 py-2 text-sm ${tab===t.k ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}>{t.label}</button>
          ))}
        </div>
        <div className="overflow-y-auto max-h-[60vh] pr-2">
          {tab==='diary' && (
            detail.sessionDiary ? <div className="text-sm whitespace-pre-wrap text-muted-foreground">{detail.sessionDiary}</div>
              : <div className="text-sm text-muted-foreground">AI生成中，请稍后刷新页面查看</div>
          )}
          {tab==='activity' && renderActivity(detail.preSessionActivity)}
          {tab==='ltm' && (
            ltm.currentLtm ? renderLtm() : <div className="text-sm text-muted-foreground">AI生成中，请稍后刷新页面查看</div>
          )}
          {pollingMsg && <div className="text-xs text-muted-foreground mt-2">{pollingMsg}</div>}
        </div>
        {onConfirm && (
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 border rounded">取消</button>
            <button onClick={async()=>{ try { await onConfirm(); } finally {} }} className="px-4 py-2 bg-primary text-primary-foreground rounded">{confirmText || '确认'}</button>
          </div>
        )}
      </div>
    </div>
  );
}

function RetryLastButton({ sessionId, onRetried }: { sessionId: string; onRetried: (content: string)=>void }){
  const [busy, setBusy] = useState(false);
  return (
    <button
      onClick={async ()=>{
        if (busy) return;
        setBusy(true);
        try {
          const { retryLastAi } = await import('@/services/api/sessions');
          const r = await retryLastAi(sessionId);
          const content = (r as any)?.aiResponse?.content || '';
          if (content) onRetried(content);
        } catch (e:any) {
          // 可选：显示错误
        } finally {
          setBusy(false);
        }
      }}
      className="inline-flex items-center gap-1 text-xs px-2 py-1 border rounded bg-white hover:bg-gray-50"
      title="重新生成此条回复"
    >
      <RotateCcw className="w-3 h-3" />{busy ? '重试中…' : '重试'}
    </button>
  );
}

function RollbackButton({ sessionId, userIndex, onDone }: { sessionId: string; userIndex: number; onDone: (updated: ChatTurn[])=>void }){
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <>
      <button onClick={()=>setOpen(true)} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-white/40 bg-white/10 text-white hover:bg-white/20" title="回到此节点并继续对话">回到此处</button>
      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card text-foreground rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">回到此对话节点</h3>
            <p className="text-sm text-muted-foreground mb-3">编辑该条发言后将清空该条之后的所有记录，并生成新的AI回复。</p>
            <textarea value={text} onChange={(e)=>setText(e.target.value)} className="w-full border border-border rounded px-3 py-2 text-sm bg-white text-foreground placeholder:text-muted-foreground" rows={4} placeholder="在此编辑你的发言" />
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={()=>setOpen(false)} className="px-3 py-2 border rounded">取消</button>
              <button
                onClick={async ()=>{
                  if (busy) return; setBusy(true);
                  try {
                    const { rollbackAndReplay, getSessionDetail } = await import('@/services/api/sessions');
                    await rollbackAndReplay(sessionId, userIndex, text);
                    const d = await getSessionDetail(sessionId);
                    onDone(d.chatHistory || []);
                    setOpen(false);
                  } catch (e:any) {
                    // 可以在页面顶部提示错误
                  } finally {
                    setBusy(false);
                  }
                }}
                className="px-3 py-2 bg-primary text-primary-foreground rounded disabled:opacity-60"
                disabled={busy}
              >{busy?'处理中…':'确定'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}