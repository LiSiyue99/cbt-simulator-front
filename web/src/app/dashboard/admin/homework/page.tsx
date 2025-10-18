"use client";

import { useEffect, useState } from "react";
import { httpGet, httpPost, httpPut, httpDelete } from "@/services/http";

type Field = { key: string; label: string; type: string; placeholder?: string; helpText?: string };

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
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


