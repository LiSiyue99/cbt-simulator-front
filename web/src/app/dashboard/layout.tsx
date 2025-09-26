"use client";

import { Sidebar } from "@/components/shared/sidebar";
import { useAuth } from "@/contexts/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { state } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!state.loading && !state.token) {
      router.push('/login');
    }
  }, [state.loading, state.token, router]);

  if (state.loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex items-center space-x-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-r-transparent"></div>
          <span className="text-sm text-muted-foreground">正在加载...</span>
        </div>
      </div>
    );
  }

  if (!state.token || !state.me) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}