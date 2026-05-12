import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const url = window.location.href;
        const hasCode = /[?&]code=/.test(url);
        const hasHashToken = /#.*access_token=/.test(window.location.hash);

        if (hasCode) {
          const { error } = await supabase.auth.exchangeCodeForSession(url);
          if (error) throw error;
        } else if (hasHashToken) {
          // Supabase JS automatically parses hash on client init; wait for session.
          // Force a session read to ensure it's hydrated.
          await supabase.auth.getSession();
        }

        // Small wait so onAuthStateChange propagates
        await new Promise((r) => setTimeout(r, 50));
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;
        if (session) navigate({ to: "/dashboard", replace: true });
        else navigate({ to: "/login", replace: true });
      } catch (e) {
        if (cancelled) return;
        setError((e as Error).message);
        setTimeout(() => navigate({ to: "/login", replace: true }), 1500);
      }
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <p className="text-sm font-medium text-primary">Signing you in…</p>
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}
