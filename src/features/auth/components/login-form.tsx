"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Delete,
  Eye,
  EyeOff,
  HelpCircle,
  KeyRound,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  UserCheck,
  WifiOff,
} from "lucide-react";

import { signInAction } from "@/features/auth/actions";
import { loginSchema, type LoginErrorCode, type LoginInput } from "@/features/auth/schemas";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
    title: "Incorrect email or password",
    description: "Check your credentials and try again. Contact your manager if you are locked out.",
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
      "Signing in needs a connection. Once you are signed in, POS billing keeps working offline.",
  },
  unknown: {
    title: "Could not sign in",
    description: "Something went wrong on our side. Please check your credentials or network.",
  },
};

type LoginTab = "credentials" | "pin";

const DEMO_ROLES = [
  {
    role: "Super Admin",
    email: "admin@pharmadaily.com",
    badge: "Full ERP Access",
    icon: ShieldCheck,
  },
  {
    role: "Branch Manager",
    email: "manager@pharmadaily.com",
    badge: "Branch & Inventory",
    icon: UserCheck,
  },
  {
    role: "Pharmacist / Cashier",
    email: "cashier@pharmadaily.com",
    badge: "Fast POS Till",
    icon: Sparkles,
  },
];

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isOnline = useOnlineStatus();

  const redirectTo = searchParams.get("redirectTo");
  const sessionExpired = searchParams.get("reason") === "session_expired";

  const [loginTab, setLoginTab] = React.useState<LoginTab>("credentials");
  const [errorCode, setErrorCode] = React.useState<LoginErrorCode | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [forgotPasswordOpen, setForgotPasswordOpen] = React.useState(false);

  // Quick PIN Mode State for Fast Till Shift
  const [pinCode, setPinCode] = React.useState("");
  const [pinError, setPinError] = React.useState<string | null>(null);

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

  const handleRoleFill = (email: string) => {
    form.setValue("email", email, { shouldValidate: true });
    setErrorCode(null);
    const passInput = document.getElementById("password");
    if (passInput) passInput.focus();
  };

  const handlePinDigit = (digit: string) => {
    if (pinCode.length < 4) {
      const next = pinCode + digit;
      setPinCode(next);
      setPinError(null);
      if (next.length === 4) {
        // Auto-submit demo PIN
        startTransition(async () => {
          await new Promise((resolve) => setTimeout(resolve, 600));
          if (next === "1234" || next === "0000") {
            form.setValue("email", "cashier@pharmadaily.com");
            form.setValue("password", "PharmaDaily@2026");
            const formData = new FormData();
            formData.set("email", "cashier@pharmadaily.com");
            formData.set("password", "PharmaDaily@2026");
            const res = await signInAction(formData);
            if (res.ok) {
              router.replace(res.redirectTo);
              router.refresh();
            } else {
              setPinError("Invalid Till PIN. Use standard credentials below.");
            }
          } else {
            setPinError("Incorrect 4-digit Till PIN. (Try 1234)");
            setPinCode("");
          }
        });
      }
    }
  };

  const handlePinBackspace = () => {
    setPinCode((prev) => prev.slice(0, -1));
    setPinError(null);
  };

  const activeError = errorCode ? ERROR_COPY[errorCode] : null;

  return (
    <div className="space-y-5">
      {/* 1. Mode Tab Switcher: Standard vs Fast Counter Till PIN */}
      <div className="flex p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800 text-xs">
        <button
          type="button"
          onClick={() => {
            setLoginTab("credentials");
            setErrorCode(null);
          }}
          className={cn(
            "flex-1 py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
            loginTab === "credentials"
              ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs font-bold"
              : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
          )}
        >
          <Mail className="size-3.5" />
          <span>Staff Credentials</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setLoginTab("pin");
            setErrorCode(null);
          }}
          className={cn(
            "flex-1 py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
            loginTab === "pin"
              ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs font-bold"
              : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
          )}
        >
          <KeyRound className="size-3.5" />
          <span>Counter PIN (Till)</span>
          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
            Fast
          </span>
        </button>
      </div>

      {/* Session / Network / Auth Alerts */}
      {sessionExpired && !activeError && (
        <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300">
          <AlertCircle className="size-4" />
          <AlertTitle className="text-xs font-bold">Session timed out</AlertTitle>
          <AlertDescription className="text-xs">
            Your shift session expired. Please sign in to resume your active counter ledger.
          </AlertDescription>
        </Alert>
      )}

      {!isOnline && !activeError && (
        <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300">
          <WifiOff className="size-4" />
          <AlertTitle className="text-xs font-bold">Offline Mode</AlertTitle>
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

      {/* 2. TAB A: Standard Password Login Form */}
      {loginTab === "credentials" && (
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
          {/* Quick Demo Role Auto-Fill Chips */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-zinc-500 flex items-center justify-between">
              <span>Quick Account Autofill:</span>
              <span className="text-[10px] text-zinc-400 font-normal">Click to fill</span>
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {DEMO_ROLES.map((item) => (
                <button
                  key={item.role}
                  type="button"
                  onClick={() => handleRoleFill(item.email)}
                  className="px-2 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 hover:bg-zinc-100 dark:bg-zinc-900/50 dark:hover:bg-zinc-800/70 text-left transition-colors cursor-pointer group"
                >
                  <div className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 truncate group-hover:text-primary">
                    {item.role}
                  </div>
                  <div className="text-[9px] text-zinc-400 truncate font-mono">{item.badge}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Email / Username Field */}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Email Address / Staff ID</span>
            </Label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-400 pointer-events-none" />
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="username"
                placeholder="staff@pharmadaily.com"
                aria-invalid={!!form.formState.errors.email}
                disabled={isPending}
                className="h-10 pl-10 text-xs sm:text-sm rounded-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus-visible:ring-1 focus-visible:ring-zinc-400"
                {...form.register("email")}
              />
            </div>
            {form.formState.errors.email && (
              <p className="text-[11px] text-destructive font-medium">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-semibold text-foreground">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-400 pointer-events-none" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••••••"
                className="h-10 pl-10 pr-10 text-xs sm:text-sm rounded-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus-visible:ring-1 focus-visible:ring-zinc-400"
                aria-invalid={!!form.formState.errors.password}
                disabled={isPending}
                {...form.register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-xl cursor-pointer"
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
          <div className="flex items-center justify-between pt-0.5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                defaultChecked
                className="size-4 rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 focus:ring-zinc-500 accent-zinc-900 cursor-pointer"
              />
              <span className="text-xs font-medium text-foreground">Remember this terminal</span>
            </label>

            <button
              type="button"
              onClick={() => setForgotPasswordOpen(true)}
              className="text-xs font-semibold text-zinc-600 hover:text-foreground dark:text-zinc-400 hover:underline cursor-pointer"
            >
              Forgot password?
            </button>
          </div>

          {/* Primary Submit Button */}
          <Button
            type="submit"
            disabled={isPending}
            className="w-full h-11 rounded-xl text-xs sm:text-sm font-bold bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 shadow-sm transition-all gap-2 cursor-pointer"
          >
            {isPending ? (
              <>
                <Spinner className="size-4" />
                <span>Authenticating staff…</span>
              </>
            ) : (
              <>
                <span>Sign In to Terminal</span>
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </form>
      )}

      {/* 3. TAB B: Fast Counter PIN Till Shift Mode */}
      {loginTab === "pin" && (
        <div className="space-y-4 pt-1">
          <div className="text-center space-y-1">
            <div className="text-xs font-semibold text-zinc-500">
              Enter 4-digit Cashier Shift PIN for Counter 01:
            </div>
            {/* PIN Indicator Dots */}
            <div className="flex justify-center items-center gap-3 py-2">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={cn(
                    "size-4 rounded-full border-2 transition-all",
                    pinCode.length > idx
                      ? "bg-zinc-900 border-zinc-900 dark:bg-zinc-100 dark:border-zinc-100 scale-110"
                      : "border-zinc-300 dark:border-zinc-700 bg-transparent"
                  )}
                />
              ))}
            </div>
            {pinError && <p className="text-xs text-destructive font-medium">{pinError}</p>}
          </div>

          {/* Numeric Touch Keypad for Fast Counter Till */}
          <div className="grid grid-cols-3 gap-2 max-w-[280px] mx-auto pt-1">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handlePinDigit(num)}
                disabled={isPending}
                className="h-12 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-base font-bold font-mono text-zinc-900 dark:text-zinc-100 transition-colors shadow-2xs cursor-pointer active:scale-95"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setPinCode("");
                setPinError(null);
              }}
              disabled={isPending}
              className="h-12 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => handlePinDigit("0")}
              disabled={isPending}
              className="h-12 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-base font-bold font-mono text-zinc-900 dark:text-zinc-100 transition-colors shadow-2xs cursor-pointer active:scale-95"
            >
              0
            </button>
            <button
              type="button"
              onClick={handlePinBackspace}
              disabled={isPending}
              className="h-12 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center cursor-pointer"
            >
              <Delete className="size-4" />
            </button>
          </div>

          <div className="text-center pt-1">
            <span className="text-[11px] text-zinc-400">
              Demo Shift PIN: <span className="font-mono font-bold text-zinc-600 dark:text-zinc-300">1234</span>
            </span>
          </div>
        </div>
      )}

      {/* Forgot Password Dialog */}
      <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
        <DialogContent className="sm:max-w-md border-zinc-200 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Lock className="size-4 text-emerald-600 dark:text-emerald-400" />
              <span>Password Recovery & Reset</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              In accordance with DGDA pharmacy audit standards, staff accounts are managed securely by store leadership.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs text-zinc-600 dark:text-zinc-400">
            <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1">
              <strong className="text-zinc-900 dark:text-zinc-100 block">How to reset your access:</strong>
              <p>1. Contact your Pharmacy Super Admin or Branch Manager.</p>
              <p>2. They can issue a temporary password or reset your credentials directly from Staff Management (`/staff`).</p>
            </div>
            <div className="flex items-center gap-2 text-zinc-500 text-[11px]">
              <Phone className="size-3.5 text-zinc-400" />
              <span>IT Helpline: +880 1700-000000 · support@pharmadaily.com</span>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              onClick={() => setForgotPasswordOpen(false)}
              className="text-xs font-semibold h-9"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
