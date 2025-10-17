"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { httpGet, httpPost, setTokenProvider } from "@/services/http";

export type UserRole = "student" | "assistant_tech" | "assistant_class" | "admin";

export type MeResponse = {
  userId: string;
  email: string;
  name?: string | null;
  role: UserRole;
  roles?: UserRole[];
  classScopes?: Array<{ role: UserRole; classId?: number }>;
  studentId?: number | null;
  visitorInstanceIds?: string[];
  currentVisitor?: {
    instanceId: string;
    name: string;
    templateKey: string;
  };
  assignedTechAsst?: {
    name: string;
    email: string;
  };
  assignedVisitorTemplates?: {
    templateKey: string;
    name: string;
    brief: string;
  }[];
};

export type AuthState = {
  token: string | null;
  me: MeResponse | null;
  loading: boolean;
  error: string | null;
};

const AuthContext = createContext<{
  state: AuthState;
  loginRequestCode: (email: string) => Promise<{ ok: boolean; code?: string }>;
  loginVerifyCode: (email: string, code: string) => Promise<void>;
  loginDirect: (email: string) => Promise<void>;
  logout: () => void;
} | null>(null);

/**
 * AuthProvider - 提供认证上下文，管理 token、/me 信息与登录/登出流程
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ token: null, me: null, loading: true, error: null });

  // Token 注入器
  useEffect(() => {
    setTokenProvider(() => state.token);
  }, [state.token]);

  // 初始化：从 Storage 读取 token，并拉取 /me
  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem("token") : null;
    if (saved) {
      setState((s) => ({ ...s, token: saved }));
    } else {
      setState((s) => ({ ...s, loading: false }));
    }
  }, []);

  useEffect(() => {
    async function fetchMe() {
      if (!state.token) return;
      try {
        const me = await httpGet<MeResponse>("/me");
        setState((s) => ({ ...s, me, loading: false, error: null }));
      } catch (e: any) {
        // token 失效
        window.localStorage.removeItem("token");
        setState({ token: null, me: null, loading: false, error: e?.message || "unauthorized" });
      }
    }
    fetchMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.token]);

  const loginRequestCode = useCallback(async (email: string) => {
    const res = await httpPost<{ ok: boolean; code?: string }>("/auth/request-code", { email });
    return res;
  }, []);

  const loginVerifyCode = useCallback(async (email: string, code: string) => {
    const res = await httpPost<{ token: string; role: UserRole }>("/auth/verify-code", { email, code });
    window.localStorage.setItem("token", res.token);
    setState((s) => ({ ...s, token: res.token, loading: true }));
  }, []);

  const loginDirect = useCallback(async (email: string) => {
    const res = await httpPost<{ token: string; role: UserRole }>("/auth/direct-login", { email });
    window.localStorage.setItem("token", res.token);
    setState((s) => ({ ...s, token: res.token, loading: true }));
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem("token");
    setState({ token: null, me: null, loading: false, error: null });
  }, []);

  const value = useMemo(() => ({ state, loginRequestCode, loginVerifyCode, loginDirect, logout }), [state, loginRequestCode, loginVerifyCode, loginDirect, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * useAuth - 访问认证上下文
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
