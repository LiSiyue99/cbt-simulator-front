"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/auth";
import { useRouter } from "next/navigation";

/**
 * 登录页 - 验证码登录（请求验证码 → 校验验证码）
 */
export default function LoginPage() {
  const router = useRouter();
  const { state, loginRequestCode, loginVerifyCode } = useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [phase, setPhase] = useState<"request" | "verify">("request");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRequest() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await loginRequestCode(email);
      setPhase("verify");
      setMsg(res.code ? `开发模式验证码：${res.code}` : "验证码已发送，请查收邮箱");
    } catch (e: any) {
      setMsg(e?.message || "请求失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    setLoading(true);
    setMsg(null);
    try {
      await loginVerifyCode(email, code);
      router.replace("/");
    } catch (e: any) {
      setMsg(e?.message || "校验失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-white">
      <div className="w-full max-w-2xl flex flex-col items-center gap-8">
        {/* Title 区域：极简风格 */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-extrabold tracking-tight text-neutral-900">认知行为治疗智能体互动平台</h1>
          <p className="text-lg text-neutral-500">2025 年秋季学期</p>
        </div>

        <h2 className="text-xl font-semibold text-neutral-800">登录界面</h2>
        {phase === "request" ? (
          <div className="w-full max-w-lg space-y-4">
            <input
              type="email"
              className="w-full border rounded-full px-5 py-3 text-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="填入你登记的邮箱"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button onClick={handleRequest} disabled={loading || !email} className="w-full rounded-full px-5 py-3 text-lg bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50">
              {loading ? "请求中..." : "获取验证码"}
            </button>
          </div>
        ) : (
          <div className="w-full max-w-lg space-y-4">
            <input
              type="text"
              className="w-full border rounded-full px-5 py-3 text-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="验证码"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button onClick={handleVerify} disabled={loading || !code} className="w-full rounded-full px-5 py-3 text-lg bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50">
              {loading ? "校验中..." : "登录"}
            </button>
          </div>
        )}
        {msg && <p className="text-sm text-neutral-500">{msg}</p>}
      </div>
    </div>
  );
}
