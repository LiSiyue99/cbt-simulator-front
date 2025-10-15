"use client";

import { useEffect, useState } from "react";
import { httpGet, httpPost, httpPut } from "@/services/http";

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
      // 显示全部已发布作业，便于一次性查看
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

      <div className="bg-card rounded border border-border p-4 space-y-4">
        {/* 基础设置 */}
        <div className="text-base font-semibold">基础设置</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="text-sm space-y-2 md:col-span-2">
            <span className="block text-muted-foreground">班级ID（可多选，发包时为每个班级各创建一份）</span>
            <div className="space-y-2">
              {form.classIds.map((cid, idx)=> (
                <div key={idx} className="flex gap-2 items-center">
                  <input className="border rounded px-3 py-2 flex-1" value={cid} onChange={e=>{
                    const a=[...form.classIds]; a[idx]=e.target.value; setForm({...form,classIds:a});
                  }} placeholder={`例如：${idx+1}`} />
                  <button className="text-red-600 text-sm" onClick={()=>{ const a=[...form.classIds]; a.splice(idx,1); if(a.length===0) a.push(""); setForm({...form,classIds:a}); }}>移除</button>
                </div>
              ))}
              <button className="text-sm underline" onClick={()=> setForm({...form,classIds:[...form.classIds,""]})}>+ 增加班级</button>
            </div>
          </div>
          <label className="text-sm space-y-1">
            <span className="text-muted-foreground">第N次作业（= 第N次会话）</span>
            <input className="border rounded px-3 py-2 w-full" value={form.sequenceNumber} onChange={e=>setForm({...form,sequenceNumber:e.target.value})} placeholder="例如：1" />
          </label>
        </div>

        {/* 窗口设置 */}
        <div className="text-base font-semibold mt-2">窗口设置</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="text-sm space-y-1">
            <span className="text-muted-foreground">学生窗口开始（studentStartAt）</span>
            <input className="border rounded px-3 py-2 w-full" value={form.studentStartAt} onChange={e=>setForm({...form,studentStartAt:e.target.value})} type="datetime-local" />
          </label>
          <label className="text-sm space-y-1">
            <span className="text-muted-foreground">学生窗口截止（studentDeadline）</span>
            <input className="border rounded px-3 py-2 w-full" value={form.studentDeadline} onChange={e=>setForm({...form,studentDeadline:e.target.value})} type="datetime-local" />
          </label>
          <label className="text-sm space-y-1">
            <span className="text-muted-foreground">助教窗口开始（assistantStartAt）</span>
            <input className="border rounded px-3 py-2 w-full" value={form.assistantStartAt} onChange={e=>setForm({...form,assistantStartAt:e.target.value})} type="datetime-local" />
          </label>
          <label className="text-sm space-y-1">
            <span className="text-muted-foreground">助教窗口截止（assistantDeadline）</span>
            <input className="border rounded px-3 py-2 w-full" value={form.assistantDeadline} onChange={e=>setForm({...form,assistantDeadline:e.target.value})} type="datetime-local" />
          </label>
        </div>

        {/* 字段定义 */}
        <div>
          <div className="text-base font-semibold mb-2">字段定义（全部必填）</div>
          <div className="space-y-2">
            {form.fields.map((f, idx)=> (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-start">
                <input className="border rounded px-2 py-1" value={f.key} onChange={e=>{
                  const a=[...form.fields]; a[idx]={...a[idx],key:e.target.value}; setForm({...form,fields:a});
                }} placeholder="字段ID（例如：situation）" title="字段ID：仅作存储键，建议英文/下划线，学生端不可见" />
                <input className="border rounded px-2 py-1" value={f.label} onChange={e=>{
                  const a=[...form.fields]; a[idx]={...a[idx],label:e.target.value}; setForm({...form,fields:a});
                }} placeholder="学生端显示名（例如：情境）" title="学生端看到的标题，例如：情境/想法/后果" />
                <select className="border rounded px-2 py-1" value={f.type} onChange={e=>{
                  const a=[...form.fields]; a[idx]={...a[idx],type:e.target.value}; setForm({...form,fields:a});
                }}>
                  <option value="text">text</option>
                  <option value="textarea">textarea</option>
                  <option value="number">number</option>
                  <option value="date">date</option>
                  <option value="boolean">boolean</option>
                </select>
                <input className="border rounded px-2 py-1" value={f.placeholder||''} onChange={e=>{
                  const a=[...form.fields]; a[idx]={...a[idx],placeholder:e.target.value}; setForm({...form,fields:a});
                }} placeholder="占位提示（可选）" />
                <button
                  className="text-red-600 text-sm mt-1"
                  onClick={()=>{ const a=[...form.fields]; a.splice(idx,1); setForm({...form,fields:a}); }}
                >删除字段</button>
              </div>
            ))}
            <div className="text-xs text-muted-foreground">提示：学生端会按此顺序渲染字段。类型为 boolean 时展示“是/否”。</div>
            <button className="text-sm underline" onClick={()=> setForm({...form, fields: [...form.fields, { key:'', label:'', type:'text' }]})}>+ 增加字段</button>
          </div>
        </div>
        <div className="text-right">
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded" onClick={create}>发布第 {form.sequenceNumber} 次作业到 {form.classIds.length} 个班级</button>
        </div>
      </div>

      <div className="bg-card rounded border border-border p-4">
        <div className="font-semibold mb-3">已发布作业</div>
        {loading ? <div>加载中...</div> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th>班级</th><th>序号</th><th>窗口（学生）</th><th>窗口（助教）</th><th>字段数</th>
              </tr>
            </thead>
            <tbody>
              {(items||[]).map((it:any)=> (
                <tr key={it.id} className="border-t">
                  <td>{it.classId}</td>
                  <td>{it.sequenceNumber}</td>
                  <td>{new Date(it.studentStartAt).toLocaleString('zh-CN')} ~ {new Date(it.studentDeadline).toLocaleString('zh-CN')}</td>
                  <td>{new Date(it.assistantStartAt).toLocaleString('zh-CN')} ~ {new Date(it.assistantDeadline).toLocaleString('zh-CN')}</td>
                  <td>{Array.isArray(it.formFields)? it.formFields.length : 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}


