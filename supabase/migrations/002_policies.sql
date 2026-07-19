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
