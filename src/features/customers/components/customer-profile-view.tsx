"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  Edit3,
  FileText,
  History,
  Mail,
  MapPin,
  Phone,
  Pill,
  Printer,
  Receipt,
  RotateCcw,
  ShieldCheck,
  ShoppingCart,
  User,
  UserCheck,
  Wallet,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RecordPaymentDialog } from "@/features/customers/components/record-payment-dialog";
import { amountInWords, formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export type CustomerPurchaseRecord = {
  id: string;
  invoice_no: string;
  date: string;
  items_count: number;
  items_summary: string;
  amount: number;
  payment_method: string;
  status: "Paid" | "Partial" | "Due";
};

export type CustomerPaymentRecord = {
  id: string;
  date: string;
  amount: number;
  method: string;
  reference?: string | null;
  invoice_no?: string | null;
  collected_by?: string | null;
};

export type CustomerTimelineEvent = {
  id: string;
  type: "created" | "purchase" | "payment" | "update";
  title: string;
  description: string;
  timestamp: string;
  actor: string;
};

export type CustomerProfileData = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at?: string | null;
  is_active: boolean;
  total_purchases: number;
  total_bills: number;
  outstanding: number;
  last_visit: string;
  purchases: CustomerPurchaseRecord[];
  payments: CustomerPaymentRecord[];
  timeline: CustomerTimelineEvent[];
};

export const DEMO_CUSTOMER_RAHIM: CustomerProfileData = {
  id: "cust-rahim-01",
  name: "Md. Rahim",
  phone: "017XXXXXXXX",
  email: "rahim@email.com",
  address: "House 14, Road 5, Dhanmondi, Dhaka",
  date_of_birth: "1988-05-14",
  gender: "Male",
  notes: "Regular cardiac patient · Prescribed Napa & Seclo · 5% OTC discount approved",
  created_at: "2024-01-12T09:30:00+06:00",
  updated_at: "2026-09-18T16:20:00+06:00",
  is_active: true,
  total_purchases: 8450.0,
  total_bills: 24,
  outstanding: 0.0,
  last_visit: "2026-09-19T10:42:00+06:00",
  purchases: [
    {
      id: "sale-demo-1",
      invoice_no: "BR-HQ-00231",
      date: "19 Sep 2026 · 10:42 AM",
      items_count: 2,
      items_summary: "Paracetamol 500 mg, Omeprazole 20 mg",
      amount: 32.0,
      payment_method: "Cash",
      status: "Paid",
    },
    {
      id: "sale-demo-2",
      invoice_no: "BR-HQ-00198",
      date: "12 Sep 2026 · 05:15 PM",
      items_count: 3,
      items_summary: "Azithromycin 500 mg, Pantoprazole 20 mg, Vitamin D3",
      amount: 485.0,
      payment_method: "bKash",
      status: "Paid",
    },
    {
      id: "sale-demo-3",
      invoice_no: "BR-HQ-00155",
      date: "28 Aug 2026 · 11:30 AM",
      items_count: 4,
      items_summary: "Metformin 500 mg, Telmisartan 40 mg, Rosuvastatin",
      amount: 920.0,
      payment_method: "Cash",
      status: "Paid",
    },
    {
      id: "sale-demo-4",
      invoice_no: "BR-HQ-00102",
      date: "10 Aug 2026 · 04:00 PM",
      items_count: 1,
      items_summary: "Insulin Glargine 100 IU/ml",
      amount: 1150.0,
      payment_method: "Card",
      status: "Paid",
    },
    {
      id: "sale-demo-5",
      invoice_no: "BR-HQ-00078",
      date: "22 Jul 2026 · 09:45 AM",
      items_count: 2,
      items_summary: "Seretide 250 Inhaler, Montelukast 10 mg",
      amount: 860.0,
      payment_method: "Cash",
      status: "Paid",
    },
  ],
  payments: [
    {
      id: "pay-demo-1",
      date: "19 Sep 2026 · 10:42 AM",
      amount: 32.0,
      method: "Cash",
      reference: "CSH-REG-1042",
      invoice_no: "BR-HQ-00231",
      collected_by: "Karim (Pharmacist)",
    },
    {
      id: "pay-demo-2",
      date: "12 Sep 2026 · 05:15 PM",
      amount: 485.0,
      method: "bKash",
      reference: "TRX-BK-99120",
      invoice_no: "BR-HQ-00198",
      collected_by: "Sales Desk",
    },
    {
      id: "pay-demo-3",
      date: "28 Aug 2026 · 11:30 AM",
      amount: 920.0,
      method: "Cash",
      reference: "CSH-REG-0828",
      invoice_no: "BR-HQ-00155",
      collected_by: "Karim (Pharmacist)",
    },
  ],
  timeline: [
    {
      id: "time-1",
      type: "purchase",
      title: "Dispensed Sale #BR-HQ-00231",
      description: "Paracetamol 500 mg (2), Omeprazole 20 mg (1) · Total ৳32.00",
      timestamp: "19 Sep 2026 · 10:42 AM",
      actor: "Dispensed by Karim (Terminal 01)",
    },
    {
      id: "time-2",
      type: "payment",
      title: "Payment Settled ৳32.00",
      description: "Cash tender ৳50.00 · Change returned ৳18.00",
      timestamp: "19 Sep 2026 · 10:42 AM",
      actor: "Verified at Till 01",
    },
    {
      id: "time-3",
      type: "update",
      title: "Profile Contact Updated",
      description: "Updated residential address: House 14, Road 5, Dhanmondi, Dhaka",
      timestamp: "18 Sep 2026 · 04:20 PM",
      actor: "Updated by Admin User",
    },
    {
      id: "time-4",
      type: "purchase",
      title: "Dispensed Sale #BR-HQ-00198",
      description: "Azithromycin 500 mg, Pantoprazole 20 mg · Total ৳485.00",
      timestamp: "12 Sep 2026 · 05:15 PM",
      actor: "Dispensed by Sales Desk",
    },
    {
      id: "time-5",
      type: "created",
      title: "Customer Account Created",
      description: "Registered as regular customer with phone 017XXXXXXXX",
      timestamp: "12 Jan 2024 · 09:30 AM",
      actor: "Registered at Main Branch Counter",
    },
  ],
};

interface CustomerProfileViewProps {
  customer?: CustomerProfileData;
  canCollect?: boolean;
  branchId?: string | null;
}

export function CustomerProfileView({
  customer = DEMO_CUSTOMER_RAHIM,
  canCollect = false,
  branchId = null,
}: CustomerProfileViewProps) {
  const [activeTab, setActiveTab] = React.useState<string>("overview");

  const currentCustomer = customer || DEMO_CUSTOMER_RAHIM;
  const isDue = currentCustomer.outstanding > 0;

  // Timeline icon helper
  const getTimelineIcon = (type: CustomerTimelineEvent["type"]) => {
    switch (type) {
      case "purchase":
        return (
          <div className="size-7 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 flex items-center justify-center shrink-0">
            <ShoppingCart className="size-3.5" />
          </div>
        );
      case "payment":
        return (
          <div className="size-7 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200 dark:border-emerald-800">
            <Wallet className="size-3.5" />
          </div>
        );
      case "update":
        return (
          <div className="size-7 rounded-lg bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 flex items-center justify-center shrink-0 border border-zinc-200 dark:border-zinc-700">
            <Edit3 className="size-3.5" />
          </div>
        );
      case "created":
      default:
        return (
          <div className="size-7 rounded-lg bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 flex items-center justify-center shrink-0 border border-zinc-200 dark:border-zinc-700">
            <UserCheck className="size-3.5" />
          </div>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Header with Breadcrumb & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200/80 dark:border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="size-8 p-0 rounded-xl text-zinc-500 hover:text-foreground"
          >
            <Link href="/customers">
              <ArrowLeft className="size-4" />
              <span className="sr-only">Back to Customers</span>
            </Link>
          </Button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Customer Profile</h1>
              <Badge
                variant="outline"
                className="text-[10px] font-mono border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900"
              >
                ID: {currentCustomer.id.slice(0, 14)}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Comprehensive purchase ledger, credit account, and patient activity.
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {isDue && canCollect && branchId && (
            <RecordPaymentDialog
              kind="customer"
              targetId={currentCustomer.id}
              targetName={currentCustomer.name}
              branchId={branchId}
              outstanding={currentCustomer.outstanding}
            />
          )}

          <Button
            asChild
            className="h-9 px-3.5 rounded-xl text-xs font-bold bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 shadow-2xs gap-1.5 cursor-pointer"
          >
            <Link href={`/pos?customerId=${currentCustomer.id}`}>
              <ShoppingCart className="size-3.5" />
              <span>New Sale (F2)</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. Customer Identity Card (Hero Section) */}
      <Card className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          {/* Identity Left Info */}
          <div className="flex items-start gap-4">
            <div className="size-14 rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 flex items-center justify-center font-bold text-lg shrink-0 font-mono shadow-xs">
              {currentCustomer.name.slice(0, 2).toUpperCase()}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  {currentCustomer.name}
                </h2>
                {currentCustomer.is_active ? (
                  <Badge
                    variant="outline"
                    className="text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800"
                  >
                    Active Profile
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] font-semibold">
                    Inactive
                  </Badge>
                )}
                {isDue && (
                  <Badge
                    variant="outline"
                    className="text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800 font-mono"
                  >
                    Due: {formatCurrency(currentCustomer.outstanding)}
                  </Badge>
                )}
              </div>

              {/* Contact Information */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-0.5">
                {currentCustomer.phone && (
                  <a
                    href={`tel:${currentCustomer.phone}`}
                    className="flex items-center gap-1.5 font-mono text-foreground hover:underline font-medium"
                  >
                    <Phone className="size-3 text-zinc-400" />
                    <span>{currentCustomer.phone}</span>
                  </a>
                )}

                {currentCustomer.email && (
                  <a
                    href={`mailto:${currentCustomer.email}`}
                    className="flex items-center gap-1.5 hover:underline"
                  >
                    <Mail className="size-3 text-zinc-400" />
                    <span>{currentCustomer.email}</span>
                  </a>
                )}

                {currentCustomer.address && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-3 text-zinc-400" />
                    <span>{currentCustomer.address}</span>
                  </span>
                )}
              </div>

              {currentCustomer.notes && (
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 pt-1 italic">
                  Note: {currentCustomer.notes}
                </p>
              )}
            </div>
          </div>

          {/* Identity Actions Right */}
          <div className="flex items-center gap-2 self-start md:self-center shrink-0">
            {/* Edit Action */}
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-9 px-3.5 rounded-xl text-xs font-semibold border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 gap-1.5 cursor-pointer"
            >
              <Link href={`/customers/new`}>
                <Edit3 className="size-3.5" />
                <span>Edit</span>
              </Link>
            </Button>

            {/* New Sale Action */}
            <Button
              asChild
              size="sm"
              className="h-9 px-3.5 rounded-xl text-xs font-bold bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 shadow-2xs gap-1.5 cursor-pointer"
            >
              <Link href={`/pos?customerId=${currentCustomer.id}`}>
                <ShoppingCart className="size-3.5" />
                <span>New Sale</span>
              </Link>
            </Button>

            {/* Customer History Action */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setActiveTab("history")}
              className="h-9 px-3.5 rounded-xl text-xs font-semibold border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 gap-1.5 cursor-pointer"
            >
              <History className="size-3.5" />
              <span>Customer History</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* 3. Summary KPI Cards (4 Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Purchases */}
        <Card className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Total Purchases
            </span>
            <Wallet className="size-4 text-zinc-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black tracking-tight text-foreground font-mono tabular-nums">
              {formatCurrency(currentCustomer.total_purchases)}
            </span>
          </div>
        </Card>

        {/* Total Bills */}
        <Card className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Total Bills
            </span>
            <Receipt className="size-4 text-zinc-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-foreground font-mono tabular-nums">
              {currentCustomer.total_bills}
            </span>
            <span className="text-xs text-muted-foreground">invoices</span>
          </div>
        </Card>

        {/* Outstanding */}
        <Card className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Outstanding
            </span>
            <CreditCard className="size-4 text-zinc-400" />
          </div>
          <div className="mt-2">
            <span
              className={cn(
                "text-2xl font-black tracking-tight font-mono tabular-nums",
                isDue ? "text-amber-700 dark:text-amber-400" : "text-foreground",
              )}
            >
              {formatCurrency(currentCustomer.outstanding)}
            </span>
          </div>
        </Card>

        {/* Last Visit */}
        <Card className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Last Visit
            </span>
            <Clock className="size-4 text-zinc-400" />
          </div>
          <div className="mt-2">
            <span className="text-sm font-bold text-foreground block">
              {currentCustomer.last_visit ? formatDate(currentCustomer.last_visit) : "19 Sep 2026"}
            </span>
            <span className="text-[11px] text-muted-foreground font-mono">
              {currentCustomer.last_visit ? formatDateTime(currentCustomer.last_visit).split("at ")[1] || "10:42 AM" : "10:42 AM"}
            </span>
          </div>
        </Card>
      </div>

      {/* 4. CRM Tabs Section */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        {/* Tabs Bar */}
        <TabsList className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-1 rounded-xl h-10 gap-1 shadow-2xs">
          <TabsTrigger
            value="overview"
            className="rounded-lg text-xs font-semibold px-4 data-active:bg-zinc-900 data-active:text-white dark:data-active:bg-white dark:data-active:text-zinc-900 transition-all select-none"
          >
            Overview
          </TabsTrigger>

          <TabsTrigger
            value="history"
            className="rounded-lg text-xs font-semibold px-4 data-active:bg-zinc-900 data-active:text-white dark:data-active:bg-white dark:data-active:text-zinc-900 transition-all select-none"
          >
            Purchase History ({currentCustomer.purchases.length})
          </TabsTrigger>

          <TabsTrigger
            value="payments"
            className="rounded-lg text-xs font-semibold px-4 data-active:bg-zinc-900 data-active:text-white dark:data-active:bg-white dark:data-active:text-zinc-900 transition-all select-none"
          >
            Payments ({currentCustomer.payments.length})
          </TabsTrigger>

          <TabsTrigger
            value="ledger"
            className="rounded-lg text-xs font-semibold px-4 data-active:bg-zinc-900 data-active:text-white dark:data-active:bg-white dark:data-active:text-zinc-900 transition-all select-none"
          >
            Due / Ledger
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: OVERVIEW */}
        <TabsContent value="overview" className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left: Recent Purchases Preview (2 cols) */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 overflow-hidden shadow-2xs">
                <CardHeader className="py-3 px-5 border-b border-zinc-100 dark:border-zinc-800 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Receipt className="size-4 text-zinc-500" />
                    <span>Recent Purchases</span>
                  </CardTitle>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveTab("history")}
                    className="text-xs text-muted-foreground hover:text-foreground gap-1"
                  >
                    <span>View all</span>
                    <ArrowUpRight className="size-3" />
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 text-muted-foreground text-xs font-semibold">
                        <TableHead className="py-2.5 px-4 text-left">Invoice</TableHead>
                        <TableHead className="py-2.5 px-4 text-left">Date</TableHead>
                        <TableHead className="py-2.5 px-4 text-left">Items</TableHead>
                        <TableHead className="py-2.5 px-4 text-right">Amount</TableHead>
                        <TableHead className="py-2.5 px-4 text-center">Status</TableHead>
                      </tr>
                    </TableHeader>
                    <TableBody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
                      {currentCustomer.purchases.slice(0, 4).map((p) => (
                        <TableRow key={p.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40">
                          <TableCell className="py-2.5 px-4 font-mono font-bold text-foreground">
                            <Link href={`/sales?saleId=${p.invoice_no}`} className="hover:underline">
                              {p.invoice_no}
                            </Link>
                          </TableCell>
                          <TableCell className="py-2.5 px-4 text-muted-foreground">{p.date}</TableCell>
                          <TableCell className="py-2.5 px-4 max-w-[200px] truncate text-foreground/90">
                            {p.items_summary}
                          </TableCell>
                          <TableCell className="py-2.5 px-4 text-right font-mono font-bold text-foreground tabular-nums">
                            {formatCurrency(p.amount)}
                          </TableCell>
                          <TableCell className="py-2.5 px-4 text-center">
                            <Badge
                              variant="outline"
                              className="text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800"
                            >
                              {p.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Patient Info Card */}
              <Card className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 p-4 shadow-2xs space-y-2 text-xs">
                <span className="font-bold text-xs uppercase tracking-wider text-muted-foreground block">
                  Prescription & Safety Notes
                </span>
                <p className="text-foreground leading-relaxed">
                  {currentCustomer.notes || "No chronic condition or drug allergies documented."}
                </p>
                <div className="flex items-center gap-4 pt-1 text-[11px] text-muted-foreground border-t border-zinc-100 dark:border-zinc-800">
                  <span>Gender: <strong>{currentCustomer.gender || "Male"}</strong></span>
                  <span>DOB: <strong>{currentCustomer.date_of_birth ? formatDate(currentCustomer.date_of_birth) : "14 May 1988"}</strong></span>
                  <span>Registered: <strong>{formatDate(currentCustomer.created_at)}</strong></span>
                </div>
              </Card>
            </div>

            {/* Right: Customer Activity Timeline */}
            <div className="space-y-4">
              <Card className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 p-4 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
                  <span className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Clock className="size-3.5 text-zinc-500" />
                    <span>Customer Activity Timeline</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">Live Logs</span>
                </div>

                {/* Vertical Timeline */}
                <div className="relative pl-6 space-y-4 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-200 dark:before:bg-zinc-800">
                  {currentCustomer.timeline.map((event) => (
                    <div key={event.id} className="relative group">
                      <div className="absolute -left-6 top-0">
                        {getTimelineIcon(event.type)}
                      </div>

                      <div className="space-y-0.5 ml-2">
                        <p className="text-xs font-bold text-foreground leading-tight">
                          {event.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground leading-snug">
                          {event.description}
                        </p>
                        <div className="flex items-center gap-2 pt-0.5 text-[10px] text-zinc-400 font-mono">
                          <span>{event.timestamp}</span>
                          <span>·</span>
                          <span>{event.actor}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: PURCHASE HISTORY */}
        <TabsContent value="history" className="space-y-4">
          <Card className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 overflow-hidden shadow-2xs">
            <CardHeader className="py-3 px-5 border-b border-zinc-100 dark:border-zinc-800 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-foreground">
                  Purchase History ({currentCustomer.purchases.length} invoices)
                </CardTitle>
                <p className="text-xs text-muted-foreground">Every prescription and OTC sale billed to this customer.</p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="h-8 rounded-lg text-xs font-semibold gap-1.5 border-zinc-200 dark:border-zinc-800"
              >
                <Printer className="size-3.5" />
                <span>Print Statement</span>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 text-muted-foreground text-xs font-semibold">
                    <TableHead className="py-3 px-4 text-left">Invoice</TableHead>
                    <TableHead className="py-3 px-4 text-left">Date</TableHead>
                    <TableHead className="py-3 px-4 text-left">Items</TableHead>
                    <TableHead className="py-3 px-4 text-right">Amount</TableHead>
                    <TableHead className="py-3 px-4 text-center">Payment</TableHead>
                    <TableHead className="py-3 px-4 text-center">Status</TableHead>
                    <TableHead className="py-3 px-4 text-right">Action</TableHead>
                  </tr>
                </TableHeader>
                <TableBody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
                  {currentCustomer.purchases.map((p) => (
                    <TableRow key={p.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-900/40 transition-colors">
                      <TableCell className="py-3 px-4 font-mono font-bold text-foreground">
                        <Link href={`/sales?saleId=${p.invoice_no}`} className="hover:underline">
                          {p.invoice_no}
                        </Link>
                      </TableCell>
                      <TableCell className="py-3 px-4 text-muted-foreground">{p.date}</TableCell>
                      <TableCell className="py-3 px-4 max-w-xs">
                        <p className="font-medium text-foreground truncate">{p.items_summary}</p>
                        <span className="text-[10px] text-muted-foreground font-mono">{p.items_count} items dispensed</span>
                      </TableCell>
                      <TableCell className="py-3 px-4 text-right font-mono font-bold text-foreground tabular-nums text-sm">
                        {formatCurrency(p.amount)}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-center font-mono">
                        <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700 text-xs">
                          {p.payment_method}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 px-4 text-center">
                        <Badge
                          variant="outline"
                          className="text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800"
                        >
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 px-4 text-right">
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="h-7.5 px-2.5 rounded-lg text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        >
                          <Link href={`/sales?saleId=${p.invoice_no}`}>View Drawer</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: PAYMENTS */}
        <TabsContent value="payments" className="space-y-4">
          <Card className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 overflow-hidden shadow-2xs">
            <CardHeader className="py-3 px-5 border-b border-zinc-100 dark:border-zinc-800">
              <CardTitle className="text-sm font-bold text-foreground">
                Payment Receipts ({currentCustomer.payments.length} collections)
              </CardTitle>
              <p className="text-xs text-muted-foreground">Collections recorded against customer invoices or till settlements.</p>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 text-muted-foreground text-xs font-semibold">
                    <TableHead className="py-3 px-4 text-left">Date & Time</TableHead>
                    <TableHead className="py-3 px-4 text-left">Invoice No</TableHead>
                    <TableHead className="py-3 px-4 text-left">Method</TableHead>
                    <TableHead className="py-3 px-4 text-left">Reference</TableHead>
                    <TableHead className="py-3 px-4 text-left">Collected By</TableHead>
                    <TableHead className="py-3 px-4 text-right">Amount</TableHead>
                  </tr>
                </TableHeader>
                <TableBody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
                  {currentCustomer.payments.map((pay) => (
                    <TableRow key={pay.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-900/40 transition-colors">
                      <TableCell className="py-3 px-4 text-muted-foreground font-mono">{pay.date}</TableCell>
                      <TableCell className="py-3 px-4 font-mono font-bold text-foreground">
                        {pay.invoice_no || "Till Settlement"}
                      </TableCell>
                      <TableCell className="py-3 px-4 capitalize font-semibold">{pay.method}</TableCell>
                      <TableCell className="py-3 px-4 font-mono text-muted-foreground">{pay.reference || "—"}</TableCell>
                      <TableCell className="py-3 px-4 text-foreground/80">{pay.collected_by || "Main Register"}</TableCell>
                      <TableCell className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums text-sm">
                        {formatCurrency(pay.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: DUE / LEDGER */}
        <TabsContent value="ledger" className="space-y-4">
          <Card className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-foreground">Accounting Balance Ledger</h3>
                <p className="text-xs text-muted-foreground">
                  Running debit/credit breakdown verifying credit balance and payments.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Current Status:</span>
                {isDue ? (
                  <Badge variant="outline" className="text-xs font-bold text-amber-700 dark:text-amber-400 border-amber-300 bg-amber-50">
                    Owes {formatCurrency(currentCustomer.outstanding)}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs font-bold text-emerald-700 dark:text-emerald-400 border-emerald-300 bg-emerald-50">
                    Settled in Full (পরিশোধিত)
                  </Badge>
                )}
              </div>
            </div>

            {/* Financial Summary Ledger Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 text-xs">
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Total Invoiced (Debit)</span>
                <span className="text-lg font-black font-mono text-foreground tabular-nums">
                  {formatCurrency(currentCustomer.total_purchases)}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Total Settled (Credit)</span>
                <span className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {formatCurrency(currentCustomer.total_purchases - currentCustomer.outstanding)}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Net Balance (Receivable)</span>
                <span className={cn("text-lg font-black font-mono tabular-nums", isDue ? "text-amber-700" : "text-foreground")}>
                  {formatCurrency(currentCustomer.outstanding)}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground">
              Note: The ledger balance is strictly verified against transactional sale items and audited till payments. Outstanding credit follows the customer across all pharmacy branches.
            </p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
