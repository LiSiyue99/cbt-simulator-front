"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth";
import { ensurePlayground, listPlaygroundInstances, PlaygroundInstance } from "@/services/api/playground";

/**
 * usePlayground
 * 管理助教体验（Playground）的授权判定、实例确保与加载、当前选择状态。
 * - 仅当用户为技术助教或“非学生身份的行政助教”时允许；
 * - 自动调用 ensurePlayground 并加载 10 个实例；
 * - 暴露实例列表与选中实例 ID。
 */
export function usePlayground() {
  const { state } = useAuth();
  const [instances, setInstances] = useState<PlaygroundInstance[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 授权：技术助教，或拥有 assistant_class 角色且主身份不是学生，或 admin
  const allowed = useMemo(() => {
    const role = state.me?.role;
    const roles = (state.me as any)?.roles || (role ? [role] : []);
    if (role === 'assistant_tech') return true;
    if (roles.includes('assistant_class') && role !== 'student') return true;
    if (role === 'admin' || roles.includes('admin')) return true;
    return false;
  }, [state.me]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!state.token || !allowed) return;
      setLoading(true);
      setError(null);
      try {
        await ensurePlayground();
        const res = await listPlaygroundInstances();
        const items = (res.items || []).sort((a, b) => Number(a.templateKey) - Number(b.templateKey));
        if (cancelled) return;
        setInstances(items);
        if (!selectedId && items.length) setSelectedId(items[0].instanceId);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || '加载失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [state.token, allowed]);

  return { allowed, instances, selectedId, setSelectedId, loading, error } as const;
}


