import { httpGet } from "@/services/http";

export interface TodoItem {
  id: string;
  type: 'session' | 'assignment' | 'message';
  title: string;
  description: string;
  completed: boolean;
  urgent: boolean;
  dueDate?: string;
  sessionId?: string;
  unreadCount?: number;
  action: {
    type: 'navigate';
    target: string;
    params?: Record<string, any>;
  };
}

export interface TodoSummary {
  totalTodos: number;
  urgentTodos: number;
  completedThisWeek: number;
  weeklyProgress: {
    sessionsCompleted: number;
    sessionsRequired: number;
    thoughtRecordsCompleted: number;
    thoughtRecordsRequired: number;
  };
}

export interface DashboardTodosResponse {
  items: TodoItem[];
  summary: TodoSummary;
}

/**
 * getDashboardTodos - 获取学生dashboard待办事项
 */
export function getDashboardTodos(visitorInstanceId: string) {
  return httpGet<DashboardTodosResponse>("/dashboard/todos", {
    query: { visitorInstanceId },
  });
}