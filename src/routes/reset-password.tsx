import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { hasRecoveryLink, passwordError } from "@/lib/password-recovery";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Reset company password — UTL Store" },
    { name: "description", content: "Set a new password for your UTL company account using your secure recovery link." },
    { property: "og:title", content: "Reset company password — UTL Store" },
    { property: "og:description", content: "Recover access to your UTL company account." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ResetPassword,
});

function ResetPassword() {
  const [state, setState] = useState<"checking" | "ready" | "invalid" | "done">("checking");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    let recoveryReceived = false;
    const recoveryLink = hasRecoveryLink(window.location.hash);
    const params = new URLSearchParams(window.location.hash.slice(1));
    const linkError = params.get("error_description");
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" && active) {
        recoveryReceived = true;
        setState("ready");
      }
    });
    async function check() {
      if (linkError) {
        if (active) { setError(linkError); setState("invalid"); }
        return;
      }
      if (recoveryLink) {
        const { data: user, error: authError } = await supabase.auth.getUser();
        if (active) setState(user.user && !authError ? "ready" : "invalid");
      } else {
        // Wait for the client's URL processing before deciding whether recovery is valid.
        await supabase.auth.getUser();
        if (active && !recoveryReceived) setState("invalid");
      }
    }
    void check();
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state !== "ready" || busy) return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const validation = passwordError(password, String(form.get("confirmation") ?? ""));
    if (validation) { setError(validation); return; }
    setBusy(true); setError("");
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) { setError(updateError.message); return; }
      setState("done");
    } catch {
      setError("Unable to update your password. Please try again.");
    } finally { setBusy(false); }
  }

  return <div className="min-h-screen bg-background">
    <header className="border-b bg-primary px-4 py-4 text-primary-foreground"><div className="mx-auto max-w-4xl"><Link to="/" className="font-display text-lg font-semibold">UTL Store</Link></div></header>
    <main className="mx-auto max-w-sm px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold">{state === "done" ? "Password updated" : "Reset company password"}</h1>
      {state === "checking" && <p role="status">Checking your reset link…</p>}
      {state === "invalid" && <p className="mb-4 text-muted-foreground">This reset link is invalid or expired. Request a new link from company sign in.</p>}
      {state === "ready" && <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm">New password<input name="password" type="password" autoComplete="new-password" required minLength={6} className="mt-2 w-full rounded-md border bg-background px-3 py-2" /></label>
        <label className="block text-sm">Confirm new password<input name="confirmation" type="password" autoComplete="new-password" required minLength={6} className="mt-2 w-full rounded-md border bg-background px-3 py-2" /></label>
        <Button disabled={busy} className="w-full">{busy ? "Saving…" : "Save new password"}</Button>
      </form>}
      {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
      {state !== "checking" && <Button asChild variant="link" className="mt-4 px-0"><Link to="/portal">{state === "done" ? "Open company portal" : "Back to company sign in"}</Link></Button>}
    </main>
  </div>;
}