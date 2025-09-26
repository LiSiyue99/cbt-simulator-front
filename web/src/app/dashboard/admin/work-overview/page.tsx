"use client";

import { useEffect, useState } from "react";
import { getAdminOverview } from "@/services/api/assistant";
import Link from "next/link";

export default function AdminWorkOverviewPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try { setData(await getAdminOverview()); } finally { setLoading(false); }
    }
    load();
  }, []);

  if (loading) return <div className="p-6">加载中...</div>;
  if (!data) return <div className="p-6">暂无数据</div>;

  return (
    <div className="p-6 space-y-6">
      {/* Alerts */}
      <div className="bg-red-50 border border-red-200 rounded">
        <div className="p-4 font-semibold">紧急/异常</div>
        <ul className="px-6 pb-4 list-disc space-y-1 text-sm text-red-800">
          {(data.alerts || []).length ? data.alerts.map((a: any, idx: number) => (
            <li key={idx}>{a.message}</li>
          )) : <li>暂无异常</li>}
        </ul>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="助教未读消息积压 Top">
          <TopList list={data.unreadByAssistant || []} empty="暂无未读积压" />
          <div className="mt-3 text-right text-xs text-muted-foreground">建议：工单提醒/均衡分配</div>
        </Card>
        <Card title="待批改三联表积压 Top">
          <TopList list={data.pendingByAssistant || []} empty="暂无待批改积压" />
          <div className="mt-3 text-right text-xs text-muted-foreground">建议：优先安排批改/处理培训</div>
        </Card>
      </div>

      <Card title="模板覆盖缺口（按班级）">
        <div className="space-y-2 text-sm">
          {Object.entries(data.coverageDetails || {}).map(([cid, detail]: any) => {
            const ratio = data.coverageByClass?.[cid] || 0;
            if (ratio >= 1) return null;
            return (
              <div key={cid} className="flex items-center justify-between">
                <span>{detail.className}</span>
                <span className="text-muted-foreground">已覆盖 {detail.templatesCovered}/{detail.templatesTotal}</span>
              </div>
            );
          })}
          {!Object.values(data.coverageByClass || {}).some((r: any)=>r<1) && (
            <div className="text-muted-foreground">暂无覆盖缺口</div>
          )}
        </div>
        <div className="mt-4 flex justify-end gap-2 text-sm">
          <Link href="/dashboard/admin/overview" className="underline">查看概览</Link>
        </div>
      </Card>
    </div>
  );
}

function Card({ title, children }: { title: string; children: any }) {
  return (
    <div className="bg-card rounded border border-border">
      <div className="p-4 border-b border-border font-semibold">{title}</div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function TopList({ list, empty }: { list: { assistantId: string; assistantName: string; count: number }[]; empty: string }) {
  if (!list.length) return <div className="text-sm text-muted-foreground">{empty}</div>;
  return (
    <div className="space-y-2 text-sm">
      {list.slice(0,5).map(item => (
        <div key={item.assistantId} className="flex items-center justify-between">
          <span className="truncate mr-2">{item.assistantName}</span>
          <span className="font-semibold">{item.count}</span>
        </div>
      ))}
    </div>
  );
}
