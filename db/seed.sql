-- Seed — same provenance rules as lib/seed.js. Run AFTER db/schema.sql.
-- ONLY Hair Cut is verified from the branch menu. The three Hair Spa
-- rows are UNVERIFIED Justdial listings, NOT the official menu.
-- Normal Cut is OWNER-ADDED: the owner's own Men service (Rs.100, 20 mins),
-- added by him in the test app admin; price unverified against the branch menu.
-- All other categories start empty by design; do not invent prices.

INSERT INTO branches (id, name, address, note) VALUES
  ('berhampore-main', 'Berhampore Salon', 'K K Banerjee Road, Berhampore',
   'Model location only. Generic salon identity — no Lakme branding, logos or images.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO services
  (id, branch_id, gender, category, subcategory, name, price_min, price_max, currency,
   duration_min, duration_max, level, is_active, provenance, provenance_note) VALUES
  ('hair-cut', 'berhampore-main', 'WOMEN', 'Hair', 'Cut', 'Hair Cut',
   340, 1750, 'INR', 45, 60, 'Entry', true, 'verified',
   'Verified from the branch service menu.'),
  ('hair-spa-insta-care', 'berhampore-main', 'WOMEN', 'Hair', 'Hair Spa', 'Hair Spa — Insta Care',
   1330, 1330, 'INR', NULL, NULL, 'Entry', true, 'unverified',
   'UNVERIFIED: from a Justdial listing for this branch, NOT the official menu. Admin-editable.'),
  ('hair-spa-beauty-sutra', 'berhampore-main', 'WOMEN', 'Hair', 'Hair Spa', 'Hair Spa — Beauty Sutra',
   3520, 3520, 'INR', NULL, NULL, 'Mid', true, 'unverified',
   'UNVERIFIED: from a Justdial listing for this branch, NOT the official menu. Admin-editable.'),
  ('hair-spa-moroccan-oil', 'berhampore-main', 'WOMEN', 'Hair', 'Hair Spa', 'Hair Spa — Moroccan Oil',
   4280, 4280, 'INR', NULL, NULL, 'Premium', true, 'unverified',
   'UNVERIFIED: from a Justdial listing for this branch, NOT the official menu. Admin-editable.'),
  ('normal-cut', 'berhampore-main', 'MEN', 'Hair', 'Cut', 'Normal Cut',
   100, 100, 'INR', 20, 20, 'Entry', true, 'admin',
   'Owner-added: the owner''s own service, added by him in the test app admin. Price unverified against the branch menu.')
ON CONFLICT (id) DO NOTHING;

-- No staff, slots, customers, bookings or notifications are seeded.
-- Staff and slots are created by the salon in admin after deploy.
