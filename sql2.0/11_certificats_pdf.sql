BEGIN;

CREATE TABLE IF NOT EXISTS public.rasinayiti_certificats_pdf (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_kind text NOT NULL CHECK (source_kind IN ('event','inscription')),
    source_id uuid NOT NULL,
    inscription_id uuid REFERENCES public.rasinayiti_inscriptions(id) ON DELETE RESTRICT,
    event_registration_id uuid REFERENCES public.rasinayiti_inscriptions_evenements(id) ON DELETE RESTRICT,
    canonical_type text NOT NULL,
    canonical_id uuid NOT NULL,
    email text NOT NULL,
    nom_complet text NOT NULL,
    titre text NOT NULL,
    storage_path text NOT NULL UNIQUE,
    created_by uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (canonical_type,canonical_id),
    UNIQUE (source_kind,source_id),
    CHECK ((source_kind = 'event' AND event_registration_id = source_id AND inscription_id IS NULL)
        OR (source_kind = 'inscription' AND inscription_id = source_id AND event_registration_id IS NULL))
);
ALTER TABLE public.rasinayiti_certificats_pdf ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rasinayiti_certificats_pdf FROM anon, authenticated;

CREATE OR REPLACE VIEW public.rasinayiti_certificate_eligibility AS
SELECT r.*,
    coalesce((payload->>'veut_certificat')::boolean
    AND payload->>'certificat_statut_paiement' = 'verifie'
    AND coalesce(payload->>'statut',payload->>'status_inscription','') <> 'annule'
    AND (effective_activity->>'status' = 'termine' OR effective_activity->>'archived_status' = 'termine')
    AND CASE effective_type
        WHEN 'event' THEN coalesce((effective_activity->>'end_date')::timestamptz,(effective_activity->>'start_date')::timestamptz,(effective_activity->>'date_evenement')::timestamptz,now()) <= now()
        WHEN 'formation' THEN coalesce(((effective_activity->>'date_fin')::date + coalesce((effective_activity->>'heure_fin')::time,'00:00'::time)) AT TIME ZONE 'America/Port-au-Prince',now()) <= now()
        ELSE coalesce(((effective_activity->>'date_seminaire')::date + coalesce((effective_activity->>'heure_fin')::time,'00:00'::time)) AT TIME ZONE 'America/Port-au-Prince',now()) <= now() END
    AND NOT EXISTS (SELECT 1 FROM public.rasinayiti_inscriptions_evenements i WHERE r.effective_type = 'event' AND i.id = r.canonical_id AND i.statut = 'annule'),false) AS eligible
FROM public.rasinayiti_registration_overview r;
REVOKE ALL ON public.rasinayiti_certificate_eligibility FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.rasinayiti_admin_certificates()
RETURNS TABLE (source_kind text,source_id uuid,canonical_id uuid,effective_type text,effective_id uuid,titre text,email text,nom_complet text,paiement text,eligible boolean,certificate_id uuid,storage_path text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
    IF NOT public.rasinayiti_is_admin() THEN RAISE EXCEPTION 'Session Supabase Auth administrateur requise.'; END IF;
    RETURN QUERY
    SELECT DISTINCT ON (r.effective_type,r.canonical_id) r.source_kind,r.source_id,r.canonical_id,r.effective_type,r.effective_id,r.effective_title,r.email,
        concat_ws(' ',r.prenom,r.nom),r.payload->>'certificat_statut_paiement',coalesce(r.eligible,false),c.id,c.storage_path
    FROM public.rasinayiti_certificate_eligibility r
    LEFT JOIN public.rasinayiti_certificats_pdf c ON (c.canonical_type = r.effective_type AND c.canonical_id = r.canonical_id) OR (c.source_kind = r.source_kind AND c.source_id = r.source_id)
    WHERE (r.payload->>'veut_certificat')::boolean
    ORDER BY r.effective_type,r.canonical_id,(c.source_kind = r.source_kind AND c.source_id = r.source_id) DESC NULLS LAST,r.eligible DESC NULLS LAST,
        (coalesce(r.payload->>'statut',r.payload->>'status_inscription','') <> 'annule') DESC,
        (r.payload->>'certificat_statut_paiement' = 'verifie') DESC NULLS LAST,c.created_at,r.source_kind,r.source_id;
END $$;
REVOKE ALL ON FUNCTION public.rasinayiti_admin_certificates() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rasinayiti_admin_certificates() TO authenticated;

CREATE OR REPLACE FUNCTION public.rasinayiti_complete_activity(p_type text,p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE t text; a jsonb; due timestamptz;
BEGIN
    IF NOT public.rasinayiti_is_admin() THEN RAISE EXCEPTION 'Session Supabase Auth administrateur requise.'; END IF;
    t := CASE p_type WHEN 'event' THEN 'rasinayiti_events' WHEN 'formation' THEN 'rasinayiti_formations' WHEN 'seminaire' THEN 'rasinayiti_seminaires' END;
    IF t IS NULL THEN RAISE EXCEPTION 'Type invalide.'; END IF;
    EXECUTE format('SELECT to_jsonb(a) FROM public.%I a WHERE id = $1 FOR UPDATE',t) INTO a USING p_id;
    IF a IS NULL OR a->>'archived_at' IS NOT NULL OR a->>'status' = 'annule' THEN RAISE EXCEPTION 'Activité introuvable, annulée ou archivée.'; END IF;
    due := CASE p_type WHEN 'event' THEN coalesce((a->>'end_date')::timestamptz,(a->>'start_date')::timestamptz,(a->>'date_evenement')::timestamptz)
        WHEN 'formation' THEN ((a->>'date_fin')::date + coalesce((a->>'heure_fin')::time,'00:00'::time)) AT TIME ZONE 'America/Port-au-Prince'
        ELSE ((a->>'date_seminaire')::date + coalesce((a->>'heure_fin')::time,'00:00'::time)) AT TIME ZONE 'America/Port-au-Prince' END;
    IF due > now() THEN RAISE EXCEPTION 'La date de fin est dans le futur. Vérifiez le calendrier avant de clôturer.'; END IF;
    EXECUTE format('UPDATE public.%I SET status = ''termine'' WHERE id = $1',t) USING p_id;
    IF p_type = 'event' THEN UPDATE public.rasinayiti_events SET inscription_ouverte = false WHERE id = p_id; END IF;
    INSERT INTO public.rasinayiti_logs_activite (utilisateur_id,type_utilisateur,action,donnees)
    VALUES (auth.uid(),'admin','activite_terminee',jsonb_build_object('type',p_type,'id',p_id));
END $$;
REVOKE ALL ON FUNCTION public.rasinayiti_complete_activity(text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rasinayiti_complete_activity(text,uuid) TO authenticated;

INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
VALUES ('rasinayiti_certificats','rasinayiti_certificats',false,15728640,ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE SET public = false,file_size_limit = EXCLUDED.file_size_limit,allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE OR REPLACE FUNCTION public.rasinayiti_publish_certificate(p_kind text,p_source uuid,p_path text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE r public.rasinayiti_certificate_eligibility%ROWTYPE; cert uuid;
BEGIN
    IF NOT public.rasinayiti_is_admin() THEN RAISE EXCEPTION 'Session Supabase Auth administrateur requise.'; END IF;
    PERFORM pg_catalog.pg_advisory_xact_lock(102026,1);
    LOCK TABLE public.rasinayiti_inscriptions, public.rasinayiti_inscriptions_evenements IN SHARE MODE;
    SELECT * INTO r FROM public.rasinayiti_certificate_eligibility WHERE source_kind = p_kind AND source_id = p_source;
    IF NOT FOUND OR NOT coalesce(r.eligible,false) THEN RAISE EXCEPTION 'Certificat non autorisé : paiement non vérifié, inscription annulée ou activité non terminée.'; END IF;
    IF EXISTS (SELECT 1 FROM public.rasinayiti_certificats_pdf c JOIN public.rasinayiti_registration_overview o ON o.source_kind = c.source_kind AND o.source_id = c.source_id
        WHERE o.effective_type = r.effective_type AND o.canonical_id = r.canonical_id) THEN RAISE EXCEPTION 'Un certificat est déjà publié pour ce participant et cette activité.'; END IF;
    IF p_path IS NULL OR p_path !~ '^issued/[0-9a-f-]{36}\.pdf$' OR NOT EXISTS (
        SELECT 1 FROM storage.objects WHERE bucket_id = 'rasinayiti_certificats' AND name = p_path AND metadata->>'mimetype' = 'application/pdf'
    ) THEN RAISE EXCEPTION 'PDF privé introuvable. Téléversez le PDF avant de publier.'; END IF;
    INSERT INTO public.rasinayiti_certificats_pdf (source_kind,source_id,inscription_id,event_registration_id,canonical_type,canonical_id,email,nom_complet,titre,storage_path,created_by)
    VALUES (p_kind,p_source,CASE WHEN p_kind = 'inscription' THEN p_source END,CASE WHEN p_kind = 'event' THEN p_source END,
        r.effective_type,r.canonical_id,r.email,concat_ws(' ',r.prenom,r.nom),r.effective_title,p_path,auth.uid()) RETURNING id INTO cert;
    IF p_kind = 'event' THEN UPDATE public.rasinayiti_inscriptions_evenements SET certificat_delivre = true WHERE id = p_source;
    ELSE UPDATE public.rasinayiti_inscriptions SET certificat_delivre = true WHERE id = p_source; END IF;
    RETURN cert;
END $$;
REVOKE ALL ON FUNCTION public.rasinayiti_publish_certificate(text,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rasinayiti_publish_certificate(text,uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.rasinayiti_my_certificates()
RETURNS TABLE (id uuid,titre text,nom_complet text,created_at timestamptz,storage_path text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT c.id,c.titre,c.nom_complet,c.created_at,c.storage_path FROM public.rasinayiti_certificats_pdf c
    JOIN public.rasinayiti_certificate_eligibility r ON r.source_kind = c.source_kind AND r.source_id = c.source_id
    WHERE auth.uid() IS NOT NULL AND lower(c.email) = lower(auth.jwt()->>'email') AND coalesce(r.eligible,false)
    ORDER BY c.created_at DESC,c.id;
$$;
REVOKE ALL ON FUNCTION public.rasinayiti_my_certificates() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rasinayiti_my_certificates() TO authenticated;

CREATE OR REPLACE FUNCTION public.rasinayiti_my_certificate_requests()
RETURNS TABLE (canonical_id uuid,effective_type text,titre text,paiement text,eligible boolean,certificate_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT DISTINCT ON (r.effective_type,r.canonical_id) r.canonical_id,r.effective_type,r.effective_title,
        r.payload->>'certificat_statut_paiement',coalesce(r.eligible,false),c.id
    FROM public.rasinayiti_certificate_eligibility r
    LEFT JOIN public.rasinayiti_certificats_pdf c ON (c.canonical_type = r.effective_type AND c.canonical_id = r.canonical_id) OR (c.source_kind = r.source_kind AND c.source_id = r.source_id)
    WHERE auth.uid() IS NOT NULL AND r.email = lower(auth.jwt()->>'email') AND (r.payload->>'veut_certificat')::boolean
    ORDER BY r.effective_type,r.canonical_id,(c.source_kind = r.source_kind AND c.source_id = r.source_id) DESC NULLS LAST,r.eligible DESC NULLS LAST,
        (coalesce(r.payload->>'statut',r.payload->>'status_inscription','') <> 'annule') DESC,
        (r.payload->>'certificat_statut_paiement' = 'verifie') DESC NULLS LAST,c.created_at,r.source_kind,r.source_id;
$$;
REVOKE ALL ON FUNCTION public.rasinayiti_my_certificate_requests() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rasinayiti_my_certificate_requests() TO authenticated;

CREATE OR REPLACE FUNCTION public.rasinayiti_can_read_certificate(p_path text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT public.rasinayiti_is_admin() OR EXISTS (SELECT 1 FROM public.rasinayiti_my_certificates() c WHERE c.storage_path = p_path);
$$;
REVOKE ALL ON FUNCTION public.rasinayiti_can_read_certificate(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rasinayiti_can_read_certificate(text) TO anon,authenticated;

DROP POLICY IF EXISTS certificate_read ON storage.objects;
CREATE POLICY certificate_read ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'rasinayiti_certificats' AND public.rasinayiti_can_read_certificate(name));
DROP POLICY IF EXISTS certificate_insert ON storage.objects;
CREATE POLICY certificate_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'rasinayiti_certificats' AND public.rasinayiti_is_admin());
DROP POLICY IF EXISTS certificate_read_guard ON storage.objects;
CREATE POLICY certificate_read_guard ON storage.objects AS RESTRICTIVE FOR SELECT TO anon,authenticated USING (bucket_id <> 'rasinayiti_certificats' OR public.rasinayiti_can_read_certificate(name));
DROP POLICY IF EXISTS certificate_insert_guard ON storage.objects;
CREATE POLICY certificate_insert_guard ON storage.objects AS RESTRICTIVE FOR INSERT TO anon,authenticated WITH CHECK (bucket_id <> 'rasinayiti_certificats' OR public.rasinayiti_is_admin());
DROP POLICY IF EXISTS certificate_update_guard ON storage.objects;
CREATE POLICY certificate_update_guard ON storage.objects AS RESTRICTIVE FOR UPDATE TO anon,authenticated USING (bucket_id <> 'rasinayiti_certificats') WITH CHECK (bucket_id <> 'rasinayiti_certificats');
DROP POLICY IF EXISTS certificate_delete_guard ON storage.objects;
CREATE POLICY certificate_delete_guard ON storage.objects AS RESTRICTIVE FOR DELETE TO anon,authenticated USING (bucket_id <> 'rasinayiti_certificats');

COMMIT;
