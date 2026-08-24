// Database types matching the 11-table schema
// These are manually maintained — update when schema changes

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled'
export type OrderType = 
  | 'pickup' 
  | 'scheduled_route' 
  | 'immediate_local' 
  | 'delivery' 
  | 'preorder_route' 
  | 'preorder_nearby'

export interface DeliveryLocation {
  id: string
  name: string
  building: string | null
  route_name: string | null
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface DeliverySchedule {
  id: string
  delivery_date: string
  location_id: string | null
  location_name: string
  building: string | null
  route_name: string | null
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  // Optional joined location
  location?: DeliveryLocation
}

export interface Category {
  id: string
  name: string
  sort_order: number
  is_visible: boolean
  created_at: string
}

export interface Product {
  id: string
  name: string
  description: string | null
  price: number
  image_url: string | null
  category_id: string | null
  is_visible: boolean
  is_sold_out: boolean
  is_recommended: boolean
  sort_order: number
  created_at: string
  // Joined data
  category?: Category
  addon_groups?: AddonGroup[]
}

export interface AddonGroup {
  id: string
  name: string
  is_required: boolean
  is_multiple: boolean
  sort_order: number
  created_at: string
  // Joined data
  addon_options?: AddonOption[]
}

export interface AddonOption {
  id: string
  group_id: string
  name: string
  additional_price: number
  sort_order: number
  created_at: string
}

export interface ProductAddonGroup {
  product_id: string
  addon_group_id: string
}

export type PaymentMethod = 'cash' | 'promptpay'

export interface Order {
  id: string
  order_number: string
  queue_number: number
  tracking_token: string
  customer_name: string
  customer_phone: string
  order_type: OrderType
  payment_method: PaymentMethod
  delivery_address: string | null
  delivery_date: string | null
  delivery_fee: number
  scheduled_delivery_date: string | null
  scheduled_delivery_location_id: string | null
  scheduled_delivery_location_name: string | null
  scheduled_delivery_building: string | null
  scheduled_delivery_route: string | null
  notes: string | null
  status: OrderStatus
  total: number
  created_at: string
  // Joined data
  order_items?: OrderItem[]
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string | null
  product_name: string
  product_price: number
  quantity: number
  notes: string | null
  subtotal: number
  // Joined data
  order_item_addons?: OrderItemAddon[]
}

export interface OrderItemAddon {
  id: string
  order_item_id: string
  addon_group_name: string
  addon_option_name: string
  additional_price: number
}

export interface Website {
  id: string
  logo_url: string | null
  banner_url: string | null
  carousel_images: string[]
  promotion_text: string | null
  business_description: string | null
  opening_hours: string | null
  location: string | null
  phone: string | null
  facebook: string | null
  instagram: string | null
  line: string | null
  google_map_url: string | null
  updated_at: string
}

export interface Settings {
  id: string
  store_name: string
  primary_color: string
  is_open: boolean
  updated_at: string
}

export type PromotionType = 'discount_products' | 'buy_x_get_y' | 'percentage_discount'

export interface Promotion {
  id: string
  name: string
  type: PromotionType
  start_date: string | null
  end_date: string | null
  is_active: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: any
  created_at: string
}

// Supabase Database type for the typed client
export interface Database {
  public: {
    Tables: {
      categories: {
        Row: Category
        Insert: Omit<Category, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Omit<Category, 'id'>>
      }
      products: {
        Row: Product
        Insert: Omit<Product, 'id' | 'created_at' | 'category' | 'addon_groups'> & { id?: string; created_at?: string }
        Update: Partial<Omit<Product, 'id' | 'category' | 'addon_groups'>>
      }
      addon_groups: {
        Row: AddonGroup
        Insert: Omit<AddonGroup, 'id' | 'created_at' | 'addon_options'> & { id?: string; created_at?: string }
        Update: Partial<Omit<AddonGroup, 'id' | 'addon_options'>>
      }
      addon_options: {
        Row: AddonOption
        Insert: Omit<AddonOption, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Omit<AddonOption, 'id'>>
      }
      product_addon_groups: {
        Row: ProductAddonGroup
        Insert: ProductAddonGroup
        Update: Partial<ProductAddonGroup>
      }
      orders: {
        Row: Order
        Insert: Omit<Order, 'id' | 'created_at' | 'order_items'> & { id?: string; created_at?: string }
        Update: Partial<Omit<Order, 'id' | 'order_items'>>
      }
      order_items: {
        Row: OrderItem
        Insert: Omit<OrderItem, 'id' | 'order_item_addons'> & { id?: string }
        Update: Partial<Omit<OrderItem, 'id' | 'order_item_addons'>>
      }
      order_item_addons: {
        Row: OrderItemAddon
        Insert: Omit<OrderItemAddon, 'id'> & { id?: string }
        Update: Partial<Omit<OrderItemAddon, 'id'>>
      }
      website: {
        Row: Website
        Insert: Omit<Website, 'id' | 'updated_at'> & { id?: string; updated_at?: string }
        Update: Partial<Omit<Website, 'id'>>
      }
      settings: {
        Row: Settings
        Insert: Omit<Settings, 'id' | 'updated_at'> & { id?: string; updated_at?: string }
        Update: Partial<Omit<Settings, 'id'>>
      }
      promotions: {
        Row: Promotion
        Insert: Omit<Promotion, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Omit<Promotion, 'id'>>
      }
      delivery_locations: {
        Row: DeliveryLocation
        Insert: Omit<DeliveryLocation, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }
        Update: Partial<Omit<DeliveryLocation, 'id'>>
      }
      delivery_schedules: {
        Row: DeliverySchedule
        Insert: Omit<DeliverySchedule, 'id' | 'created_at' | 'updated_at' | 'location'> & { id?: string; created_at?: string; updated_at?: string }
        Update: Partial<Omit<DeliverySchedule, 'id' | 'location'>>
      }
    }
  }
}
