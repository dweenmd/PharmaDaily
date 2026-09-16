"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Eye, EyeOff, WifiOff } from "lucide-react";

import { signInAction } from "@/features/auth/actions";
import { loginSchema, type LoginErrorCode, type LoginInput } from "@/features/auth/schemas";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

/** Copy for each failure the server can report, plus the local offline case. */
const ERROR_COPY: Record<LoginErrorCode, { title: string; description: string }> = {
  invalid_credentials: {
    title: "Incorrect email or password",
    description: "Check your details and try again. Contact your manager if you are locked out.",
  },
  account_inactive: {
    title: "Account not active",
    description:
      "Your account exists but has not been activated, or has been deactivated. Ask an administrator to assign you a role and branch.",
  },
  email_not_confirmed: {
    title: "Email not confirmed",
    description: "This account still needs to be confirmed. Ask an administrator to finish setup.",
  },
  rate_limited: {
    title: "Too many attempts",
    description: "Too many sign-in attempts. Wait a minute before trying again.",
  },
  offline: {
    title: "No internet connection",
    description:
      "Signing in needs a connection. Once you are signed in, billing keeps working offline.",
  },
  unknown: {
    title: "Could not sign in",
    description: "Something went wrong on our side. Please try again.",
  },
};

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isOnline = useOnlineStatus();

  const redirectTo = searchParams.get("redirectTo");
  const sessionExpired = searchParams.get("reason") === "session_expired";

  const [errorCode, setErrorCode] = React.useState<LoginErrorCode | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  function onSubmit(values: LoginInput) {
    setErrorCode(null);

    // Fail fast with an explanation instead of letting the request hang until
    // fetch eventually rejects with an opaque network error.
    if (!isOnline) {
      setErrorCode("offline");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("email", values.email);
      formData.set("password", values.password);
      if (redirectTo) formData.set("redirectTo", redirectTo);

      try {
        const result = await signInAction(formData);

        if (!result.ok) {
          setErrorCode(result.code);
          form.setValue("password", "");
          return;
        }

        // refresh() first so the freshly-set auth cookie is picked up by the
        // server components that are about to render the dashboard.
        router.replace(result.redirectTo);
        router.refresh();
      } catch {
        // The action itself failed to reach the server — almost always the
        // connection dropping between the check above and the request.
        setErrorCode(navigator.onLine ? "unknown" : "offline");
      }
    });
  }

  const activeError = errorCode ? ERROR_COPY[errorCode] : null;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-5">
      {sessionExpired && !activeError && (
        <Alert>
          <AlertCircle />
          <AlertTitle>Session expired</AlertTitle>
          <AlertDescription>
            You were signed out because your session timed out. Please sign in again.
          </AlertDescription>
        </Alert>
      )}

      {!isOnline && !activeError && (
        <Alert>
          <WifiOff />
          <AlertTitle>You are offline</AlertTitle>
          <AlertDescription>
            Connect to the internet to sign in. Billing continues to work offline once signed in.
          </AlertDescription>
        </Alert>
      )}

      {activeError && (
        <Alert variant="destructive" role="alert" aria-live="assertive">
          <AlertCircle />
          <AlertTitle>{activeError.title}</AlertTitle>
          <AlertDescription>{activeError.description}</AlertDescription>
        </Alert>
      )}

      <FieldGroup>
        <Field data-invalid={!!form.formState.errors.email}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="username"
            autoFocus
            placeholder="you@pharmacy.com"
            aria-invalid={!!form.formState.errors.email}
            disabled={isPending}
            {...form.register("email")}
          />
          {form.formState.errors.email && (
            <FieldError>{form.formState.errors.email.message}</FieldError>
          )}
        </Field>

        <Field data-invalid={!!form.formState.errors.password}>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              className="pr-10"
              aria-invalid={!!form.formState.errors.password}
              disabled={isPending}
              {...form.register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md focus-visible:ring-2 focus-visible:outline-none"
              aria-label={showPassword ? "Hide password" : "Show password"}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {form.formState.errors.password && (
            <FieldError>{form.formState.errors.password.message}</FieldError>
          )}
        </Field>
      </FieldGroup>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? (
          <>
            <Spinner />
            Signing in…
          </>
        ) : (
          "Sign in"
        )}
      </Button>

      <p className="text-muted-foreground text-center text-xs">
        Accounts are created by an administrator. There is no public sign-up.
      </p>
    </form>
  );
}
