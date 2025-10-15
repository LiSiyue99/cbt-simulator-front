"use client";

import { useAuth } from "@/contexts/auth";
import { useEffect, useState } from "react";
import {
  Calendar,
  Clock,
  Users,
  ClipboardCheck,
  AlertCircle,
  TrendingUp,
  BookOpen,
  CheckCircle2
} from "lucide-react";
import { getAssistantVisitors, listEditableTemplates, updateTemplate, getAssistantDashboardStats, getPendingThoughtRecords, getUnreadMessageSessions } from "@/services/api/assistant";
import { useState as useReactState } from "react";
import { useRouter } from "next/navigation";

interface DashboardStats {
  totalStudents: number;
  pendingThoughtRecords: number;
  completedFeedbacks: number;
  weeklyDeadline: string | null;
  unreadMessages: number;
}

export default function TechAssistantOverview() {
  const { state } = useAuth();
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 每秒更新时间
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function loadStats() {
      if (!state.me || state.me.role !== 'assistant_tech') return;

      try {
        const [visitorResponse, board] = await Promise.all([
          getAssistantVisitors(),
          getAssistantDashboardStats()
        ]);
        const totalStudents = visitorResponse.items.reduce((sum, visitor) => sum + visitor.studentCount, 0);

        setStats({
          totalStudents,
          pendingThoughtRecords: board.pendingThoughtRecords,
          completedFeedbacks: board.completedFeedbacks,
          weeklyDeadline: board.weeklyDeadline,
          unreadMessages: (board as any).unreadMessages ?? 0,
        });
      } catch (error) {
        console.error('Failed to load dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [state.me]);

  if (!state.me || state.me.role !== 'assistant_tech') return null;

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 6) return '夜深了';
    if (hour < 9) return '早上好';
    if (hour < 12) return '上午好';
    if (hour < 14) return '中午好';
    if (hour < 18) return '下午好';
    if (hour < 22) return '晚上好';
    return '深夜了';
  };

  const formatDateTime = (date: Date) => {
    return {
      date: date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      }),
      time: date.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    };
  };

  const getDaysUntilDeadline = () => {
    if (!stats?.weeklyDeadline) return null;
    const now = new Date();
    const deadline = new Date(stats.weeklyDeadline);
    const diffTime = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return '已过期';
    if (diffDays === 0) return '今天截止';
    if (diffDays === 1) return '明天截止';
    return `${diffDays}天后截止`;
  };

  const { date, time } = formatDateTime(currentTime);
  const assistantName = state.me?.name || '助教';
  const visitorTemplates = state.me.assignedVisitorTemplates || [];
  const deadlineText = getDaysUntilDeadline();
  const [editOpen, setEditOpen] = useReactState(false);
  const [templates, setTemplates] = useReactState<{ templateKey: string; name: string; brief: string; corePersona: any; updatedAt: string }[]>([]);
  const [current, setCurrent] = useReactState<{ templateKey: string; name: string; brief: string; corePersona: any } | null>(null);
  const [saving, setSaving] = useReactState(false);
  // 历史查看功能已移除
  const [pendingOpen, setPendingOpen] = useReactState(false);
  const [pendingList, setPendingList] = useReactState<{ studentId: string; studentName: string; sessionId: string; sessionNumber: number; submittedAt: string | null }[]>([]);
  const [unreadOpen, setUnreadOpen] = useReactState(false);
  const [unreadList, setUnreadList] = useReactState<{ sessionId: string; sessionNumber: number; studentId: string; studentName: string; unreadCount: number }[]>([]);

  const openEditor = async () => {
    try {
      const res = await listEditableTemplates();
      setTemplates(res.items || []);
      setEditOpen(true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    if (!current) return;
    setSaving(true);
    try {
      await updateTemplate(current.templateKey, { name: current.name, brief: current.brief, corePersona: current.corePersona });
      const res = await listEditableTemplates();
      setTemplates(res.items || []);
      setEditOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const rollbackTo = async (version: { content: string }) => {
    if (!current) return;
    setSaving(true);
    try {
      await updateTemplate(current.templateKey, { corePersona: version.content });
      const res = await listEditableTemplates();
      setTemplates(res.items || []);
      // 保持编辑器打开并同步当前值
      const updated = (res.items || []).find(t => t.templateKey === current.templateKey);
      if (updated) setCurrent({ templateKey: updated.templateKey, name: updated.name, brief: updated.brief, corePersona: updated.corePersona });
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-primary/5">
      <div className="container mx-auto p-6 max-w-6xl">
        {/* Welcome Header */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-xl border border-blue-200 shadow-sm overflow-hidden">
            <div className="p-8">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
                        {getGreeting()}，{state.me?.name ? `${state.me.name}助教` : '助教'}！
                      </h1>
                      <p className="text-muted-foreground">
                        欢迎回到CBT助教工作台
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 text-lg font-semibold text-foreground mb-1">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      <span>{date}</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-2xl font-bold text-blue-600 font-mono">
                      <Clock className="w-5 h-5" />
                      <span>{time}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Students */}
          <div className="bg-card/80 backdrop-blur-sm rounded-xl border border-border shadow-sm">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">负责学生数</p>
                  <p className="text-2xl font-bold text-foreground">
                    {loading ? '...' : stats?.totalStudents || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center relative">
                  <Users className="w-6 h-6 text-blue-600" />
                  {stats && stats.unreadMessages > 0 && (
                    <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-0.5 text-[10px] bg-red-600 text-white rounded-full">
                      {stats.unreadMessages}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Pending Reviews */}
          <div className="bg-card/80 backdrop-blur-sm rounded-xl border border-border shadow-sm">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">待批改作业</p>
                  <p className="text-2xl font-bold text-foreground">
                    {loading ? '...' : stats?.pendingThoughtRecords || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <ClipboardCheck className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Completed Feedbacks */}
          <div className="bg-card/80 backdrop-blur-sm rounded-xl border border-border shadow-sm">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">本周已反馈</p>
                  <p className="text-2xl font-bold text-foreground">
                    {loading ? '...' : stats?.completedFeedbacks || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Weekly Deadline */}
          <div className="bg-card/80 backdrop-blur-sm rounded-xl border border-border shadow-sm">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">本周截止</p>
                  <p className="text-lg font-bold text-foreground">
                    {deadlineText || '无截止日期'}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  deadlineText?.includes('已过期') || deadlineText?.includes('今天')
                    ? 'bg-red-100'
                    : 'bg-purple-100'
                }`}>
                  <Clock className={`w-6 h-6 ${
                    deadlineText?.includes('已过期') || deadlineText?.includes('今天')
                      ? 'text-red-600'
                      : 'text-purple-600'
                  }`} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Template quick entry below dashboard */}
        <div className="mb-8">
          <div className="bg-card/80 backdrop-blur-sm rounded-xl border border-border shadow-sm">
            <div className="p-6 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">来访者模板管理</h3>
                <p className="text-sm text-muted-foreground">编辑我负责的来访者模板</p>
              </div>
              <button onClick={openEditor} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-accent">编辑我负责的来访者模板</button>
            </div>
          </div>
        </div>

        {/* Work Summary */}
        <div className="bg-card/80 backdrop-blur-sm rounded-xl border border-border shadow-sm">
          <div className="p-6 border-b border-border">
            <h3 className="font-semibold text-foreground">工作提醒</h3>
          </div>
          <div className="p-6">
            {stats && stats.unreadMessages > 0 && (
              <div className="mb-4 flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-medium text-red-900">
                    有 {stats.unreadMessages} 条未读消息
                  </p>
                  <p className="text-sm text-red-700">
                    请在“学生详情”中查看聊天并标记为已读
                  </p>
                </div>
                <div className="ml-auto">
                  <button
                    onClick={async ()=>{ try{ const res = await getUnreadMessageSessions(); setUnreadList(res.items||[]); setUnreadOpen(true);}catch(e){ console.error(e);} }}
                    className="px-2 py-1 text-xs border border-red-300 text-red-700 rounded hover:bg-red-50"
                  >去处理</button>
                </div>
              </div>
            )}

            {stats?.pendingThoughtRecords && stats.pendingThoughtRecords > 0 ? (
              <div className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
                <div>
                  <p className="font-medium text-orange-900">
                    有 {stats.pendingThoughtRecords} 份作业待批改
                  </p>
                  <p className="text-sm text-orange-700">
                    请及时查看学生提交的作业并提供反馈
                  </p>
                </div>
                <div className="ml-auto">
                  <button
                    onClick={async ()=>{ try{ const res = await getPendingThoughtRecords(); setPendingList(res.items||[]); setPendingOpen(true);}catch(e){ console.error(e);} }}
                    className="px-2 py-1 text-xs border border-orange-300 text-orange-700 rounded hover:bg-orange-50"
                  >去批改</button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-green-900">
                    所有作业已完成批改
                  </p>
                  <p className="text-sm text-green-700">
                    暂无待处理的作业
                  </p>
                </div>
              </div>
            )}
            {/* 模板编辑入口已上移至数据看板下方 */}
          </div>
        </div>

        {/* Template Editor Modal */}
        {editOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg p-6 w-full max-w-3xl mx-4 max-h-[80vh] overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">编辑我负责的来访者模板</h3>
                <button onClick={()=>setEditOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <div className="md:col-span-1 space-y-2 overflow-y-auto max-h-[60vh] pr-2">
                  {templates.map(t => (
                    <div key={t.templateKey} className={`p-3 rounded border cursor-pointer ${current?.templateKey===t.templateKey ? 'bg-primary/10 border-primary/30' : 'hover:bg-background'}`}
                      onClick={()=>setCurrent({ templateKey: t.templateKey, name: t.name, brief: t.brief, corePersona: t.corePersona })}>
                      <div className="text-sm font-medium">{t.name}（{t.templateKey}）</div>
                      <div className="text-xs text-muted-foreground">更新于 {new Date(t.updatedAt).toLocaleString('zh-CN')}</div>
                    </div>
                  ))}
                </div>
                <div className="md:col-span-2 space-y-3">
                  {current ? (
                    <>
                      <input
                        value={current.name}
                        onChange={e=>setCurrent({...current, name: e.target.value})}
                        className="w-full border border-border rounded px-3 py-2 text-sm"
                        placeholder="名称"
                      />
                      <textarea
                        value={current.brief}
                        onChange={e=>setCurrent({...current, brief: e.target.value})}
                        className="w-full border border-border rounded px-3 py-2 text-sm"
                        rows={3}
                        placeholder="简介"
                      />
                      <textarea
                        value={typeof current.corePersona === 'string' ? current.corePersona : JSON.stringify(current.corePersona, null, 2)}
                        onChange={e=>setCurrent({...current, corePersona: e.target.value})}
                        className="w-full border border-border rounded px-3 py-2 text-sm font-mono"
                        rows={14}
                        placeholder="核心人设（可粘贴纯文本或JSON）"
                      />
                      <div className="flex justify-end items-center gap-2">
                        <button onClick={()=>setEditOpen(false)} className="px-4 py-2 border border-border rounded">取消</button>
                        <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-primary text-primary-foreground rounded disabled:opacity-60">{saving ? '保存中...' : '保存'}</button>
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground">请选择左侧模板进行编辑</div>
                  )}
                </div>
              </div>
              {/* 历史查看区域已移除 */}
            </div>
          </div>
        )}

        {/* Unread Sessions Modal */}
        {unreadOpen && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">有未读消息的会话</h3>
                <button onClick={()=>setUnreadOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
              </div>
              {unreadList.length === 0 ? (
                <p className="text-sm text-muted-foreground">暂无未读消息会话</p>
              ) : (
                <div className="space-y-2">
                  {unreadList.map(item => (
                    <div key={item.sessionId} className="p-3 border rounded flex items-center justify-between">
                      <div>
                        <div className="font-medium text-foreground">{item.studentName} · 第 {item.sessionNumber} 次会话</div>
                        <div className="text-xs text-muted-foreground">未读：{item.unreadCount}</div>
                      </div>
                      <button
                        onClick={()=>{ setUnreadOpen(false); router.push(`/dashboard/student/${item.studentId}?sessionId=${item.sessionId}`); }}
                        className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded"
                      >前往处理</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pending Thought Records Modal */}
        {pendingOpen && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">待批改作业</h3>
                <button onClick={()=>setPendingOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
              </div>
              {pendingList.length === 0 ? (
                <p className="text-sm text-muted-foreground">当前没有待批改项</p>
              ) : (
                <div className="space-y-2">
                  {pendingList.map(item => (
                    <div key={item.sessionId} className="p-3 border rounded flex items-center justify-between">
                      <div>
                        <div className="font-medium text-foreground">{item.studentName} · 第 {item.sessionNumber} 次会话</div>
                        <div className="text-xs text-muted-foreground">提交时间：{item.submittedAt ? new Date(item.submittedAt).toLocaleString('zh-CN') : '—'}</div>
                      </div>
                      <button
                        onClick={()=>{ setPendingOpen(false); router.push(`/dashboard/student/${item.studentId}?sessionId=${item.sessionId}&tab=homework`); }}
                        className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded"
                      >前往批改</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}