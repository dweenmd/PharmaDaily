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
