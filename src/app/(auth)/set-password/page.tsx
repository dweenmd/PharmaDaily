"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { type EmailOtpType } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

type Stage = "checking" | "ready" | "already-set" | "invalid" | "done";

/**
 * Where an invite or password-reset email link lands.
 *
 * Deliberately reachable with no session cookie: the token that proves who
 * this is lives in the URL — either the `#access_token` fragment (which
 * `detectSessionInUrl` on the browser client parses automatically) or a
 * `?token_hash=` query param (the newer Supabase email-template style,
 * verified explicitly below) — and a fragment in particular is something
 * only the browser ever sees, never the server. Middleware allow-lists this
 * path for exactly that reason.
 */
export default function SetPasswordPage() {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);

  const [stage, setStage] = React.useState<Stage>("checking");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  React.useEffect(() => {
    let cancelled = false;

    // A session alone is not permission to set a new password with no
    // re-authentication — that only belongs to someone who just proved
    // identity via the emailed link. An already-provisioned account
    // (password_set already true) reaching this page some other way — a
    // stale tab, a stolen session cookie — gets turned away here rather than
    // handed a way to overwrite a password without knowing it, which is
    // exactly the bypass changeOwnPasswordAction's re-auth step exists to
    // prevent.
    async function settleForCurrentUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (!cancelled) setStage("invalid");
        return;
      }

      const { data: row } = await supabase
        .from("profiles")
        .select("password_set")
        .eq("auth_id", user.id)
        .maybeSingle();

      if (!cancelled) setStage(row?.password_set === false ? "ready" : "already-set");
    }

    async function establishSession() {
      const url = new URL(window.location.href);
      const tokenHash = url.searchParams.get("token_hash");
      const type = url.searchParams.get("type") as EmailOtpType | null;

      if (tokenHash && type) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          type,
          token_hash: tokenHash,
        });
        if (cancelled) return;
        if (verifyError) {
          setStage("invalid");
          return;
        }
        await settleForCurrentUser();
        return;
      }

      // No query-param token: either the fragment form (detectSessionInUrl
      // parses it automatically on client init) or there is no valid link at
      // all. Either way, asking the client what it landed on settles it.
      await settleForCurrentUser();
    }

    // The fragment case needs a moment: detectSessionInUrl runs as part of
    // the client's own init, which can still be in flight on first paint.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        settleForCurrentUser();
      }
    });

    establishSession();
    const timeout = setTimeout(() => {
      if (!cancelled) setStage((s) => (s === "checking" ? "invalid" : s));
    }, 5000);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [supabase]);

  function submit() {
    setError(null);

    if (password.length < 12) {
      setError("Use at least 12 characters.");
      return;
    }
    if (/^[a-z]+$/i.test(password)) {
      setError("Mix in a number or symbol.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }

    startTransition(async () => {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError("Could not set the password. The link may have expired — ask for a new invite.");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Best-effort: RLS scopes this to the caller's own row, so it can
        // only ever clear their own pending-invite flag. Not fatal if it
        // fails — the account already has a working password either way,
        // and an admin can always confirm from the staff list.
        await supabase.from("profiles").update({ password_set: true }).eq("auth_id", user.id);
      }

      setStage("done");
      router.push("/dashboard");
      router.refresh();
    });
  }

  if (stage === "checking") {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-2 py-10 text-sm">
          <Spinner />
          Checking your link…
        </CardContent>
      </Card>
    );
  }

  if (stage === "already-set") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Your password is already set</CardTitle>
          <CardDescription>
            This link is for setting a password the first time. To change an existing one, use
            &quot;Change password&quot; from your account menu instead — that asks for your current
            password too, which this page deliberately does not.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <a href="/dashboard">Go to dashboard</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (stage === "invalid") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">This link isn&apos;t working</CardTitle>
          <CardDescription>
            It may have expired or already been used. Ask whoever set up your account to send a new
            one, or sign in if you already have a password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <a href="/login">Go to sign in</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Set your password</CardTitle>
        <CardDescription>Choose a password only you know, then you&apos;re in.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            disabled={isPending}
          />
          <p className="text-muted-foreground text-xs">At least 12 characters.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password">Repeat password</Label>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={isPending}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </div>

        <Button
          className="w-full"
          onClick={submit}
          disabled={isPending || password === "" || confirm === ""}
        >
          {isPending && <Spinner />}
          Set password and continue
        </Button>
      </CardContent>
    </Card>
  );
}
