/**
 * Tables the audit log covers, with names a person would use.
 *
 * Kept out of queries.ts because that module is `server-only` and the filter
 * bar is a Client Component — importing it there pulled the Supabase server
 * client into the browser bundle, which the guard correctly refused at build
 * time.
 */
export const AUDITED_TABLES: Record<string, string> = {
  sales: "Sales",
  branch_stocks: "Stock",
  purchases: "Purchases",
  profiles: "Staff",
  branches: "Branches",
  medicines: "Medicines",
  customers: "Customers",
  suppliers: "Suppliers",
};
