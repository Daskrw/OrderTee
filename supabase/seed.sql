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

-- Assign sweetness and size to tea
INSERT INTO product_addon_groups (product_id, addon_group_id)
SELECT p.id, ag.id
FROM products p
CROSS JOIN addon_groups ag
WHERE p.category_id = (SELECT id FROM categories WHERE name = 'Tea')
  AND ag.name IN ('Sweetness', 'Size');
