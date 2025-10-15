"use client";

import { useEffect, useState } from "react";
import { httpGet, httpPost } from "@/services/http";
import { httpGet as apiGet } from "@/services/http";

function SectionCard({ title, subtitle, icon, children }: { title: string; subtitle?: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="relative rounded-xl border bg-white shadow-sm overflow-hidden">
      <div className="absolute left-0 top-0 h-full w-1.5" style={{ background: 'hsl(var(--primary))' }} />
      <div className="flex items-center gap-3 border-b px-4 py-3">
        {icon ? <div className="h-8 w-8 rounded-md flex items-center justify-center" style={{ background: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))' }}>{icon}</div> : null}
        <div>
          <h3 className="text-base font-semibold">{title}</h3>
          {subtitle ? <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p> : null}
        </div>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export default function AdminPolicyPage() {
  const [kv, setKv] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [ovItems, setOvItems] = useState<any[]>([]);
  const [form, setForm] = useState({ subjectType: 'student', subjectEmail: '', overrideDate: '', weekKey: '', action: 'extend_student_tr', until: '', reason: '' });
  const [sessEmail, setSessEmail] = useState('');
  const [templateKeyFilter, setTemplateKeyFilter] = useState('');
  const [sessList, setSessList] = useState<any[]>([]);
  const [sessOverrides, setSessOverrides] = useState<any[]>([]);
  const [sessUntilMap, setSessUntilMap] = useState<Record<string, string>>({});
  const [fbUntilMap, setFbUntilMap] = useState<Record<string, string>>({});
  const [batch, setBatch] = useState<{ scope: string; emails: string; overrideDate: string; action: string; until: string; reason: string }>({ scope: 'allStudents', emails: '', overrideDate: '', action: 'extend_student_tr', until: '', reason: '' });
  const [recentSessionOv, setRecentSessionOv] = useState<any[]>([]);
  const [recentBatchAgg, setRecentBatchAgg] = useState<{ batches: any[]; singles: any[] }>({ batches: [], singles: [] });
  const [showRecentModal, setShowRecentModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const a = await httpGet<{ items: any }>('/admin/policy/time-window');
        setKv((a as any).items || {});
        const b = await httpGet<{ items: any[] }>('/admin/policy/ddl-override');
        setOvItems((b as any).items || []);
        const c = await httpGet<{ items: any[] }>('/admin/policy/session-override/recent');
        setRecentSessionOv((c as any).items || []);
        const d = await httpGet<{ batches: any[]; singles: any[] }>('/admin/policy/ddl-override/recent');
        setRecentBatchAgg({ batches: (d as any).batches || [], singles: (d as any).singles || [] });
      } finally { setLoading(false); }
    }
    load();
  }, []);

  async function saveKv() {
    try {
      await httpPost('/admin/policy/time-window', kv);
      setToast({ message: '时间窗已保存', type: 'success' });
    } catch (e) {
      setToast({ message: '保存失败，请重试', type: 'error' });
    }
  }

  async function createOverride() {
    try {
      await httpPost('/admin/policy/ddl-override', form);
      const b = await httpGet<{ items: any[] }>('/admin/policy/ddl-override');
      setOvItems((b as any).items || []);
      setToast({ message: '已创建解锁', type: 'success' });
    } catch (e) {
      setToast({ message: '创建失败，请检查输入', type: 'error' });
    }
  }

  if (loading) return <div className="p-6">加载中...</div>;

  return (
    <div className="p-6 space-y-6">
      <SectionCard title="时间窗设置" subtitle="配置学生/助教每周窗口期（学生：周二00:00开放；周五24:00截止；助教反馈：周日24:00截止）。可在此修改开启weekday。" icon={<span className="text-sm">🗓️</span>}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="text-sm">学生窗口开启（weekday, 默认2=周二 00:00）
            <input className="block w-full border rounded p-2 mt-1" value={kv.student_open_weekday||''} onChange={e=>setKv({ ...kv, student_open_weekday: e.target.value })} placeholder="2" />
          </label>
          <label className="text-sm">学生作业截止（weekday, 默认5=周五 24:00）
            <input className="block w-full border rounded p-2 mt-1" value={kv.student_deadline_weekday||''} onChange={e=>setKv({ ...kv, student_deadline_weekday: e.target.value })} placeholder="5" />
          </label>
          <label className="text-sm">助教反馈截止（weekday, 默认7=周日 24:00）
            <input className="block w-full border rounded p-2 mt-1" value={kv.assistant_deadline_weekday||''} onChange={e=>setKv({ ...kv, assistant_deadline_weekday: e.target.value })} placeholder="7" />
          </label>
        </div>
        <div className="mt-4 text-right">
          <button onClick={saveKv} className="px-3 py-2 rounded bg-primary text-primary-foreground hover:opacity-90">保存</button>
        </div>
      </SectionCard>

      <SectionCard title="DDL 临时解锁（按周）" subtitle="按周为某人放宽 DDL（将同时放开“开始对话+作业提交”）" icon={<span className="text-sm">⏳</span>}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="text-sm">对象类型
            <select className="block w-full border rounded p-2 mt-1" value={form.subjectType} onChange={e=>setForm({ ...form, subjectType: e.target.value })}>
              <option value="student">学生</option>
              <option value="assistant">助教</option>
            </select>
          </label>
          <label className="text-sm">对象邮箱
            <input className="block w-full border rounded p-2 mt-1" value={form.subjectEmail} onChange={e=>setForm({ ...form, subjectEmail: e.target.value })} placeholder="user@example.com" />
          </label>
          <label className="text-sm">选择日期（自动换算周）
            <input type="date" className="block w-full border rounded p-2 mt-1" value={form.overrideDate} onChange={e=>{
              const d = e.target.value;
              let until = form.until;
              if (!until && d) {
                const dt = new Date(d + 'T00:00:00');
                dt.setDate(dt.getDate() + 1);
                until = dt.toISOString().slice(0,16);
              }
              setForm({ ...form, overrideDate: d, until });
            }} />
          </label>
          <label className="text-sm">动作
            <select className="block w-full border rounded p-2 mt-1" value={form.action} onChange={e=>setForm({ ...form, action: e.target.value })}>
              <option value="extend_student_tr">放宽学生作业（含对话）</option>
              <option value="extend_assistant_feedback">放宽助教反馈</option>
            </select>
          </label>
          <label className="text-sm">允许到（绝对时间）
            <input type="datetime-local" className="block w-full border rounded p-2 mt-1" value={form.until} onChange={e=>setForm({ ...form, until: e.target.value })} />
          </label>
          <label className="text-sm">原因
            <input className="block w-full border rounded p-2 mt-1" value={form.reason} onChange={e=>setForm({ ...form, reason: e.target.value })} placeholder="可选" />
          </label>
        </div>
        <div className="mt-4 text-right">
          <button onClick={createOverride} className="px-3 py-2 rounded bg-primary text-primary-foreground hover:opacity-90">创建解锁</button>
        </div>
      </SectionCard>

      <SectionCard title="按会话解锁（回合制）" subtitle="为某学生某次会话放宽 DDL" icon={<span className="text-sm">💬</span>}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <label className="text-sm">学生邮箱
            <input className="block w-full border rounded p-2 mt-1" value={sessEmail} onChange={e=>setSessEmail(e.target.value)} placeholder="student@example.com" />
          </label>
          <label className="text-sm">模板键（可选）
            <input className="block w-full border rounded p-2 mt-1" value={templateKeyFilter} onChange={e=>setTemplateKeyFilter(e.target.value)} placeholder="tmpl-1..tmpl-10" />
          </label>
          <div className="flex items-end">
            <button className="px-3 py-2 rounded bg-secondary text-secondary-foreground hover:opacity-90" onClick={async()=>{
              if (!sessEmail) return alert('请输入邮箱');
              const r = await apiGet<any>('/admin/policy/session-override', { query: { studentEmail: sessEmail, templateKey: templateKeyFilter || undefined } });
              setSessList(r.sessions||[]);
              setSessOverrides(r.overrides||[]);
            }}>查询会话</button>
          </div>
        </div>
        {sessList.length>0 && (
          <div className="mt-4 space-y-3">
            {sessList.map((s:any)=> (
              <div key={s.id} className="p-3 border rounded flex items-center gap-3">
                <div className="text-sm">第{s.sessionNumber}次 • {new Date(s.createdAt).toLocaleString('zh-CN')}</div>
                <div className="ml-auto grid grid-cols-1 md:grid-cols-2 gap-2 items-center">
                  <div className="flex items-center gap-2">
                    <input type="datetime-local" className="border rounded p-1" value={sessUntilMap[s.id]||''} onChange={e=> setSessUntilMap((m)=>({ ...m, [s.id]: e.target.value })) } />
                    <button className="px-2 py-1 border rounded hover:bg-accent" onClick={async()=>{
                      const v = sessUntilMap[s.id];
                      if (!v) return alert('请选择时间');
                      await httpPost('/admin/policy/session-override', { sessionId: s.id, action: 'extend_student_tr', until: v });
                      const r = await apiGet<any>('/admin/policy/session-override', { query: { studentEmail: sessEmail, templateKey: templateKeyFilter || undefined } });
                      setSessOverrides(r.overrides||[]);
                      setToast({ message: '已设置作业DDL', type: 'success' });
                    }}>设置三联表DDL</button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="datetime-local" className="border rounded p-1" value={fbUntilMap[s.id]||''} onChange={e=> setFbUntilMap((m)=>({ ...m, [s.id]: e.target.value })) } />
                    <button className="px-2 py-1 border rounded hover:bg-accent" onClick={async()=>{
                      const v = fbUntilMap[s.id];
                      if (!v) return alert('请选择时间');
                      await httpPost('/admin/policy/session-override', { sessionId: s.id, action: 'extend_assistant_feedback', until: v });
                      const r = await apiGet<any>('/admin/policy/session-override', { query: { studentEmail: sessEmail, templateKey: templateKeyFilter || undefined } });
                      setSessOverrides(r.overrides||[]);
                      setToast({ message: '已设置助教反馈DDL', type: 'success' });
                    }}>设置助教反馈DDL</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="批量解锁（大规模事件应急）" subtitle="按范围批量放宽 DDL（extend_student_tr 同时放开对话+作业提交）" icon={<span className="text-sm">🚀</span>}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <label className="text-sm">作用域
            <select className="block w-full border rounded p-2 mt-1" value={batch.scope} onChange={e=>setBatch({ ...batch, scope: e.target.value })}>
              <option value="allStudents">所有学生</option>
              <option value="allAssistantTechs">所有技术助教</option>
              <option value="class:1">班级1学生</option>
              <option value="class:2">班级2学生</option>
              <option value="class:3">班级3学生</option>
              <option value="emails">指定邮箱列表</option>
            </select>
          </label>
          {batch.scope==='emails' && (
            <label className="text-sm">邮箱列表（逗号分隔）
              <input className="block w-full border rounded p-2 mt-1" placeholder="a@x.com,b@y.com" value={batch.emails} onChange={e=>setBatch({ ...batch, emails: e.target.value })} />
            </label>
          )}
          <label className="text-sm">选择日期（自动换算周）
            <input type="date" className="block w-full border rounded p-2 mt-1" value={batch.overrideDate} onChange={e=>{
              const d = e.target.value;
              let until = batch.until;
              if (!until && d) {
                const dt = new Date(d + 'T00:00:00');
                dt.setDate(dt.getDate() + 1);
                until = dt.toISOString().slice(0,16);
              }
              setBatch({ ...batch, overrideDate: d, until });
            }} />
          </label>
          <label className="text-sm">动作
            <select className="block w-full border rounded p-2 mt-1" value={batch.action} onChange={e=>setBatch({ ...batch, action: e.target.value })}>
              <option value="extend_student_tr">放宽学生作业（含对话权限）</option>
              <option value="extend_assistant_feedback">放宽助教反馈</option>
            </select>
          </label>
          <label className="text-sm">允许到（绝对时间）
            <input type="datetime-local" className="block w-full border rounded p-2 mt-1" value={batch.until} onChange={e=>setBatch({ ...batch, until: e.target.value })} />
          </label>
          <label className="text-sm">原因
            <input className="block w-full border rounded p-2 mt-1" value={batch.reason} onChange={e=>setBatch({ ...batch, reason: e.target.value })} placeholder="可选" />
          </label>
        </div>
        <div className="mt-4 text-right">
          <button className="px-3 py-2 rounded bg-primary text-primary-foreground hover:opacity-90" onClick={async()=>{
            const payload: any = { scope: batch.scope, overrideDate: batch.overrideDate, action: batch.action, until: batch.until, reason: batch.reason };
            if (batch.scope==='emails') payload.emails = batch.emails.split(',').map(s=>s.trim()).filter(Boolean);
            await httpPost('/admin/policy/ddl-override/batch', payload);
            setToast({ message: '批量解锁已创建', type: 'success' });
          }}>创建批量解锁</button>
        </div>
      </SectionCard>

      {/* 全局唯一：查看最近解锁记录（悬浮按钮） - 居中下方 */}
      <button
        onClick={()=>setShowRecentModal(true)}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full font-extrabold shadow-xl border"
        style={{ background: '#0b5a2a', color: '#000', borderColor: 'rgba(0,0,0,0.4)', boxShadow: '0 12px 24px rgba(0,0,0,0.25)' }}
      >
        查看最近解锁记录
      </button>

      {showRecentModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={()=>setShowRecentModal(false)}>
          <div className="bg-white w-full max-w-3xl max-h-[80vh] overflow-y-auto rounded-xl shadow-lg" onClick={(e)=>e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-semibold">最近解锁记录</h3>
              <button className="px-2 py-1 border rounded" onClick={()=>setShowRecentModal(false)}>关闭</button>
            </div>
            <div className="p-4 space-y-3 text-sm">
              <h4 className="font-semibold">批量/周级（聚合）</h4>
              {recentBatchAgg.batches.map((b:any)=> (
                <div key={b.batchId} className="p-2 border rounded">
                  <div>{b.scope==='allStudents'?'所有学生':(b.scope?.startsWith('class:')?`班级${b.scope.split(':')[1]}学生`:b.scope)} • {b.action} • {b.weekKey} • until: {new Date(b.until).toLocaleString('zh-CN')} • 共{b.count}人</div>
                  <div className="text-muted-foreground">{new Date(b.createdAt).toLocaleString('zh-CN')} {b.reason?`• ${b.reason}`:''}</div>
                </div>
              ))}
              <h4 className="font-semibold mt-4">单个学生（最近）</h4>
              {recentBatchAgg.singles.map((it:any)=> {
                const k = `${it.subjectEmail || it.subjectName || 'unknown'}-${it.action}-${it.createdAt}`;
                return (
                  <div key={k} className="p-2 border rounded">
                    <div>{it.subjectName||''}{it.subjectEmail?` • ${it.subjectEmail}`:''} • {it.action} • {it.weekKey} • until: {new Date(it.until).toLocaleString('zh-CN')}</div>
                    <div className="text-muted-foreground">{new Date(it.createdAt).toLocaleString('zh-CN')} • {it.reason||''}</div>
                  </div>
                );
              })}
              <h4 className="font-semibold mt-4">会话级（最近）</h4>
              {recentSessionOv.map((o:any)=> (
                <div key={o.id} className="p-2 border rounded">
                  <div>{o.userName||o.userEmail} • 第{o.sessionNumber}次 • {o.action} • until: {new Date(o.until).toLocaleString('zh-CN')}</div>
                  <div className="text-muted-foreground">{new Date(o.createdAt).toLocaleString('zh-CN')}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50">
          <div className={`px-4 py-2 rounded shadow-md ${toast.type==='error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>{toast.message}</div>
        </div>
      )}
    </div>
  );
}
