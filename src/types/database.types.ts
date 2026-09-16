/**
 * Database types for the Supabase client.
 *
 * ---------------------------------------------------------------------------
 * REGENERATE THIS FILE — do not hand-edit it once a database is reachable:
 *
 *     npm run db:types      # local stack (requires Docker + `npm run db:start`)
 *
 * The definitions below were written by hand to match the Phase 1 migrations
 * exactly, so the app is type-safe before the local stack has ever been
 * started. Every later phase should replace this file with generated output
 * rather than extending it manually.
 * ---------------------------------------------------------------------------
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole =
  | "super_admin"
  | "branch_manager"
  | "cashier"
  | "stock_manager"
  | "pharmacist";

export type Database = {
  public: {
    Tables: {
      branches: {
        Row: {
          id: string;
          name: string;
          code: string;
          address: string | null;
          phone: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          code: string;
          address?: string | null;
          phone?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          code?: string;
          address?: string | null;
          phone?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          auth_id: string;
          name: string;
          role: UserRole;
          branch_id: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          auth_id: string;
          name: string;
          role?: UserRole;
          branch_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          auth_id?: string;
          name?: string;
          role?: UserRole;
          branch_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_branch_id_fkey";
            columns: ["branch_id"];
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<never, never>;
    Functions: {
      current_user_role: {
        Args: Record<PropertyKey, never>;
        Returns: UserRole | null;
      };
      current_user_branch_id: {
        Args: Record<PropertyKey, never>;
        Returns: string | null;
      };
      is_super_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
    };
    Enums: {
      user_role: UserRole;
    };
    CompositeTypes: Record<never, never>;
  };
};

/** Convenience aliases so feature code does not spell out the full path. */
export type BranchRow = Database["public"]["Tables"]["branches"]["Row"];
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
