import { Suspense } from "react";
import type { Metadata } from "next";
import {
  Boxes,
  Building2,
  Check,
  CheckCircle2,
  Lock,
  Pill,
  Receipt,
  ShieldCheck,
  Zap,
} from "lucide-react";

import { LoginForm } from "@/features/auth/components/login-form";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Sign In · PharmaDaily Enterprise",
  description: "Enterprise pharmacy management, FEFO inventory, and point-of-sale login",
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
    <div className="grid min-h-screen w-full lg:grid-cols-2 bg-white dark:bg-zinc-950 font-sans">
      {/* =================================================================== */}
      {/* LEFT SIDE: Minimalist Monochrome Enterprise Pharmacy Showcase     */}
      {/* =================================================================== */}
      <div className="hidden lg:flex flex-col justify-between bg-zinc-950 text-white p-12 xl:p-16 border-r border-zinc-800/80 relative overflow-hidden select-none">
        {/* Subtle geometric dot grid pattern */}
        <div className="absolute inset-0 opacity-[0.035] pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px]" />

        {/* Minimalist Rx & Capsule Watermark (Subtle pharmacy visual without clutter) */}
        <div className="absolute -right-12 -bottom-12 size-96 rounded-full border border-zinc-800/40 opacity-30 pointer-events-none" />
        <div className="absolute -right-24 -bottom-24 size-[480px] rounded-full border border-zinc-800/20 opacity-20 pointer-events-none" />
        <div className="absolute right-8 bottom-8 text-zinc-800/20 font-serif font-black text-8xl pointer-events-none select-none">
          Rx
        </div>

        {/* 1. Header: Brand Logo & Title */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex aspect-square size-10 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-white shadow-xs">
              <Pill className="size-5 text-zinc-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-white text-lg">PharmaDaily</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 font-semibold">
                  Enterprise
                </span>
              </div>
              <p className="text-zinc-500 text-xs font-medium">Pharmacy Management System</p>
            </div>
          </div>
        </div>

        {/* 2. Center: Pharmacy Benefits Showcase */}
        <div className="relative z-10 space-y-8 max-w-md my-auto">
          {/* Main Headline & Narrative */}
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/80 border border-zinc-800 text-zinc-400 text-xs font-mono">
              <span className="size-1.5 rounded-full bg-zinc-300" />
              <span>DGDA & NBR Ready</span>
            </div>

            <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Manage your pharmacy, inventory and sales in one place.
            </h1>

            <p className="text-xs xl:text-sm text-zinc-400 leading-relaxed">
              Designed for retail pharmacies, hospital dispensaries, and multi-branch pharmacy chains with real-time FEFO batch control, split-second POS checkout, and bilingual invoices.
            </p>
          </div>

          {/* Subtle Pharmacy Capability Metric Badge (No clutter, crisp monochrome) */}
          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 grid grid-cols-3 gap-2 text-center text-zinc-300">
            <div className="space-y-0.5 border-r border-zinc-800/80 pr-2">
              <span className="text-[10px] font-mono uppercase text-zinc-500 block">Till Speed</span>
              <span className="text-xs font-bold font-mono text-white">&lt; 1.0s Scan</span>
            </div>
            <div className="space-y-0.5 border-r border-zinc-800/80 pr-2">
              <span className="text-[10px] font-mono uppercase text-zinc-500 block">FEFO Safety</span>
              <span className="text-xs font-bold font-mono text-white">100% Tracked</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono uppercase text-zinc-500 block">Outlets</span>
              <span className="text-xs font-bold font-mono text-white">Multi-Branch</span>
            </div>
          </div>

          {/* 4 Core Pharmacy Benefits as requested */}
          <div className="space-y-4 pt-1">
            {/* Benefit 1: Fast POS */}
            <div className="flex items-start gap-3">
              <div className="size-6 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-200 mt-0.5 shrink-0">
                <Zap className="size-3.5" />
              </div>
              <div className="text-xs text-zinc-400 leading-normal">
                <strong className="text-white font-semibold block text-zinc-200">Fast POS Checkout:</strong>
                Sub-second barcode scanning, keyboard hotkeys (F9/F4), 80mm/58mm thermal receipts, and offline till resilience.
              </div>
            </div>

            {/* Benefit 2: FEFO Inventory */}
            <div className="flex items-start gap-3">
              <div className="size-6 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-200 mt-0.5 shrink-0">
                <Boxes className="size-3.5" />
              </div>
              <div className="text-xs text-zinc-400 leading-normal">
                <strong className="text-white font-semibold block text-zinc-200">FEFO Inventory Governance:</strong>
                First-Expiring First-Out batch automation, near-expiry alerts, zero-expired drug safety, and stock reconciliation.
              </div>
            </div>

            {/* Benefit 3: Multi-Branch Support */}
            <div className="flex items-start gap-3">
              <div className="size-6 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-200 mt-0.5 shrink-0">
                <Building2 className="size-3.5" />
              </div>
              <div className="text-xs text-zinc-400 leading-normal">
                <strong className="text-white font-semibold block text-zinc-200">Multi-Branch Management:</strong>
                Centralized chainwide inventory oversight, inter-branch stock transfers, and isolated cash register floats.
              </div>
            </div>

            {/* Benefit 4: Role-Based Security */}
            <div className="flex items-start gap-3">
              <div className="size-6 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-200 mt-0.5 shrink-0">
                <ShieldCheck className="size-3.5" />
              </div>
              <div className="text-xs text-zinc-400 leading-normal">
                <strong className="text-white font-semibold block text-zinc-200">Role-Based Security:</strong>
                Strict multi-tier permission isolation for Super Admins, Branch Managers, Pharmacists, and Cashiers with audit trails.
              </div>
            </div>
          </div>
        </div>

        {/* 3. Bottom: System Status & Security Assurance */}
        <div className="relative z-10 pt-6 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium text-zinc-400 text-[11px]">System Status: Operational</span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-500">
            <span>256-Bit TLS</span>
            <span>·</span>
            <span>Cloud POS</span>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* RIGHT SIDE: Clean, Focused, Elevated Sign-In Workspace            */}
      {/* =================================================================== */}
      <div className="flex flex-col justify-center items-center px-6 py-12 sm:px-12 md:px-16 bg-white dark:bg-zinc-950">
        <div className="w-full max-w-[400px] space-y-7">
          {/* Mobile Branding (Visible only on small screens) */}
          <div className="lg:hidden flex items-center gap-3 pb-2 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex aspect-square size-10 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-xs">
              <Pill className="size-5 text-white" />
            </div>
            <div>
              <span className="font-bold tracking-tight text-foreground text-base">PharmaDaily</span>
              <p className="text-[11px] text-muted-foreground">Pharmacy Management System</p>
            </div>
          </div>

          {/* Form Header */}
          <div className="space-y-1.5 text-left">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
              Welcome back
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
              Sign in to your pharmacy account to access your counter
            </p>
          </div>

          {/* Interactive Login Form Component */}
          <Suspense fallback={<LoginFormSkeleton />}>
            <LoginForm />
          </Suspense>

          {/* Security & Access Notices */}
          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800/80 text-center space-y-1">
            <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400 flex items-center justify-center gap-1.5">
              <ShieldCheck className="size-3.5 text-zinc-500" />
              <span>Secure pharmacy management</span>
            </p>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
              Protected by role-based access control & audit logging
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
