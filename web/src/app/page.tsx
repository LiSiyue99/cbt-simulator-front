"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/auth";
import { useRouter } from "next/navigation";

/**
 * 首页 - 根据是否登录与角色跳转到对应页面：
 * - 未登录：/login
 * - student：/dashboard/conversation
 * - assistant_tech：/dashboard/tutor
 * - assistant_class：/dashboard/class-monitor
 * - admin：先进入助教工作台（后续可加管理台）
 */
export default function HomePage() {
  const { state } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (state.loading) return;
    if (!state.token) {
      router.replace("/login");
      return;
    }
    const role = state.me?.role;
    const roles = state.me?.roles || (role ? [role] : []);
    const hasAssistantClass = roles.includes("assistant_class");
    if (role === "student" && hasAssistantClass) {
      // 学生+行政助教 → 优先进入行政助教面板
      router.replace("/dashboard/class-monitor");
      return;
    }
    if (role === "student") {
      router.replace("/dashboard/conversation");
      return;
    }
    if (role === "assistant_tech") {
      router.replace("/dashboard/tutor");
      return;
    }
    if (role === "assistant_class") {
      router.replace("/dashboard/class-monitor");
      return;
    }
    // admin 临时进入助教工作台
    router.replace("/dashboard/tutor");
  }, [state.loading, state.token, router]);

  return null;
}
