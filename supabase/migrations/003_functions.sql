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
