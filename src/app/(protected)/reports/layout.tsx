import Link from "next/link";
import { notFound } from "next/navigation";

import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { Button } from "@/components/ui/button";

const CAN_VIEW_REPORTS = ["super_admin", "branch_manager"];

const TABS = [
  { href: "/reports/sales", label: "Sales" },
  { href: "/reports/profit", label: "Profit" },
  { href: "/reports/stock", label: "Stock" },
];

/**
 * Reports are for people who run the business, not everyone who works in it —
 * a cashier's takings are their manager's business, not another cashier's.
 *
 * This is a UI gate; the report functions are SECURITY INVOKER, so RLS scopes
 * whatever anyone manages to call directly.
 */
export default async function ReportsLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile || !CAN_VIEW_REPORTS.includes(profile.role)) notFound();

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap gap-2 print:hidden" aria-label="Reports">
        {TABS.map((tab) => (
          <Button key={tab.href} asChild variant="outline" size="sm">
            <Link href={tab.href}>{tab.label}</Link>
          </Button>
        ))}
      </nav>

      {children}
    </div>
  );
}
