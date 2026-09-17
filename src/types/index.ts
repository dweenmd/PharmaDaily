/**
 * Application-facing database types.
 *
 * Import from `@/types`, never from `@/types/database.types` — that file is
 * overwritten wholesale by `npm run db:types`, so anything hand-written there
 * is lost on the next schema change. The aliases below are derived from it, so
 * they follow the schema automatically.
 */
import { type Database } from "./database.types";

export type { Database, Json } from "./database.types";

export type UserRole = Database["public"]["Enums"]["user_role"];
export type StockMovementType = Database["public"]["Enums"]["stock_movement_type"];
export type StockAdjustmentType = Database["public"]["Enums"]["stock_adjustment_type"];
export type PaymentMethod = Database["public"]["Enums"]["payment_method"];
export type NotificationType = Database["public"]["Enums"]["notification_type"];
export type TransferStatus = Database["public"]["Enums"]["transfer_status"];
export type CashMovementType = Database["public"]["Enums"]["cash_movement_type"];
export type SyncStatus = Database["public"]["Enums"]["sync_status"];

type Tables = Database["public"]["Tables"];

export type BranchRow = Tables["branches"]["Row"];
export type BranchInsert = Tables["branches"]["Insert"];
export type BranchUpdate = Tables["branches"]["Update"];

export type ProfileRow = Tables["profiles"]["Row"];
export type ProfileInsert = Tables["profiles"]["Insert"];
export type ProfileUpdate = Tables["profiles"]["Update"];

export type MedicineCategoryRow = Tables["medicine_categories"]["Row"];
export type MedicineCategoryInsert = Tables["medicine_categories"]["Insert"];

export type MedicineRow = Tables["medicines"]["Row"];
export type MedicineInsert = Tables["medicines"]["Insert"];
export type MedicineUpdate = Tables["medicines"]["Update"];

export type SupplierRow = Tables["suppliers"]["Row"];
export type SupplierInsert = Tables["suppliers"]["Insert"];
export type SupplierUpdate = Tables["suppliers"]["Update"];

export type BranchStockRow = Tables["branch_stocks"]["Row"];

export type PurchaseRow = Tables["purchases"]["Row"];
export type PurchaseItemRow = Tables["purchase_items"]["Row"];

export type StockMovementRow = Tables["stock_movements"]["Row"];
export type StockAdjustmentRow = Tables["stock_adjustments"]["Row"];

export type CustomerRow = Tables["customers"]["Row"];
export type CustomerInsert = Tables["customers"]["Insert"];

export type SaleRow = Tables["sales"]["Row"];
export type SaleItemRow = Tables["sale_items"]["Row"];
export type PaymentRow = Tables["payments"]["Row"];

export type SalesReturnRow = Tables["sales_returns"]["Row"];
export type SalesReturnItemRow = Tables["sales_return_items"]["Row"];

export type SettingRow = Tables["settings"]["Row"];
export type ExpenseRow = Tables["expenses"]["Row"];
export type NotificationRow = Tables["notifications"]["Row"];

type Functions = Database["public"]["Functions"];

export type DashboardKpis = Functions["dashboard_kpis"]["Returns"][number];
export type SalesTrendPoint = Functions["sales_trend"]["Returns"][number];
export type ProfitReportRow = Functions["profit_report"]["Returns"][number];
export type StockReportRow = Functions["stock_report"]["Returns"][number];
export type SalesReportRow = Functions["sales_report"]["Returns"][number];

export type CustomerPaymentRow = Tables["customer_payments"]["Row"];
export type SupplierPaymentRow = Tables["supplier_payments"]["Row"];

export type StockTransferRow = Tables["stock_transfers"]["Row"];
export type StockTransferItemRow = Tables["stock_transfer_items"]["Row"];

export type AuditLogRow = Tables["audit_logs"]["Row"];
export type CashSessionRow = Tables["cash_sessions"]["Row"];
export type CashMovementRow = Tables["cash_movements"]["Row"];
export type OfflineQueueRow = Tables["offline_sync_queue"]["Row"];
