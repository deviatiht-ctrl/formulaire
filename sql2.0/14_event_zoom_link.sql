-- ============================================================
-- 14_event_zoom_link.sql — Lien Zoom / Live par événement
-- À exécuter APRÈS 07 à 13. Réexécutable (idempotent).
-- Ajoute rasinayiti_events.zoom_link (réglé dans Admin → Événements).
-- Le lien est réservé aux inscrits : il s'affiche dans l'espace
-- étudiant uniquement quand l'inscription est confirmée.
-- ============================================================
BEGIN;

ALTER TABLE public.rasinayiti_events ADD COLUMN IF NOT EXISTS zoom_link TEXT;
COMMENT ON COLUMN public.rasinayiti_events.zoom_link IS 'Lien Zoom/Live de l''événement. Visible dans l''espace étudiant pour les inscriptions confirmées.';

COMMIT;
