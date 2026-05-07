import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/shell/AppShell";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { session, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      navigate({ to: "/login" });
      return;
    }
    if (session && !role) {
      // signed in but not whitelisted — show denied view via /login
      navigate({ to: "/login" });
    }
  }, [session, role, loading, navigate]);

  if (loading || !session || !role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Loading workspace…</div>
      </div>
    );
  }

  return (
    <AppShell role={role}>
      <Outlet />
    </AppShell>
  );
}
