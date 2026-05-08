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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: unknown
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: unknown
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: unknown
          user_id?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          active: boolean
          created_at: string
          display_order: number
          icon: string | null
          id: string
          name: string
          store_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          display_order?: number
          icon?: string | null
          id?: string
          name: string
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          display_order?: number
          icon?: string | null
          id?: string
          name?: string
          store_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_usage: {
        Row: {
          coupon_id: string
          customer_id: string
          id: string
          order_id: string | null
          used_at: string
        }
        Insert: {
          coupon_id: string
          customer_id: string
          id?: string
          order_id?: string | null
          used_at?: string
        }
        Update: {
          coupon_id?: string
          customer_id?: string
          id?: string
          order_id?: string | null
          used_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_usage_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usage_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usage_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          max_discount: number | null
          min_order_value: number | null
          store_id: string | null
          usage_count: number
          usage_limit: number | null
          valid_from: string
          valid_until: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          description?: string | null
          discount_type: string
          discount_value: number
          id?: string
          max_discount?: number | null
          min_order_value?: number | null
          store_id?: string | null
          usage_count?: number
          usage_limit?: number | null
          valid_from: string
          valid_until: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          max_discount?: number | null
          min_order_value?: number | null
          store_id?: string | null
          usage_count?: number
          usage_limit?: number | null
          valid_from?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupons_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_addresses: {
        Row: {
          city: string
          complement: string | null
          created_at: string
          customer_id: string
          id: string
          is_default: boolean
          latitude: number | null
          longitude: number | null
          neighborhood: string
          number: string
          state: string
          street: string
          zipcode: string
        }
        Insert: {
          city: string
          complement?: string | null
          created_at?: string
          customer_id: string
          id?: string
          is_default?: boolean
          latitude?: number | null
          longitude?: number | null
          neighborhood: string
          number: string
          state: string
          street: string
          zipcode: string
        }
        Update: {
          city?: string
          complement?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          is_default?: boolean
          latitude?: number | null
          longitude?: number | null
          neighborhood?: string
          number?: string
          state?: string
          street?: string
          zipcode?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_favorites: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          product_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          product_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_favorites_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_favorites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_notes: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          note: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          note: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          note?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_segments: {
        Row: {
          active: boolean
          color: string | null
          created_at: string
          criteria: Json | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          color?: string | null
          created_at?: string
          criteria?: Json | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          color?: string | null
          created_at?: string
          criteria?: Json | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      customer_tags: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          tag: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          tag: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_tags_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          birth_date: string | null
          created_at: string
          email: string | null
          first_order_at: string | null
          gender: string | null
          id: string
          last_order_at: string | null
          loyalty_points: number
          loyalty_tier: string | null
          name: string
          notes: string | null
          opt_in_marketing: boolean
          phone: string
          total_orders: number
          total_spent: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          birth_date?: string | null
          created_at?: string
          email?: string | null
          first_order_at?: string | null
          gender?: string | null
          id?: string
          last_order_at?: string | null
          loyalty_points?: number
          loyalty_tier?: string | null
          name: string
          notes?: string | null
          opt_in_marketing?: boolean
          phone: string
          total_orders?: number
          total_spent?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          birth_date?: string | null
          created_at?: string
          email?: string | null
          first_order_at?: string | null
          gender?: string | null
          id?: string
          last_order_at?: string | null
          loyalty_points?: number
          loyalty_tier?: string | null
          name?: string
          notes?: string | null
          opt_in_marketing?: boolean
          phone?: string
          total_orders?: number
          total_spent?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      delivery_drivers: {
        Row: {
          active: boolean
          created_at: string
          current_location: Json | null
          id: string
          name: string
          phone: string
          rating: number | null
          status: string
          store_id: string | null
          total_deliveries: number | null
          updated_at: string
          vehicle_plate: string | null
          vehicle_type: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          current_location?: Json | null
          id?: string
          name: string
          phone: string
          rating?: number | null
          status?: string
          store_id?: string | null
          total_deliveries?: number | null
          updated_at?: string
          vehicle_plate?: string | null
          vehicle_type?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          current_location?: Json | null
          id?: string
          name?: string
          phone?: string
          rating?: number | null
          status?: string
          store_id?: string | null
          total_deliveries?: number | null
          updated_at?: string
          vehicle_plate?: string | null
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_drivers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_routes: {
        Row: {
          completed_at: string | null
          created_at: string
          driver_id: string | null
          id: string
          name: string
          order_ids: Json
          started_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          driver_id?: string | null
          id?: string
          name: string
          order_ids: Json
          started_at?: string | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          driver_id?: string | null
          id?: string
          name?: string
          order_ids?: Json
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_routes_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "delivery_drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_tracking: {
        Row: {
          created_at: string
          driver_id: string | null
          id: string
          location: Json | null
          order_id: string
          status: string
        }
        Insert: {
          created_at?: string
          driver_id?: string | null
          id?: string
          location?: Json | null
          order_id: string
          status: string
        }
        Update: {
          created_at?: string
          driver_id?: string | null
          id?: string
          location?: Json | null
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_tracking_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "delivery_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_tracking_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_categories: {
        Row: {
          active: boolean
          color: string | null
          created_at: string
          icon: string | null
          id: string
          name: string
          type: string
        }
        Insert: {
          active?: boolean
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          type: string
        }
        Update: {
          active?: boolean
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          type?: string
        }
        Relationships: []
      }
      financial_goals: {
        Row: {
          active: boolean
          created_at: string
          end_date: string
          id: string
          name: string
          period: string
          start_date: string
          target_amount: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          end_date: string
          id?: string
          name: string
          period: string
          start_date: string
          target_amount: number
        }
        Update: {
          active?: boolean
          created_at?: string
          end_date?: string
          id?: string
          name?: string
          period?: string
          start_date?: string
          target_amount?: number
        }
        Relationships: []
      }
      financial_transactions: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          created_by: string | null
          description: string
          due_date: string | null
          id: string
          notes: string | null
          paid_date: string | null
          payment_method: string | null
          reference_id: string | null
          reference_type: string | null
          status: string
          store_id: string | null
          type: string
          updated_at: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          due_date?: string | null
          id?: string
          notes?: string | null
          paid_date?: string | null
          payment_method?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          store_id?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          paid_date?: string | null
          payment_method?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          store_id?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      franchisee_requests: {
        Row: {
          city: string
          created_at: string | null
          email: string
          full_name: string
          id: string
          message: string | null
          phone: string
          preferred_slug: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          state: string
          status: string | null
          store_name: string
          updated_at: string | null
        }
        Insert: {
          city: string
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          message?: string | null
          phone: string
          preferred_slug: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          state: string
          status?: string | null
          store_name: string
          updated_at?: string | null
        }
        Update: {
          city?: string
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          message?: string | null
          phone?: string
          preferred_slug?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          state?: string
          status?: string | null
          store_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      game_inventory: {
        Row: {
          id: string
          is_equipped: boolean | null
          item_id: string
          item_type: string
          purchased_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          is_equipped?: boolean | null
          item_id: string
          item_type: string
          purchased_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          is_equipped?: boolean | null
          item_id?: string
          item_type?: string
          purchased_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_inventory_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_missions: {
        Row: {
          id: string
          mission_id: string
          progress: number | null
          status: string | null
          target: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          mission_id: string
          progress?: number | null
          status?: string | null
          target: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          mission_id?: string
          progress?: number | null
          status?: string | null
          target?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_missions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_profiles: {
        Row: {
          acai_coins: number
          created_at: string | null
          current_streak: number
          last_played_at: string | null
          level: number
          user_id: string
          xp: number
        }
        Insert: {
          acai_coins?: number
          created_at?: string | null
          current_streak?: number
          last_played_at?: string | null
          level?: number
          user_id: string
          xp?: number
        }
        Update: {
          acai_coins?: number
          created_at?: string | null
          current_streak?: number
          last_played_at?: string | null
          level?: number
          user_id?: string
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "game_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_scores: {
        Row: {
          score: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          score?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          score?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredients: {
        Row: {
          category: string
          cost_per_unit: number
          created_at: string
          current_stock: number
          description: string | null
          id: string
          is_active: boolean
          minimum_stock: number
          name: string
          supplier: string | null
          unit: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          category?: string
          cost_per_unit?: number
          created_at?: string
          current_stock?: number
          description?: string | null
          id?: string
          is_active?: boolean
          minimum_stock?: number
          name: string
          supplier?: string | null
          unit?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          category?: string
          cost_per_unit?: number
          created_at?: string
          current_stock?: number
          description?: string | null
          id?: string
          is_active?: boolean
          minimum_stock?: number
          name?: string
          supplier?: string | null
          unit?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      infinitepay_checkouts: {
        Row: {
          address: Json | null
          amount: number
          capture_method: string | null
          checkout_url: string | null
          created_at: string | null
          customer: Json | null
          id: string
          installments: number | null
          invoice_slug: string | null
          items: Json
          order_id: string
          order_nsu: string
          paid_amount: number | null
          raw_webhook: Json | null
          receipt_url: string | null
          status: string
          transaction_nsu: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address?: Json | null
          amount: number
          capture_method?: string | null
          checkout_url?: string | null
          created_at?: string | null
          customer?: Json | null
          id?: string
          installments?: number | null
          invoice_slug?: string | null
          items: Json
          order_id: string
          order_nsu: string
          paid_amount?: number | null
          raw_webhook?: Json | null
          receipt_url?: string | null
          status?: string
          transaction_nsu?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address?: Json | null
          amount?: number
          capture_method?: string | null
          checkout_url?: string | null
          created_at?: string | null
          customer?: Json | null
          id?: string
          installments?: number | null
          invoice_slug?: string | null
          items?: Json
          order_id?: string
          order_nsu?: string
          paid_amount?: number | null
          raw_webhook?: Json | null
          receipt_url?: string | null
          status?: string
          transaction_nsu?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "infinitepay_checkouts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          active: boolean
          config: Json
          created_at: string
          id: string
          name: string
          provider: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          config: Json
          created_at?: string
          id?: string
          name: string
          provider?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          config?: Json
          created_at?: string
          id?: string
          name?: string
          provider?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          active: boolean
          created_at: string
          current_stock: number
          description: string | null
          id: string
          max_stock: number | null
          min_stock: number
          name: string
          store_id: string | null
          supplier: string | null
          unit: string
          unit_cost: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          current_stock?: number
          description?: string | null
          id?: string
          max_stock?: number | null
          min_stock?: number
          name: string
          store_id?: string | null
          supplier?: string | null
          unit: string
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          current_stock?: number
          description?: string | null
          id?: string
          max_stock?: number | null
          min_stock?: number
          name?: string
          store_id?: string | null
          supplier?: string | null
          unit?: string
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          item_id: string
          movement_type: string
          notes: string | null
          quantity: number
          reason: string | null
          reference_id: string | null
          reference_type: string | null
          total_cost: number | null
          unit_cost: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          item_id: string
          movement_type: string
          notes?: string | null
          quantity: number
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
          total_cost?: number | null
          unit_cost?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          item_id?: string
          movement_type?: string
          notes?: string | null
          quantity?: number
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
          total_cost?: number | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      order_item_toppings: {
        Row: {
          created_at: string
          id: string
          order_item_id: string
          quantity: number
          topping_id: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_item_id: string
          quantity?: number
          topping_id: string
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          order_item_id?: string
          quantity?: number
          topping_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_item_toppings_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_item_toppings_topping_id_fkey"
            columns: ["topping_id"]
            isOneToOne: false
            referencedRelation: "toppings"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          order_id: string
          product_id: string
          product_size_id: string | null
          quantity: number
          subtotal: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          order_id: string
          product_id: string
          product_size_id?: string | null
          quantity?: number
          subtotal: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string
          product_id?: string
          product_size_id?: string | null
          quantity?: number
          subtotal?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_size_id_fkey"
            columns: ["product_size_id"]
            isOneToOne: false
            referencedRelation: "product_sizes"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          confirmed_at: string | null
          created_at: string
          customer_id: string
          customer_notes: string | null
          delivered_at: string | null
          delivery_address_id: string | null
          delivery_fee: number
          discount_amount: number
          driver_id: string | null
          id: string
          mercadopago_payment_id: string | null
          mercadopago_status: string | null
          order_number: string
          order_type: string
          payment_method: string
          payment_status: string
          prepared_at: string | null
          ready_at: string | null
          scheduled_for: string | null
          status: string
          store_id: string
          subtotal: number
          table_number: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          customer_id: string
          customer_notes?: string | null
          delivered_at?: string | null
          delivery_address_id?: string | null
          delivery_fee?: number
          discount_amount?: number
          driver_id?: string | null
          id?: string
          mercadopago_payment_id?: string | null
          mercadopago_status?: string | null
          order_number: string
          order_type: string
          payment_method: string
          payment_status?: string
          prepared_at?: string | null
          ready_at?: string | null
          scheduled_for?: string | null
          status?: string
          store_id: string
          subtotal: number
          table_number?: string | null
          total_amount: number
          updated_at?: string
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          customer_id?: string
          customer_notes?: string | null
          delivered_at?: string | null
          delivery_address_id?: string | null
          delivery_fee?: number
          discount_amount?: number
          driver_id?: string | null
          id?: string
          mercadopago_payment_id?: string | null
          mercadopago_status?: string | null
          order_number?: string
          order_type?: string
          payment_method?: string
          payment_status?: string
          prepared_at?: string | null
          ready_at?: string | null
          scheduled_for?: string | null
          status?: string
          store_id?: string
          subtotal?: number
          table_number?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_delivery_address_id_fkey"
            columns: ["delivery_address_id"]
            isOneToOne: false
            referencedRelation: "customer_addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "delivery_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      product_ingredients: {
        Row: {
          created_at: string
          id: string
          item_id: string
          product_id: string
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          product_id: string
          quantity: number
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          product_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_ingredients_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_ingredients_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      product_delivery_prices: {
        Row: {
          created_at: string
          id: string
          platform_id: string | null
          price: number
          product_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform_id?: string | null
          price?: number
          product_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          platform_id?: string | null
          price?: number
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_delivery_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_recipes: {
        Row: {
          created_at: string
          id: string
          ingredient_id: string
          product_id: string
          quantity: number
          unit: string
        }
        Insert: {
          created_at?: string
          id?: string
          ingredient_id: string
          product_id: string
          quantity: number
          unit: string
        }
        Update: {
          created_at?: string
          id?: string
          ingredient_id?: string
          product_id?: string
          quantity?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_recipes_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_recipes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_sizes: {
        Row: {
          active: boolean
          created_at: string
          display_order: number
          id: string
          ml_size: number | null
          name: string
          price: number
          product_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          display_order?: number
          id?: string
          ml_size?: number | null
          name: string
          price: number
          product_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          display_order?: number
          id?: string
          ml_size?: number | null
          name?: string
          price?: number
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_sizes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          base_image_url: string | null
          category: string
          category_id: string | null
          code: string | null
          cost_price: number
          created_at: string
          current_stock: number
          description: string | null
          display_order: number
          id: string
          minimum_stock: number
          name: string
          profit_margin: number
          sale_price: number
          sale_type: string
          unit: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          base_image_url?: string | null
          category?: string
          category_id?: string | null
          code?: string | null
          cost_price?: number
          created_at?: string
          current_stock?: number
          description?: string | null
          display_order?: number
          id?: string
          minimum_stock?: number
          name: string
          profit_margin?: number
          sale_price?: number
          sale_type?: string
          unit?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          base_image_url?: string | null
          category?: string
          category_id?: string | null
          code?: string | null
          cost_price?: number
          created_at?: string
          current_stock?: number
          description?: string | null
          display_order?: number
          id?: string
          minimum_stock?: number
          name?: string
          profit_margin?: number
          sale_price?: number
          sale_type?: string
          unit?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
        profiles: {
          Row: {
            avatar_url: string | null
            created_at: string
            email: string
            full_name: string | null
            id: string
            phone: string | null
            updated_at: string
          }
          Insert: {
            avatar_url?: string | null
            created_at?: string
            email: string
            full_name?: string | null
            id: string
            phone?: string | null
            updated_at?: string
          }
          Update: {
            avatar_url?: string | null
            created_at?: string
            email?: string
            full_name?: string | null
            id?: string
            phone?: string | null
            updated_at?: string
          }
          Relationships: []
        }
        push_subscriptions: {
          Row: {
            auth: string
            created_at: string | null
            endpoint: string
            id: string
            p256dh: string
            store_id: string | null
            updated_at: string | null
            user_id: string | null
          }
          Insert: {
            auth: string
            created_at?: string | null
            endpoint: string
            id?: string
            p256dh: string
            store_id?: string | null
            updated_at?: string | null
            user_id?: string | null
          }
          Update: {
            auth?: string
            created_at?: string | null
            endpoint?: string
            id?: string
            p256dh?: string
            store_id?: string | null
            updated_at?: string | null
            user_id?: string | null
          }
          Relationships: [
            {
              foreignKeyName: "push_subscriptions_store_id_fkey"
              columns: ["store_id"]
              isOneToOne: false
              referencedRelation: "stores"
              referencedColumns: ["id"]
            },
          ]
        }
        stock_movements: {
          Row: {
            created_at: string
            id: string
            ingredient_id: string
            movement_type: string
            quantity: number
            reason: string | null
            reference_id: string | null
            total_cost: number | null
            unit_cost: number | null
            user_id: string | null
          }
          Insert: {
            created_at?: string
            id?: string
            ingredient_id: string
            movement_type: string
            quantity: number
            reason?: string | null
            reference_id?: string | null
            total_cost?: number | null
            unit_cost?: number | null
            user_id?: string | null
          }
          Update: {
            created_at?: string
            id?: string
            ingredient_id?: string
            movement_type?: string
            quantity?: number
            reason?: string | null
            reference_id?: string | null
            total_cost?: number | null
            unit_cost?: number | null
            user_id?: string | null
          }
          Relationships: [
            {
              foreignKeyName: "stock_movements_ingredient_id_fkey"
              columns: ["ingredient_id"]
              isOneToOne: false
              referencedRelation: "ingredients"
              referencedColumns: ["id"]
            },
          ]
        }
        stores: {
          Row: {
            accepts_card: boolean | null
            accepts_cash: boolean | null
            accepts_pix: boolean | null
            active: boolean
            address: string | null
            address_complement: string | null
            address_number: string | null
            approved_at: string | null
            approved_by: string | null
            business_hours: Json | null
            city: string | null
            created_at: string
            created_by: string | null
            delivery_fee: number | null
            delivery_radius_km: number | null
            delivery_time: number | null
            franchisee_user_id: string | null
            id: string
            logo_url: string | null
            min_order_value: number | null
            name: string
            neighborhood: string | null
            phone: string | null
            preparation_time: number | null
            requires_change: boolean | null
            slug: string | null
            state: string | null
            status: string | null
            updated_at: string
            zipcode: string | null
          }
          Insert: {
            accepts_card?: boolean | null
            accepts_cash?: boolean | null
            accepts_pix?: boolean | null
            active?: boolean
            address?: string | null
            address_complement?: string | null
            address_number?: string | null
            approved_at?: string | null
            approved_by?: string | null
            business_hours?: Json | null
            city?: string | null
            created_at?: string
            created_by?: string | null
            delivery_fee?: number | null
            delivery_radius_km?: number | null
            delivery_time?: number | null
            franchisee_user_id?: string | null
            id?: string
            logo_url?: string | null
            min_order_value?: number | null
            name: string
            neighborhood?: string | null
            phone?: string | null
            preparation_time?: number | null
            requires_change?: boolean | null
            slug?: string | null
            state?: string | null
            status?: string | null
            updated_at?: string
            zipcode?: string | null
          }
          Update: {
            accepts_card?: boolean | null
            accepts_cash?: boolean | null
            accepts_pix?: boolean | null
            active?: boolean
            address?: string | null
            address_complement?: string | null
            address_number?: string | null
            approved_at?: string | null
            approved_by?: string | null
            business_hours?: Json | null
            city?: string | null
            created_at?: string
            created_by?: string | null
            delivery_fee?: number | null
            delivery_radius_km?: number | null
            delivery_time?: number | null
            franchisee_user_id?: string | null
            id?: string
            logo_url?: string | null
            min_order_value?: number | null
            name?: string
            neighborhood?: string | null
            phone?: string | null
            preparation_time?: number | null
            requires_change?: boolean | null
            slug?: string | null
            state?: string | null
            status?: string | null
            updated_at?: string
            zipcode?: string | null
          }
          Relationships: []
        }
        system_settings: {
          Row: {
            category: string
            description: string | null
            id: string
            key: string
            updated_at: string
            updated_by: string | null
            value: Json
          }
          Insert: {
            category: string
            description?: string | null
            id?: string
            key: string
            updated_at?: string
            updated_by?: string | null
            value: Json
          }
          Update: {
            category?: string
            description?: string | null
            id?: string
            key?: string
            updated_at?: string
            updated_by?: string | null
            value?: Json
          }
          Relationships: []
        }
        topping_categories: {
          Row: {
            created_at: string
            display_order: number
            id: string
            max_selections: number | null
            name: string
            store_id: string | null
          }
          Insert: {
            created_at?: string
            display_order?: number
            id?: string
            max_selections?: number | null
            name: string
            store_id?: string | null
          }
          Update: {
            created_at?: string
            display_order?: number
            id?: string
            max_selections?: number | null
            name?: string
            store_id?: string | null
          }
          Relationships: [
            {
              foreignKeyName: "topping_categories_store_id_fkey"
              columns: ["store_id"]
              isOneToOne: false
              referencedRelation: "stores"
              referencedColumns: ["id"]
            },
          ]
        }
        toppings: {
          Row: {
            active: boolean
            category_id: string | null
            created_at: string
            display_order: number
            id: string
            image_url: string | null
            name: string
            price: number | null
            store_id: string | null
            updated_at: string
          }
          Insert: {
            active?: boolean
            category_id?: string | null
            created_at?: string
            display_order?: number
            id?: string
            image_url?: string | null
            name: string
            price?: number | null
            store_id?: string | null
            updated_at?: string
          }
          Update: {
            active?: boolean
            category_id?: string | null
            created_at?: string
            display_order?: number
            id?: string
            image_url?: string | null
            name?: string
            price?: number | null
            store_id?: string | null
            updated_at?: string
          }
          Relationships: [
            {
              foreignKeyName: "toppings_category_id_fkey"
              columns: ["category_id"]
              isOneToOne: false
              referencedRelation: "topping_categories"
              referencedColumns: ["id"]
            },
            {
              foreignKeyName: "toppings_store_id_fkey"
              columns: ["store_id"]
              isOneToOne: false
              referencedRelation: "stores"
              referencedColumns: ["id"]
            },
          ]
        }
        user_roles: {
          Row: {
            created_at: string
            id: string
            role: Database["public"]["Enums"]["app_role"]
            user_id: string
          }
          Insert: {
            created_at?: string
            id?: string
            role: Database["public"]["Enums"]["app_role"]
            user_id: string
          }
          Update: {
            created_at?: string
            id?: string
            role?: Database["public"]["Enums"]["app_role"]
            user_id?: string
          }
          Relationships: []
        }
        pdv_cash_registers: {
          Row: {
            closed_at: string | null
            closing_amount: number | null
            created_at: string | null
            expected_amount: number | null
            id: string
            notes: string | null
            opened_at: string | null
            opening_amount: number
            status: string
            updated_at: string | null
            user_id: string | null
          }
          Insert: {
            closed_at?: string | null
            closing_amount?: number | null
            created_at?: string | null
            expected_amount?: number | null
            id?: string
            notes?: string | null
            opened_at?: string | null
            opening_amount?: number
            status?: string
            updated_at?: string | null
            user_id?: string | null
          }
          Update: {
            closed_at?: string | null
            closing_amount?: number | null
            created_at?: string | null
            expected_amount?: number | null
            id?: string
            notes?: string | null
            opened_at?: string | null
            opening_amount?: number
            status?: string
            updated_at?: string | null
            user_id?: string | null
          }
          Relationships: []
        }
        pdv_cash_movements: {
          Row: {
            amount: number
            cash_register_id: string | null
            created_at: string | null
            id: string
            reason: string | null
            type: string
            user_id: string | null
          }
          Insert: {
            amount: number
            cash_register_id?: string | null
            created_at?: string | null
            id?: string
            reason?: string | null
            type: string
            user_id?: string | null
          }
          Update: {
            amount?: number
            cash_register_id?: string | null
            created_at?: string | null
            id?: string
            reason?: string | null
            type?: string
            user_id?: string | null
          }
          Relationships: [
            {
              foreignKeyName: "pdv_cash_movements_cash_register_id_fkey"
              columns: ["cash_register_id"]
              isOneToOne: false
              referencedRelation: "pdv_cash_registers"
              referencedColumns: ["id"]
            }
          ]
        }
        pdv_tables: {
          Row: {
            capacity: number | null
            created_at: string | null
            current_order_id: string | null
            id: string
            number: number
            status: string
            updated_at: string | null
            user_id: string | null
          }
          Insert: {
            capacity?: number | null
            created_at?: string | null
            current_order_id?: string | null
            id?: string
            number: number
            status?: string
            updated_at?: string | null
            user_id?: string | null
          }
          Update: {
            capacity?: number | null
            created_at?: string | null
            current_order_id?: string | null
            id?: string
            number?: number
            status?: string
            updated_at?: string | null
            user_id?: string | null
          }
          Relationships: [
            {
              foreignKeyName: "pdv_tables_current_order_id_fkey"
              columns: ["current_order_id"]
              isOneToOne: false
              referencedRelation: "pdv_orders"
              referencedColumns: ["id"]
            }
          ]
        }
        pdv_orders: {
          Row: {
            amount_paid: number | null
            cancel_note: string | null
            cancel_reason: string | null
            cash_register_id: string | null
            change_amount: number | null
            created_at: string | null
            customer_cpf: string | null
            customer_name: string | null
            delivery_platform: string | null
            discount: number | null
            id: string
            paid_at: string | null
            payment_method: string | null
            sales_channel: string | null
            status: string
            subtotal: number | null
            table_id: string | null
            total: number | null
            updated_at: string | null
            user_id: string | null
          }
          Insert: {
            amount_paid?: number | null
            cancel_note?: string | null
            cancel_reason?: string | null
            cash_register_id?: string | null
            change_amount?: number | null
            created_at?: string | null
            customer_cpf?: string | null
            customer_name?: string | null
            delivery_platform?: string | null
            discount?: number | null
            id?: string
            paid_at?: string | null
            payment_method?: string | null
            sales_channel?: string | null
            status?: string
            subtotal?: number | null
            table_id?: string | null
            total?: number | null
            updated_at?: string | null
            user_id?: string | null
          }
          Update: {
            amount_paid?: number | null
            cancel_note?: string | null
            cancel_reason?: string | null
            cash_register_id?: string | null
            change_amount?: number | null
            created_at?: string | null
            customer_cpf?: string | null
            customer_name?: string | null
            delivery_platform?: string | null
            discount?: number | null
            id?: string
            paid_at?: string | null
            payment_method?: string | null
            sales_channel?: string | null
            status?: string
            subtotal?: number | null
            table_id?: string | null
            total?: number | null
            updated_at?: string | null
            user_id?: string | null
          }
          Relationships: [
            {
              foreignKeyName: "pdv_orders_table_id_fkey"
              columns: ["table_id"]
              isOneToOne: false
              referencedRelation: "pdv_tables"
              referencedColumns: ["id"]
            }
          ]
        }
        pdv_order_items: {
          Row: {
            created_at: string | null
            id: string
            order_id: string | null
            product_id: string | null
            product_name: string
            quantity: number
            total_price: number
            unit_price: number
            weight: number | null
          }
          Insert: {
            created_at?: string | null
            id?: string
            order_id?: string | null
            product_id?: string | null
            product_name: string
            quantity: number
            total_price: number
            unit_price: number
            weight?: number | null
          }
          Update: {
            created_at?: string | null
            id?: string
            order_id?: string | null
            product_id?: string | null
            product_name?: string
            quantity?: number
            total_price?: number
            unit_price?: number
            weight?: number | null
          }
          Relationships: [
            {
              foreignKeyName: "pdv_order_items_order_id_fkey"
              columns: ["order_id"]
              isOneToOne: false
              referencedRelation: "pdv_orders"
              referencedColumns: ["id"]
            },
            {
              foreignKeyName: "pdv_order_items_product_id_fkey"
              columns: ["product_id"]
              isOneToOne: false
              referencedRelation: "products"
              referencedColumns: ["id"]
            }
          ]
        }
        pdv_settings: {
          Row: {
            allow_negative_stock: boolean | null
            auto_print: boolean | null
            auto_receive_cash: boolean | null
            created_at: string | null
            id: string
            integrate_with_receivables: boolean | null
            min_discount_value: number | null
            printer_ip: string | null
            printer_model: string | null
            printer_port: number | null
            qz_printer_name: string | null
            require_cpf: boolean | null
            updated_at: string | null
            use_qz_tray: boolean | null
            user_id: string | null
          }
          Insert: {
            allow_negative_stock?: boolean | null
            auto_print?: boolean | null
            auto_receive_cash?: boolean | null
            created_at?: string | null
            id?: string
            integrate_with_receivables?: boolean | null
            min_discount_value?: number | null
            printer_ip?: string | null
            printer_model?: string | null
            printer_port?: number | null
            qz_printer_name?: string | null
            require_cpf?: boolean | null
            updated_at?: string | null
            use_qz_tray?: boolean | null
            user_id?: string | null
          }
          Update: {
            allow_negative_stock?: boolean | null
            auto_print?: boolean | null
            auto_receive_cash?: boolean | null
            created_at?: string | null
            id?: string
            integrate_with_receivables?: boolean | null
            min_discount_value?: number | null
            printer_ip?: string | null
            printer_model?: string | null
            printer_port?: number | null
            qz_printer_name?: string | null
            require_cpf?: boolean | null
            updated_at?: string | null
            use_qz_tray?: boolean | null
            user_id?: string | null
          }
          Relationships: []
        }
      }
      Views: {
        [_ in never]: never
      }
      Functions: {
        add_franchisee_master_role: {
          Args: { user_email: string }
          Returns: string
        }
        generate_order_number: { Args: never; Returns: string }
        has_role: {
          Args: {
            _role: Database["public"]["Enums"]["app_role"]
            _user_id: string
          }
          Returns: boolean
        }
      }
      Enums: {
        app_role: "admin" | "manager" | "staff" | "franchisee_master"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
  : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
  : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "manager", "staff", "franchisee_master"],
    },
  },
} as const
