-- ============================================================
-- Migration 008: Store Settings upgrade
-- ============================================================

ALTER TABLE settings ADD COLUMN IF NOT EXISTS store_description TEXT DEFAULT 'ร้านชาและเครื่องดื่ม สดชื่นทุกแก้ว';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS store_phone TEXT DEFAULT '0616080720';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS store_address TEXT DEFAULT 'อาคารหลัก ร้านค้า OrderTee';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS promptpay_number TEXT DEFAULT '0616080720';

-- Ensure single settings row exists
INSERT INTO settings (store_name, primary_color, is_open, store_description, store_phone, store_address, promptpay_number)
SELECT 'OrderTee', '#f48c2e', true, 'ร้านชาและเครื่องดื่ม สดชื่นทุกแก้ว', '0616080720', 'อาคารหลัก ร้านค้า OrderTee', '0616080720'
WHERE NOT EXISTS (SELECT 1 FROM settings);
