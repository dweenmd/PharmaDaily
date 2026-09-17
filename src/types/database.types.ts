export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      branch_stocks: {
        Row: {
          batch_no: string
          branch_id: string
          created_at: string
          expiry_date: string
          id: string
          is_active: boolean
          medicine_id: string
          mrp: number
          purchase_price: number
          quantity: number
          received_date: string
          reserved_quantity: number
          selling_price: number
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          batch_no: string
          branch_id: string
          created_at?: string
          expiry_date: string
          id?: string
          is_active?: boolean
          medicine_id: string
          mrp: number
          purchase_price: number
          quantity?: number
          received_date?: string
          reserved_quantity?: number
          selling_price: number
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          batch_no?: string
          branch_id?: string
          created_at?: string
          expiry_date?: string
          id?: string
          is_active?: boolean
          medicine_id?: string
          mrp?: number
          purchase_price?: number
          quantity?: number
          received_date?: string
          reserved_quantity?: number
          selling_price?: number
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_stocks_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_stocks_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_stocks_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          code: string
          created_at: string
          deleted_at: string | null
          id: string
          is_active: boolean
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          code: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      customer_payments: {
        Row: {
          amount: number
          branch_id: string
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          notes: string | null
          reference: string | null
        }
        Insert: {
          amount: number
          branch_id: string
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          reference?: string | null
        }
        Update: {
          amount?: number
          branch_id?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_payments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          deleted_at: string | null
          due_amount: number
          id: string
          is_active: boolean
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          deleted_at?: string | null
          due_amount?: number
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          deleted_at?: string | null
          due_amount?: number
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          branch_id: string
          category: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          expense_date: string
          id: string
          updated_at: string
        }
        Insert: {
          amount: number
          branch_id: string
          category: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          branch_id?: string
          category?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_counters: {
        Row: {
          branch_id: string
          last_number: number
          year: number
        }
        Insert: {
          branch_id: string
          last_number?: number
          year: number
        }
        Update: {
          branch_id?: string
          last_number?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_counters_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      medicine_categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      medicines: {
        Row: {
          barcode: string | null
          brand_name: string | null
          category_id: string | null
          controlled_drug: boolean
          created_at: string
          deleted_at: string | null
          dosage_form: string | null
          generic_name: string | null
          id: string
          is_active: boolean
          manufacturer: string | null
          name: string
          pack_size: string | null
          prescription_required: boolean
          reorder_level: number
          strength: string | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          brand_name?: string | null
          category_id?: string | null
          controlled_drug?: boolean
          created_at?: string
          deleted_at?: string | null
          dosage_form?: string | null
          generic_name?: string | null
          id?: string
          is_active?: boolean
          manufacturer?: string | null
          name: string
          pack_size?: string | null
          prescription_required?: boolean
          reorder_level?: number
          strength?: string | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          brand_name?: string | null
          category_id?: string | null
          controlled_drug?: boolean
          created_at?: string
          deleted_at?: string | null
          dosage_form?: string | null
          generic_name?: string | null
          id?: string
          is_active?: boolean
          manufacturer?: string | null
          name?: string
          pack_size?: string | null
          prescription_required?: boolean
          reorder_level?: number
          strength?: string | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medicines_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "medicine_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          branch_id: string | null
          created_at: string
          dedupe_key: string
          id: string
          is_read: boolean
          message: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          dedupe_key: string
          id?: string
          is_read?: boolean
          message: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          dedupe_key?: string
          id?: string
          is_read?: boolean
          message?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          branch_id: string
          created_at: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          reference: string | null
          sale_id: string
        }
        Insert: {
          amount: number
          branch_id: string
          created_at?: string
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          reference?: string | null
          sale_id: string
        }
        Update: {
          amount?: number
          branch_id?: string
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          reference?: string | null
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          auth_id: string
          branch_id: string | null
          created_at: string
          deleted_at: string | null
          id: string
          is_active: boolean
          name: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          auth_id: string
          branch_id?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          auth_id?: string
          branch_id?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_items: {
        Row: {
          batch_no: string
          cost_price: number
          created_at: string
          expiry_date: string
          id: string
          medicine_id: string
          mrp: number
          purchase_id: string
          quantity: number
          selling_price: number
        }
        Insert: {
          batch_no: string
          cost_price: number
          created_at?: string
          expiry_date: string
          id?: string
          medicine_id: string
          mrp: number
          purchase_id: string
          quantity: number
          selling_price: number
        }
        Update: {
          batch_no?: string
          cost_price?: number
          created_at?: string
          expiry_date?: string
          id?: string
          medicine_id?: string
          mrp?: number
          purchase_id?: string
          quantity?: number
          selling_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_items_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          branch_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          due_amount: number
          id: string
          invoice_no: string
          notes: string | null
          paid_amount: number
          purchase_date: string
          supplier_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          due_amount?: number
          id?: string
          invoice_no: string
          notes?: string | null
          paid_amount?: number
          purchase_date?: string
          supplier_id: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          due_amount?: number
          id?: string
          invoice_no?: string
          notes?: string | null
          paid_amount?: number
          purchase_date?: string
          supplier_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          batch_no: string
          branch_stock_id: string
          cost_price: number
          created_at: string
          id: string
          medicine_id: string
          quantity: number
          sale_id: string
          total_price: number
          unit_price: number
        }
        Insert: {
          batch_no: string
          branch_stock_id: string
          cost_price?: number
          created_at?: string
          id?: string
          medicine_id: string
          quantity: number
          sale_id: string
          total_price: number
          unit_price: number
        }
        Update: {
          batch_no?: string
          branch_stock_id?: string
          cost_price?: number
          created_at?: string
          id?: string
          medicine_id?: string
          quantity?: number
          sale_id?: string
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_branch_stock_id_fkey"
            columns: ["branch_stock_id"]
            isOneToOne: false
            referencedRelation: "branch_stocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          branch_id: string
          cashier_id: string | null
          created_at: string
          customer_id: string | null
          deleted_at: string | null
          discount: number
          due_amount: number
          id: string
          invoice_no: string
          paid_amount: number
          sale_date: string
          subtotal: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          branch_id: string
          cashier_id?: string | null
          created_at?: string
          customer_id?: string | null
          deleted_at?: string | null
          discount?: number
          due_amount?: number
          id?: string
          invoice_no: string
          paid_amount?: number
          sale_date?: string
          subtotal?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          branch_id?: string
          cashier_id?: string | null
          created_at?: string
          customer_id?: string | null
          deleted_at?: string | null
          discount?: number
          due_amount?: number
          id?: string
          invoice_no?: string
          paid_amount?: number
          sale_date?: string
          subtotal?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_cashier_id_fkey"
            columns: ["cashier_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_return_items: {
        Row: {
          created_at: string
          id: string
          quantity: number
          return_id: string
          sale_item_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          quantity: number
          return_id: string
          sale_item_id: string
        }
        Update: {
          created_at?: string
          id?: string
          quantity?: number
          return_id?: string
          sale_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_return_items_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "sales_returns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_return_items_sale_item_id_fkey"
            columns: ["sale_item_id"]
            isOneToOne: false
            referencedRelation: "sale_items"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_returns: {
        Row: {
          branch_id: string
          created_at: string
          id: string
          reason: string
          refund_method: Database["public"]["Enums"]["payment_method"]
          returned_by: string | null
          sale_id: string
          total_refund: number
        }
        Insert: {
          branch_id: string
          created_at?: string
          id?: string
          reason: string
          refund_method: Database["public"]["Enums"]["payment_method"]
          returned_by?: string | null
          sale_id: string
          total_refund: number
        }
        Update: {
          branch_id?: string
          created_at?: string
          id?: string
          reason?: string
          refund_method?: Database["public"]["Enums"]["payment_method"]
          returned_by?: string | null
          sale_id?: string
          total_refund?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_returns_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_returns_returned_by_fkey"
            columns: ["returned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_returns_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          branch_id: string | null
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          branch_id?: string | null
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          branch_id?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "settings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_adjustments: {
        Row: {
          batch_no: string
          branch_id: string
          created_at: string
          created_by: string | null
          id: string
          medicine_id: string
          quantity: number
          reason: string
          type: Database["public"]["Enums"]["stock_adjustment_type"]
        }
        Insert: {
          batch_no: string
          branch_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          medicine_id: string
          quantity: number
          reason: string
          type: Database["public"]["Enums"]["stock_adjustment_type"]
        }
        Update: {
          batch_no?: string
          branch_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          medicine_id?: string
          quantity?: number
          reason?: string
          type?: Database["public"]["Enums"]["stock_adjustment_type"]
        }
        Relationships: [
          {
            foreignKeyName: "stock_adjustments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustments_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          batch_no: string
          branch_id: string
          created_at: string
          created_by: string | null
          id: string
          medicine_id: string
          quantity: number
          reference_id: string | null
          reference_type: string | null
          type: Database["public"]["Enums"]["stock_movement_type"]
        }
        Insert: {
          batch_no: string
          branch_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          medicine_id: string
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          type: Database["public"]["Enums"]["stock_movement_type"]
        }
        Update: {
          batch_no?: string
          branch_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          medicine_id?: string
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          type?: Database["public"]["Enums"]["stock_movement_type"]
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transfer_items: {
        Row: {
          batch_no: string
          created_at: string
          expiry_date: string | null
          id: string
          medicine_id: string
          mrp: number | null
          purchase_price: number | null
          quantity: number
          received_quantity: number | null
          selling_price: number | null
          shortfall_reason: string | null
          source_stock_id: string
          supplier_id: string | null
          transfer_id: string
        }
        Insert: {
          batch_no: string
          created_at?: string
          expiry_date?: string | null
          id?: string
          medicine_id: string
          mrp?: number | null
          purchase_price?: number | null
          quantity: number
          received_quantity?: number | null
          selling_price?: number | null
          shortfall_reason?: string | null
          source_stock_id: string
          supplier_id?: string | null
          transfer_id: string
        }
        Update: {
          batch_no?: string
          created_at?: string
          expiry_date?: string | null
          id?: string
          medicine_id?: string
          mrp?: number | null
          purchase_price?: number | null
          quantity?: number
          received_quantity?: number | null
          selling_price?: number | null
          shortfall_reason?: string | null
          source_stock_id?: string
          supplier_id?: string | null
          transfer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfer_items_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfer_items_source_stock_id_fkey"
            columns: ["source_stock_id"]
            isOneToOne: false
            referencedRelation: "branch_stocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfer_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfer_items_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "stock_transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transfers: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          completed_at: string | null
          created_at: string
          from_branch_id: string
          id: string
          notes: string | null
          received_by: string | null
          reference_no: string
          rejection_reason: string | null
          status: Database["public"]["Enums"]["transfer_status"]
          to_branch_id: string
          transferred_by: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string
          from_branch_id: string
          id?: string
          notes?: string | null
          received_by?: string | null
          reference_no: string
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["transfer_status"]
          to_branch_id: string
          transferred_by?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string
          from_branch_id?: string
          id?: string
          notes?: string | null
          received_by?: string | null
          reference_no?: string
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["transfer_status"]
          to_branch_id?: string
          transferred_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfers_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_from_branch_id_fkey"
            columns: ["from_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_to_branch_id_fkey"
            columns: ["to_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_transferred_by_fkey"
            columns: ["transferred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_payments: {
        Row: {
          amount: number
          branch_id: string
          created_at: string
          created_by: string | null
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          notes: string | null
          reference: string | null
          supplier_id: string
        }
        Insert: {
          amount: number
          branch_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          reference?: string | null
          supplier_id: string
        }
        Update: {
          amount?: number
          branch_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          reference?: string | null
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_payments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          created_at: string
          deleted_at: string | null
          due_amount: number
          id: string
          is_active: boolean
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          deleted_at?: string | null
          due_amount?: number
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          deleted_at?: string | null
          due_amount?: number
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      transfer_counters: {
        Row: {
          last_number: number
          year: number
        }
        Insert: {
          last_number?: number
          year: number
        }
        Update: {
          last_number?: number
          year?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_stock_transfer: {
        Args: { p_transfer_id: string }
        Returns: undefined
      }
      can_approve_transfers: { Args: never; Returns: boolean }
      can_manage_catalogue: { Args: never; Returns: boolean }
      can_sell: { Args: never; Returns: boolean }
      create_purchase: {
        Args: {
          p_branch_id: string
          p_invoice_no: string
          p_items: Json
          p_notes?: string
          p_paid_amount: number
          p_purchase_date: string
          p_supplier_id: string
        }
        Returns: string
      }
      create_sale: {
        Args: {
          p_branch_id: string
          p_customer_id: string
          p_discount: number
          p_items: Json
          p_payments: Json
          p_sale_date?: string
        }
        Returns: string
      }
      create_sales_return: {
        Args: {
          p_items: Json
          p_reason: string
          p_refund_method: Database["public"]["Enums"]["payment_method"]
          p_sale_id: string
        }
        Returns: string
      }
      create_stock_adjustment: {
        Args: {
          p_batch_no: string
          p_branch_id: string
          p_medicine_id: string
          p_quantity: number
          p_reason: string
          p_type: Database["public"]["Enums"]["stock_adjustment_type"]
        }
        Returns: string
      }
      create_stock_transfer: {
        Args: {
          p_from_branch_id: string
          p_items: Json
          p_notes?: string
          p_to_branch_id: string
        }
        Returns: string
      }
      current_user_branch_id: { Args: never; Returns: string }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      dashboard_kpis: {
        Args: { p_branch_id?: string; p_date?: string }
        Returns: {
          collected: number
          expired_count: number
          low_stock_count: number
          near_expiry_count: number
          outstanding: number
          profit: number
          revenue: number
          sales_count: number
        }[]
      }
      is_super_admin: { Args: never; Returns: boolean }
      next_invoice_no: { Args: { p_branch_id: string }; Returns: string }
      next_transfer_no: { Args: never; Returns: string }
      profit_report: {
        Args: { p_branch_id?: string; p_from: string; p_to: string }
        Returns: {
          cost: number
          margin_percent: number
          medicine_id: string
          medicine_name: string
          profit: number
          revenue: number
          strength: string
          units_sold: number
        }[]
      }
      receive_stock_transfer: {
        Args: { p_receipts?: Json; p_transfer_id: string }
        Returns: undefined
      }
      recompute_customer_balance: {
        Args: { p_customer_id: string }
        Returns: number
      }
      recompute_supplier_balance: {
        Args: { p_supplier_id: string }
        Returns: number
      }
      record_customer_payment: {
        Args: {
          p_amount: number
          p_branch_id: string
          p_customer_id: string
          p_method: Database["public"]["Enums"]["payment_method"]
          p_notes?: string
          p_reference?: string
        }
        Returns: string
      }
      record_supplier_payment: {
        Args: {
          p_amount: number
          p_branch_id: string
          p_method: Database["public"]["Enums"]["payment_method"]
          p_notes?: string
          p_reference?: string
          p_supplier_id: string
        }
        Returns: string
      }
      refresh_stock_alerts: { Args: { p_branch_id?: string }; Returns: number }
      reject_stock_transfer: {
        Args: { p_reason: string; p_transfer_id: string }
        Returns: undefined
      }
      returned_quantity: { Args: { p_sale_item_id: string }; Returns: number }
      sales_report: {
        Args: {
          p_branch_id?: string
          p_cashier_id?: string
          p_from: string
          p_payment_method?: Database["public"]["Enums"]["payment_method"]
          p_to: string
        }
        Returns: {
          branch_code: string
          cashier_name: string
          created_at: string
          customer_name: string
          discount: number
          due_amount: number
          invoice_no: string
          methods: string
          paid_amount: number
          profit: number
          sale_date: string
          sale_id: string
          subtotal: number
          total_amount: number
        }[]
      }
      sales_trend: {
        Args: { p_branch_id?: string; p_from: string; p_to: string }
        Returns: {
          day: string
          profit: number
          revenue: number
          sales_count: number
        }[]
      }
      stock_report: {
        Args: { p_branch_id?: string }
        Returns: {
          batch_count: number
          branch_code: string
          branch_id: string
          category_name: string
          cost_value: number
          retail_value: number
          supplier_name: string
          total_quantity: number
        }[]
      }
    }
    Enums: {
      notification_type:
        | "low_stock"
        | "near_expiry"
        | "expired"
        | "transfer"
        | "sales"
        | "system"
      payment_method: "cash" | "bkash" | "nagad" | "card" | "due"
      stock_adjustment_type: "increase" | "decrease"
      stock_movement_type:
        | "purchase"
        | "sale"
        | "transfer_in"
        | "transfer_out"
        | "adjustment"
        | "return"
      transfer_status: "pending" | "approved" | "completed" | "rejected"
      user_role:
        | "super_admin"
        | "branch_manager"
        | "cashier"
        | "stock_manager"
        | "pharmacist"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      notification_type: [
        "low_stock",
        "near_expiry",
        "expired",
        "transfer",
        "sales",
        "system",
      ],
      payment_method: ["cash", "bkash", "nagad", "card", "due"],
      stock_adjustment_type: ["increase", "decrease"],
      stock_movement_type: [
        "purchase",
        "sale",
        "transfer_in",
        "transfer_out",
        "adjustment",
        "return",
      ],
      transfer_status: ["pending", "approved", "completed", "rejected"],
      user_role: [
        "super_admin",
        "branch_manager",
        "cashier",
        "stock_manager",
        "pharmacist",
      ],
    },
  },
} as const
