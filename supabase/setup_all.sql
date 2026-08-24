-- ============================================================
-- OrderTee — Full Database Setup
-- Generated: 2026-08-24T13:47:06.662Z
-- Run this in: https://supabase.com/dashboard/project/tkezdrcciespyxjvweyy/sql
-- ============================================================

-- Migration: 001_schema.sql
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
  payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'promptpay')),
  payment_slip_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'completed', 'cancelled')),
  total NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_status ON orders (status);
CREATE INDEX idx_orders_payment_method ON orders (payment_method);
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
  store_description TEXT DEFAULT 'ร้านชาและเครื่องดื่ม สดชื่นทุกแก้ว',
  store_phone TEXT DEFAULT '0616080720',
  store_address TEXT DEFAULT 'อาคารหลัก ร้านค้า OrderTee',
  promptpay_number TEXT DEFAULT '0616080720',
  primary_color TEXT NOT NULL DEFAULT '#f48c2e',
  is_open BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- Migration: 002_policies.sql
-- Row Level Security Policies
-- Strategy: Public read for customer-facing data, authenticated write for admin

-- ============================================================
-- Enable RLS on all tables
-- ============================================================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE addon_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE addon_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_addon_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_item_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE website ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Categories — Public read, admin write
-- ============================================================
CREATE POLICY "categories_public_read" ON categories
  FOR SELECT USING (true);

CREATE POLICY "categories_admin_insert" ON categories
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "categories_admin_update" ON categories
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "categories_admin_delete" ON categories
  FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================================
-- Products — Public read (visible only), admin write
-- ============================================================
CREATE POLICY "products_public_read" ON products
  FOR SELECT USING (true);

CREATE POLICY "products_admin_insert" ON products
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "products_admin_update" ON products
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "products_admin_delete" ON products
  FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================================
-- Addon Groups — Public read, admin write
-- ============================================================
CREATE POLICY "addon_groups_public_read" ON addon_groups
  FOR SELECT USING (true);

CREATE POLICY "addon_groups_admin_insert" ON addon_groups
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "addon_groups_admin_update" ON addon_groups
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "addon_groups_admin_delete" ON addon_groups
  FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================================
-- Addon Options — Public read, admin write
-- ============================================================
CREATE POLICY "addon_options_public_read" ON addon_options
  FOR SELECT USING (true);

CREATE POLICY "addon_options_admin_insert" ON addon_options
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "addon_options_admin_update" ON addon_options
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "addon_options_admin_delete" ON addon_options
  FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================================
-- Product Addon Groups — Public read, admin write
-- ============================================================
CREATE POLICY "product_addon_groups_public_read" ON product_addon_groups
  FOR SELECT USING (true);

CREATE POLICY "product_addon_groups_admin_insert" ON product_addon_groups
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "product_addon_groups_admin_delete" ON product_addon_groups
  FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================================
-- Orders — Anyone can insert (customer checkout), admin can read/update/delete
-- Customers can read their own order via tracking_token (handled in app logic)
-- ============================================================
CREATE POLICY "orders_public_insert" ON orders
  FOR INSERT WITH CHECK (true);

CREATE POLICY "orders_public_read" ON orders
  FOR SELECT USING (true);

CREATE POLICY "orders_admin_update" ON orders
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "orders_admin_delete" ON orders
  FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================================
-- Order Items — Anyone can insert (with order), public read
-- ============================================================
CREATE POLICY "order_items_public_insert" ON order_items
  FOR INSERT WITH CHECK (true);

CREATE POLICY "order_items_public_read" ON order_items
  FOR SELECT USING (true);

-- ============================================================
-- Order Item Addons — Anyone can insert (with order), public read
-- ============================================================
CREATE POLICY "order_item_addons_public_insert" ON order_item_addons
  FOR INSERT WITH CHECK (true);

CREATE POLICY "order_item_addons_public_read" ON order_item_addons
  FOR SELECT USING (true);

-- ============================================================
-- Website — Public read, admin write
-- ============================================================
CREATE POLICY "website_public_read" ON website
  FOR SELECT USING (true);

CREATE POLICY "website_admin_insert" ON website
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "website_admin_update" ON website
  FOR UPDATE USING (auth.role() = 'authenticated');

-- ============================================================
-- Settings — Public read (for store status), admin write
-- ============================================================
CREATE POLICY "settings_public_read" ON settings
  FOR SELECT USING (true);

CREATE POLICY "settings_admin_insert" ON settings
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "settings_admin_update" ON settings
  FOR UPDATE USING (auth.role() = 'authenticated');


-- Migration: 003_functions.sql
-- Database Functions & Triggers

-- ============================================================
-- Auto-generate daily queue number
-- Resets to 1 each day, increments within the same day.
-- ============================================================
CREATE OR REPLACE FUNCTION generate_queue_number()
RETURNS TRIGGER AS $$
DECLARE
  today_count INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO today_count
  FROM orders
  WHERE created_at::date = CURRENT_DATE;

  NEW.queue_number := today_count;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_order_queue_number
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION generate_queue_number();

-- ============================================================
-- Auto-generate order number (OT-YYYYMMDD-XXXX)
-- ============================================================
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
  today_count INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO today_count
  FROM orders
  WHERE created_at::date = CURRENT_DATE;

  NEW.order_number := 'OT-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(today_count::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION generate_order_number();

-- ============================================================
-- Auto-update "updated_at" on website and settings
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_website_updated_at
  BEFORE UPDATE ON website
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Enable Realtime for orders table
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE orders;


-- Migration: 004_promotions.sql
-- ============================================================
-- Promotions
-- ============================================================
CREATE TABLE promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('discount_products', 'buy_x_get_y', 'percentage_discount')),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Policies for Promotions
-- ============================================================
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on active promotions" 
  ON promotions FOR SELECT 
  USING (is_active = true);

CREATE POLICY "Allow admin full access on promotions" 
  ON promotions FOR ALL 
  USING (auth.role() = 'authenticated');


-- Migration: 005_carousel.sql
ALTER TABLE website ADD COLUMN carousel_images TEXT[] DEFAULT '{}'::TEXT[];


-- Migration: 006_delivery_system.sql
-- ============================================================
-- 006_delivery_system.sql
-- Scheduled Route Delivery & Time-validated Delivery Options
-- ============================================================

-- 1. Delivery Locations (Places, Buildings, Routes)
CREATE TABLE IF NOT EXISTS delivery_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  building TEXT,
  route_name TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delivery_locations_active ON delivery_locations(is_active);

-- 2. Delivery Schedules (Admin-configured delivery dates & locations)
CREATE TABLE IF NOT EXISTS delivery_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_date DATE NOT NULL,
  location_id UUID REFERENCES delivery_locations(id) ON DELETE SET NULL,
  location_name TEXT NOT NULL,
  building TEXT,
  route_name TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delivery_schedules_date ON delivery_schedules(delivery_date);
CREATE INDEX IF NOT EXISTS idx_delivery_schedules_active ON delivery_schedules(is_active);

-- 3. Update orders table with scheduled delivery fields
ALTER TABLE orders ADD COLUMN IF NOT EXISTS scheduled_delivery_date DATE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS scheduled_delivery_location_id UUID;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS scheduled_delivery_location_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS scheduled_delivery_building TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS scheduled_delivery_route TEXT;

-- Update orders order_type check constraint to support new delivery methods
DO $$
BEGIN
  -- Drop existing constraint if named orders_order_type_check
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_order_type_check'
  ) THEN
    ALTER TABLE orders DROP CONSTRAINT orders_order_type_check;
  END IF;
  
  -- Add updated constraint supporting all current & legacy types
  ALTER TABLE orders ADD CONSTRAINT orders_order_type_check 
    CHECK (order_type IN ('pickup', 'scheduled_route', 'immediate_local', 'delivery', 'preorder_route', 'preorder_nearby'));
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- 4. Automatic updated_at triggers
CREATE TRIGGER trg_delivery_locations_updated_at
  BEFORE UPDATE ON delivery_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_delivery_schedules_updated_at
  BEFORE UPDATE ON delivery_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 5. Row Level Security (RLS)
ALTER TABLE delivery_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_schedules ENABLE ROW LEVEL SECURITY;

-- Locations Policies
DO $$ BEGIN
  CREATE POLICY "delivery_locations_public_read" ON delivery_locations
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "delivery_locations_admin_all" ON delivery_locations
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Schedules Policies
DO $$ BEGIN
  CREATE POLICY "delivery_schedules_public_read" ON delivery_schedules
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "delivery_schedules_admin_all" ON delivery_schedules
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 6. Backend Delivery Validation Trigger on Orders
CREATE OR REPLACE FUNCTION validate_order_delivery_rules()
RETURNS TRIGGER AS $$
DECLARE
  current_local_time TIME;
  current_local_date DATE;
  matching_schedule_count INTEGER;
BEGIN
  -- Compute Bangkok local time (UTC+7)
  current_local_time := (now() AT TIME ZONE 'Asia/Bangkok')::time;
  current_local_date := (now() AT TIME ZONE 'Asia/Bangkok')::date;

  -- 1. Pickup at Store validation (19:00 - 22:00 only)
  IF NEW.order_type = 'pickup' THEN
    IF current_local_time < '19:00:00'::time OR current_local_time >= '22:00:00'::time THEN
      RAISE EXCEPTION 'Pickup at store is available from 19:00 to 22:00 only (Current local time: %)', current_local_time;
    END IF;
  END IF;

  -- 2. Immediate Local Delivery validation (19:00 - 22:00 only)
  IF NEW.order_type = 'immediate_local' THEN
    IF current_local_time < '19:00:00'::time OR current_local_time >= '22:00:00'::time THEN
      RAISE EXCEPTION 'Immediate local delivery is available from 19:00 to 22:00 only (Current local time: %)', current_local_time;
    END IF;
    IF NEW.delivery_address IS NULL OR trim(NEW.delivery_address) = '' THEN
      RAISE EXCEPTION 'Delivery address is required for immediate local delivery';
    END IF;
  END IF;

  -- 3. Scheduled Route Delivery validation (Strictly future dates & active admin schedule)
  IF NEW.order_type = 'scheduled_route' THEN
    IF NEW.scheduled_delivery_date IS NULL THEN
      RAISE EXCEPTION 'Scheduled delivery date is required for scheduled route delivery';
    END IF;

    -- Must be strictly in the future (NOT today, NOT in the past)
    IF NEW.scheduled_delivery_date <= current_local_date THEN
      RAISE EXCEPTION 'Scheduled delivery date must be a future date (strictly after %)', current_local_date;
    END IF;

    -- Validate against active admin schedule
    SELECT COUNT(*) INTO matching_schedule_count
    FROM delivery_schedules
    WHERE delivery_date = NEW.scheduled_delivery_date
      AND is_active = true
      AND (
        (NEW.scheduled_delivery_location_id IS NOT NULL AND location_id = NEW.scheduled_delivery_location_id)
        OR (location_name = NEW.scheduled_delivery_location_name)
      );

    IF matching_schedule_count = 0 THEN
      RAISE EXCEPTION 'No active delivery schedule found for date % and location %', NEW.scheduled_delivery_date, NEW.scheduled_delivery_location_name;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger execution before insert on orders
DROP TRIGGER IF EXISTS trg_validate_order_delivery ON orders;
CREATE TRIGGER trg_validate_order_delivery
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION validate_order_delivery_rules();


-- Seed Data — Sample Coffee Shop Menu
-- Run this after the schema migration to populate test data.

-- ============================================================
-- Settings
-- ============================================================
INSERT INTO settings (store_name, primary_color, is_open)
VALUES ('OrderTee Coffee', '#f48c2e', true);

-- ============================================================
-- Website
-- ============================================================
INSERT INTO website (
  promotion_text,
  business_description,
  opening_hours,
  location,
  phone
) VALUES (
  '☕ Grand Opening! 20% off all drinks this week!',
  'We serve specialty coffee, fresh pastries, and good vibes. Come visit us!',
  'Mon-Fri: 7:00 AM - 6:00 PM | Sat-Sun: 8:00 AM - 5:00 PM',
  '123 Coffee Street, Bangkok 10110',
  '02-123-4567'
);

-- ============================================================
-- Categories
-- ============================================================
INSERT INTO categories (name, sort_order, is_visible) VALUES
  ('Hot Coffee', 1, true),
  ('Iced Coffee', 2, true),
  ('Tea', 3, true),
  ('Smoothies', 4, true),
  ('Pastries', 5, true),
  ('Snacks', 6, true);

-- ============================================================
-- Products
-- ============================================================
-- Hot Coffee
INSERT INTO products (name, description, price, category_id, is_visible, is_recommended, sort_order)
VALUES
  ('Espresso', 'Rich and bold single shot espresso', 60, (SELECT id FROM categories WHERE name = 'Hot Coffee'), true, false, 1),
  ('Americano', 'Espresso with hot water', 70, (SELECT id FROM categories WHERE name = 'Hot Coffee'), true, true, 2),
  ('Cappuccino', 'Espresso with steamed milk and foam', 85, (SELECT id FROM categories WHERE name = 'Hot Coffee'), true, true, 3),
  ('Latte', 'Espresso with steamed milk', 85, (SELECT id FROM categories WHERE name = 'Hot Coffee'), true, false, 4),
  ('Mocha', 'Espresso with chocolate and steamed milk', 95, (SELECT id FROM categories WHERE name = 'Hot Coffee'), true, false, 5);

-- Iced Coffee
INSERT INTO products (name, description, price, category_id, is_visible, is_recommended, sort_order)
VALUES
  ('Iced Americano', 'Espresso with cold water and ice', 75, (SELECT id FROM categories WHERE name = 'Iced Coffee'), true, true, 1),
  ('Iced Latte', 'Espresso with cold milk and ice', 90, (SELECT id FROM categories WHERE name = 'Iced Coffee'), true, true, 2),
  ('Iced Mocha', 'Espresso with chocolate, cold milk and ice', 100, (SELECT id FROM categories WHERE name = 'Iced Coffee'), true, false, 3),
  ('Cold Brew', 'Slow-steeped for 16 hours', 95, (SELECT id FROM categories WHERE name = 'Iced Coffee'), true, false, 4);

-- Tea
INSERT INTO products (name, description, price, category_id, is_visible, is_recommended, sort_order)
VALUES
  ('Thai Tea', 'Classic Thai iced tea with cream', 65, (SELECT id FROM categories WHERE name = 'Tea'), true, true, 1),
  ('Green Tea Latte', 'Matcha with steamed milk', 85, (SELECT id FROM categories WHERE name = 'Tea'), true, false, 2),
  ('Chamomile Tea', 'Calming herbal tea', 55, (SELECT id FROM categories WHERE name = 'Tea'), true, false, 3);

-- Smoothies
INSERT INTO products (name, description, price, category_id, is_visible, is_recommended, sort_order)
VALUES
  ('Mango Smoothie', 'Fresh mango blended with yogurt', 90, (SELECT id FROM categories WHERE name = 'Smoothies'), true, true, 1),
  ('Berry Blast', 'Mixed berries with banana and milk', 95, (SELECT id FROM categories WHERE name = 'Smoothies'), true, false, 2);

-- Pastries
INSERT INTO products (name, description, price, category_id, is_visible, is_recommended, sort_order)
VALUES
  ('Croissant', 'Buttery and flaky French croissant', 65, (SELECT id FROM categories WHERE name = 'Pastries'), true, true, 1),
  ('Chocolate Muffin', 'Rich double chocolate muffin', 55, (SELECT id FROM categories WHERE name = 'Pastries'), true, false, 2),
  ('Banana Bread', 'Moist homemade banana bread', 60, (SELECT id FROM categories WHERE name = 'Pastries'), true, false, 3);

-- Snacks
INSERT INTO products (name, description, price, category_id, is_visible, is_sold_out, sort_order)
VALUES
  ('Granola Bar', 'Oats, honey, and dried fruits', 45, (SELECT id FROM categories WHERE name = 'Snacks'), true, false, 1),
  ('Cookie', 'Freshly baked chocolate chip cookie', 40, (SELECT id FROM categories WHERE name = 'Snacks'), true, true, 2);

-- ============================================================
-- Addon Groups
-- ============================================================
INSERT INTO addon_groups (name, is_required, is_multiple, sort_order) VALUES
  ('Sweetness', true, false, 1),
  ('Size', true, false, 2),
  ('Toppings', false, true, 3),
  ('Extra Shot', false, false, 4);

-- ============================================================
-- Addon Options
-- ============================================================
-- Sweetness
INSERT INTO addon_options (group_id, name, additional_price, sort_order) VALUES
  ((SELECT id FROM addon_groups WHERE name = 'Sweetness'), '0%', 0, 1),
  ((SELECT id FROM addon_groups WHERE name = 'Sweetness'), '25%', 0, 2),
  ((SELECT id FROM addon_groups WHERE name = 'Sweetness'), '50%', 0, 3),
  ((SELECT id FROM addon_groups WHERE name = 'Sweetness'), '75%', 0, 4),
  ((SELECT id FROM addon_groups WHERE name = 'Sweetness'), '100%', 0, 5);

-- Size
INSERT INTO addon_options (group_id, name, additional_price, sort_order) VALUES
  ((SELECT id FROM addon_groups WHERE name = 'Size'), 'Small', 0, 1),
  ((SELECT id FROM addon_groups WHERE name = 'Size'), 'Medium', 10, 2),
  ((SELECT id FROM addon_groups WHERE name = 'Size'), 'Large', 20, 3);

-- Toppings
INSERT INTO addon_options (group_id, name, additional_price, sort_order) VALUES
  ((SELECT id FROM addon_groups WHERE name = 'Toppings'), 'Pearls', 15, 1),
  ((SELECT id FROM addon_groups WHERE name = 'Toppings'), 'Cheese Foam', 20, 2),
  ((SELECT id FROM addon_groups WHERE name = 'Toppings'), 'Whipped Cream', 15, 3),
  ((SELECT id FROM addon_groups WHERE name = 'Toppings'), 'Jelly', 10, 4);

-- Extra Shot
INSERT INTO addon_options (group_id, name, additional_price, sort_order) VALUES
  ((SELECT id FROM addon_groups WHERE name = 'Extra Shot'), 'No Extra', 0, 1),
  ((SELECT id FROM addon_groups WHERE name = 'Extra Shot'), '+1 Shot', 25, 2),
  ((SELECT id FROM addon_groups WHERE name = 'Extra Shot'), '+2 Shots', 45, 3);

-- ============================================================
-- Assign addon groups to coffee products
-- ============================================================
INSERT INTO product_addon_groups (product_id, addon_group_id)
SELECT p.id, ag.id
FROM products p
CROSS JOIN addon_groups ag
WHERE p.category_id IN (
  SELECT id FROM categories WHERE name IN ('Hot Coffee', 'Iced Coffee')
);

INSERT INTO product_addon_groups (product_id, addon_group_id)
SELECT p.id, ag.id
FROM products p
CROSS JOIN addon_groups ag
WHERE p.category_id = (SELECT id FROM categories WHERE name = 'Tea');

-- ============================================================
-- Activities & Submissions
-- ============================================================
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  cover_image TEXT,
  required_items INTEGER NOT NULL DEFAULT 5,
  reward_description TEXT NOT NULL DEFAULT 'รับส่วนลดพิเศษหรือของรางวัลจากทางร้าน',
  contact_info TEXT DEFAULT 'ติดต่อร้านค้าได้ที่เบอร์ 061-608-0720 หรือ Line Official',
  start_date DATE,
  end_date DATE,
  max_photos_per_submission INTEGER NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT true,
  show_gallery BOOLEAN NOT NULL DEFAULT true,
  show_leaderboard BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS activity_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  images TEXT[] NOT NULL DEFAULT '{}',
  item_tag TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note TEXT,
  rejection_reason TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_submissions_activity ON activity_submissions(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_submissions_phone ON activity_submissions(customer_phone);
CREATE INDEX IF NOT EXISTS idx_activity_submissions_status ON activity_submissions(status);

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_submissions ENABLE ROW LEVEL SECURITY;
  AND ag.name IN ('Sweetness', 'Size');
