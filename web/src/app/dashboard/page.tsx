"use client";

import { useAuth } from "@/contexts/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  MessageSquare,
  ClipboardCheck,
  Bell,
  TrendingUp,
  MessageCircle
} from "lucide-react";
import TechAssistantOverview from "./tech-assistant-overview";
import { getDashboardTodos, TodoItem, DashboardTodosResponse } from "@/services/api/dashboard";

export default function DashboardPage() {
  const { state } = useAuth();
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [summary, setSummary] = useState<DashboardTodosResponse['summary'] | null>(null);
  const [todosLoading, setTodosLoading] = useState(true);
  const [todosError, setTodosError] = useState<string | null>(null);

  useEffect(() => {
    if (!state.me) {
      router.push('/login');
      return;
    }

    // 每秒更新时间
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, [state.me, router]);

  // Admin: redirect to admin overview
  useEffect(() => {
    if (state.me?.role === 'admin') {
      router.replace('/dashboard/admin/overview');
    }
  }, [state.me, router]);

  // Fetch dashboard todos
  useEffect(() => {
    async function fetchTodos() {
      if (!state.me || state.me.role !== 'student') return;

      setTodosLoading(true);
      setTodosError(null);

      try {
        // Get visitorInstanceId from user context
        const visitorInstanceId = state.me.currentVisitor?.instanceId ||
                                 (state.me.visitorInstanceIds && state.me.visitorInstanceIds[0]);

        if (!visitorInstanceId) {
          setTodosError('未找到访客实例');
          return;
        }

        const response = await getDashboardTodos(visitorInstanceId);
        setTodos(response.items);
        setSummary(response.summary);
      } catch (error: any) {
        setTodosError(error.message || 'Failed to load todos');
        console.error('Failed to fetch dashboard todos:', error);
      } finally {
        setTodosLoading(false);
      }
    }

    fetchTodos();
  }, [state.me]);

  if (!state.me) return null;

  // Route to appropriate dashboard based on role
  if (state.me.role === 'assistant_tech') {
    return <TechAssistantOverview />;
  }
  if (state.me.role === 'admin') return null;

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

  const getStudentInfo = () => {
    const name = state.me?.name || state.me?.email?.split('@')[0] || '同学';
    const studentId = state.me?.studentId;
    const assignedTechAsst = state.me?.assignedTechAsst;
    return { name, studentId, assignedTechAsst };
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

  const getDaysUntilDeadline = (dueDate?: string) => {
    if (!dueDate) return null;
    const now = new Date();
    const deadline = new Date(dueDate);
    const diffTime = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return '已过期';
    if (diffDays === 0) return '今天截止';
    if (diffDays === 1) return '明天截止';
    return `${diffDays}天后截止`;
  };

  const { date, time } = formatDateTime(currentTime);
  const { name, studentId, assignedTechAsst } = getStudentInfo();


  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-primary/5">
      <div className="container mx-auto p-6 max-w-6xl">
        {/* Welcome Header */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-emerald-50/50 rounded-xl border border-primary/20 shadow-sm overflow-hidden">
            <div className="p-8">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                      <MessageCircle className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
                        {getGreeting()}，{name}{state.me.role==='admin' ? '管理员' : '同学'}！
                      </h1>
                      <p className="text-muted-foreground">
                        欢迎回到CBT训练平台 {studentId && `• 学号：${studentId}`} {assignedTechAsst && `• 负责助教：${assignedTechAsst.name}`}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 text-lg font-semibold text-foreground mb-1">
                      <Calendar className="w-5 h-5 text-primary" />
                      <span>{date}</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-2xl font-bold text-primary font-mono">
                      <Clock className="w-5 h-5" />
                      <span>{time}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Todo List - Takes 2 columns on xl screens */}
          <div className="xl:col-span-2">
            <div className="bg-card/80 backdrop-blur-sm rounded-xl border border-border shadow-sm">
              <div className="p-6 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                      <ClipboardCheck className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-foreground">学习任务</h2>
                      <p className="text-sm text-muted-foreground">完成以下任务来保持学习进度</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {todosLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">加载学习任务中...</p>
                  </div>
                ) : todosError ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Bell className="w-8 h-8 text-red-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">加载失败</h3>
                    <p className="text-muted-foreground">{todosError}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {todos.filter(todo => !todo.completed).map((todo, index) => {
                      const Icon = todo.type === 'session' ? MessageSquare :
                                 todo.type === 'assignment' ? ClipboardCheck : Bell;

                      const deadlineText = getDaysUntilDeadline(todo.dueDate);
                      const isOverdue = deadlineText?.includes('已过期');
                      const isToday = deadlineText?.includes('今天');

                      const handleTodoClick = () => {
                        if (todo.action && todo.action.type === 'navigate') {
                          router.push(todo.action.target);
                        }
                      };

                      return (
                        <div
                          key={todo.id}
                          onClick={handleTodoClick}
                          className={`group relative p-4 rounded-lg border transition-all duration-200 hover:shadow-md cursor-pointer ${
                            todo.urgent
                              ? 'border-red-200 bg-red-50/50 hover:bg-red-50'
                              : 'border-border bg-background/50 hover:bg-background'
                          }`}
                        >
                        <div className="flex items-start gap-4">
                          {/* Icon */}
                          <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                            todo.urgent ? 'bg-red-100' : 'bg-primary/10'
                          }`}>
                            <Icon className={`w-5 h-5 ${
                              todo.urgent ? 'text-red-600' : 'text-primary'
                            }`} />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h3 className="font-medium text-foreground leading-tight">
                                {todo.title}
                              </h3>
                              {(todo.urgent || isOverdue || isToday) && (
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                                  isOverdue
                                    ? 'bg-red-100 text-red-800'
                                    : isToday
                                    ? 'bg-orange-100 text-orange-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {isOverdue ? '已过期' : isToday ? '今天截止' : '紧急'}
                                </span>
                              )}
                            </div>

                            <p className="text-sm text-muted-foreground mb-3">
                              {todo.description}
                            </p>

                            {deadlineText && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                <span>{deadlineText}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                    {todos.filter(todo => !todo.completed).length === 0 && (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <CheckCircle2 className="w-8 h-8 text-green-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">太棒了！</h3>
                        <p className="text-muted-foreground">你已经完成了所有学习任务</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Progress Overview */}
          <div className="space-y-6">
            {/* Progress Overview */}
            <div className="bg-card/80 backdrop-blur-sm rounded-xl border border-border shadow-sm">
              <div className="p-6 border-b border-border">
                <h3 className="font-semibold text-foreground">本周进度</h3>
              </div>
              <div className="p-6 space-y-4">
                {summary ? (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">AI对话</span>
                        <span className="font-medium">
                          {summary.weeklyProgress.sessionsCompleted}/{summary.weeklyProgress.sessionsRequired}
                        </span>
                      </div>
                      <div className="w-full bg-muted/50 rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{
                            width: `${(summary.weeklyProgress.sessionsCompleted / summary.weeklyProgress.sessionsRequired) * 100}%`
                          }}
                        ></div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">三联表</span>
                        <span className="font-medium">
                          {summary.weeklyProgress.thoughtRecordsCompleted}/{summary.weeklyProgress.thoughtRecordsRequired}
                        </span>
                      </div>
                      <div className="w-full bg-muted/50 rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{
                            width: `${(summary.weeklyProgress.thoughtRecordsCompleted / summary.weeklyProgress.thoughtRecordsRequired) * 100}%`
                          }}
                        ></div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground text-sm">加载进度数据中...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}