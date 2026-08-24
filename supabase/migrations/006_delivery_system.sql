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
