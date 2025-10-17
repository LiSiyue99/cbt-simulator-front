import { NextResponse } from "next/server";

/**
 * GET /api/health
 * 返回前端运行健康状态与构建信息。
 */
export async function GET() {
  const buildId = process.env.NEXT_RUNTIME === "edge"
    ? undefined
    : (process as any)?.env?.NEXT_BUILD_ID || undefined;

  return NextResponse.json({ ok: true, buildId });
}


