import type { Metadata } from "next";

import { CustomerManagementView } from "@/features/customers/components/customer-management-view";
import {
  DEFAULT_CRM_CUSTOMERS,
  DEMO_RAHIM,
  type CustomerCRMItem,
} from "@/features/customers/constants";
import { getCustomers } from "@/features/customers/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Customers CRM",
};

export default async function CustomersPage() {
  const supabase = await createClient();

  const [dbCustomers, { data: sales }] = await Promise.all([
    getCustomers(),
    supabase
      .from("sales")
      .select("customer_id, total_amount, created_at")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1000),
  ]);

  // Aggregate purchases, bills and last visit by customer
  const customerMetrics = new Map<
    string,
    { total: number; bills: number; lastVisit: string | null }
  >();

  for (const s of sales ?? []) {
    if (!s.customer_id) continue;
    const existing = customerMetrics.get(s.customer_id) ?? {
      total: 0,
      bills: 0,
      lastVisit: null,
    };
    existing.total += Number(s.total_amount);
    existing.bills += 1;
    if (!existing.lastVisit) {
      existing.lastVisit = s.created_at;
    }
    customerMetrics.set(s.customer_id, existing);
  }

  // Map DB customers to CRM item format
  const mappedCustomers: CustomerCRMItem[] = (dbCustomers ?? [])
    .filter(Boolean)
    .map((c) => {
      const stats = customerMetrics.get(c.id);
      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        address: c.address,
        total_purchases: stats?.total ?? 0,
        bills: stats?.bills ?? 0,
        outstanding: Number(c.due_amount) || 0,
        last_visit: stats?.lastVisit ? stats.lastVisit.slice(0, 10) : c.created_at.slice(0, 10),
        is_active: c.is_active,
      };
    });

  // Always ensure the featured demo customer "Md. Rahim" is present at the top
  const hasRahim = mappedCustomers.some((c) =>
    Boolean(c?.name && c.name.toLowerCase().includes("rahim") && c.phone === "017XXXXXXXX"),
  );

  const initialCustomers: CustomerCRMItem[] = hasRahim
    ? mappedCustomers
    : DEMO_RAHIM
      ? [DEMO_RAHIM, ...mappedCustomers]
      : mappedCustomers;

  return (
    <div className="space-y-6">
      <CustomerManagementView initialCustomers={initialCustomers} />
    </div>
  );
}
