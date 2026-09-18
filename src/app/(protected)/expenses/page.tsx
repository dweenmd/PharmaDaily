import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getAccessibleBranches } from "@/features/branches/queries";
import { ExpensesClient } from "@/features/expenses/components/expenses-client";
import { getExpenses, type ExpenseListRow } from "@/features/expenses/queries";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";

export const metadata: Metadata = {
  title: "Expenses — PharmaDaily",
  description: "Minimal monochrome operating costs, overhead, and branch expenditure ledger.",
};

const CAN_VIEW = ["super_admin", "branch_manager", "stock_manager"];
const CAN_ADD = ["super_admin", "branch_manager"];

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

const DEMO_EXPENSES: ExpenseListRow[] = [
  {
    id: "00000000-0000-0000-0000-000000000081",
    category: "Supplies",
    description: "Thermal receipt paper rolls & prescription dispensing packets",
    amount: 1850,
    expense_date: "2026-09-19",
    branch_id: "00000000-0000-0000-0000-000000000001",
    created_at: "2026-09-19T02:40:00.000Z",
    recorded_by: { id: "u2", name: "Kazi Anam" },
    branch: { id: "00000000-0000-0000-0000-000000000001", code: "MB-01", name: "Main Branch" },
    payment_method: "Cash",
    status: "Approved",
    notes: "Prime Paper Mart Invoice #PPM-9102",
    attachment_url: "receipt_supplies_sep19.pdf",
  },
  {
    id: "00000000-0000-0000-0000-000000000082",
    category: "Transport",
    description: "Urgent transfer parcel delivery van courier to Dhanmondi Outlet",
    amount: 450,
    expense_date: "2026-09-19",
    branch_id: "00000000-0000-0000-0000-000000000001",
    created_at: "2026-09-19T01:15:00.000Z",
    recorded_by: { id: "u1", name: "Dr. Tanvir Ahmed" },
    branch: { id: "00000000-0000-0000-0000-000000000001", code: "MB-01", name: "Main Branch" },
    payment_method: "bKash / MFS",
    status: "Approved",
    notes: "Delivery for Transfer #TRF-2026-0042",
    attachment_url: "bkash_trf_courier.png",
  },
  {
    id: "00000000-0000-0000-0000-000000000083",
    category: "Maintenance",
    description: "Cold chain vaccine refrigerator thermostat calibration & gasket seal",
    amount: 3500,
    expense_date: "2026-09-19",
    branch_id: "00000000-0000-0000-0000-000000000002",
    created_at: "2026-09-19T00:30:00.000Z",
    recorded_by: { id: "u3", name: "Ashraf Hossain" },
    branch: { id: "00000000-0000-0000-0000-000000000002", code: "DH-02", name: "Dhanmondi Outlet" },
    payment_method: "Cash",
    status: "Pending Approval",
    notes: "Awaiting store manager approval signature",
    attachment_url: "cooling_service_bill.pdf",
  },
  {
    id: "00000000-0000-0000-0000-000000000084",
    category: "Rent",
    description: "Main Branch premises commercial floor lease installment",
    amount: 65000,
    expense_date: "2026-09-15",
    branch_id: "00000000-0000-0000-0000-000000000001",
    created_at: "2026-09-15T09:00:00.000Z",
    recorded_by: { id: "u1", name: "Dr. Tanvir Ahmed" },
    branch: { id: "00000000-0000-0000-0000-000000000001", code: "MB-01", name: "Main Branch" },
    payment_method: "Bank Transfer",
    status: "Approved",
    notes: "City Bank Cheque A/C 0921-2291",
    attachment_url: "rent_receipt_sep2026.pdf",
  },
  {
    id: "00000000-0000-0000-0000-000000000085",
    category: "Salary",
    description: "Night shift registered pharmacists and dispenser monthly payroll",
    amount: 142000,
    expense_date: "2026-09-10",
    branch_id: "00000000-0000-0000-0000-000000000001",
    created_at: "2026-09-10T08:00:00.000Z",
    recorded_by: { id: "u4", name: "Farhana Islam" },
    branch: { id: "00000000-0000-0000-0000-000000000001", code: "MB-01", name: "Main Branch" },
    payment_method: "Bank Transfer",
    status: "Approved",
    notes: "Direct payroll bank transfer advice",
    attachment_url: "payroll_statement_sep.pdf",
  },
  {
    id: "00000000-0000-0000-0000-000000000086",
    category: "Utilities",
    description: "DESCO commercial 3-phase electricity power bill",
    amount: 18450,
    expense_date: "2026-09-08",
    branch_id: "00000000-0000-0000-0000-000000000001",
    created_at: "2026-09-08T10:30:00.000Z",
    recorded_by: { id: "u2", name: "Kazi Anam" },
    branch: { id: "00000000-0000-0000-0000-000000000001", code: "MB-01", name: "Main Branch" },
    payment_method: "Bank Transfer",
    status: "Approved",
    notes: "DESCO Meter #DHK-48201",
    attachment_url: "desco_bill_sep2026.pdf",
  },
  {
    id: "00000000-0000-0000-0000-000000000087",
    category: "Maintenance",
    description: "Central dispensary HVAC filter replacement & duct sanitization",
    amount: 8500,
    expense_date: "2026-09-05",
    branch_id: "00000000-0000-0000-0000-000000000001",
    created_at: "2026-09-05T12:00:00.000Z",
    recorded_by: { id: "u1", name: "Dr. Tanvir Ahmed" },
    branch: { id: "00000000-0000-0000-0000-000000000001", code: "MB-01", name: "Main Branch" },
    payment_method: "Cheque",
    status: "Approved",
    notes: "CleanAir Bangladesh Work Order #WO-891",
    attachment_url: "cleanair_service.pdf",
  },
  {
    id: "00000000-0000-0000-0000-000000000088",
    category: "Transport",
    description: "Inter-branch distribution van monthly fuel card top-up",
    amount: 12200,
    expense_date: "2026-09-02",
    branch_id: "00000000-0000-0000-0000-000000000001",
    created_at: "2026-09-02T14:00:00.000Z",
    recorded_by: { id: "u3", name: "Ashraf Hossain" },
    branch: { id: "00000000-0000-0000-0000-000000000001", code: "MB-01", name: "Main Branch" },
    payment_method: "Corporate Card",
    status: "Approved",
    notes: "Padma Oil Fleet Card statement",
    attachment_url: "fleet_fuel_sep.pdf",
  },
  {
    id: "00000000-0000-0000-0000-000000000089",
    category: "Other",
    description: "Annual municipal trade license fee & pharmacy compliance audit",
    amount: 15000,
    expense_date: "2026-09-01",
    branch_id: "00000000-0000-0000-0000-000000000003",
    created_at: "2026-09-01T11:00:00.000Z",
    recorded_by: { id: "u4", name: "Farhana Islam" },
    branch: { id: "00000000-0000-0000-0000-000000000003", code: "GC-03", name: "Gulshan Central" },
    payment_method: "Bank Transfer",
    status: "Pending Approval",
    notes: "DGDA and City Corporation annual clearance",
    attachment_url: "trade_license_renewal.pdf",
  },
];

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await getCurrentProfile();
  if (!profile || !CAN_VIEW.includes(profile.role)) notFound();

  const params = await searchParams;
  const from = typeof params.from === "string" ? params.from : isoDaysAgo(60);
  const to = typeof params.to === "string" ? params.to : new Date().toISOString().slice(0, 10);

  const [expenses, branches] = await Promise.all([
    getExpenses(from, to),
    getAccessibleBranches(),
  ]);

  const canAdd = CAN_ADD.includes(profile.role);
  const branchId = profile.branch_id ?? branches[0]?.id ?? null;

  const effectiveExpenses = expenses.length > 0 ? expenses : DEMO_EXPENSES;

  return (
    <ExpensesClient
      expenses={effectiveExpenses}
      branchId={branchId}
      canAdd={canAdd}
      branches={branches}
    />
  );
}
