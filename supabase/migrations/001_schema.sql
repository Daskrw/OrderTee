-- OrderTee Database Schema
-- 11 tables: categories, products, addon_groups, addon_options,
-- product_addon_groups, orders, order_items, order_item_addons,
-- website, settings

-- ============================================================
-- Categories
-- ============================================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_categories_sort ON categories (sort_order);

-- ============================================================
-- Products
-- ============================================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  image_url TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  is_sold_out BOOLEAN NOT NULL DEFAULT false,
  is_recommended BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_category ON products (category_id);
CREATE INDEX idx_products_sort ON products (sort_order);
CREATE INDEX idx_products_visible ON products (is_visible);

-- ============================================================
-- Addon Groups
-- ============================================================
CREATE TABLE addon_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT false,
  is_multiple BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_addon_groups_sort ON addon_groups (sort_order);

-- ============================================================
-- Addon Options
-- ============================================================
CREATE TABLE addon_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES addon_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  additional_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_addon_options_group ON addon_options (group_id);
CREATE INDEX idx_addon_options_sort ON addon_options (sort_order);

-- ============================================================
-- Product ↔ Addon Group (many-to-many)
-- ============================================================
CREATE TABLE product_addon_groups (
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  addon_group_id UUID NOT NULL REFERENCES addon_groups(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, addon_group_id)
);

-- ============================================================
-- Orders
-- ============================================================
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL,
  queue_number INTEGER NOT NULL DEFAULT 0,
  tracking_token TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  order_type TEXT NOT NULL DEFAULT 'pickup' CHECK (order_type IN ('pickup', 'delivery')),
  delivery_address TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'completed', 'cancelled')),
  total NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_status ON orders (status);
CREATE INDEX idx_orders_tracking ON orders (tracking_token);
CREATE INDEX idx_orders_created ON orders (created_at DESC);
CREATE INDEX idx_orders_queue ON orders (queue_number);

-- ============================================================
-- Order Items (snapshot product data)
-- ============================================================
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_price NUMERIC(10, 2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0
);

CREATE INDEX idx_order_items_order ON order_items (order_id);

-- ============================================================
-- Order Item Addons (snapshot addon data)
-- ============================================================
CREATE TABLE order_item_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  addon_group_name TEXT NOT NULL,
  addon_option_name TEXT NOT NULL,
  additional_price NUMERIC(10, 2) NOT NULL DEFAULT 0
);

CREATE INDEX idx_order_item_addons_item ON order_item_addons (order_item_id);

-- ============================================================
-- Website (single row — store content)
-- ============================================================
CREATE TABLE website (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  logo_url TEXT,
  banner_url TEXT,
  promotion_text TEXT,
  business_description TEXT,
  opening_hours TEXT,
  location TEXT,
  phone TEXT,
  facebook TEXT,
  instagram TEXT,
  line TEXT,
  google_map_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Settings (single row — store configuration)
-- ============================================================
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name TEXT NOT NULL DEFAULT 'OrderTee',
  primary_color TEXT NOT NULL DEFAULT '#f48c2e',
  is_open BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
