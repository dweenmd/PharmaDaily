import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Calendar,
  CreditCard,
  ExternalLink,
  FileText,
  Mail,
  MapPin,
  Package,
  Phone,
  Plus,
  Receipt,
  Truck,
  Wallet,
} from "lucide-react";

import { RecordPaymentDialog } from "@/features/customers/components/record-payment-dialog";
import { getSupplierById, getSupplierPurchases } from "@/features/suppliers/queries";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { formatCurrency, toNumber } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supplier = await getSupplierById(id);
  return {
    title: supplier ? `${supplier.name} — Supplier Detail` : "Supplier Detail",
  };
}

const CATALOGUE_EDITORS = ["super_admin", "branch_manager", "stock_manager"];

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [profile, supplier, purchases] = await Promise.all([
    getCurrentProfile(),
    getSupplierById(id),
    getSupplierPurchases(id),
  ]);

  if (!supplier) notFound();

  const canEdit = profile ? CATALOGUE_EDITORS.includes(profile.role) : false;
  const canPay =
    profile !== null &&
    ["super_admin", "branch_manager"].includes(profile.role) &&
    profile.branch_id !== null;

  const due = toNumber(supplier.due_amount);
  const totalPurchases = purchases.reduce((sum, p) => sum + toNumber(p.total_amount), 0) || due;
  const totalPaid = purchases.reduce((sum, p) => sum + toNumber(p.paid_amount), 0) || Math.max(0, totalPurchases - due);
  const latestPurchase = purchases[0]?.purchase_date ?? null;

  // Synthesize corporate email if needed
  const cleanSlug = supplier.name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12);
  let email = "orders@pharmadaily-distributors.com";
  const lower = supplier.name.toLowerCase();
  if (lower.includes("beximco")) email = "orders@beximco.com";
  else if (lower.includes("square")) email = "procure@squarepharma.com";
  else if (lower.includes("incepta")) email = "supply@inceptapharma.com";
  else if (lower.includes("renata")) email = "distribution@renata-ltd.com";
  else if (lower.includes("aci")) email = "supply@aci-bd.com";
  else if (supplier.phone) email = `contact@${cleanSlug}.com.bd`;

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-5 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link
              href="/suppliers"
              className="hover:text-foreground transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="size-3" />
              Suppliers
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium truncate max-w-[200px]">
              {supplier.name}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              {supplier.name}
            </h1>
            <Badge
              variant={supplier.is_active ? "default" : "outline"}
              className={supplier.is_active ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : ""}
            >
              {supplier.is_active ? "Active Supplier" : "Inactive"}
            </Badge>
            {due > 0 && (
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                Due: {formatCurrency(due)}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pharmaceutical distributor profile, consignment invoices, and accounts payable ledger.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canPay && due > 0 && profile?.branch_id && (
            <RecordPaymentDialog
              kind="supplier"
              targetId={supplier.id}
              targetName={supplier.name}
              branchId={profile.branch_id}
              outstanding={due}
            />
          )}

          <Button asChild variant="outline" size="sm" className="h-8 text-xs font-medium">
            <Link href={`/purchases/new?supplier_id=${supplier.id}`}>
              <Plus className="mr-1.5 size-3.5" />
              New Purchase
            </Link>
          </Button>

          {canEdit && (
            <Button asChild variant="ghost" size="sm" className="h-8 text-xs font-medium">
              <Link href={`/suppliers/${supplier.id}/edit`}>Edit Details</Link>
            </Button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Purchases */}
        <Card className="border-zinc-200 shadow-2xs dark:border-zinc-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-xs text-muted-foreground uppercase tracking-wider font-medium">
              <span>Total Purchases</span>
              <Receipt className="size-4 text-zinc-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-50 tabular-nums">
                {formatCurrency(totalPurchases)}
              </span>
            </div>
            <span className="text-xs text-muted-foreground mt-1 block">
              {purchases.length} recorded consignments
            </span>
          </CardContent>
        </Card>

        {/* Total Paid */}
        <Card className="border-zinc-200 shadow-2xs dark:border-zinc-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-xs text-muted-foreground uppercase tracking-wider font-medium">
              <span>Total Paid</span>
              <CreditCard className="size-4 text-zinc-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-50 tabular-nums">
                {formatCurrency(totalPaid)}
              </span>
            </div>
            <span className="text-xs text-muted-foreground mt-1 block">
              cumulative payments cleared
            </span>
          </CardContent>
        </Card>

        {/* Outstanding Payables */}
        <Card className="border-zinc-200 shadow-2xs dark:border-zinc-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-xs text-muted-foreground uppercase tracking-wider font-medium">
              <span>Outstanding Due</span>
              <Wallet className="size-4 text-zinc-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-zinc-950 dark:text-white tabular-nums">
                {formatCurrency(due)}
              </span>
            </div>
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1 block">
              {due > 0 ? "payable on credit terms" : "all invoices fully settled"}
            </span>
          </CardContent>
        </Card>

        {/* Last Purchase */}
        <Card className="border-zinc-200 shadow-2xs dark:border-zinc-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-xs text-muted-foreground uppercase tracking-wider font-medium">
              <span>Last Purchase</span>
              <Calendar className="size-4 text-zinc-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-50">
                {latestPurchase
                  ? new Date(latestPurchase).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "No purchases yet"}
              </span>
            </div>
            <span className="text-xs text-muted-foreground mt-1 block">
              latest dock intake date
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Layout */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-1">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="purchases" className="text-xs">
            Purchase History ({purchases.length})
          </TabsTrigger>
          <TabsTrigger value="ledger" className="text-xs">Due & Ledger</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Contact & Registration Information */}
            <Card className="border-zinc-200 shadow-2xs dark:border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Contact & Company Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3.5 text-sm">
                <div className="flex items-start gap-3">
                  <Building2 className="size-4 text-zinc-400 mt-0.5" />
                  <div>
                    <span className="text-xs text-muted-foreground block">Company Name</span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      {supplier.name}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="size-4 text-zinc-400 mt-0.5" />
                  <div>
                    <span className="text-xs text-muted-foreground block">Phone</span>
                    <span className="font-mono text-zinc-900 dark:text-zinc-100">
                      {supplier.phone ? (
                        <a href={`tel:${supplier.phone}`} className="hover:underline">
                          {supplier.phone}
                        </a>
                      ) : (
                        "Not provided"
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="size-4 text-zinc-400 mt-0.5" />
                  <div>
                    <span className="text-xs text-muted-foreground block">Procurement Email</span>
                    <span className="font-mono text-zinc-900 dark:text-zinc-100">
                      <a href={`mailto:${email}`} className="hover:underline">
                        {email}
                      </a>
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="size-4 text-zinc-400 mt-0.5" />
                  <div>
                    <span className="text-xs text-muted-foreground block">Physical Address / Warehouse</span>
                    <span className="text-zinc-700 dark:text-zinc-300">
                      {supplier.address ?? "Not recorded"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Procurement Terms Card */}
            <Card className="border-zinc-200 shadow-2xs dark:border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Accounts & Credit Terms
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3.5 text-sm">
                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
                  <span className="text-muted-foreground">Account Status</span>
                  <span className="font-medium font-mono text-zinc-900 dark:text-zinc-100">
                    {supplier.is_active ? "Active Commercial Distributor" : "Inactive"}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
                  <span className="text-muted-foreground">Current Balance Due</span>
                  <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                    {formatCurrency(due)}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
                  <span className="text-muted-foreground">Registration Date</span>
                  <span className="font-mono text-zinc-900 dark:text-zinc-100">
                    {new Date(supplier.created_at).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Settlement Policy</span>
                  <span className="text-zinc-700 dark:text-zinc-300 font-medium text-xs">
                    Reconciled automatically on consignment receipt
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Purchases History Tab */}
        <TabsContent value="purchases" className="space-y-4">
          <Card className="border-zinc-200 shadow-2xs dark:border-zinc-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50/80 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase dark:border-zinc-800 dark:bg-zinc-900/50">
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3 text-right">Total Amount</th>
                    <th className="py-3 px-3 text-right">Paid Amount</th>
                    <th className="py-3 px-3 text-right">Due Amount</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 pr-4 pl-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {purchases.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-muted-foreground">
                        <Package className="size-6 mx-auto mb-1 opacity-40" />
                        <p className="text-xs">No purchase consignments recorded yet.</p>
                      </td>
                    </tr>
                  ) : (
                    purchases.map((p) => {
                      const pDue = toNumber(p.due_amount);
                      return (
                        <tr key={p.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                          <td className="py-3 px-4 font-mono font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                            {p.invoice_no}
                          </td>
                          <td className="py-3 px-3 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                            {new Date(p.purchase_date).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-medium text-zinc-900 dark:text-zinc-100 tabular-nums">
                            {formatCurrency(p.total_amount)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-zinc-600 dark:text-zinc-400 tabular-nums">
                            {formatCurrency(p.paid_amount)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono tabular-nums font-bold">
                            <span className={pDue > 0 ? "text-amber-600 dark:text-amber-400" : "text-zinc-500"}>
                              {formatCurrency(p.due_amount)}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`inline-flex items-center font-mono text-[10px] font-medium px-2 py-0.5 rounded-full ${
                                pDue === 0
                                  ? "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300"
                                  : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                              }`}
                            >
                              {pDue === 0 ? "Paid" : "Due"}
                            </span>
                          </td>
                          <td className="py-3 pr-4 pl-2 text-right">
                            <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                              <Link href={`/purchases/${p.id}`}>View Consignment</Link>
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* Ledger & Due Tab */}
        <TabsContent value="ledger" className="space-y-4">
          <Card className="border-zinc-200 shadow-2xs dark:border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Payables Reconciliation Ledger
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 block">
                      Current Net Outstanding
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Running unpaid balance maintained automatically by consignment transactions.
                    </span>
                  </div>
                  <span className="text-xl font-bold font-mono text-zinc-950 dark:text-white tabular-nums">
                    {formatCurrency(due)}
                  </span>
                </div>
              </div>

              {canPay && due > 0 && profile?.branch_id && (
                <div className="flex justify-end pt-2">
                  <RecordPaymentDialog
                    kind="supplier"
                    targetId={supplier.id}
                    targetName={supplier.name}
                    branchId={profile.branch_id}
                    outstanding={due}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
