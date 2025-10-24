"use client";

import { useEffect, useState } from "react";
import { httpGet, httpPost, httpPut, httpDelete } from "@/services/http";

type Field = { key: string; label: string; type: string; placeholder?: string; helpText?: string };

// 轻量组件：为指定学生解锁（邮箱列表 + until）
function UnlockEmailsPanel({ setId, classId, onDone }: { setId: string; classId: number; onDone?: () => void }) {
  const [emails, setEmails] = useState<string[]>([""]);
  const [until, setUntil] = useState<string>(new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString().slice(0, 16));
  const [submitting, setSubmitting] = useState(false);
  const [candidates, setCandidates] = useState<Array<{name?: string; email?: string}>>([]);
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  useEffect(() => {
    // 管理员：按班级拉取学生列表
    (async () => {
      try {
        const res: any = await httpGet(`/admin/assignments/students?classId=${classId}` as any);
        const items = (res?.items || []).map((it: any) => ({ name: it.name, email: it.email }));
        setCandidates(items);
      } catch {
        setCandidates([]);
      }
    })();
  }, [classId]);

  function updateEmail(idx: number, v: string) {
    const a = [...emails];
    a[idx] = v;
    setEmails(a);
  }
  function addRow() {
    setEmails((a) => [...a, ""]);
  }
  function removeRow(idx: number) {
    setEmails((a) => {
      const b = [...a];
      b.splice(idx, 1);
      return b.length ? b : [""];
    });
  }

  async function submit() {
    const list = emails.map((e) => e.trim()).filter((e) => !!e);
    if (!list.length) {
      alert("请先输入至少一个学生邮箱");
      return;
    }
    if (!until) {
      alert("请填写解锁截止时间");
      return;
    }
    try {
      setSubmitting(true);
      const res: any = await httpPost(`/admin/homework/sets/${setId}/ddl-override/students/emails`, {
        emails: list,
        action: "extend_student_tr",
        until: new Date(until),
      });
      alert(`已解锁 ${Number(res?.affected || 0)} 人；未匹配邮箱 ${Number((res?.missingEmails || []).length)}`);
      onDone?.();
    } catch (e: any) {
      alert(e?.message || "解锁失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full border rounded bg-white/70 p-3 space-y-2">
      <div className="text-sm text-muted-foreground">按邮箱选择学生（逐项输入，点击“增加一行”添加更多）</div>
      <div className="space-y-2">
        {emails.map((em, idx) => {
          const q = (em || '').trim().toLowerCase();
          const list = !q ? [] : (candidates || []).filter(c =>
            (c.email || '').toLowerCase().startsWith(q) || (c.name || '').toLowerCase().startsWith(q)
          ).slice(0, 6);
          return (
            <div key={idx} className="relative flex gap-2 items-start">
              <div className="flex-1">
                <input
                  className="border rounded px-2 py-1 w-72 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  value={em}
                  onFocus={()=> setOpenIdx(idx)}
                  onBlur={()=> setTimeout(()=> setOpenIdx(v=> (v===idx? null : v)), 150)}
                  onChange={(e) => updateEmail(idx, e.target.value)}
                  placeholder="姓名或邮箱，如 张三 或 zhangsan@..."
                />
                {openIdx===idx && list.length>0 && (
                  <div className="absolute z-50 mt-1 w-72 max-h-48 overflow-auto rounded border bg-white shadow">
                    {list.map((c, i) => (
                      <button key={i} className="w-full text-left px-2 py-1 text-sm hover:bg-muted" onMouseDown={(e)=>{ e.preventDefault(); updateEmail(idx, c.email || c.name || ''); }}>
                        {(c.name || '')} {c.email ? ` <${c.email}>` : ''}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button className="px-2 py-1 text-sm border rounded" onClick={() => removeRow(idx)}>删除</button>
            </div>
          );
        })}
        <button className="text-sm underline text-primary" onClick={addRow}>+ 增加一行</button>
      </div>
      <div className="text-sm space-y-1">
        <span className="text-muted-foreground">解锁截止时间（until）</span>
        <div>
          <input className="border rounded px-2 py-1 w-72 focus:outline-none focus:ring-2 focus:ring-primary/40" type="datetime-local" value={until} onChange={(e) => setUntil(e.target.value)} />
        </div>
      </div>
      <div className="pt-1">
        <button className="px-3 py-1.5 bg-primary text-primary-foreground rounded disabled:opacity-60" disabled={submitting} onClick={submit}>{submitting ? "提交中..." : "提交解锁"}</button>
      </div>
    </div>
  );
}

function UnlockEmailsDialog({ setId, classId, onClose, onDone }: { setId: string; classId: number; onClose: () => void; onDone?: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg">
        <div className="rounded-xl shadow-xl ring-1 ring-black/5 bg-white">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="font-semibold">为指定学生解锁</div>
            <button className="text-sm px-2 py-1 border rounded" onClick={onClose}>关闭</button>
          </div>
          <div className="p-4">
            <UnlockEmailsPanel setId={setId} classId={classId} onDone={onDone} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminHomeworkPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<{ classIds: string[]; sequenceNumber: string; studentStartAt: string; studentDeadline: string; assistantStartAt: string; assistantDeadline: string; fields: Field[] }>({
    classIds: ["1"],
    sequenceNumber: "1",
    studentStartAt: new Date().toISOString().slice(0,16),
    studentDeadline: new Date(Date.now()+24*3600*1000).toISOString().slice(0,16),
    assistantStartAt: new Date().toISOString().slice(0,16),
    assistantDeadline: new Date(Date.now()+3*24*3600*1000).toISOString().slice(0,16),
    fields: [
      { key: "field1", label: "字段1", type: "text", placeholder: "请输入" },
      { key: "field2", label: "字段2", type: "textarea" },
    ],
  });
  const [unlockForSetId, setUnlockForSetId] = useState<string | null>(null);
  const [unlockForClassId, setUnlockForClassId] = useState<number | null>(null);
  const [recentForSet, setRecentForSet] = useState<{ id: string; items: any[] } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await httpGet<{ items: any[] }>("/admin/homework/sets");
      setItems(r.items || []);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function create() {
    const targets = (form.classIds || []).map((c)=>c.trim()).filter(Boolean);
    for (const cid of targets) {
      try {
        await httpPost("/admin/homework/sets", {
          classId: Number(cid),
          sequenceNumber: Number(form.sequenceNumber),
          formFields: form.fields,
          studentStartAt: new Date(form.studentStartAt),
          studentDeadline: new Date(form.studentDeadline),
          assistantStartAt: new Date(form.assistantStartAt),
          assistantDeadline: new Date(form.assistantDeadline),
          status: "published",
        });
      } catch (e: any) {
        const code = e?.code || e?.statusCode || '';
        const msg = (e?.message || '').toString();
        // 后端：invalid_sequence
        if (code === '400' || e?.status === 400) {
          if ((e?.data?.error || e?.message) === 'invalid_sequence' || msg.includes('invalid_sequence')) {
            // message: class {classId} expected next sequenceNumber = {expected}
            const m = /class (\d+) expected next sequenceNumber = (\d+)/.exec(e?.data?.message || msg || '');
            const classId = m?.[1];
            const expected = m?.[2];
            alert(`班级 ${classId || cid} 的下一次作业编号应为 ${expected || '(未知)'}。\n请将“第N次作业”填写为 ${expected || '正确的下一个序号'} 后再发布。`);
            return; // 中断后续班级循环
          }
        }
        // 其他错误走通用提示
        alert(e?.message || '发布失败');
        return;
      }
    }
    await load();
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">作业发布与管理</h1>

      {/* 说明区 */}
      <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-900">
        <div className="font-semibold mb-1">如何发包？</div>
        <ol className="list-decimal ml-5 space-y-1">
          <li>
            设定 <b>班级ID</b> 与 <b>第N次作业</b>（即“第N次会话”）。学生的第 N 次会话 = 本班第 N 次作业。
          </li>
          <li>
            设定 <b>学生DDL窗口</b>（开始/截止）与 <b>助教DDL窗口</b>（开始/截止）。只有在窗口内才能分别提交与批改。
          </li>
          <li>
            在“字段定义”处添加本次作业的 <b>表头</b>（全部必填，支持 text/textarea/number/date/boolean）。
          </li>
          <li>
            点击“发布作业”，即可为该班的第 N 次会话生成对应的作业要求。
          </li>
        </ol>
      </div>

      {/* 表单卡片化美化 */}
      <div className="rounded-xl ring-1 ring-primary/15 bg-white shadow-md p-5 space-y-6">
        {/* 基础设置 */}
        <div>
          <div className="text-base font-semibold mb-2 flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-primary" /> 基础设置
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="text-sm space-y-2 md:col-span-2">
              <span className="block text-muted-foreground">班级ID（可多选，发布时为每个班级各创建一份）</span>
              <div className="space-y-2">
                {form.classIds.map((cid, idx)=> (
                  <div key={idx} className="flex gap-2 items-center">
                    <input className="border rounded px-3 py-2 w-48 md:w-60 lg:w-72 shrink-0 focus:outline-none focus:ring-2 focus:ring-primary/40" value={cid} onChange={e=>{ const a=[...form.classIds]; a[idx]=e.target.value; setForm({...form,classIds:a}); }} placeholder={`例如：${idx+1}`} />
                    <button className="px-2 py-1 text-sm text-red-700 border border-red-300 rounded hover:bg-red-50 hover:border-red-400" onClick={()=>{ const a=[...form.classIds]; a.splice(idx,1); if(a.length===0) a.push(""); setForm({...form,classIds:a}); }}>移除</button>
                  </div>
                ))}
                <button className="text-sm underline text-primary" onClick={()=> setForm({...form,classIds:[...form.classIds,""]})}>+ 增加班级</button>
              </div>
            </div>
            <label className="text-sm space-y-1">
              <span className="text-muted-foreground">第N次作业（= 第N次会话）</span>
              <input className="border rounded px-3 py-2 w-full md:max-w-[240px] focus:outline-none focus:ring-2 focus:ring-primary/40" value={form.sequenceNumber} onChange={e=>setForm({...form,sequenceNumber:e.target.value})} placeholder="例如：1" />
              <span className="text-xs text-muted-foreground">提示：每个班级需从 1 开始依次递增（1,2,3…）。如提示“下一次应为 N+1”，请按提示修改。</span>
            </label>
          </div>
        </div>

        {/* 窗口设置 */}
        <div>
          <div className="text-base font-semibold mb-2 flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-primary" /> 窗口设置
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-sm space-y-1">
              <span className="text-muted-foreground">学生窗口开始（studentStartAt）</span>
              <input className="border rounded px-3 py-2 w-full md:max-w-[320px] focus:outline-none focus:ring-2 focus:ring-primary/40" value={form.studentStartAt} onChange={e=>setForm({...form,studentStartAt:e.target.value})} type="datetime-local" />
            </label>
            <label className="text-sm space-y-1">
              <span className="text-muted-foreground">学生窗口截止（studentDeadline）</span>
              <input className="border rounded px-3 py-2 w-full md:max-w-[320px] focus:outline-none focus:ring-2 focus:ring-primary/40" value={form.studentDeadline} onChange={e=>setForm({...form,studentDeadline:e.target.value})} type="datetime-local" />
            </label>
            <label className="text-sm space-y-1">
              <span className="text-muted-foreground">助教窗口开始（assistantStartAt）</span>
              <input className="border rounded px-3 py-2 w-full md:max-w-[320px] focus:outline-none focus:ring-2 focus:ring-primary/40" value={form.assistantStartAt} onChange={e=>setForm({...form,assistantStartAt:e.target.value})} type="datetime-local" />
            </label>
            <label className="text-sm space-y-1">
              <span className="text-muted-foreground">助教窗口截止（assistantDeadline）</span>
              <input className="border rounded px-3 py-2 w-full md:max-w-[320px] focus:outline-none focus:ring-2 focus:ring-primary/40" value={form.assistantDeadline} onChange={e=>setForm({...form,assistantDeadline:e.target.value})} type="datetime-local" />
            </label>
          </div>
        </div>

        {/* 字段定义 */}
        <div>
          <div className="text-base font-semibold mb-2 flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-primary" /> 字段定义（全部必填）
          </div>
          <div className="space-y-2">
            {form.fields.map((f, idx)=> (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-start">
                <input className="border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary/40" value={f.key} onChange={e=>{ const a=[...form.fields]; a[idx]={...a[idx],key:e.target.value}; setForm({...form,fields:a}); }} placeholder="字段ID（例如：situation）" />
                <input className="border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary/40" value={f.label} onChange={e=>{ const a=[...form.fields]; a[idx]={...a[idx],label:e.target.value}; setForm({...form,fields:a}); }} placeholder="学生端显示名（例如：情境）" />
                <select className="border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary/40" value={f.type} onChange={e=>{ const a=[...form.fields]; a[idx]={...a[idx],type:e.target.value}; setForm({...form,fields:a}); }}>
                  <option value="text">text</option>
                  <option value="textarea">textarea</option>
                  <option value="number">number</option>
                  <option value="date">date</option>
                  <option value="boolean">boolean</option>
                </select>
                <input className="border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary/40" value={f.placeholder||''} onChange={e=>{ const a=[...form.fields]; a[idx]={...a[idx],placeholder:e.target.value}; setForm({...form,fields:a}); }} placeholder="占位提示（可选）" />
                <button className="px-2 py-1 text-sm text-red-700 border border-red-300 rounded hover:bg-red-50 hover:border-red-400 mt-1" onClick={()=>{ const a=[...form.fields]; a.splice(idx,1); setForm({...form,fields:a}); }}>删除字段</button>
              </div>
            ))}
            <div className="text-xs text-muted-foreground">提示：学生端会按此顺序渲染；boolean 类型显示“是/否”。</div>
            <button className="text-sm underline text-primary" onClick={()=> setForm({...form, fields: [...form.fields, { key:'', label:'', type:'text' }]})}>+ 增加字段</button>
          </div>
        </div>
        <div className="text-right">
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded shadow hover:opacity-90" onClick={create}>发布第 {form.sequenceNumber} 次作业到 {form.classIds.length} 个班级</button>
        </div>
      </div>

      <div className="bg-card rounded border border-border p-4">
        <div className="font-semibold mb-3">已发布作业</div>
        {loading ? <div>加载中...</div> : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {(items||[]).map((it:any)=> (
              <div key={it.id} className="relative rounded-xl ring-1 ring-primary/15 bg-gradient-to-r from-primary/5 to-primary/10 shadow-lg overflow-hidden">
                {/* 左侧主色细条 */}
                <div className="absolute left-0 top-0 h-full w-1.5" style={{ background: 'hsl(var(--primary))' }} />
                <div className="p-4 space-y-3">
                  {/* 顶部信息行：徽章 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-primary/15 text-primary">班级 #{it.classId}</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-secondary/15 text-secondary-foreground">第 {it.sequenceNumber} 次</span>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-100 text-emerald-700">字段 {Array.isArray(it.formFields)? it.formFields.length : 0}</span>
                  </div>

                  {/* 学生窗口 */}
                  <div className="rounded-lg border bg-white/70 backdrop-blur-sm p-3">
                    <div className="text-xs text-muted-foreground mb-1">窗口（学生）</div>
                    <div className="text-sm font-medium text-foreground">
                      {new Date(it.studentStartAt).toLocaleString('zh-CN')} <span className="mx-1 text-muted-foreground">~</span> <span className="font-semibold text-primary">{new Date(it.studentDeadline).toLocaleString('zh-CN')}</span>
                    </div>
                  </div>

                  {/* 助教窗口 */}
                  <div className="rounded-lg border bg-white/70 backdrop-blur-sm p-3">
                    <div className="text-xs text-muted-foreground mb-1">窗口（助教）</div>
                    <div className="text-sm font-medium text-foreground">
                      {new Date(it.assistantStartAt).toLocaleString('zh-CN')} <span className="mx-1 text-muted-foreground">~</span> <span className="font-semibold text-primary">{new Date(it.assistantDeadline).toLocaleString('zh-CN')}</span>
                    </div>
                  </div>

                  {/* 操作按钮组 */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button className="px-2 py-1 border rounded" title="删除该作业包" onClick={async()=>{
                      if (!confirm('确定删除该作业包？')) return;
                      await httpDelete(`/admin/homework/sets/${it.id}` as any).catch(()=>{});
                      await load();
                    }}>删除</button>
                    <button className="px-2 py-1 border rounded" title="修改学生截止时间（立即生效）" onClick={async()=>{
                      const ns = prompt('学生截止时间(ISO，如 2025-10-20T16:00)', it.studentDeadline?.slice(0,16));
                      if (!ns) return;
                      await httpPut(`/admin/homework/sets/${it.id}`, { studentDeadline: new Date(ns) });
                      await load();
                    }}>修改学生截止时间</button>
                    <button className="px-2 py-1 border rounded" title="修改助教截止时间（立即生效）" onClick={async()=>{
                      const na = prompt('助教截止时间(ISO，如 2025-10-21T16:00)', it.assistantDeadline?.slice(0,16));
                      if (!na) return;
                      await httpPut(`/admin/homework/sets/${it.id}`, { assistantDeadline: new Date(na) });
                      await load();
                    }}>修改助教截止时间</button>
                    <button className="px-2 py-1 border rounded" title="为指定学生解锁（逐项输入邮箱）" onClick={()=>{
                      setUnlockForSetId(it.id);
                      setUnlockForClassId(Number(it.classId));
                    }}>为学生解锁</button>
                    <button className="px-2 py-1 border rounded" title="查看最近解锁记录" onClick={async()=>{
                      try {
                        const r: any = await httpGet(`/admin/homework/sets/${it.id}/ddl-override/recent` as any);
                        setRecentForSet({ id: it.id, items: r?.items || [] });
                      } catch (e:any) {
                        alert(e?.message || '读取失败');
                      }
                    }}>查看最近解锁记录</button>
                  </div>
                </div>
              </div>
            ))}
          {unlockForSetId && unlockForClassId!=null && (
            <UnlockEmailsDialog
              setId={unlockForSetId}
              classId={unlockForClassId}
              onClose={() => setUnlockForSetId(null)}
              onDone={() => { setUnlockForSetId(null); setUnlockForClassId(null); load(); }}
            />
          )}
          {recentForSet && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/40" onClick={()=> setRecentForSet(null)} />
              <div className="relative z-10 w-full max-w-2xl">
                <div className="rounded-xl shadow-xl ring-1 ring-black/5 bg-white">
                  <div className="flex items-center justify-between px-4 py-3 border-b">
                    <div className="font-semibold">最近解锁记录</div>
                    <button className="text-sm px-2 py-1 border rounded" onClick={()=> setRecentForSet(null)}>关闭</button>
                  </div>
                  <div className="p-4 max-h-[70vh] overflow-auto text-sm">
                    {(recentForSet.items||[]).length === 0 ? (
                      <div className="text-muted-foreground">暂无记录</div>
                    ) : (
                      <div className="space-y-2">
                        {(recentForSet.items||[]).map((row:any, idx:number)=> (
                          <div key={idx} className="border rounded p-2 bg-white/70">
                            <div className="flex flex-wrap gap-x-4 gap-y-1">
                              <div><span className="text-muted-foreground">对象</span>：{row.subjectEmail || row.subjectName || row.subjectType}</div>
                              <div><span className="text-muted-foreground">动作</span>：{row.action}</div>
                              <div><span className="text-muted-foreground">有效期</span>：{new Date(row.until).toLocaleString('zh-CN')}</div>
                              <div><span className="text-muted-foreground">创建时间</span>：{new Date(row.createdAt).toLocaleString('zh-CN')}</div>
                              <div className="truncate max-w-full"><span className="text-muted-foreground">作用域</span>：{row.scope}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>
        )}
      </div>
    </div>
  );
}


