import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BarChart3,
  CalendarClock,
  CircleDollarSign,
  PackageX,
  Receipt,
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
import { Badge } from "@/components/ui/badge";
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

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Good day, ${profile.name.split(" ")[0]}`}
        description={
          superAdmin
            ? activeBranch
              ? `Viewing ${activeBranch.name}.`
              : "Viewing every branch."
            : `${profile.branch?.name ?? "Unassigned"} · ${ROLE_LABELS[profile.role]}`
        }
        action={
          <Button asChild variant="outline">
            <Link href="/reports/sales">
              <BarChart3 className="size-4" />
              Reports
            </Link>
          </Button>
        }
      />

      {/* Branch selector. Only a super admin sees it — everyone else has exactly
          one branch, and offering a choice of one is noise. */}
      {superAdmin && branches.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant={branchFilter === null ? "default" : "outline"} size="sm">
            <Link href="/dashboard">All branches</Link>
          </Button>
          {branches.map((branch) => (
            <Button
              key={branch.id}
              asChild
              variant={branchFilter === branch.id ? "default" : "outline"}
              size="sm"
            >
              <Link href={`/dashboard?branch=${branch.id}`}>{branch.name}</Link>
            </Button>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Sales today"
          value={formatCurrency(kpis.revenue)}
          hint={`${kpis.sales_count} invoice${Number(kpis.sales_count) === 1 ? "" : "s"}`}
          icon={Receipt}
        />
        <StatTile
          label="Profit today"
          value={formatCurrency(kpis.profit)}
          hint="Revenue less cost of goods"
          icon={TrendingUp}
        />
        <StatTile
          label="Low stock"
          value={String(lowStock)}
          hint="medicines at or below reorder level"
          icon={TriangleAlert}
          status={lowStock === 0 ? "good" : lowStock > 10 ? "serious" : "warning"}
        />
        <StatTile
          label="Near expiry"
          value={String(nearExpiry)}
          hint={expired > 0 ? `${expired} already expired` : "batches expiring soon"}
          icon={CalendarClock}
          status={expired > 0 ? "critical" : nearExpiry === 0 ? "good" : "warning"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue and profit, last 30 days</CardTitle>
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-1.5">
              <CircleDollarSign className="size-3.5" />
              Collected today
            </CardDescription>
            <CardTitle className="text-xl">{formatCurrency(kpis.collected)}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-1.5">
              <Receipt className="size-3.5" />
              Left on credit today
            </CardDescription>
            <CardTitle
              className={`text-xl ${Number(kpis.outstanding) > 0 ? "text-[var(--viz-warning)]" : ""}`}
            >
              {formatCurrency(kpis.outstanding)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="viz-root">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-1.5">
              <PackageX className="size-3.5" />
              Expired stock on shelf
            </CardDescription>
            <CardTitle className="flex items-center gap-2 text-xl">
              {expired}
              {expired > 0 && (
                <Badge variant="destructive" className="text-[10px]">
                  Remove today
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          {expired > 0 && (
            <CardContent>
              <Button asChild variant="outline" size="sm">
                <Link href="/stock">Review stock</Link>
              </Button>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
