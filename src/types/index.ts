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

export type BranchRow = Database["public"]["Tables"]["branches"]["Row"];
export type BranchInsert = Database["public"]["Tables"]["branches"]["Insert"];
export type BranchUpdate = Database["public"]["Tables"]["branches"]["Update"];

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];
