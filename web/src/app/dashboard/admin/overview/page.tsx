"use client";

import { useEffect, useState } from "react";
import { getAdminOverview } from "@/services/api/assistant";

export default function AdminOverviewPage() {
  const [data, setData] = useState<null | {
    weekStart: string;
    weekEnd: string;
    sessionsThisWeek: number;
    trSubmitRate: number;
    taFeedbackRate: number;
    coverageByClass: Record<string, number>;
    coverageMatrix?: Record<string, Record<string, number>>;
    coverageDetails?: Record<string, { classId: number; className: string; templatesTotal: number; templatesCovered: number }>;
    unreadByAssistant?: { assistantId: string; assistantName: string; count: number }[];
    pendingByAssistant?: { assistantId: string; assistantName: string; count: number }[];
    assistantTemplateWorkload?: { assistantId: string; assistantName: string; total: number; items: { templateKey: string; count: number }[] }[];
    alerts: { type: string; message: string }[];
  }>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await getAdminOverview();
        setData(res as any);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="p-6">加载中...</div>;
  if (!data) return <div className="p-6">暂无数据</div>;

  return (
    <div className="p-6 space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi title="本周会话数" value={String(data.sessionsThisWeek)} icon={<span>💬</span>} subtitle="sessions" />
        <Kpi title="作业提交率" value={`${Math.round(data.trSubmitRate * 100)}%`} icon={<span>✅</span>} subtitle="Homework 提交率" />
        <Kpi title="助教反馈达标率" value={`${Math.round(data.taFeedbackRate * 100)}%`} icon={<span>🧑‍🏫</span>} subtitle="Feedback rate" />
        <Kpi title="模板覆盖达标班级" value={`${Object.values(data.coverageByClass).filter(v=>v>=1).length}/${Object.keys(data.coverageByClass).length}`} icon={<span>📊</span>} subtitle="Coverage classes" />
      </div>

      {/* 摘要：未读与待批改Top */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="助教未读消息积压 Top">
          <TopList list={data.unreadByAssistant || []} empty="暂无未读积压" />
        </Card>
        <Card title="待批改作业积压 Top">
          <TopList list={data.pendingByAssistant || []} empty="暂无待批改积压" />
        </Card>
      </div>

      {/* 覆盖度矩阵 */}
      <div className="bg-card rounded border border-border">
        <div className="p-4 border-b border-border font-semibold">各班模板覆盖度</div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(data.coverageByClass).map(([cid, ratio]) => {
            const detail = data.coverageDetails?.[cid];
            const total = detail?.templatesTotal || 10;
            const covered = detail?.templatesCovered ?? Math.round(ratio*total);
            return (
              <div key={cid} className="p-4 border rounded">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm text-muted-foreground">{detail?.className || `班级 ${cid}`}</div>
                  <div className="text-sm text-muted-foreground">{covered}/{total}</div>
                </div>
                <div className="text-xl font-bold mb-2">{Math.round(ratio*100)}%</div>
                <Bar percent={ratio} />
                {data.coverageMatrix?.[cid] && (
                  <div className="mt-3 text-xs text-muted-foreground grid grid-cols-2 gap-y-1 gap-x-4">
                    {Object.entries(data.coverageMatrix[cid]).sort(([a],[b])=>Number(a)-Number(b)).map(([tpl,count])=> (
                      <div key={tpl} className="flex justify-between">
                        <span className="truncate">模板 {tpl}</span>
                        <span>{count} 人</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 助教模板承担情况 */}
      <div className="bg-card rounded border border-border">
        <div className="p-4 border-b border-border font-semibold">助教模板承担（人数）</div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
          {(data.assistantTemplateWorkload||[]).map((a)=> {
            const max = Math.max(1, ...a.items.map(it=>it.count));
            return (
              <div key={a.assistantId} className="p-4 border rounded">
                <div className="font-semibold mb-3 flex items-center justify-between">
                  <span className="truncate mr-2">{a.assistantName}</span>
                  <span className="text-muted-foreground">合计 {a.total} 人</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {a.items.map((it, idx) => {
                    const colors = badgeColors(idx);
                    const t = String(it.templateKey).replace('tmpl-','');
                    return (
                      <span key={`${a.assistantId}-${it.templateKey}`} className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}>
                        <span className="text-xs font-medium">模板 {t}</span>
                        <span className="text-sm font-semibold">{it.count} 人</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Alerts */}
      {data.alerts && data.alerts.length>0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded">
          <div className="p-4 font-semibold">异常提示</div>
          <ul className="px-6 pb-4 list-disc space-y-1 text-sm text-yellow-800">
            {data.alerts.map((a, idx) => (
              <li key={idx}>{a.message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Kpi({ title, value, icon, subtitle }: { title: string; value: string; icon?: React.ReactNode; subtitle?: string }) {
  return (
    <div className="rounded-xl border border-border bg-white overflow-hidden">
      <div className="p-4 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, hsl(var(--primary) / 0.10) 0%, hsl(var(--primary) / 0.02) 100%)' }}>
        <div>
          <div className="text-xs text-muted-foreground">{title}</div>
          <div className="text-3xl font-extrabold leading-tight">{value}</div>
          {subtitle ? <div className="text-xs text-muted-foreground mt-1">{subtitle}</div> : null}
        </div>
        {icon ? <div className="text-2xl opacity-70">{icon}</div> : null}
      </div>
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
      {list.slice(0,5).map((item, idx) => (
        <div key={item.assistantId} className="flex items-center gap-3">
          <span className="w-5 text-right text-muted-foreground">{idx+1}</span>
          <span className="truncate flex-1">{item.assistantName}</span>
          <div className="flex-1">
            <Bar percent={Math.min(item.count/ (list[0]?.count || 1), 1)} colorClass="bg-emerald-600" height="h-2" />
          </div>
          <span className="w-10 text-right font-semibold">{item.count}</span>
        </div>
      ))}
    </div>
  );
}

function Bar({ percent, colorClass = 'bg-primary', height = 'h-2' }: { percent: number; colorClass?: string; height?: string }) {
  const w = `${Math.max(0, Math.min(1, percent)) * 100}%`;
  return (
    <div className={`w-full ${height} bg-muted rounded`}>
      <div className={`${height} ${colorClass} rounded`} style={{ width: w }} />
    </div>
  );
}

function badgeColors(idx: number) {
  const palette = [
    { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
    { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
    { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
    { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  ];
  return palette[idx % palette.length];
}
