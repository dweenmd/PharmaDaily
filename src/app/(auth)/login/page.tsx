import { Suspense } from "react";
import type { Metadata } from "next";
import {
  Activity,
  CheckCircle2,
  Lock,
  Pill,
  Shield,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";

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
    <div className="grid min-h-screen w-full lg:grid-cols-12 bg-zinc-50 dark:bg-zinc-950">
      {/* ================= Left Side: Enterprise Pharmacy Showcase ================= */}
      <div className="hidden lg:flex lg:col-span-5 xl:col-span-5 bg-[#0a0d14] text-white flex-col justify-between p-10 xl:p-14 border-r border-zinc-850 relative overflow-hidden select-none">
        {/* Subtle grid pattern & ambient glow */}
        <div className="absolute inset-0 opacity-[0.035] pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="absolute -top-32 -left-32 size-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 size-96 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />

        {/* 1. Brand Header */}
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex aspect-square size-11 items-center justify-center rounded-2xl bg-zinc-900/90 border border-zinc-700/60 text-white shadow-md shadow-emerald-950/40">
                <Pill className="size-5.5 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold tracking-tight text-white text-lg">PharmaDaily</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 font-semibold">
                    v2.4
                  </span>
                </div>
                <p className="text-zinc-400 text-xs font-medium">Enterprise Pharmacy ERP</p>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Center: Value Proposition & Live Dashboard Preview Card */}
        <div className="relative z-10 space-y-6 my-auto max-w-md">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/80 border border-zinc-800 text-zinc-300 text-xs font-mono">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>DGDA & NBR Ready</span>
            </div>

            <h1 className="text-2xl xl:text-3xl font-bold tracking-tight text-white leading-tight">
              Intelligent Pharmacy ERP, FEFO Inventory & High-Speed POS.
            </h1>

            <p className="text-xs xl:text-sm text-zinc-400 leading-relaxed">
              Designed for retail pharmacies, hospital dispensaries, and pharmacy chains in Bangladesh with real-time batch expiry tracking and split-second checkout.
            </p>
          </div>

          {/* Live Floating Glassmorphism Counter Preview Card */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4.5 backdrop-blur-md shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
              <div className="flex items-center gap-2">
                <Activity className="size-4 text-emerald-400" />
                <span className="text-xs font-bold text-zinc-200">Main Branch Counter 01</span>
              </div>
              <span className="text-[10px] font-mono font-semibold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-800/50">
                Live Shift Active
              </span>
            </div>

            {/* Quick Micro KPIs */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60 space-y-0.5">
                <span className="text-[10px] text-zinc-400 font-medium">Today's Revenue</span>
                <div className="text-sm font-bold font-mono text-zinc-100">৳148,920.00</div>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60 space-y-0.5">
                <span className="text-[10px] text-zinc-400 font-medium">FEFO Protection</span>
                <div className="text-sm font-bold font-mono text-emerald-400">100% Verified</div>
              </div>
            </div>

            {/* Audit Status Line */}
            <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-emerald-400" />
                <span>Zero Expired Drugs Dispensed</span>
              </span>
              <span className="font-mono text-zinc-500">2.1s Checkout</span>
            </div>
          </div>

          {/* 3 Core Architecture Pillars */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-start gap-2.5">
              <div className="size-5 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400 mt-0.5 shrink-0">
                <Zap className="size-3" />
              </div>
              <p className="text-xs text-zinc-300">
                <strong className="text-white font-semibold">Instant Till Checkout:</strong> F9 barcode gun scanner, 80mm/58mm thermal receipts & offline till resilience.
              </p>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="size-5 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400 mt-0.5 shrink-0">
                <ShieldCheck className="size-3" />
              </div>
              <p className="text-xs text-zinc-300">
                <strong className="text-white font-semibold">FEFO Batch Governance:</strong> Automated first-expiry warning alerts, stock returns, and purchase orders.
              </p>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="size-5 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400 mt-0.5 shrink-0">
                <Shield className="size-3" />
              </div>
              <p className="text-xs text-zinc-300">
                <strong className="text-white font-semibold">Role-Based Security:</strong> Strict isolation for Super Admins, Branch Managers, Pharmacists, and Cashiers.
              </p>
            </div>
          </div>
        </div>

        {/* 3. Bottom Security & Status */}
        <div className="relative z-10 pt-6 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-medium text-zinc-400 text-[11px]">System Status: Operational</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-500">
            <span>256-Bit TLS</span>
            <span>·</span>
            <span>Cloud POS</span>
          </div>
        </div>
      </div>

      {/* ================= Right Side: Centered Elevated Login Card ================= */}
      <div className="flex lg:col-span-7 xl:col-span-7 flex-col justify-center items-center px-4 py-12 sm:px-8 md:px-12 bg-zinc-50/70 dark:bg-zinc-950/70 relative">
        {/* Subtle background ambient blur */}
        <div className="absolute top-1/4 right-1/4 size-72 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />

        <div className="w-full max-w-[440px] space-y-6 relative z-10">
          {/* Mobile Branding (Visible only on small screens) */}
          <div className="lg:hidden flex items-center justify-between mb-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2.5">
              <div className="flex aspect-square size-9 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-xs">
                <Pill className="size-4.5 text-emerald-400" />
              </div>
              <div>
                <span className="font-bold tracking-tight text-foreground text-base">PharmaDaily</span>
                <p className="text-[11px] text-muted-foreground">Pharmacy Management System</p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
              Online
            </span>
          </div>

          {/* Elevated Login Card Container */}
          <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-xl shadow-zinc-200/50 dark:shadow-none space-y-6">
            {/* Form Header */}
            <div className="space-y-1 text-left">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Welcome back
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Sign in to your pharmacy workspace or terminal
              </p>
            </div>

            {/* Interactive Login Form */}
            <Suspense fallback={<LoginFormSkeleton />}>
              <LoginForm />
            </Suspense>
          </div>

          {/* Footer Security Badges */}
          <div className="pt-2 text-center space-y-1">
            <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-center gap-1.5">
              <ShieldCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Protected by Role-Based Access Control & Audit Logs</span>
            </p>
            <p className="text-[11px] text-muted-foreground">
              PharmaDaily Health Technologies Ltd. · All rights reserved
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
