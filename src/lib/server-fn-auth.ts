import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

// Client-side middleware that attaches the current Supabase access token
// as a Bearer Authorization header to every server function call.
export const supabaseAuthClientMiddleware = createMiddleware({ type: "function" })
  .client(async ({ next }) => {
    let token: string | undefined;
    if (typeof window !== "undefined") {
      try {
        const { data } = await supabase.auth.getSession();
        token = data.session?.access_token;
      } catch {
        // ignore — request goes out unauthenticated and server returns 401
      }
    }
    return next(token ? { headers: { Authorization: `Bearer ${token}` } } : {});
  });
