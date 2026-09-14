# Rasin Ayiti 2.0 — Baz Done SQL (Supabase)

Tout fichye SQL nan dosye sa a itilize prefiks **`rasinayiti_`** sou tout tablo, fonksyon, ak storage buckets pou evite nenpòt konfli ak lòt pwojè ki pataje menm enstans Supabase la.

---

## 📁 Estrikti Fichye yo

| Fichye | Deskripsyon |
|---|---|
| **`00_master_setup.sql`** | **Fichye Konplè All-in-One** (kouri sa a pou w enstale tout bagay an yon sèl kou) |
| **`01_tables.sql`** | Definisyon 24 tablo yo (`rasinayiti_...`) |
| **`02_triggers_indexes.sql`** | Endèks pou akselere rechèch, fonksyon ak deklanchè (triggers) `updated_at` |
| **`03_rls_policies.sql`** | Règleman sekirite Row Level Security (RLS) pou chak tablo |
| **`04_storage_buckets.sql`** | Kreyasyon 5 storage buckets ak règleman piblik yo |
| **`05_seed_data.sql`** | Done inisyal (kategori, admin defo, keksyon quiz, pwodui maillot, paramèt) |

---

## 🚀 Kijan pou w Enstale li nan Supabase

1. Konekte sou kont **[Supabase Dashboard](https://supabase.com)** ou.
2. Chwazi pwojè w la.
3. Nan meni a gòch, klike sou **SQL Editor**.
4. Klike sou **New Query**.
5. Kopi tout kontni fichye **`00_master_setup.sql`** la epi kole li ladan l.
6. Klike sou bouton vèt **Run** (oswa peze `Ctrl + Enter`).
7. Ou dwe wè mesaj: `✅ TOUT TABLO AK KONFIGIRASYON RASIN AYITI 2.0 ENSTALE AVÈK SIKSÈ!`.

---

## 🗄️ Lis Tablo ki Kreye yo

1. `rasinayiti_categories`
2. `rasinayiti_formations`
3. `rasinayiti_seminaires`
4. `rasinayiti_etudiants`
5. `rasinayiti_inscriptions`
6. `rasinayiti_progressions`
7. `rasinayiti_modules`
8. `rasinayiti_completions_modules`
9. `rasinayiti_galerie`
10. `rasinayiti_notifications`
11. `rasinayiti_administrateurs`
12. `rasinayiti_parametres`
13. `rasinayiti_logs_activite`
14. `rasinayiti_events`
15. `rasinayiti_event_questions`
16. `rasinayiti_inscriptions_evenements`
17. `rasinayiti_donations`
18. `rasinayiti_maillots`
19. `rasinayiti_maillot_orders`
20. `rasinayiti_leaders_v2`
21. `rasinayiti_participants`
22. `rasinayiti_zoom_config`
23. `rasinayiti_live_viewers`
24. `rasinayiti_live_reactions`

---

## 🪣 Lis Storage Buckets

- `rasinayiti_paiements`
- `rasinayiti_events`
- `rasinayiti_maillots`
- `rasinayiti_leaders`
- `rasinayiti_galerie`
