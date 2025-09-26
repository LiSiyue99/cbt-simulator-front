/**
 * RoleBasedContent - 基于最小权限显示内容
 *
 * usage:
 * <RoleBasedContent requiredRole="assistant_tech">children</RoleBasedContent>
 */
"use client";
import { useAuth } from "@/contexts/auth";
import { ReactNode } from "react";

export default function RoleBasedContent({ requiredRole, fallback, children }: { requiredRole: "student" | "assistant_tech" | "assistant_class" | "admin"; fallback?: ReactNode; children: ReactNode; }) {
  const { state } = useAuth();
  const role = state.me?.role;
  const hierarchy: Record<string, number> = { student: 1, assistant_tech: 2, assistant_class: 2, admin: 3 };
  if (!role) return null;
  if (hierarchy[role] >= hierarchy[requiredRole]) return <>{children}</>;
  return <>{fallback || null}</>;
}
