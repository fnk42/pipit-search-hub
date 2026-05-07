import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isWhitelistedEmail } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "denied" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const { session, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session && role) {
      navigate({ to: "/dashboard" });
    }
  }, [loading, session, role, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!isWhitelistedEmail(email)) {
      setStatus("denied");
      return;
    }
    setStatus("sending");
    const redirectUrl = `${window.location.origin}/dashboard`;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectUrl },
    });
    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
    } else {
      setStatus("sent");
    }
  };

  // Authenticated but no role assigned (non-whitelisted somehow signed up)
  if (!loading && session && !role) {
    return <AccessDenied email={session.user.email ?? ""} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="px-6 sm:px-10 py-6 border-b border-border">
        <div className="text-sm font-semibold tracking-tight text-primary">
          Golden Pipit Recruiting
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <div className="mb-10">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-3">
              Confidential workspace
            </p>
            <h1 className="text-3xl font-semibold text-primary leading-tight">
              Transformari IR Search
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Sign in with your authorized email to access the engagement.
            </p>
          </div>

          {status === "denied" ? (
            <AccessDenied email={email} onReset={() => { setStatus("idle"); setEmail(""); }} />
          ) : status === "sent" ? (
            <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
              <h2 className="font-semibold text-primary">Check your email</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                A secure sign-in link has been sent to <span className="font-medium text-foreground">{email}</span>.
                Open it from this device to access the workspace.
              </p>
              <button
                onClick={() => setStatus("idle")}
                className="mt-4 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-border bg-card p-6 shadow-sm">
              <div className="space-y-2">
                <Label htmlFor="email">Work email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@goldenpipitrecruiting.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={status === "sending"}
                />
              </div>
              {errorMsg && <p className="text-xs text-destructive">{errorMsg}</p>}
              <Button type="submit" disabled={status === "sending"} className="w-full">
                {status === "sending" ? "Sending link…" : "Send sign-in link"}
              </Button>
            </form>
          )}
        </div>
      </main>

      <footer className="px-6 sm:px-10 py-4 border-t border-border text-center text-xs text-muted-foreground">
        Prepared by Golden Pipit Recruiting · View Park Towers, Nairobi · Confidential
      </footer>
    </div>
  );
}

function AccessDenied({ email, onReset }: { email: string; onReset?: () => void }) {
  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <h2 className="font-semibold text-primary">Access denied</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        The address <span className="font-medium text-foreground">{email}</span> is not authorized for this engagement.
        If you believe this is an error, please contact your engagement lead.
      </p>
      {onReset && (
        <button
          onClick={onReset}
          className="mt-4 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          Try a different email
        </button>
      )}
    </div>
  );
}
