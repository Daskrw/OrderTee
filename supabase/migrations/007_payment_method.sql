-- ============================================================
-- Migration 007: Payment Method and Payment Slip in orders
-- ============================================================

ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'cash';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_slip_url TEXT;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_payment_method_check') THEN
    ALTER TABLE orders DROP CONSTRAINT orders_payment_method_check;
  END IF;
  ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check 
    CHECK (payment_method IN ('cash', 'promptpay'));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_payment_method ON orders(payment_method);

-- Storage bucket for images & payment slips
DO $$ 
BEGIN
  INSERT INTO storage.buckets (id, name, public) VALUES ('images', 'images', true)
  ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ 
BEGIN
  CREATE POLICY "images_public_insert" ON storage.objects 
    FOR INSERT WITH CHECK (bucket_id = 'images');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  CREATE POLICY "images_public_select" ON storage.objects 
    FOR SELECT USING (bucket_id = 'images');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
