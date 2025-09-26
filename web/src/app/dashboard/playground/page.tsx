"use client";

import { useEffect } from "react";
import { usePlayground } from "@/hooks/usePlayground";
import ConversationPage from "../conversation/page";

export default function PlaygroundPage() {
  const { allowed, instances, selectedId, setSelectedId } = usePlayground();
  // 清理残留的 window 全局标记，避免旧逻辑干扰
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__PLAYGROUND_VISITOR_INSTANCE_ID__ = null;
    }
  }, []);

  if (!allowed) return (
    <div className="min-h-screen flex items-center justify-center text-muted-foreground">
      无权限
    </div>
  );

  return (
    <div className="flex h-screen bg-gradient-to-br from-background to-primary/5">
      {/* 左侧模板选择器 */}
      <div className="w-72 bg-card/80 border-r border-border p-4 space-y-2 overflow-auto">
        <h2 className="text-sm font-semibold text-muted-foreground mb-2">AI访客体验 · 模板</h2>
        {instances.map((it) => (
          <button
            key={it.instanceId}
            onClick={() => {
              setSelectedId(it.instanceId);
            }}
            className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedId === it.instanceId ? 'bg-primary/10 border-primary/20' : 'bg-background/50 border-border hover:bg-background'}`}
          >
            <div className="text-sm font-medium text-foreground">{it.name || `模板 ${it.templateKey}`}</div>
            <div className="text-xs text-muted-foreground">templateKey: {it.templateKey}</div>
          </button>
        ))}
      </div>

      <div className="flex-1">
        <ConversationPage playgroundInstanceId={selectedId || null} />
      </div>
    </div>
  );
}
