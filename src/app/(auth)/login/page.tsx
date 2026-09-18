import { Suspense } from "react";
import type { Metadata } from "next";
import { CheckCircle2, Lock, Pill, ShieldCheck } from "lucide-react";

import { LoginForm } from "@/features/auth/components/login-form";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Sign In · PharmaDaily Enterprise",
};

function LoginFormSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
      <div className="flex justify-between items-center pt-1">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="h-11 w-full rounded-xl mt-2" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="grid min-h-screen w-full lg:grid-cols-12 bg-background">
      {/* ================= Left Side: Clean Enterprise Branding ================= */}
      <div className="hidden lg:flex lg:col-span-5 xl:col-span-5 bg-[#0e1013] text-white flex-col justify-between p-10 xl:p-14 border-r border-zinc-800/80 relative overflow-hidden select-none">
        {/* Subtle monochrome pharmacy grid / lattice background pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]" />
        <div className="absolute -right-16 -bottom-16 size-80 rounded-full border border-zinc-800/40 opacity-20 pointer-events-none" />
        <div className="absolute -right-28 -bottom-28 size-96 rounded-full border border-zinc-800/20 opacity-20 pointer-events-none" />

        {/* Top: Logo & Title */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex aspect-square size-10 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-white shadow-xs">
              <Pill className="size-5 text-white" />
            </div>
            <div>
              <span className="font-bold tracking-tight text-white text-lg">PharmaDaily</span>
              <p className="text-zinc-500 text-xs font-medium">Pharmacy Management System</p>
            </div>
          </div>
        </div>

        {/* Center: Tagline & Enterprise Capabilities */}
        <div className="relative z-10 space-y-6 max-w-md my-auto">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-mono">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              <span>Enterprise Edition</span>
            </div>
            <h1 className="text-2xl xl:text-3xl font-bold tracking-tight text-white leading-snug">
              Manage your pharmacy, inventory and sales in one place.
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Designed for retail pharmacies, hospital dispensaries, and pharmacy chains with real-time FEFO batch control, split-second POS checkout, and bilingual invoices.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-3">
              <div className="size-5 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 mt-0.5 shrink-0">
                <CheckCircle2 className="size-3.5 text-zinc-300" />
              </div>
              <p className="text-xs text-zinc-300">
                <strong className="text-white font-semibold">Counter-Optimized POS:</strong> Instant barcode scanner, keyboard navigation, and offline till resilience.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="size-5 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 mt-0.5 shrink-0">
                <CheckCircle2 className="size-3.5 text-zinc-300" />
              </div>
              <p className="text-xs text-zinc-300">
                <strong className="text-white font-semibold">Inventory Intelligence:</strong> FEFO expiry prioritization, low-stock warnings, and purchase consignments.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="size-5 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 mt-0.5 shrink-0">
                <CheckCircle2 className="size-3.5 text-zinc-300" />
              </div>
              <p className="text-xs text-zinc-300">
                <strong className="text-white font-semibold">Role-Based Security:</strong> Isolated multi-tier access control for Cashiers, Pharmacists, and Managers.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom: Security & System Status */}
        <div className="relative z-10 pt-6 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-medium text-zinc-400 text-[11px]">System Status: Operational</span>
          </div>
          <span className="text-[11px] font-mono text-zinc-500">256-Bit SSL</span>
        </div>
      </div>

      {/* ================= Right Side: Centered Login Form ================= */}
      <div className="flex lg:col-span-7 xl:col-span-7 flex-col justify-center items-center px-6 py-12 sm:px-12 bg-background">
        <div className="w-full max-w-[420px] space-y-7">
          {/* Mobile Branding (Visible only on small screens) */}
          <div className="lg:hidden flex items-center gap-2.5 mb-2">
            <div className="flex aspect-square size-9 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-xs">
              <Pill className="size-4.5" />
            </div>
            <div>
              <span className="font-bold tracking-tight text-foreground text-base">PharmaDaily</span>
              <p className="text-[11px] text-muted-foreground">Pharmacy Management System</p>
            </div>
          </div>

          {/* Form Header */}
          <div className="space-y-1">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Welcome back</h2>
            <p className="text-sm text-muted-foreground">Sign in to your pharmacy account</p>
          </div>

          {/* Login Form */}
          <Suspense fallback={<LoginFormSkeleton />}>
            <LoginForm />
          </Suspense>

          {/* Security & Access Notices */}
          <div className="pt-3 border-t border-zinc-200/80 dark:border-zinc-800 text-center space-y-1">
            <p className="text-xs font-semibold text-foreground flex items-center justify-center gap-1.5">
              <ShieldCheck className="size-3.5 text-zinc-500" />
              Secure pharmacy management
            </p>
            <p className="text-[11px] text-muted-foreground">
              Protected by role-based access control
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
