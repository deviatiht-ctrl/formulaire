-- ============================================================
-- 15_whatsapp_group_links.sql — Liens des groupes WhatsApp
-- À exécuter APRÈS 07 à 14. Réexécutable (idempotent).
-- Ajoute whatsapp_link aux tables rasinayiti_formations et rasinayiti_seminaires.
-- (rasinayiti_events possède déjà whatsapp_link).
-- ============================================================
BEGIN;

ALTER TABLE public.rasinayiti_formations ADD COLUMN IF NOT EXISTS whatsapp_link TEXT;
COMMENT ON COLUMN public.rasinayiti_formations.whatsapp_link IS 'Lien du groupe WhatsApp officiel de la formation.';

ALTER TABLE public.rasinayiti_seminaires ADD COLUMN IF NOT EXISTS whatsapp_link TEXT;
COMMENT ON COLUMN public.rasinayiti_seminaires.whatsapp_link IS 'Lien du groupe WhatsApp officiel du séminaire.';

COMMIT;
