BEGIN;

DO $$
DECLARE t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['rasinayiti_events','rasinayiti_formations','rasinayiti_seminaires'] LOOP
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS archived_at timestamptz, ADD COLUMN IF NOT EXISTS archived_status text', t);
    END LOOP;
END $$;

ALTER TABLE public.rasinayiti_inscriptions_evenements ADD COLUMN IF NOT EXISTS consolidation_source_id uuid;

CREATE TABLE IF NOT EXISTS public.rasinayiti_consolidations (
    source_kind text NOT NULL CHECK (source_kind IN ('event','inscription')),
    source_id uuid NOT NULL,
    source_type text NOT NULL CHECK (source_type IN ('event','formation','seminaire')),
    source_activity_id uuid NOT NULL,
    target_event_id uuid NOT NULL REFERENCES public.rasinayiti_events(id) ON DELETE RESTRICT,
    target_registration_id uuid NOT NULL REFERENCES public.rasinayiti_inscriptions_evenements(id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED,
    source_snapshot jsonb NOT NULL,
    target_snapshot jsonb NOT NULL,
    copied boolean NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (source_kind, source_id)
);
CREATE INDEX IF NOT EXISTS rasinayiti_consolidations_activity_idx ON public.rasinayiti_consolidations(source_type,source_activity_id);
CREATE INDEX IF NOT EXISTS rasinayiti_consolidations_target_idx ON public.rasinayiti_consolidations(target_registration_id);
CREATE INDEX IF NOT EXISTS rasinayiti_event_email_normalized_idx ON public.rasinayiti_inscriptions_evenements(event_id,lower(btrim(email)));
ALTER TABLE public.rasinayiti_consolidations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rasinayiti_consolidations FROM anon, authenticated;

CREATE OR REPLACE VIEW public.rasinayiti_registration_overview AS
WITH originals AS (
    SELECT 'event'::text AS source_kind, i.id AS source_id, 'event'::text AS activity_type, i.event_id AS activity_id,
        a.titre::text, lower(btrim(i.email)) AS email, i.prenom::text, i.nom::text,
        to_jsonb(i) AS payload, '{}'::jsonb AS student, to_jsonb(a) AS activity
    FROM public.rasinayiti_inscriptions_evenements i JOIN public.rasinayiti_events a ON a.id = i.event_id
    WHERE i.consolidation_source_id IS NULL
    UNION ALL
    SELECT 'inscription', i.id, CASE WHEN i.formation_id IS NOT NULL THEN 'formation' ELSE 'seminaire' END,
        coalesce(i.formation_id,i.seminaire_id), coalesce(f.titre,s.titre)::text,
        lower(btrim(coalesce(nullif(i.inscription_email,''),nullif(i.etudiant_email,''),e.email))),
        coalesce(nullif(i.etudiant_prenom,''),e.prenom)::text, coalesce(nullif(i.etudiant_nom,''),e.nom)::text,
        to_jsonb(i), to_jsonb(e) - ARRAY['mot_de_passe_hash','code_acces_temp'], coalesce(to_jsonb(f),to_jsonb(s))
    FROM public.rasinayiti_inscriptions i LEFT JOIN public.rasinayiti_etudiants e ON e.id = i.etudiant_id
    LEFT JOIN public.rasinayiti_formations f ON f.id = i.formation_id
    LEFT JOIN public.rasinayiti_seminaires s ON s.id = i.seminaire_id
)
SELECT o.*, coalesce(c.target_registration_id,o.source_id) AS canonical_id,
    CASE WHEN c.source_id IS NOT NULL THEN 'event' ELSE o.activity_type END AS effective_type,
    coalesce(c.target_event_id,o.activity_id) AS effective_id,
    coalesce(a.titre,o.titre) AS effective_title,
    coalesce(to_jsonb(a),o.activity) AS effective_activity,
    c.created_at AS transferred_at, c.source_snapshot AS transfer_snapshot, c.target_snapshot AS destination_snapshot
FROM originals o LEFT JOIN public.rasinayiti_consolidations c ON c.source_kind = o.source_kind AND c.source_id = o.source_id
LEFT JOIN public.rasinayiti_events a ON a.id = c.target_event_id;
REVOKE ALL ON public.rasinayiti_registration_overview FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.rasinayiti_admin_registrations()
RETURNS SETOF public.rasinayiti_registration_overview
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
    IF NOT public.rasinayiti_is_admin() THEN RAISE EXCEPTION 'Session Supabase Auth administrateur requise.'; END IF;
    RETURN QUERY SELECT * FROM public.rasinayiti_registration_overview ORDER BY source_kind, source_id;
END $$;
REVOKE ALL ON FUNCTION public.rasinayiti_admin_registrations() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rasinayiti_admin_registrations() TO authenticated;

CREATE OR REPLACE FUNCTION public.rasinayiti_archive_activity(p_type text, p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE t text; affected integer;
BEGIN
    IF NOT public.rasinayiti_is_admin() THEN RAISE EXCEPTION 'Session Supabase Auth administrateur requise. Reconnectez-vous.'; END IF;
    t := CASE p_type WHEN 'event' THEN 'rasinayiti_events' WHEN 'formation' THEN 'rasinayiti_formations' WHEN 'seminaire' THEN 'rasinayiti_seminaires' END;
    IF t IS NULL THEN RAISE EXCEPTION 'Type invalide.'; END IF;
    EXECUTE format('UPDATE public.%I SET archived_status = coalesce(archived_status,status), archived_at = coalesce(archived_at,now()), status = ''archive'' WHERE id = $1', t) USING p_id;
    GET DIAGNOSTICS affected = ROW_COUNT;
    IF affected <> 1 THEN RAISE EXCEPTION 'Activité introuvable.'; END IF;
    IF p_type = 'event' THEN UPDATE public.rasinayiti_events SET afficher_sur_site = false, inscription_ouverte = false WHERE id = p_id; END IF;
    INSERT INTO public.rasinayiti_logs_activite (utilisateur_id,type_utilisateur,action,donnees)
    VALUES (auth.uid(),'admin','archivage',jsonb_build_object('type',p_type,'id',p_id));
END $$;
REVOKE ALL ON FUNCTION public.rasinayiti_archive_activity(text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rasinayiti_archive_activity(text,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.rasinayiti_preserve_activity()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Suppression définitive désactivée pour préserver les données. Utilisez Archiver ou Consolidation.'; END IF;
    IF OLD.archived_at IS NOT NULL AND (NEW.status IS DISTINCT FROM 'archive' OR NEW.archived_at IS DISTINCT FROM OLD.archived_at OR NEW.archived_status IS DISTINCT FROM OLD.archived_status) THEN
        RAISE EXCEPTION 'Cette activité est archivée. Utilisez l’événement de destination.';
    END IF;
    RETURN NEW;
END $$;
DO $$
DECLARE t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['rasinayiti_events','rasinayiti_formations','rasinayiti_seminaires'] LOOP
        EXECUTE format('CREATE OR REPLACE TRIGGER preserve_activity BEFORE DELETE OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.rasinayiti_preserve_activity()',t);
    END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.rasinayiti_registration_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE snapshot jsonb; a jsonb; kind text;
BEGIN
    kind := CASE WHEN TG_TABLE_NAME = 'rasinayiti_inscriptions_evenements' THEN 'event' ELSE 'inscription' END;
    IF TG_OP = 'DELETE' THEN
        IF EXISTS (SELECT 1 FROM public.rasinayiti_consolidations c WHERE (c.source_kind = kind AND c.source_id = OLD.id) OR (kind = 'event' AND c.target_registration_id = OLD.id)) THEN
            RAISE EXCEPTION 'Inscription conservée dans un historique de consolidation. Annulez-la sans la supprimer.';
        END IF;
        RETURN OLD;
    END IF;
    IF kind = 'event' THEN
        IF NEW.consolidation_source_id IS NOT NULL THEN
            SELECT c.target_snapshot INTO snapshot FROM public.rasinayiti_consolidations c
            WHERE c.target_registration_id = NEW.id AND c.source_id = NEW.consolidation_source_id AND c.copied AND c.created_by = auth.uid();
            IF NOT public.rasinayiti_is_admin() OR snapshot IS NULL THEN RAISE EXCEPTION 'Copie non autorisée.'; END IF;
            NEW := jsonb_populate_record(NEW, snapshot);
            RETURN NEW;
        END IF;
    END IF;
    IF kind = 'event' THEN
        SELECT to_jsonb(e) INTO a FROM public.rasinayiti_events e WHERE id = NEW.event_id FOR SHARE;
    ELSIF NEW.formation_id IS NOT NULL THEN
        SELECT to_jsonb(f) INTO a FROM public.rasinayiti_formations f WHERE id = NEW.formation_id FOR SHARE;
    ELSE
        SELECT to_jsonb(s) INTO a FROM public.rasinayiti_seminaires s WHERE id = NEW.seminaire_id FOR SHARE;
    END IF;
    IF a IS NULL OR a->>'archived_at' IS NOT NULL OR coalesce(a->>'status','') NOT IN ('actif','publie','planifie','en_cours')
        OR (kind = 'event' AND (NOT coalesce((a->>'afficher_sur_site')::boolean,false) OR NOT coalesce((a->>'inscription_ouverte')::boolean,false))) THEN RAISE EXCEPTION 'Inscriptions fermées pour cette activité.'; END IF;
    RETURN NEW;
END $$;
CREATE OR REPLACE TRIGGER a_registration_guard BEFORE INSERT OR DELETE ON public.rasinayiti_inscriptions_evenements FOR EACH ROW EXECUTE FUNCTION public.rasinayiti_registration_guard();
CREATE OR REPLACE TRIGGER a_registration_guard BEFORE INSERT OR DELETE ON public.rasinayiti_inscriptions FOR EACH ROW EXECUTE FUNCTION public.rasinayiti_registration_guard();
DROP TRIGGER IF EXISTS rasinayiti_validate_certificate ON public.rasinayiti_inscriptions_evenements;
CREATE OR REPLACE TRIGGER rasinayiti_validate_certificate_insert BEFORE INSERT ON public.rasinayiti_inscriptions_evenements
    FOR EACH ROW WHEN (NEW.consolidation_source_id IS NULL) EXECUTE FUNCTION public.rasinayiti_validate_certificate();
CREATE OR REPLACE TRIGGER rasinayiti_validate_certificate_update BEFORE UPDATE ON public.rasinayiti_inscriptions_evenements
    FOR EACH ROW EXECUTE FUNCTION public.rasinayiti_validate_certificate();

CREATE OR REPLACE FUNCTION public.rasinayiti_consolidate(p_type text, p_id uuid, p_target uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE r record; dest uuid; existing_count integer; copied_count integer := 0; linked_count integer := 0; snap jsonb; newrow jsonb; t text; a jsonb;
BEGIN
    IF NOT public.rasinayiti_is_admin() THEN RAISE EXCEPTION 'Session Supabase Auth administrateur requise.'; END IF;
    IF p_type = 'event' AND p_id = p_target THEN RAISE EXCEPTION 'La source et la destination doivent être différentes.'; END IF;
    PERFORM pg_catalog.pg_advisory_xact_lock(102026,1);
    LOCK TABLE public.rasinayiti_inscriptions, public.rasinayiti_inscriptions_evenements IN SHARE ROW EXCLUSIVE MODE;
    SELECT to_jsonb(e) INTO a FROM public.rasinayiti_events e WHERE id = p_target FOR UPDATE;
    IF a IS NULL OR a->>'archived_at' IS NOT NULL OR a->>'status' IN ('archive','annule') THEN RAISE EXCEPTION 'Événement de destination indisponible.'; END IF;
    IF EXISTS (SELECT 1 FROM public.rasinayiti_consolidations WHERE source_type = 'event' AND source_activity_id = p_target) THEN RAISE EXCEPTION 'La destination a déjà été transférée.'; END IF;
    IF p_type = 'event' AND EXISTS (SELECT 1 FROM public.rasinayiti_consolidations WHERE target_event_id = p_id) THEN RAISE EXCEPTION 'Cet événement reçoit déjà des inscriptions. Conservez-le comme destination.'; END IF;
    t := CASE p_type WHEN 'event' THEN 'rasinayiti_events' WHEN 'formation' THEN 'rasinayiti_formations' WHEN 'seminaire' THEN 'rasinayiti_seminaires' END;
    IF t IS NULL THEN RAISE EXCEPTION 'Type invalide.'; END IF;
    EXECUTE format('SELECT to_jsonb(a) FROM public.%I a WHERE id = $1 FOR UPDATE',t) INTO a USING p_id;
    IF a IS NULL THEN RAISE EXCEPTION 'Activité source introuvable.'; END IF;
    IF EXISTS (SELECT 1 FROM public.rasinayiti_consolidations WHERE source_type = p_type AND source_activity_id = p_id AND target_event_id <> p_target) THEN RAISE EXCEPTION 'Source déjà transférée vers un autre événement.'; END IF;
    FOR r IN SELECT * FROM public.rasinayiti_registration_overview WHERE activity_type = p_type AND activity_id = p_id AND transferred_at IS NULL ORDER BY source_id LOOP
        IF coalesce(r.email,'') = '' OR r.activity_id IS NULL THEN RAISE EXCEPTION 'Inscription % sans email ou activité : corrigez-la avant le transfert.',r.source_id; END IF;
        SELECT count(*), (array_agg(id ORDER BY created_at,id))[1] INTO existing_count,dest FROM public.rasinayiti_inscriptions_evenements WHERE event_id = p_target AND lower(btrim(email)) = r.email;
        IF existing_count > 1 THEN RAISE EXCEPTION 'Plusieurs inscriptions existent déjà dans la destination pour %. Aucune modification effectuée.',r.email; END IF;
        snap := jsonb_build_object('registration',r.payload,'student',r.student,'activity',r.activity);
        IF dest IS NULL THEN
            dest := gen_random_uuid();
            newrow := (r.payload - ARRAY['id','created_at','event_id','consolidation_source_id']) || jsonb_build_object(
                'id',dest,'event_id',p_target,'consolidation_source_id',r.source_id,'email',r.email,
                'prenom',coalesce(r.prenom,''),'nom',coalesce(r.nom,''),
                'telephone',coalesce(r.payload->>'telephone',r.payload->>'etudiant_telephone',r.student->>'telephone'),
                'whatsapp',coalesce(r.payload->>'whatsapp',r.student->>'whatsapp'),'ville',coalesce(r.payload->>'ville',r.student->>'ville'),
                'statut',CASE WHEN coalesce(r.payload->>'statut',r.payload->>'status_inscription') IN ('confirme','termine') THEN 'confirme' WHEN coalesce(r.payload->>'statut',r.payload->>'status_inscription') = 'annule' THEN 'annule' ELSE 'en_attente' END,
                'created_at',coalesce(r.payload->>'created_at',r.payload->>'date_inscription',now()::text),'certificat_delivre',false);
            INSERT INTO public.rasinayiti_consolidations VALUES (r.source_kind,r.source_id,p_type,p_id,p_target,dest,snap,newrow,true,auth.uid(),now());
            INSERT INTO public.rasinayiti_inscriptions_evenements (id,consolidation_source_id,event_id,prenom,nom,email) VALUES (dest,r.source_id,p_target,r.prenom,r.nom,r.email);
            copied_count := copied_count + 1;
        ELSE
            SELECT to_jsonb(i) INTO newrow FROM public.rasinayiti_inscriptions_evenements i WHERE id = dest;
            INSERT INTO public.rasinayiti_consolidations VALUES (r.source_kind,r.source_id,p_type,p_id,p_target,dest,snap,newrow,false,auth.uid(),now());
            linked_count := linked_count + 1;
        END IF;
    END LOOP;
    PERFORM public.rasinayiti_archive_activity(p_type,p_id);
    RETURN jsonb_build_object('copies',copied_count,'doublons_conserves',linked_count,'source_archivee',true);
END $$;
REVOKE ALL ON FUNCTION public.rasinayiti_consolidate(text,uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rasinayiti_consolidate(text,uuid,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.rasinayiti_sync_consolidated_registration()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE kind text := CASE WHEN TG_TABLE_NAME = 'rasinayiti_inscriptions_evenements' THEN 'event' ELSE 'inscription' END;
    before_data jsonb := to_jsonb(OLD); after_data jsonb := to_jsonb(NEW); registration_status text;
BEGIN
    IF TG_WHEN = 'BEFORE' THEN
        IF after_data->>'consolidation_source_id' IS NOT NULL AND pg_trigger_depth() = 1
            AND (NEW.certificat_statut_paiement IS DISTINCT FROM OLD.certificat_statut_paiement OR NEW.certificat_delivre IS DISTINCT FROM OLD.certificat_delivre) THEN
            RAISE EXCEPTION 'Vérifiez le paiement sur l’inscription d’origine dans Consolidation ou Certificats PDF.';
        END IF;
        RETURN NEW;
    END IF;
    registration_status := coalesce(after_data->>'statut',after_data->>'status_inscription');
    UPDATE public.rasinayiti_inscriptions_evenements target SET certificat_statut_paiement = NEW.certificat_statut_paiement,
        certificat_delivre = NEW.certificat_delivre,
        statut = CASE WHEN registration_status IS DISTINCT FROM coalesce(before_data->>'statut',before_data->>'status_inscription')
            THEN CASE WHEN registration_status IN ('confirme','termine') THEN 'confirme' WHEN registration_status = 'annule' THEN 'annule' ELSE 'en_attente' END ELSE target.statut END
    FROM public.rasinayiti_consolidations c WHERE c.source_kind = kind AND c.source_id = NEW.id AND c.copied AND target.id = c.target_registration_id;
    RETURN NEW;
END $$;
CREATE OR REPLACE TRIGGER protect_consolidated_payment BEFORE UPDATE ON public.rasinayiti_inscriptions_evenements
    FOR EACH ROW EXECUTE FUNCTION public.rasinayiti_sync_consolidated_registration();
CREATE OR REPLACE TRIGGER sync_consolidated_registration AFTER UPDATE ON public.rasinayiti_inscriptions
    FOR EACH ROW EXECUTE FUNCTION public.rasinayiti_sync_consolidated_registration();
CREATE OR REPLACE TRIGGER sync_consolidated_registration AFTER UPDATE ON public.rasinayiti_inscriptions_evenements
    FOR EACH ROW EXECUTE FUNCTION public.rasinayiti_sync_consolidated_registration();

CREATE OR REPLACE FUNCTION public.rasinayiti_original_registration(p_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE result jsonb;
BEGIN
    IF NOT public.rasinayiti_is_admin() THEN RAISE EXCEPTION 'Session Supabase Auth administrateur requise.'; END IF;
    SELECT jsonb_build_object('kind',source_kind,'id',source_id) INTO result FROM public.rasinayiti_consolidations WHERE target_registration_id = p_id AND copied;
    RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.rasinayiti_original_registration(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rasinayiti_original_registration(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.rasinayiti_leader_ranking()
RETURNS TABLE (id uuid, nom text, commune text, inscriptions bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    WITH paid AS (
        SELECT DISTINCT (payload->>'leader_id')::uuid AS leader_id, effective_type, effective_id, email
        FROM public.rasinayiti_registration_overview
        WHERE payload->>'code_leader' IS NOT NULL AND payload->>'certificat_statut_paiement' = 'verifie'
            AND (payload->>'certificat_prix')::numeric > 0 AND coalesce(payload->>'statut',payload->>'status_inscription','') <> 'annule'
    )
    SELECT l.id,coalesce(nullif(l.nom,''),l.commune)::text,l.commune::text,count(p.email)
    FROM public.rasinayiti_leaders_v2 l LEFT JOIN paid p ON p.leader_id = l.id WHERE l.est_actif
    GROUP BY l.id ORDER BY count(p.email) DESC,coalesce(nullif(l.nom,''),l.commune),l.id;
$$;

COMMIT;
