import type { Metadata } from "next";

import { getAccessibleBranches } from "@/features/branches/queries";
import { TransfersClient } from "@/features/transfers/components/transfers-client";
import { getTransfers, type TransferListRow } from "@/features/transfers/queries";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";

export const metadata: Metadata = {
  title: "Stock Transfers — PharmaDaily",
  description: "Inter-branch consignment movement, batch tracking, and chain inventory routing.",
};

const CAN_REQUEST = ["super_admin", "branch_manager", "stock_manager"];

const DEMO_TRANSFERS: TransferListRow[] = [
  {
    id: "00000000-0000-0000-0000-000000000051",
    reference_no: "TRF-2026-0042",
    status: "approved", // In transit
    created_at: "2026-09-19T02:30:00.000Z",
    approved_at: "2026-09-19T03:00:00.000Z",
    completed_at: null,
    notes: "Urgent restocking of Paracetamol & Omeprazole for weekend surge",
    rejection_reason: null,
    from_branch_id: "00000000-0000-0000-0000-000000000001",
    to_branch_id: "00000000-0000-0000-0000-000000000002",
    from_branch: { id: "00000000-0000-0000-0000-000000000001", name: "Main Branch", code: "MB-01" },
    to_branch: { id: "00000000-0000-0000-0000-000000000002", name: "Dhanmondi Outlet", code: "DH-02" },
    requested_by: { id: "u1", name: "Dr. Tanvir Ahmed" },
    item_count: 2,
    total_units: 250,
    items_summary: "Napa 500mg, Seclo 20mg",
  },
  {
    id: "00000000-0000-0000-0000-000000000052",
    reference_no: "TRF-2026-0041",
    status: "pending", // Requested
    created_at: "2026-09-19T01:15:00.000Z",
    approved_at: null,
    completed_at: null,
    notes: "Antibiotic replenishment request",
    rejection_reason: null,
    from_branch_id: "00000000-0000-0000-0000-000000000001",
    to_branch_id: "00000000-0000-0000-0000-000000000003",
    from_branch: { id: "00000000-0000-0000-0000-000000000001", name: "Main Branch", code: "MB-01" },
    to_branch: { id: "00000000-0000-0000-0000-000000000003", name: "Gulshan Central", code: "GC-03" },
    requested_by: { id: "u2", name: "Kazi Anam" },
    item_count: 1,
    total_units: 60,
    items_summary: "Zimax 500mg",
  },
  {
    id: "00000000-0000-0000-0000-000000000053",
    reference_no: "TRF-2026-0040",
    status: "completed", // Received
    created_at: "2026-09-18T16:00:00.000Z",
    approved_at: "2026-09-18T16:30:00.000Z",
    completed_at: "2026-09-18T18:45:00.000Z",
    notes: "Emergency transfer delivered by courier",
    rejection_reason: null,
    from_branch_id: "00000000-0000-0000-0000-000000000002",
    to_branch_id: "00000000-0000-0000-0000-000000000001",
    from_branch: { id: "00000000-0000-0000-0000-000000000002", name: "Dhanmondi Outlet", code: "DH-02" },
    to_branch: { id: "00000000-0000-0000-0000-000000000001", name: "Main Branch", code: "MB-01" },
    requested_by: { id: "u3", name: "Ashraf Hossain" },
    item_count: 3,
    total_units: 180,
    items_summary: "Sergel 20mg, Fexo 120mg +1",
  },
  {
    id: "00000000-0000-0000-0000-000000000054",
    reference_no: "TRF-2026-0039",
    status: "rejected", // Rejected
    created_at: "2026-09-18T11:20:00.000Z",
    approved_at: null,
    completed_at: null,
    notes: "Routine inventory balance",
    rejection_reason: "Insufficient on-hand shelf reserve at sending branch",
    from_branch_id: "00000000-0000-0000-0000-000000000003",
    to_branch_id: "00000000-0000-0000-0000-000000000002",
    from_branch: { id: "00000000-0000-0000-0000-000000000003", name: "Gulshan Central", code: "GC-03" },
    to_branch: { id: "00000000-0000-0000-0000-000000000002", name: "Dhanmondi Outlet", code: "DH-02" },
    requested_by: { id: "u4", name: "Farhana Islam" },
    item_count: 1,
    total_units: 40,
    items_summary: "Ceevit 250mg",
  },
];

export default async function TransfersPage() {
  const [profile, transfers, branches] = await Promise.all([
    getCurrentProfile(),
    getTransfers(),
    getAccessibleBranches(),
  ]);

  const canRequest = profile ? CAN_REQUEST.includes(profile.role) : false;
  const myBranchId = profile?.branch_id ?? null;

  const effectiveTransfers = transfers.length > 0 ? transfers : DEMO_TRANSFERS;
  const effectiveBranches =
    branches.length > 0
      ? branches
      : [
          { id: "00000000-0000-0000-0000-000000000001", name: "Main Branch", code: "MB-01" },
          { id: "00000000-0000-0000-0000-000000000002", name: "Dhanmondi Outlet", code: "DH-02" },
          { id: "00000000-0000-0000-0000-000000000003", name: "Gulshan Central", code: "GC-03" },
        ];

  return (
    <TransfersClient
      transfers={effectiveTransfers}
      canRequest={canRequest}
      myBranchId={myBranchId}
      branches={effectiveBranches}
    />
  );
}
