-- ============================================================
-- Migration 009: Activities & Customer Submissions
-- ============================================================

CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  cover_image TEXT,
  required_items INTEGER NOT NULL DEFAULT 5,
  reward_description TEXT NOT NULL DEFAULT 'รับส่วนลดพิเศษหรือโปรโมชั่นสุดคุ้มจากทางร้าน',
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

-- Enable RLS
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_submissions ENABLE ROW LEVEL SECURITY;

-- Policies for activities
DO $$ 
BEGIN
  CREATE POLICY "activities_public_read" ON activities FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ 
BEGIN
  CREATE POLICY "activities_admin_insert" ON activities FOR INSERT WITH CHECK (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ 
BEGIN
  CREATE POLICY "activities_admin_update" ON activities FOR UPDATE USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ 
BEGIN
  CREATE POLICY "activities_admin_delete" ON activities FOR DELETE USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Policies for activity_submissions
-- 1. Public can insert new submissions
DO $$ 
BEGIN
  CREATE POLICY "submissions_public_insert" ON activity_submissions FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Public can read approved submissions (for gallery/leaderboard) or admin can read all
DO $$ 
BEGIN
  CREATE POLICY "submissions_select_policy" ON activity_submissions FOR SELECT USING (
    status = 'approved' OR auth.role() = 'authenticated'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Admin can update and delete submissions
DO $$ 
BEGIN
  CREATE POLICY "submissions_admin_update" ON activity_submissions FOR UPDATE USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ 
BEGIN
  CREATE POLICY "submissions_admin_delete" ON activity_submissions FOR DELETE USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Insert First Campaign if empty
INSERT INTO activities (
  title,
  description,
  instructions,
  required_items,
  reward_description,
  contact_info,
  is_active,
  show_gallery,
  show_leaderboard
)
SELECT
  'แคมเปญถ่ายภาพสะสมไอเทม (Customer Photo Challenge)',
  'ร่วมสนุกสะสมภาพถ่ายสินค้า คำคม หรือไอเทมพิเศษที่คุณได้รับจากทางร้าน ครบ 5 แบบเพื่อรับโปรโมชั่นพิเศษ!',
  '1. ถ่ายภาพสินค้า แก้วเครื่องดื่ม หรือคำคมพิเศษที่คุณได้รับ
2. อัปโหลดรูปภาพพร้อมระบุชื่อและเบอร์โทรศัพท์
3. ทางร้านจะตรวจสอบความถูกต้องของแต่ละไอเทม
4. เมื่อสะสมไอเทมที่ได้รับการอนุมัติครบ 5 แบบ ติดต่อรับส่วนลดพิเศษได้ทันที!',
  5,
  'รับส่วนลดพิเศษ 15% หรือสิทธิ์รับเครื่องดื่มฟรี 1 แก้ว!',
  'ติดต่อแจ้งรับสิทธิ์ทาง Line หรือโทร 061-608-0720',
  true,
  true,
  true
WHERE NOT EXISTS (SELECT 1 FROM activities);
