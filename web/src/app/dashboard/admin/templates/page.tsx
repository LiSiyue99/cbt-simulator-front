"use client";

import { useEffect, useState } from "react";
import { getAdminTemplates, updateAdminTemplate } from "@/services/api/assistant";

export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<{ templateKey: string; name: string; brief: string; corePersona: any; updatedAt: string }[]>([]);
  const [current, setCurrent] = useState<{ templateKey: string; name: string; brief: string; corePersona: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await getAdminTemplates();
        setTemplates(res.items || []);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSave() {
    if (!current) return;
    setSaving(true);
    try {
      await updateAdminTemplate(current.templateKey, {
        name: current.name,
        brief: current.brief,
        corePersona: current.corePersona,
      });
      const res = await getAdminTemplates();
      setTemplates(res.items || []);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-6">加载中...</div>;

  return (
    <div className="p-6">
      <div className="bg-card rounded border border-border">
        <div className="p-4 border-b border-border font-semibold">模板管理（Admin）</div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-1 space-y-2 overflow-y-auto max-h-[70vh] pr-2">
            {templates.map(t => (
              <div key={t.templateKey} className={`p-3 rounded border cursor-pointer ${current?.templateKey===t.templateKey ? 'bg-primary/10 border-primary/30' : 'hover:bg-background'}`}
                   onClick={()=>setCurrent({ templateKey: t.templateKey, name: t.name, brief: t.brief, corePersona: t.corePersona })}>
                <div className="text-sm font-medium">{t.name}（{t.templateKey}）</div>
                <div className="text-xs text-muted-foreground">更新于 {new Date(t.updatedAt).toLocaleString('zh-CN')}</div>
              </div>
            ))}
          </div>
          <div className="md:col-span-2 space-y-3">
            {current ? (
              <>
                <input
                  value={current.name}
                  onChange={e=>setCurrent({...current, name: e.target.value})}
                  className="w-full border border-border rounded px-3 py-2 text-sm"
                  placeholder="名称"
                />
                <textarea
                  value={current.brief}
                  onChange={e=>setCurrent({...current, brief: e.target.value})}
                  className="w-full border border-border rounded px-3 py-2 text-sm"
                  rows={3}
                  placeholder="简介"
                />
                <textarea
                  value={typeof current.corePersona === 'string' ? current.corePersona : JSON.stringify(current.corePersona, null, 2)}
                  onChange={e=>setCurrent({...current, corePersona: e.target.value})}
                  className="w-full border border-border rounded px-3 py-2 text-sm font-mono"
                  rows={16}
                  placeholder="核心人设（可粘贴纯文本或JSON）"
                />
                <div className="flex justify-end items-center gap-2">
                  <button onClick={()=>setCurrent(null)} className="px-4 py-2 border border-border rounded">取消</button>
                  <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-primary text-primary-foreground rounded disabled:opacity-60">{saving ? '保存中...' : '保存'}</button>
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">请选择左侧模板进行编辑</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
