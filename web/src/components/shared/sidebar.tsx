"use client";

import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getAllAssistantStudents } from "@/services/api/assistant";
import {
  MessageCircle,
  ClipboardList,
  Home,
  LogOut,
  User,
  Calendar,
  Bell,
  Users,
  BookOpen,
  BarChart3
} from "lucide-react";

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ElementType;
  description: string;
}

const studentSidebarItems: SidebarItem[] = [
  {
    name: "学习概览",
    href: "/dashboard",
    icon: Home,
    description: "查看学习进度和待办事项"
  },
  {
    name: "AI访客对话",
    href: "/dashboard/conversation",
    icon: MessageCircle,
    description: "与AI访客进行CBT对话训练"
  },
  {
    name: "学习档案",
    href: "/dashboard/assignments",
    icon: ClipboardList,
    description: "完成作业与助教互动"
  }
];

const techAssistantSidebarItems: SidebarItem[] = [
  {
    name: "助教工作台",
    href: "/dashboard",
    icon: Home,
    description: "查看工作概览和统计数据"
  }
];

interface Student {
  studentId: string;
  studentName: string;
  userId: number | null;
  sessionCount: number;
}

const assistantStudentsCache: { items: Student[] } = { items: [] };

export function Sidebar() {
  const { state, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);

  // Load students for assistant_tech users
  useEffect(() => {
    async function loadStudents() {
      if (state.me?.role === 'assistant_tech') {
        try {
          if (assistantStudentsCache.items.length > 0) {
            setStudents(assistantStudentsCache.items);
            return;
          }
          const response = await getAllAssistantStudents();
          assistantStudentsCache.items = response.items as any;
          setStudents(response.items);
        } catch (error) {
          console.error('Failed to load students for sidebar:', error);
        }
      }
    }
    loadStudents();
  }, [state.me]);

  if (!state.me) return null;

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  // 根据角色获取侧边栏项目
  const classAssistantItem: SidebarItem = {
    name: "班级监控",
    href: "/dashboard/class-monitor",
    icon: BarChart3,
    description: "查看班级合规与会话进度"
  };

  const primaryRole = state.me.role;
  const roles = (state.me as any).roles && Array.isArray((state.me as any).roles)
    ? ((state.me as any).roles as string[])
    : [primaryRole];
  const hasAssistantClass = roles.includes('assistant_class');
  const hasStudentRole = roles.includes('student');
  const hasStudentContext = !!state.me.currentVisitor?.instanceId;

  const sidebarItems = (() => {
    if (primaryRole === 'assistant_tech') return [
      ...techAssistantSidebarItems,
      // Playground 暂不发布：隐藏导航项
    ];
    if (primaryRole === 'assistant_class') {
      // 行政助教：仅当确有 student 授权时展示学生菜单；不再因 currentVisitor 兜底展示学生功能
      return hasStudentRole
        ? [...studentSidebarItems, classAssistantItem]
        : [
            { name: "工作概览", href: "/dashboard", icon: Home, description: "查看工作概览和统计数据" },
            classAssistantItem,
          ];
    }
    if (primaryRole === 'admin') {
      return [
        { name: "工作概览", href: "/dashboard/admin/work-overview", icon: Home, description: "查看工作概览和统计数据" },
        classAssistantItem,
        // Playground 暂不发布：隐藏导航项
        { name: "宏观情况概览", href: "/dashboard/admin/overview", icon: BarChart3, description: "全局态势与配置入口" },
        { name: "规则与日历", href: "/dashboard/admin/policy", icon: Calendar, description: "时间窗与临时解锁" },
        { name: "人员与分配", href: "/dashboard/admin/people", icon: Users, description: "用户与分配管理" },
        { name: "模板管理", href: "/dashboard/admin/templates", icon: BookOpen, description: "编辑所有来访者模板" },
        { name: "作业发布与管理", href: "/dashboard/admin/homework", icon: ClipboardList, description: "为班级发包并设置窗口期" },
      ];
    }
    // primary student：如果拥有行政助教授权，追加行政助教入口
    if (primaryRole === 'student' || hasStudentRole) {
      return hasAssistantClass ? [...studentSidebarItems, classAssistantItem] : studentSidebarItems;
    }
    return [];
  })();

  return (
    <div className="flex h-screen w-72 flex-col bg-gradient-to-b from-primary/5 to-primary/10 border-r border-primary/20 shadow-xl">
      {/* Header */}
      <div className="flex h-20 items-center border-b border-primary/20 px-6 bg-white/50 backdrop-blur-sm">
        <div className="flex items-center space-x-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg">
            <MessageCircle className="h-6 w-6" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-foreground">CBT 训练平台</h1>
            <p className="text-xs text-muted-foreground font-medium">认知行为疗法学习系统</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="border-b border-primary/20 p-6 bg-white/30 backdrop-blur-sm">
        <div className="flex items-center space-x-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
            <User className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-foreground truncate">
              {state.me.name || ''}
            </p>
            <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              {primaryRole === 'student' && hasAssistantClass ? '学生 + 行政助教' :
               primaryRole === 'student' ? '学生用户' :
               primaryRole === 'assistant_tech' ? '技术助教' :
               primaryRole === 'assistant_class' ? '行政助教' : '管理员'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-6 space-y-2">
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            功能导航
          </h3>
        </div>

        {sidebarItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center space-x-4 rounded-xl px-4 py-4 text-sm transition-all duration-200 group relative overflow-hidden",
                isActive
                  ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg transform scale-[1.02]"
                  : "text-foreground hover:bg-white/60 hover:shadow-md hover:transform hover:scale-[1.01] bg-white/20 backdrop-blur-sm"
              )}
            >
              {/* Active indicator */}
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-foreground/30 rounded-r-full" />
              )}

              <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                isActive
                  ? "bg-primary-foreground/20"
                  : "bg-primary/10 group-hover:bg-primary/20"
              )}>
                <item.icon className={cn(
                  "h-5 w-5 transition-colors",
                  isActive ? "text-primary-foreground" : "text-primary group-hover:text-primary"
                )} />
              </div>

              <div className="flex flex-col flex-1 min-w-0">
                <span className={cn(
                  "font-semibold leading-tight",
                  isActive ? "text-primary-foreground" : "text-foreground"
                )}>
                  {item.name}
                </span>
                <span className={cn(
                  "text-xs leading-tight",
                  isActive
                    ? "text-primary-foreground/80"
                    : "text-muted-foreground group-hover:text-foreground/80"
                )}>
                  {item.description}
                </span>
              </div>
            </Link>
          );
        })}

        {/* Students List for Tech Assistant */}
        {state.me.role === 'assistant_tech' && students.length > 0 && (
          <>
            <div className="mt-6 mb-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                负责学生
              </h3>
            </div>

            {/* Scrollable student list container */}
            <div className="flex-1 overflow-y-auto max-h-96 space-y-2 pr-2">
              {students.map((student) => {
                const studentPath = `/dashboard/student/${student.studentId}`;
                const isActive = pathname === studentPath;

                return (
                  <Link
                    key={student.studentId}
                    href={studentPath}
                    className={cn(
                      "flex items-center space-x-3 rounded-lg px-3 py-3 text-sm transition-all duration-200 group relative overflow-hidden",
                      isActive
                        ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg"
                        : "text-foreground hover:bg-blue-50 hover:shadow-sm bg-white/30 backdrop-blur-sm"
                    )}
                  >
                    {/* Active indicator */}
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/30 rounded-r-full" />
                    )}

                    <div className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg transition-colors text-xs font-semibold",
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-blue-100 text-blue-600 group-hover:bg-blue-200"
                    )}>
                      {student.studentName.charAt(0)}
                    </div>

                    <div className="flex flex-col flex-1 min-w-0">
                      <span className={cn(
                        "font-medium leading-tight truncate",
                        isActive ? "text-white" : "text-foreground"
                      )}>
                        {student.studentName}
                      </span>
                      <span className={cn(
                        "text-xs leading-tight",
                        isActive
                          ? "text-white/80"
                          : "text-muted-foreground"
                      )}>
                        {student.userId ? `#${student.userId}` : '未设置学号'} • {student.sessionCount}次会话
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-primary/20 p-6 bg-white/30 backdrop-blur-sm">
        <button
          onClick={handleLogout}
          className="flex w-full items-center space-x-3 rounded-lg px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-white/60 transition-all duration-200 group"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 group-hover:bg-red-200 transition-colors">
            <LogOut className="h-4 w-4 text-red-600" />
          </div>
          <span className="font-medium">退出登录</span>
        </button>
      </div>
    </div>
  );
}