"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Eye,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Filter,
  Paperclip,
  Plus,
  Receipt,
  Search,
  Upload,
  User,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import {
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  type ExpenseInput,
} from "@/features/expenses/schemas";
import { createExpenseAction } from "@/features/expenses/actions";
import { type ExpenseListRow } from "@/features/expenses/queries";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

type CategoryFilter = "All" | (typeof EXPENSE_CATEGORIES)[number];

type Props = {
  expenses: ExpenseListRow[];
  branchId: string | null;
  canAdd: boolean;
  branches?: { id: string; name: string; code: string }[];
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function ExpensesClient({ expenses, branchId, canAdd, branches = [] }: Props) {
  const router = useRouter();

  // Search & Filters
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<CategoryFilter>("All");

  // Pagination
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  // Selected Expense for Detail Inspection Drawer
  const [inspectExpense, setInspectExpense] = React.useState<ExpenseListRow | null>(null);

  // Add Expense Modal State
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [modalCategory, setModalCategory] = React.useState<(typeof EXPENSE_CATEGORIES)[number]>("Rent");
  const [modalAmount, setModalAmount] = React.useState<string>("");
  const [modalDate, setModalDate] = React.useState<string>(todayIso());
  const [modalPaymentMethod, setModalPaymentMethod] = React.useState<string>("Cash");
  const [modalDescription, setModalDescription] = React.useState<string>("");
  const [modalNotes, setModalNotes] = React.useState<string>("");
  const [modalAttachment, setModalAttachment] = React.useState<File | null>(null);
  const [modalAttachmentName, setModalAttachmentName] = React.useState<string>("");
  const [isPending, startTransition] = React.useTransition();
  const [formError, setFormError] = React.useState<string | null>(null);

  // Summary Metrics
  const todayDate = todayIso();
  const currentMonthPrefix = todayDate.slice(0, 7); // "YYYY-MM"

  const summary = React.useMemo(() => {
    let todayTotal = 0;
    let todayCount = 0;
    let monthTotal = 0;
    let monthCount = 0;
    let pendingTotal = 0;
    let pendingCount = 0;

    for (const exp of expenses) {
      const amt = Number(exp.amount) || 0;
      if (exp.expense_date === todayDate) {
        todayTotal += amt;
        todayCount++;
      }
      if (exp.expense_date.startsWith(currentMonthPrefix)) {
        monthTotal += amt;
        monthCount++;
      }
      if (exp.status === "Pending Approval") {
        pendingTotal += amt;
        pendingCount++;
      }
    }

    return {
      todayTotal,
      todayCount,
      monthTotal,
      monthCount,
      pendingTotal,
      pendingCount,
    };
  }, [expenses, todayDate, currentMonthPrefix]);

  // Category counts and amounts
  const categoryStats = React.useMemo(() => {
    const stats: Record<string, { count: number; total: number }> = {};
    for (const cat of EXPENSE_CATEGORIES) {
      stats[cat] = { count: 0, total: 0 };
    }
    for (const exp of expenses) {
      const amt = Number(exp.amount) || 0;
      const catStat = stats[exp.category];
      if (catStat) {
        catStat.count++;
        catStat.total += amt;
      }
    }
    return stats;
  }, [expenses]);

  // Filtered expenses
  const filteredExpenses = React.useMemo(() => {
    return expenses.filter((e) => {
      // Category filter
      if (selectedCategory !== "All" && e.category !== selectedCategory) {
        return false;
      }

      // Search filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const descMatch = (e.description ?? "").toLowerCase().includes(q);
        const catMatch = e.category.toLowerCase().includes(q);
        const userMatch = (e.recorded_by?.name ?? "").toLowerCase().includes(q);
        const payMatch = (e.payment_method ?? "").toLowerCase().includes(q);
        const noteMatch = (e.notes ?? "").toLowerCase().includes(q);
        const amtMatch = String(e.amount).includes(q);

        if (!descMatch && !catMatch && !userMatch && !payMatch && !noteMatch && !amtMatch) {
          return false;
        }
      }

      return true;
    });
  }, [expenses, selectedCategory, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredExpenses.length / pageSize) || 1;
  const paginatedExpenses = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredExpenses.slice(start, start + pageSize);
  }, [filteredExpenses, currentPage, pageSize]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchTerm, pageSize]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setModalAttachment(file);
      setModalAttachmentName(file.name);
    }
  }

  function handleOpenAddModal() {
    setModalCategory("Rent");
    setModalAmount("");
    setModalDate(todayIso());
    setModalPaymentMethod("Cash");
    setModalDescription("");
    setModalNotes("");
    setModalAttachment(null);
    setModalAttachmentName("");
    setFormError(null);
    setIsAddModalOpen(true);
  }

  function handleSaveExpense(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const numAmount = parseFloat(modalAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError("Please enter a valid expense amount greater than zero.");
      return;
    }

    if (!modalDate) {
      setFormError("Please select an expense date.");
      return;
    }

    const targetBranch = branchId ?? (branches[0]?.id || "");
    if (!targetBranch) {
      setFormError("No branch assigned to record this expense.");
      return;
    }

    startTransition(async () => {
      const result = await createExpenseAction(targetBranch, {
        category: modalCategory,
        amount: numAmount,
        expense_date: modalDate,
        payment_method: modalPaymentMethod,
        description: modalDescription.trim() || null,
        notes: modalNotes.trim() || null,
        attachment_name: modalAttachmentName || null,
      } as ExpenseInput);

      if (!result.ok) {
        setFormError(result.error);
        return;
      }

      toast.success("Expense saved successfully", {
        description: `${modalCategory} entry of ${formatCurrency(numAmount)} recorded in ledger.`,
      });

      setIsAddModalOpen(false);
      router.refresh();
    });
  }

  function getStatusPill(status: string) {
    switch (status) {
      case "Approved":
        return (
          <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950">
            <CheckCircle2 className="size-3" />
            <span>Approved</span>
          </span>
        );
      case "Pending Approval":
        return (
          <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-800 border border-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700">
            <Clock className="size-3" />
            <span>Pending Approval</span>
          </span>
        );
      case "Rejected":
        return (
          <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">
            <XCircle className="size-3" />
            <span>Rejected</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700">
            {status}
          </span>
        );
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-5 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1 font-medium">
            <span>Accounting</span>
            <span>/</span>
            <span className="text-foreground font-semibold">Expenses</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Expenses
            </h1>
            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-800 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700">
              ACCOUNTING LEDGER
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Operating costs, store overhead, payroll, utilities, and branch expenditure logs.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.info("Exporting expense ledger to spreadsheet...")}
            className="text-xs h-9 cursor-pointer"
          >
            <Download className="mr-1.5 size-3.5" />
            Export
          </Button>

          {canAdd && (
            <Button
              onClick={handleOpenAddModal}
              className="bg-zinc-950 hover:bg-zinc-850 dark:bg-zinc-100 dark:text-zinc-950 text-xs font-semibold h-9 shadow-xs cursor-pointer"
            >
              <Plus className="mr-1.5 size-3.5" />
              + Add Expense
            </Button>
          )}
        </div>
      </div>

      {/* 2. Summary Cards (Today's Expenses, This Month, Pending Approval) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Today's Expenses */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Today's Expenses
            </span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300">
              <Clock className="size-3.5" />
            </div>
          </div>
          <div className="mt-2.5 font-mono text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 tabular-nums">
            {formatCurrency(summary.todayTotal)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">
              {summary.todayCount}
            </span>{" "}
            disbursement{summary.todayCount === 1 ? "" : "s"} logged today
          </p>
        </div>

        {/* This Month */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              This Month
            </span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300">
              <Calendar className="size-3.5" />
            </div>
          </div>
          <div className="mt-2.5 font-mono text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 tabular-nums">
            {formatCurrency(summary.monthTotal)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">
              {summary.monthCount}
            </span>{" "}
            recorded operating entries
          </p>
        </div>

        {/* Pending Approval */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Pending Approval
            </span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300">
              <Receipt className="size-3.5" />
            </div>
          </div>
          <div className="mt-2.5 font-mono text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 tabular-nums">
            {formatCurrency(summary.pendingTotal)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">
              {summary.pendingCount}
            </span>{" "}
            voucher{summary.pendingCount === 1 ? "" : "s"} awaiting management signoff
          </p>
        </div>
      </div>

      {/* 3. Categories Horizontal Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-zinc-200 shadow-2xs dark:bg-zinc-950 dark:border-zinc-800">
        {/* Search Input */}
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search description, category, staff, payment..."
            className="h-9 pl-9 pr-8 text-xs font-medium bg-zinc-50/70 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 focus:bg-white dark:focus:bg-zinc-900"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Categories Pills (All, Rent, Utilities, Salary, Transport, Maintenance, Supplies, Other) */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setSelectedCategory("All")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer",
              selectedCategory === "All"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs"
                : "bg-zinc-100/80 text-zinc-600 hover:bg-zinc-200/80 dark:bg-zinc-850 dark:text-zinc-400 dark:hover:bg-zinc-800",
            )}
          >
            <span>All</span>
            <span
              className={cn(
                "font-mono text-[10px] px-1.5 py-0.2 rounded-full",
                selectedCategory === "All"
                  ? "bg-zinc-700 text-zinc-100 dark:bg-zinc-300 dark:text-zinc-900"
                  : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
              )}
            >
              {expenses.length}
            </span>
          </button>

          {EXPENSE_CATEGORIES.map((cat) => {
            const stat = categoryStats[cat];
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer",
                  selectedCategory === cat
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs"
                    : "bg-zinc-100/80 text-zinc-600 hover:bg-zinc-200/80 dark:bg-zinc-850 dark:text-zinc-400 dark:hover:bg-zinc-850",
                )}
              >
                <span>{cat}</span>
                {stat && stat.count > 0 && (
                  <span
                    className={cn(
                      "font-mono text-[10px] px-1.5 py-0.2 rounded-full",
                      selectedCategory === cat
                        ? "bg-zinc-700 text-zinc-100 dark:bg-zinc-300 dark:text-zinc-900"
                        : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
                    )}
                  >
                    {stat.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Table (Date, Category, Description, Amount, Payment Method, Added By, Status) */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-2xs overflow-hidden dark:bg-zinc-950 dark:border-zinc-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/80 text-[11px] font-bold tracking-wider text-zinc-500 uppercase dark:border-zinc-800 dark:bg-zinc-900/50">
                {/* 1. Date */}
                <th className="py-3 px-4 min-w-[130px]">Date</th>

                {/* 2. Category */}
                <th className="py-3 px-3 min-w-[130px]">Category</th>

                {/* 3. Description */}
                <th className="py-3 px-3 min-w-[240px]">Description</th>

                {/* 4. Amount */}
                <th className="py-3 px-3 min-w-[130px] text-right">Amount</th>

                {/* 5. Payment Method */}
                <th className="py-3 px-3 min-w-[140px]">Payment Method</th>

                {/* 6. Added By */}
                <th className="py-3 px-3 min-w-[140px]">Added By</th>

                {/* 7. Status */}
                <th className="py-3 pr-4 pl-3 w-36 text-center">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {paginatedExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <Wallet className="size-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-medium">No expenses found.</p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {selectedCategory !== "All"
                        ? `No records found in category "${selectedCategory}".`
                        : "Record an operating expense to log store overhead."}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedExpenses.map((exp) => (
                  <tr
                    key={exp.id}
                    onClick={() => setInspectExpense(exp)}
                    className="group hover:bg-zinc-50/70 dark:hover:bg-zinc-900/40 cursor-pointer transition-colors"
                  >
                    {/* 1. Date */}
                    <td className="py-3.5 px-4 font-mono text-xs text-zinc-700 dark:text-zinc-300">
                      {formatDate(exp.expense_date)}
                    </td>

                    {/* 2. Category */}
                    <td className="py-3.5 px-3">
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-800 dark:bg-zinc-850 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-700">
                        {exp.category}
                      </span>
                    </td>

                    {/* 3. Description */}
                    <td className="py-3.5 px-3">
                      <div className="space-y-0.5 max-w-md">
                        <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block truncate">
                          {exp.description ?? "General operating expense"}
                        </span>
                        {exp.notes && (
                          <span className="text-[11px] text-zinc-400 block truncate">
                            Note: {exp.notes}
                          </span>
                        )}
                        {exp.attachment_url && (
                          <span className="inline-flex items-center gap-1 font-mono text-[10px] text-zinc-500">
                            <Paperclip className="size-2.5" />
                            <span>{exp.attachment_url}</span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 4. Amount */}
                    <td className="py-3.5 px-3 text-right font-mono text-xs font-bold text-zinc-950 dark:text-zinc-50 tabular-nums">
                      {formatCurrency(exp.amount)}
                    </td>

                    {/* 5. Payment Method */}
                    <td className="py-3.5 px-3 text-xs text-zinc-700 dark:text-zinc-300">
                      <span className="font-medium text-xs text-zinc-800 dark:text-zinc-200">
                        {exp.payment_method ?? "Cash"}
                      </span>
                    </td>

                    {/* 6. Added By */}
                    <td className="py-3.5 px-3 text-xs text-zinc-700 dark:text-zinc-300">
                      <div className="flex items-center gap-1.5">
                        <User className="size-3 text-zinc-400" />
                        <span className="truncate max-w-32">
                          {exp.recorded_by?.name ?? "Branch Staff"}
                        </span>
                      </div>
                    </td>

                    {/* 7. Status */}
                    <td className="py-3.5 pr-4 pl-3 text-center">
                      {getStatusPill(exp.status)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 bg-zinc-50/50 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Showing</span>
            <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">
              {filteredExpenses.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–
              {Math.min(currentPage * pageSize, filteredExpenses.length)}
            </span>
            <span>of</span>
            <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">
              {filteredExpenses.length}
            </span>
            <span>disbursements</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="h-7 rounded border border-zinc-300 bg-white px-2 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="h-7 w-7 p-0"
              >
                <ChevronLeft className="size-3.5" />
              </Button>
              <span className="font-mono text-xs text-muted-foreground px-1">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="h-7 w-7 p-0"
              >
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 5. ADD EXPENSE MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-950 w-full max-w-lg rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden my-6">
            {/* Modal Header */}
            <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/40">
              <div>
                <h2 className="text-base font-bold text-zinc-950 dark:text-zinc-50">
                  Add Expense
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Record operating overhead or branch procurement for accounting ledger.
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="size-8 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300">
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Category */}
                <div>
                  <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block mb-1">
                    Category <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={modalCategory}
                    onChange={(e) => setModalCategory(e.target.value as (typeof EXPENSE_CATEGORIES)[number])}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs font-semibold bg-white dark:bg-zinc-900"
                  >
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block mb-1">
                    Amount (৳) <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-zinc-400 font-bold">
                      ৳
                    </span>
                    <Input
                      type="number"
                      min={1}
                      step="any"
                      required
                      value={modalAmount}
                      onChange={(e) => setModalAmount(e.target.value)}
                      placeholder="0.00"
                      className="h-9 pl-7 font-mono text-xs font-bold text-right"
                      autoFocus
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Date */}
                <div>
                  <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block mb-1">
                    Date <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="date"
                    required
                    value={modalDate}
                    max={todayIso()}
                    onChange={(e) => setModalDate(e.target.value)}
                    className="h-9 font-mono text-xs"
                  />
                </div>

                {/* Payment Method */}
                <div>
                  <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block mb-1">
                    Payment Method <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={modalPaymentMethod}
                    onChange={(e) => setModalPaymentMethod(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs font-semibold bg-white dark:bg-zinc-900"
                  >
                    {PAYMENT_METHODS.map((pm) => (
                      <option key={pm} value={pm}>
                        {pm}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block mb-1">
                  Description
                </label>
                <Input
                  value={modalDescription}
                  onChange={(e) => setModalDescription(e.target.value)}
                  placeholder="e.g. Monthly electricity bill or central warehouse premises rent"
                  className="h-9 text-xs"
                />
              </div>

              {/* Attachment */}
              <div>
                <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block mb-1">
                  Attachment (Receipt / Voucher)
                </label>
                <div className="relative rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 p-3 bg-zinc-50/50 dark:bg-zinc-900/30 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-7 items-center justify-center rounded-md bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      <Paperclip className="size-3.5" />
                    </div>
                    <div>
                      <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200 block truncate max-w-xs">
                        {modalAttachmentName || "Upload invoice, bill, or receipt"}
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        Supports PDF, PNG, JPG up to 10MB
                      </span>
                    </div>
                  </div>
                  <label className="cursor-pointer">
                    <span className="px-2.5 py-1 text-xs font-semibold rounded bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors inline-block">
                      Browse
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  placeholder="Optional internal notes, vendor voucher number, or audit comments..."
                  className="w-full p-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs bg-white dark:bg-zinc-900 resize-none"
                />
              </div>

              {/* Modal Buttons: Cancel and Save Expense */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isPending}
                  className="text-xs cursor-pointer"
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={isPending}
                  size="sm"
                  className="bg-zinc-950 text-white hover:bg-zinc-850 dark:bg-zinc-100 dark:text-zinc-950 text-xs font-semibold h-9 px-4 cursor-pointer"
                >
                  {isPending && <Spinner />}
                  Save Expense
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. EXPENSE VOUCHER DETAIL DRAWER */}
      {inspectExpense && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-950 w-full max-w-md h-full border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col overflow-y-auto animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/70 dark:bg-zinc-900/50">
              <div>
                <span className="font-mono text-[10px] uppercase font-bold text-zinc-500 block">
                  EXPENSE VOUCHER
                </span>
                <h3 className="text-lg font-bold text-zinc-950 dark:text-zinc-50 font-mono">
                  {inspectExpense.category}
                </h3>
              </div>
              <button
                onClick={() => setInspectExpense(null)}
                className="size-8 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-5 flex-1 text-xs">
              {/* Amount Display */}
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/40 text-center space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">
                  Disbursed Amount
                </span>
                <div className="font-mono text-3xl font-extrabold text-zinc-950 dark:text-zinc-50 tabular-nums">
                  {formatCurrency(inspectExpense.amount)}
                </div>
                <div className="pt-1 flex items-center justify-center">
                  {getStatusPill(inspectExpense.status)}
                </div>
              </div>

              {/* Voucher Details */}
              <div className="rounded-xl border border-zinc-200 p-4 space-y-3 dark:border-zinc-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Voucher Metadata
                </span>

                <div className="space-y-2">
                  <div className="flex items-center justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
                    <span className="text-muted-foreground">Expense Date:</span>
                    <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">
                      {formatDate(inspectExpense.expense_date)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
                    <span className="text-muted-foreground">Category:</span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {inspectExpense.category}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
                    <span className="text-muted-foreground">Payment Method:</span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {inspectExpense.payment_method}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <span className="text-muted-foreground">Added By:</span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      {inspectExpense.recorded_by?.name ?? "Branch Staff"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description & Notes */}
              <div className="rounded-xl border border-zinc-200 p-4 space-y-2 dark:border-zinc-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Description & Audit Notes
                </span>
                <p className="text-zinc-900 dark:text-zinc-100 leading-relaxed font-medium">
                  {inspectExpense.description ?? "No detailed description provided."}
                </p>
                {inspectExpense.notes && (
                  <div className="mt-2 p-2.5 rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-400">
                    <span className="font-bold block mb-0.5 text-zinc-800 dark:text-zinc-200">
                      Accounting Notes:
                    </span>
                    {inspectExpense.notes}
                  </div>
                )}
              </div>

              {/* Attachment Preview */}
              {inspectExpense.attachment_url && (
                <div className="rounded-xl border border-zinc-200 p-4 space-y-2 dark:border-zinc-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Voucher Receipt Attachment
                  </span>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                      <FileCheck className="size-4 text-emerald-600" />
                      <span className="font-mono text-xs text-zinc-800 dark:text-zinc-200">
                        {inspectExpense.attachment_url}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toast.success("Receipt downloaded for audit")}
                      className="h-7 text-[11px]"
                    >
                      View Receipt
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setInspectExpense(null)}
                className="text-xs cursor-pointer"
              >
                Close
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.info("Printing voucher receipt...")}
                className="text-xs cursor-pointer"
              >
                Print Voucher
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
