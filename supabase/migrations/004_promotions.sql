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
