-- ============================================================
-- 13_date_limite_inscription.sql — Date limite d'inscription des événements
-- À exécuter APRÈS 07 à 12. Réexécutable (idempotent).
-- Ajoute rasinayiti_events.inscription_date_limite (réglée dans Admin → Événements).
-- Après cette date, la base refuse toute nouvelle inscription à l'événement, même si
-- quelqu'un contourne le site. Les copies créées par la consolidation (admin) ne sont
-- pas concernées. Ne remplace aucun trigger existant (ne pas relancer 09 après 10).
-- ============================================================
BEGIN;

ALTER TABLE public.rasinayiti_events ADD COLUMN IF NOT EXISTS inscription_date_limite timestamptz;
COMMENT ON COLUMN public.rasinayiti_events.inscription_date_limite IS 'Fin des inscriptions (compte à rebours public). NULL = pas de limite.';

CREATE OR REPLACE FUNCTION public.rasinayiti_event_deadline_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE deadline timestamptz;
BEGIN
    SELECT inscription_date_limite INTO deadline FROM public.rasinayiti_events WHERE id = NEW.event_id;
    IF deadline IS NOT NULL AND now() >= deadline THEN
        RAISE EXCEPTION 'Les inscriptions pour cet événement sont clôturées (date limite dépassée).';
    END IF;
    RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.rasinayiti_event_deadline_guard() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS b_event_deadline_guard ON public.rasinayiti_inscriptions_evenements;
CREATE TRIGGER b_event_deadline_guard BEFORE INSERT ON public.rasinayiti_inscriptions_evenements
    FOR EACH ROW WHEN (NEW.consolidation_source_id IS NULL) EXECUTE FUNCTION public.rasinayiti_event_deadline_guard();

COMMIT;
