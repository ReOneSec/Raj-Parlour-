// Seed data — provenance is part of the data, not an afterthought.
//
// VERIFIED (from the branch service menu itself, checked 2026-11-02):
//   * Hair Cut — Rs.340-1750, 45-60 mins.
// UNVERIFIED (from Justdial listings for this branch, NOT the official menu):
//   * Hair Spa — Insta Care Rs.1330, Beauty Sutra Rs.3520, Moroccan Oil Rs.4280.
//     These are seeded so the admin can review/edit/delete them, and they are
//     labelled "unverified" everywhere they appear. Do NOT present them as
//     official menu prices until the salon confirms them.
// OWNER-ADDED (the owner's own service, added by him in the test app admin):
//   * Normal Cut (Men, Hair) — Rs.100, 20 mins, Entry level.
//     Price is unverified against the branch menu; labelled "Owner-added".
// EVERYTHING ELSE starts empty by design. No other prices are invented.
// Categories and the Men/Women structure come from the branch menu layout;
// a category with no services simply renders as empty until an admin adds one.

const BRANCH = {
  id: "berhampore-main",
  name: "Berhampore Salon",
  address: "K K Banerjee Road, Berhampore",
  note: "Model location only. Generic salon identity — no Lakme branding, logos or images are used anywhere in this project.",
};

const SERVICES = [
  {
    id: "hair-cut",
    branch_id: BRANCH.id,
    gender: "WOMEN",
    category: "Hair",
    subcategory: "Cut",
    name: "Hair Cut",
    price_min: 340,
    price_max: 1750,
    currency: "INR",
    duration_min: 45,
    duration_max: 60,
    level: "Entry",
    is_active: true,
    provenance: "verified",
    provenance_note: "Verified from the branch service menu.",
  },
  {
    id: "hair-spa-insta-care",
    branch_id: BRANCH.id,
    gender: "WOMEN",
    category: "Hair",
    subcategory: "Hair Spa",
    name: "Hair Spa — Insta Care",
    price_min: 1330,
    price_max: 1330,
    currency: "INR",
    duration_min: null,
    duration_max: null,
    level: "Entry",
    is_active: true,
    provenance: "unverified",
    provenance_note: "UNVERIFIED: from a Justdial listing for this branch, NOT the official menu. Admin-editable — confirm before publishing as an official price.",
  },
  {
    id: "hair-spa-beauty-sutra",
    branch_id: BRANCH.id,
    gender: "WOMEN",
    category: "Hair",
    subcategory: "Hair Spa",
    name: "Hair Spa — Beauty Sutra",
    price_min: 3520,
    price_max: 3520,
    currency: "INR",
    duration_min: null,
    duration_max: null,
    level: "Mid",
    is_active: true,
    provenance: "unverified",
    provenance_note: "UNVERIFIED: from a Justdial listing for this branch, NOT the official menu. Admin-editable — confirm before publishing as an official price.",
  },
  {
    id: "hair-spa-moroccan-oil",
    branch_id: BRANCH.id,
    gender: "WOMEN",
    category: "Hair",
    subcategory: "Hair Spa",
    name: "Hair Spa — Moroccan Oil",
    price_min: 4280,
    price_max: 4280,
    currency: "INR",
    duration_min: null,
    duration_max: null,
    level: "Premium",
    is_active: true,
    provenance: "unverified",
    provenance_note: "UNVERIFIED: from a Justdial listing for this branch, NOT the official menu. Admin-editable — confirm before publishing as an official price.",
  },
  {
    id: "normal-cut",
    branch_id: BRANCH.id,
    gender: "MEN",
    category: "Hair",
    subcategory: "Cut",
    name: "Normal Cut",
    price_min: 100,
    price_max: 100,
    currency: "INR",
    duration_min: 20,
    duration_max: 20,
    level: "Entry",
    is_active: true,
    provenance: "admin",
    provenance_note: "Owner-added: the owner's own service, added by him in the test app admin. Price unverified against the branch menu.",
  },
];

module.exports = { BRANCH, SERVICES };
