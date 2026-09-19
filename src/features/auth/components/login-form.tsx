"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  HelpCircle,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  WifiOff,
} from "lucide-react";

import { signInAction } from "@/features/auth/actions";
import { loginSchema, type LoginErrorCode, type LoginInput } from "@/features/auth/schemas";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

/** Copy for each failure the server can report, plus the local offline case. */
const ERROR_COPY: Record<LoginErrorCode, { title: string; description: string }> = {
  invalid_credentials: {
    title: "Incorrect credentials",
    description: "Check your email/phone and password. Contact your pharmacy manager if locked out.",
  },
  account_inactive: {
    title: "Account inactive",
    description:
      "Your staff account exists but has not been activated. Ask a store administrator to verify your profile.",
  },
  email_not_confirmed: {
    title: "Account pending confirmation",
    description: "This staff account requires initial confirmation. Contact your system administrator.",
  },
  rate_limited: {
    title: "Too many sign-in attempts",
    description: "Rate limit triggered for security. Please wait 60 seconds before trying again.",
  },
  offline: {
    title: "No internet connection",
    description:
      "Signing in requires an initial internet connection. Once authenticated, POS counter sales operate offline.",
  },
  unknown: {
    title: "Unable to sign in",
    description: "Authentication service encountered an issue. Please verify credentials or try again.",
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
  const [forgotPasswordOpen, setForgotPasswordOpen] = React.useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  function onSubmit(values: LoginInput) {
    setErrorCode(null);

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

        router.replace(result.redirectTo);
        router.refresh();
      } catch {
        setErrorCode(navigator.onLine ? "unknown" : "offline");
      }
    });
  }

  const activeError = errorCode ? ERROR_COPY[errorCode] : null;

  return (
    <div className="space-y-5">
      {/* Session / Network / Auth Status Alerts */}
      {sessionExpired && !activeError && (
        <Alert className="border-zinc-300 dark:border-zinc-700 bg-zinc-100/80 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
          <AlertCircle className="size-4" />
          <AlertTitle className="text-xs font-bold">Session expired</AlertTitle>
          <AlertDescription className="text-xs">
            Your shift session timed out. Please sign in again to resume your active counter ledger.
          </AlertDescription>
        </Alert>
      )}

      {!isOnline && !activeError && (
        <Alert className="border-zinc-300 dark:border-zinc-700 bg-zinc-100/80 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
          <WifiOff className="size-4" />
          <AlertTitle className="text-xs font-bold">Offline</AlertTitle>
          <AlertDescription className="text-xs">
            Connect to the internet to authorize staff. POS billing operates offline once signed in.
          </AlertDescription>
        </Alert>
      )}

      {activeError && (
        <Alert variant="destructive" role="alert" aria-live="assertive">
          <AlertCircle className="size-4" />
          <AlertTitle className="text-xs font-bold">{activeError.title}</AlertTitle>
          <AlertDescription className="text-xs">{activeError.description}</AlertDescription>
        </Alert>
      )}

      {/* Primary Login Form */}
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
        {/* Email or Phone Number Input */}
        <div className="space-y-1.5">
          <Label
            htmlFor="email"
            className="text-xs font-semibold text-zinc-900 dark:text-zinc-100"
          >
            Email or Phone Number
          </Label>
          <div className="relative">
            <Input
              id="email"
              type="text"
              inputMode="email"
              autoComplete="username"
              autoFocus
              placeholder="name@pharmacy.com or 017XXXXXXXX"
              aria-invalid={!!form.formState.errors.email}
              disabled={isPending}
              className="h-10.5 text-xs sm:text-sm rounded-xl bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
              {...form.register("email")}
            />
          </div>
          {form.formState.errors.email && (
            <p className="text-[11px] text-destructive font-medium">
              {form.formState.errors.email.message}
            </p>
          )}
        </div>

        {/* Password Input with Show/Hide Toggle */}
        <div className="space-y-1.5">
          <Label
            htmlFor="password"
            className="text-xs font-semibold text-zinc-900 dark:text-zinc-100"
          >
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••••••"
              className="h-10.5 pr-10 text-xs sm:text-sm rounded-xl bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
              aria-invalid={!!form.formState.errors.password}
              disabled={isPending}
              {...form.register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-xl transition-colors cursor-pointer"
              aria-label={showPassword ? "Hide password" : "Show password"}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {form.formState.errors.password && (
            <p className="text-[11px] text-destructive font-medium">
              {form.formState.errors.password.message}
            </p>
          )}
        </div>

        {/* Remember Me & Forgot Password */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              defaultChecked
              className="size-4 rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 focus:ring-zinc-900 accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
            />
            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Remember me
            </span>
          </label>

          <button
            type="button"
            onClick={() => setForgotPasswordOpen(true)}
            className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline transition-colors cursor-pointer"
          >
            Forgot password?
          </button>
        </div>

        {/* Strong Sign In Button */}
        <Button
          type="submit"
          disabled={isPending}
          className="w-full h-11 mt-2 rounded-xl text-xs sm:text-sm font-bold bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 shadow-sm transition-all gap-2 cursor-pointer"
        >
          {isPending ? (
            <>
              <Spinner className="size-4" />
              <span>Signing in…</span>
            </>
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </form>

      {/* Forgot Password Recovery Dialog */}
      <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
        <DialogContent className="sm:max-w-md border-zinc-200 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
              <Lock className="size-4 text-zinc-900 dark:text-zinc-100" />
              <span>Password Recovery</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              To maintain pharmacy ledger integrity and DGDA regulatory compliance, staff credentials are managed centrally.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs text-zinc-600 dark:text-zinc-400">
            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1.5">
              <strong className="text-zinc-900 dark:text-zinc-100 block text-xs">
                To reset or retrieve your account:
              </strong>
              <p>1. Contact your assigned Pharmacy Super Admin or Branch Manager.</p>
              <p>2. They can reset your password or issue a temporary login key from Staff Management (`/staff`).</p>
            </div>
            <div className="flex items-center gap-2 text-zinc-500 text-[11px] pt-1">
              <Phone className="size-3.5 text-zinc-400" />
              <span>Support Desk: +880 1700-000000 · support@pharmadaily.com</span>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              onClick={() => setForgotPasswordOpen(false)}
              className="text-xs font-semibold h-9"
            >
              Understood
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
