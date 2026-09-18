import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BarChart3,
  CalendarClock,
  CircleDollarSign,
  PackageX,
  Receipt,
  ShoppingCart,
  TrendingUp,
  TriangleAlert,
} from "lucide-react";

import { getAccessibleBranches } from "@/features/branches/queries";
import { getDashboardKpis, getSalesTrend } from "@/features/reports/queries";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { ROLE_LABELS, isSuperAdmin } from "@/lib/auth/roles";
import { formatCurrency } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { StatTile } from "@/components/shared/stat-tile";
import { TrendChart } from "@/components/shared/trend-chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Dashboard",
};

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const params = await searchParams;
  const superAdmin = isSuperAdmin(profile.role);

  // Mirrors can_sell() in the database and the sidebar's own CAN_SELL — a
  // pharmacist sells too, and a stock manager does not.
  const canSell = ["super_admin", "branch_manager", "cashier", "pharmacist"].includes(profile.role);
  const canViewReports = ["super_admin", "branch_manager"].includes(profile.role);

  const branches = await getAccessibleBranches();

  // A super admin may narrow to one branch; everyone else is already narrowed
  // by RLS, so passing their own branch id changes nothing — it is here only so
  // the page reads the same either way.
  const requestedBranch = typeof params.branch === "string" ? params.branch : null;
  const branchFilter = superAdmin
    ? branches.some((b) => b.id === requestedBranch)
      ? requestedBranch
      : null
    : profile.branch_id;

  const today = new Date().toISOString().slice(0, 10);

  const [kpis, trend] = await Promise.all([
    getDashboardKpis(today, branchFilter),
    getSalesTrend(isoDaysAgo(29), today, branchFilter),
  ]);

  const activeBranch = branches.find((b) => b.id === branchFilter) ?? null;

  const lowStock = Number(kpis.low_stock_count);
  const nearExpiry = Number(kpis.near_expiry_count);
  const expired = Number(kpis.expired_count);

  const todayFormatted = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date());

  const branchDisplayName = superAdmin
    ? activeBranch
      ? activeBranch.name
      : "All Branches"
    : profile.branch?.name ?? "Unassigned";

  return (
    <div className="space-y-6">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card to-accent/30 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {branchDisplayName}
              </span>
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                {ROLE_LABELS[profile.role]}
              </span>
              <span className="text-xs text-muted-foreground hidden sm:inline-block">
                • {todayFormatted}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Welcome back, {profile.name.split(" ")[0]}
            </h1>
            <p className="text-sm text-muted-foreground max-w-xl">
              Here is your branch performance and real-time inventory overview for today.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {canSell && (
              <Button asChild size="default" className="shadow-xs font-medium">
                <Link href="/pos">
                  <ShoppingCart className="size-4 mr-1.5" />
                  Point of Sale
                  <span className="ml-2 rounded bg-primary-foreground/20 px-1.5 py-0.5 text-[10px] font-bold">F2</span>
                </Link>
              </Button>
            )}
            {canViewReports && (
              <Button asChild variant="outline" size="default" className="shadow-xs font-medium">
                <Link href="/reports/sales">
                  <BarChart3 className="size-4 mr-1.5 text-muted-foreground" />
                  Reports
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Super admin branch filter pills */}
        {superAdmin && branches.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border/50 flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground mr-1">Filter branch:</span>
            <Button
              asChild
              variant={branchFilter === null ? "default" : "ghost"}
              size="xs"
              className="rounded-full text-xs"
            >
              <Link href="/dashboard">All</Link>
            </Button>
            {branches.map((b) => (
              <Button
                key={b.id}
                asChild
                variant={branchFilter === b.id ? "default" : "ghost"}
                size="xs"
                className="rounded-full text-xs"
              >
                <Link href={`/dashboard?branch=${b.id}`}>{b.name}</Link>
              </Button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile
          label="Sales today"
          value={formatCurrency(kpis.revenue)}
          hint={`${kpis.sales_count} invoice${Number(kpis.sales_count) === 1 ? "" : "s"}`}
          icon={Receipt}
          href="/sales"
        />
        <StatTile
          label="Profit today"
          value={formatCurrency(kpis.profit)}
          hint="Revenue less cost of goods"
          icon={TrendingUp}
          href="/reports/profit"
        />
        <StatTile
          label="Low stock"
          value={String(lowStock)}
          hint="medicines at or below reorder level"
          icon={TriangleAlert}
          status={lowStock === 0 ? "good" : lowStock > 10 ? "serious" : "warning"}
          href="/stock/low"
        />
        <StatTile
          label="Near expiry"
          value={String(nearExpiry)}
          hint={expired > 0 ? `${expired} already expired` : "batches expiring soon"}
          icon={CalendarClock}
          status={expired > 0 ? "critical" : nearExpiry === 0 ? "good" : "warning"}
          href="/stock"
        />
      </div>

      <Card className="rounded-xl border border-border/80 bg-card shadow-xs">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Revenue and profit, last 30 days</CardTitle>
            <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground font-medium">Daily trend</span>
          </div>
          <CardDescription>
            Profit uses the cost recorded on each sale line at the time it was sold.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TrendChart
            points={trend.map((p) => ({
              day: p.day,
              revenue: Number(p.revenue),
              profit: Number(p.profit),
            }))}
          />
        </CardContent>
      </Card>

      {/*
        Same shape as the row above, deliberately: these were three
        hand-rolled cards with their own type scale and padding, which read as
        a different kind of thing sitting under four tiles that say exactly
        the same kind of thing — a labelled number. One component, one
        rhythm, and each one now leads somewhere.
      */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <StatTile
          label="Collected today"
          value={formatCurrency(kpis.collected)}
          hint="cash and digital, at the till"
          icon={CircleDollarSign}
          href="/cash"
        />
        <StatTile
          label="Left on credit today"
          value={formatCurrency(kpis.outstanding)}
          hint="owed by customers"
          icon={Receipt}
          status={Number(kpis.outstanding) > 0 ? "warning" : "good"}
          href="/customers?owing=1"
        />
        <StatTile
          label="Expired stock on shelf"
          value={String(expired)}
          hint={expired > 0 ? "remove from sale today" : "nothing expired"}
          icon={PackageX}
          status={expired > 0 ? "critical" : "good"}
          href="/stock"
        />
      </div>
    </div>
  );
}
