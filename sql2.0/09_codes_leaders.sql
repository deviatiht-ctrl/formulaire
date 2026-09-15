BEGIN;

ALTER TABLE public.rasinayiti_leaders_v2
    ADD COLUMN IF NOT EXISTS nom TEXT,
    ADD COLUMN IF NOT EXISTS code_reduction TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS reduction_pourcentage NUMERIC(5,2) NOT NULL DEFAULT 30 CHECK (reduction_pourcentage > 0 AND reduction_pourcentage <= 100),
    ADD COLUMN IF NOT EXISTS code_actif BOOLEAN NOT NULL DEFAULT true;

DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['rasinayiti_inscriptions', 'rasinayiti_inscriptions_evenements'] LOOP
        EXECUTE format('ALTER TABLE public.%I
            ADD COLUMN IF NOT EXISTS leader_id UUID REFERENCES public.rasinayiti_leaders_v2(id) ON DELETE RESTRICT,
            ADD COLUMN IF NOT EXISTS code_leader TEXT,
            ADD COLUMN IF NOT EXISTS leader_nom TEXT,
            ADD COLUMN IF NOT EXISTS certificat_prix_initial NUMERIC(10,2),
            ADD COLUMN IF NOT EXISTS reduction_pourcentage NUMERIC(5,2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS certificat_reduction NUMERIC(10,2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS inscription_email TEXT', t);
        EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (leader_id, certificat_statut_paiement)', t || '_leader_idx', t);
    END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.rasinayiti_is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT auth.uid() IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.rasinayiti_administrateurs
        WHERE lower(email) = lower(auth.jwt()->>'email') AND actif = true AND role IN ('admin', 'super_admin')
    );
$$;
REVOKE ALL ON FUNCTION public.rasinayiti_is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rasinayiti_is_admin() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.rasinayiti_normalize_leader()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
    IF NEW.code_reduction IS NULL OR btrim(NEW.code_reduction) = '' THEN
        NEW.code_reduction := 'RA-' || upper(replace(NEW.id::text, '-', ''));
    END IF;
    NEW.code_reduction := upper(btrim(NEW.code_reduction));
    IF NEW.code_reduction !~ '^[A-Z0-9-]{4,40}$' THEN
        RAISE EXCEPTION 'Le code doit contenir 4 à 40 lettres, chiffres ou tirets.';
    END IF;
    IF TG_OP = 'UPDATE' AND OLD.code_reduction IS NOT NULL AND NEW.code_reduction IS DISTINCT FROM OLD.code_reduction THEN
        RAISE EXCEPTION 'Le code attribué est permanent. Désactivez-le plutôt que de le réattribuer.';
    END IF;
    RETURN NEW;
END;
$$;
CREATE OR REPLACE TRIGGER rasinayiti_normalize_leader BEFORE INSERT OR UPDATE ON public.rasinayiti_leaders_v2
    FOR EACH ROW EXECUTE FUNCTION public.rasinayiti_normalize_leader();

UPDATE public.rasinayiti_leaders_v2 SET code_reduction = 'RA-' || upper(replace(id::text, '-', '')) WHERE code_reduction IS NULL;

CREATE OR REPLACE FUNCTION public.rasinayiti_certificate_quote(p_type TEXT, p_id UUID, p_code TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE base NUMERIC; available BOOLEAN; leader public.rasinayiti_leaders_v2%ROWTYPE; discount NUMERIC := 0; code TEXT := nullif(upper(btrim(p_code)), '');
BEGIN
    CASE p_type
        WHEN 'event' THEN SELECT prix_certificat, avec_certificat INTO base, available FROM public.rasinayiti_events WHERE id = p_id AND status IN ('actif','publie','en_cours') AND afficher_sur_site AND inscription_ouverte;
        WHEN 'formation' THEN SELECT prix_certificat, avec_certificat INTO base, available FROM public.rasinayiti_formations WHERE id = p_id AND status IN ('publie','en_cours');
        WHEN 'seminaire' THEN SELECT prix_certificat, avec_certificat INTO base, available FROM public.rasinayiti_seminaires WHERE id = p_id AND status IN ('planifie','en_cours');
        ELSE RAISE EXCEPTION 'Type d’activité invalide.';
    END CASE;
    IF NOT FOUND OR NOT coalesce(available, false) THEN RAISE EXCEPTION 'Certificat indisponible pour cette activité.'; END IF;
    base := greatest(coalesce(base, 0), 0);
    IF code IS NOT NULL THEN
        SELECT * INTO leader FROM public.rasinayiti_leaders_v2 WHERE code_reduction = code AND est_actif AND code_actif;
        IF NOT FOUND THEN RAISE EXCEPTION 'Code leader invalide ou désactivé.'; END IF;
        IF base <= 0 THEN RAISE EXCEPTION 'Ce code est réservé aux certificats payants.'; END IF;
        discount := round(base * leader.reduction_pourcentage / 100, 2);
    END IF;
    RETURN jsonb_build_object('leader_id', leader.id, 'leader_nom', coalesce(leader.nom, leader.commune), 'code_leader', code,
        'certificat_prix_initial', base, 'reduction_pourcentage', coalesce(leader.reduction_pourcentage, 0),
        'certificat_reduction', discount, 'certificat_prix', base - discount);
END;
$$;
REVOKE ALL ON FUNCTION public.rasinayiti_certificate_quote(TEXT, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rasinayiti_certificate_quote(TEXT, UUID, TEXT) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.rasinayiti_validate_certificate()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE kind TEXT; activity UUID; email_value TEXT; quote JSONB; duplicate_found BOOLEAN;
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF (to_jsonb(NEW) - ARRAY['statut','status_inscription','status_paiement','statut_paiement','date_confirmation','notes_admin','montant_paye','certificat_statut_paiement','certificat_delivre'])
            IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['statut','status_inscription','status_paiement','statut_paiement','date_confirmation','notes_admin','montant_paye','certificat_statut_paiement','certificat_delivre']) THEN
            RAISE EXCEPTION 'Les coordonnées, le code et le prix d’une inscription sont conservés dans son historique.';
        END IF;
        IF NEW.certificat_statut_paiement = 'verifie' AND coalesce(NEW.certificat_prix, 0) > 0 AND nullif(NEW.certificat_preuve_url, '') IS NULL THEN
            RAISE EXCEPTION 'Une preuve de paiement est nécessaire pour valider le certificat.';
        END IF;
        RETURN NEW;
    END IF;
    IF TG_TABLE_NAME = 'rasinayiti_inscriptions_evenements' THEN
        kind := 'event'; activity := NEW.event_id; email_value := lower(btrim(NEW.email)); NEW.email := email_value;
    ELSE
        IF (NEW.formation_id IS NULL) = (NEW.seminaire_id IS NULL) THEN RAISE EXCEPTION 'Choisissez une seule activité.'; END IF;
        kind := CASE WHEN NEW.formation_id IS NOT NULL THEN 'formation' ELSE 'seminaire' END;
        activity := coalesce(NEW.formation_id, NEW.seminaire_id);
        SELECT lower(btrim(email)) INTO email_value FROM public.rasinayiti_etudiants WHERE id = NEW.etudiant_id;
    END IF;
    IF activity IS NULL OR email_value IS NULL OR email_value = '' THEN RAISE EXCEPTION 'Activité et email obligatoires.'; END IF;
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(kind || activity::text || email_value, 0));
    IF kind = 'event' THEN
        SELECT EXISTS(SELECT 1 FROM public.rasinayiti_inscriptions_evenements WHERE event_id = activity AND lower(btrim(email)) = email_value) INTO duplicate_found;
    ELSE
        SELECT EXISTS(SELECT 1 FROM public.rasinayiti_inscriptions i JOIN public.rasinayiti_etudiants e ON e.id = i.etudiant_id
            WHERE lower(btrim(e.email)) = email_value AND ((kind = 'formation' AND i.formation_id = activity) OR (kind = 'seminaire' AND i.seminaire_id = activity))) INTO duplicate_found;
    END IF;
    IF duplicate_found THEN RAISE EXCEPTION 'Une inscription existe déjà pour cet email et cette activité. Contactez l’administration.'; END IF;
    NEW.inscription_email := email_value;
    NEW.code_leader := nullif(upper(btrim(NEW.code_leader)), '');
    IF coalesce(NEW.veut_certificat, false) THEN
        quote := public.rasinayiti_certificate_quote(kind, activity, NEW.code_leader);
        IF NEW.certificat_prix IS NOT NULL AND NEW.certificat_prix IS DISTINCT FROM (quote->>'certificat_prix')::numeric THEN
            RAISE EXCEPTION 'Le prix a changé. Appliquez à nouveau le code et vérifiez le montant avant de confirmer.';
        END IF;
        NEW.leader_id := (quote->>'leader_id')::uuid; NEW.leader_nom := quote->>'leader_nom';
        NEW.certificat_prix_initial := (quote->>'certificat_prix_initial')::numeric;
        NEW.reduction_pourcentage := (quote->>'reduction_pourcentage')::numeric;
        NEW.certificat_reduction := (quote->>'certificat_reduction')::numeric;
        NEW.certificat_prix := (quote->>'certificat_prix')::numeric;
        IF NEW.certificat_prix > 0 THEN
            IF nullif(NEW.certificat_preuve_url, '') IS NULL OR NEW.certificat_mode_paiement NOT IN ('moncash', 'natcash') OR NEW.certificat_mode_paiement IS NULL THEN
                RAISE EXCEPTION 'Mode de paiement et preuve obligatoires pour le certificat.';
            END IF;
            NEW.certificat_statut_paiement := 'en_attente';
        ELSE
            NEW.certificat_statut_paiement := 'verifie'; NEW.certificat_mode_paiement := NULL; NEW.certificat_preuve_url := NULL;
        END IF;
    ELSE
        NEW.leader_id := NULL; NEW.leader_nom := NULL; NEW.code_leader := NULL;
        NEW.certificat_prix_initial := 0; NEW.reduction_pourcentage := 0; NEW.certificat_reduction := 0; NEW.certificat_prix := 0;
        NEW.certificat_statut_paiement := 'non_requis'; NEW.certificat_mode_paiement := NULL; NEW.certificat_preuve_url := NULL;
    END IF;
    NEW.certificat_delivre := false;
    RETURN NEW;
END;
$$;
CREATE OR REPLACE TRIGGER rasinayiti_validate_certificate BEFORE INSERT OR UPDATE ON public.rasinayiti_inscriptions
    FOR EACH ROW EXECUTE FUNCTION public.rasinayiti_validate_certificate();
CREATE OR REPLACE TRIGGER rasinayiti_validate_certificate BEFORE INSERT OR UPDATE ON public.rasinayiti_inscriptions_evenements
    FOR EACH ROW EXECUTE FUNCTION public.rasinayiti_validate_certificate();

CREATE OR REPLACE FUNCTION public.rasinayiti_register(p_type TEXT, p_id UUID, p_data JSONB)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE student UUID; registration UUID; mail TEXT := lower(btrim(p_data->>'email')); first_name TEXT := btrim(p_data->>'prenom'); last_name TEXT := btrim(p_data->>'nom');
BEGIN
    IF mail IS NULL OR mail !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' OR length(mail) > 255 OR coalesce(first_name, '') = '' OR coalesce(last_name, '') = '' THEN
        RAISE EXCEPTION 'Nom, prénom et email valides obligatoires.';
    END IF;
    IF p_type = 'event' THEN
        IF NOT EXISTS(SELECT 1 FROM public.rasinayiti_events WHERE id = p_id AND status IN ('actif','publie','en_cours') AND afficher_sur_site AND inscription_ouverte) THEN RAISE EXCEPTION 'Inscriptions fermées.'; END IF;
    ELSIF p_type = 'formation' THEN
        IF NOT EXISTS(SELECT 1 FROM public.rasinayiti_formations WHERE id = p_id AND status IN ('publie','en_cours')) THEN RAISE EXCEPTION 'Formation introuvable.'; END IF;
    ELSIF p_type = 'seminaire' THEN
        IF NOT EXISTS(SELECT 1 FROM public.rasinayiti_seminaires WHERE id = p_id AND status IN ('planifie','en_cours')) THEN RAISE EXCEPTION 'Séminaire introuvable.'; END IF;
    ELSE RAISE EXCEPTION 'Type d’activité invalide.';
    END IF;
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('student:' || mail, 0));
    SELECT id INTO student FROM public.rasinayiti_etudiants WHERE lower(btrim(email)) = mail ORDER BY created_at LIMIT 1;
    IF student IS NULL THEN
        INSERT INTO public.rasinayiti_etudiants (email, prenom, nom, telephone, whatsapp, ville, profession, tranche_age)
        VALUES (mail, first_name, last_name, p_data->>'telephone', p_data->>'whatsapp', p_data->>'ville', p_data->>'profession', p_data->>'tranche_age') RETURNING id INTO student;
    END IF;
    IF p_type = 'event' THEN
        INSERT INTO public.rasinayiti_inscriptions_evenements
            (event_id, etudiant_id, prenom, nom, email, telephone, ville, quiz_score, quiz_reponses, veut_certificat, code_leader, certificat_prix, certificat_mode_paiement, certificat_preuve_url)
        VALUES (p_id, student, first_name, last_name, mail, p_data->>'telephone', p_data->>'ville',
            (SELECT coalesce(sum(points), 0) FROM (SELECT q.points FROM public.rasinayiti_event_questions q
                WHERE q.is_active AND (q.event_id IS NULL OR q.event_id = p_id) AND p_data->'quiz_reponses'->>q.id::text = q.correct_option
                AND EXISTS(SELECT 1 FROM public.rasinayiti_events WHERE id = p_id AND has_quiz) ORDER BY q.id LIMIT 3) answers),
            coalesce(p_data->'quiz_reponses', '{}'::jsonb),
            coalesce((p_data->>'veut_certificat')::boolean, false), p_data->>'code_leader', (p_data->>'certificat_prix')::numeric, p_data->>'certificat_mode_paiement', p_data->>'certificat_preuve_url')
        RETURNING id INTO registration;
    ELSE
        INSERT INTO public.rasinayiti_inscriptions
            (etudiant_id, formation_id, seminaire_id, etudiant_prenom, etudiant_nom, etudiant_email, etudiant_telephone, veut_certificat, code_leader, certificat_prix, certificat_mode_paiement, certificat_preuve_url)
        VALUES (student, CASE WHEN p_type = 'formation' THEN p_id END, CASE WHEN p_type = 'seminaire' THEN p_id END,
            first_name, last_name, mail, p_data->>'telephone', coalesce((p_data->>'veut_certificat')::boolean, false), p_data->>'code_leader',
            (p_data->>'certificat_prix')::numeric, p_data->>'certificat_mode_paiement', p_data->>'certificat_preuve_url')
        RETURNING id INTO registration;
    END IF;
    RETURN registration;
END;
$$;
REVOKE ALL ON FUNCTION public.rasinayiti_register(TEXT, UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rasinayiti_register(TEXT, UUID, JSONB) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.rasinayiti_leader_ranking()
RETURNS TABLE (id UUID, nom TEXT, commune TEXT, inscriptions BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    WITH paid AS (
        SELECT DISTINCT leader_id, 'event:' || event_id::text AS activity, inscription_email AS email
        FROM public.rasinayiti_inscriptions_evenements
        WHERE code_leader IS NOT NULL AND certificat_statut_paiement = 'verifie' AND certificat_prix > 0 AND statut <> 'annule'
        UNION
        SELECT DISTINCT leader_id, CASE WHEN formation_id IS NOT NULL THEN 'formation:' || formation_id::text ELSE 'seminaire:' || seminaire_id::text END, inscription_email
        FROM public.rasinayiti_inscriptions
        WHERE code_leader IS NOT NULL AND certificat_statut_paiement = 'verifie' AND certificat_prix > 0 AND coalesce(status_inscription, '') <> 'annule'
    )
    SELECT l.id, coalesce(nullif(l.nom, ''), l.commune)::text, l.commune::text, count(p.email)
    FROM public.rasinayiti_leaders_v2 l LEFT JOIN paid p ON p.leader_id = l.id
    WHERE l.est_actif GROUP BY l.id ORDER BY count(p.email) DESC, coalesce(nullif(l.nom, ''), l.commune), l.id;
$$;
REVOKE ALL ON FUNCTION public.rasinayiti_leader_ranking() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rasinayiti_leader_ranking() TO anon, authenticated, service_role;

DO $$
DECLARE t TEXT; policy_command TEXT; predicate TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['rasinayiti_leaders_v2','rasinayiti_administrateurs','rasinayiti_events','rasinayiti_formations','rasinayiti_seminaires','rasinayiti_inscriptions','rasinayiti_inscriptions_evenements','rasinayiti_etudiants'] LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        FOREACH policy_command IN ARRAY ARRAY['INSERT','UPDATE','DELETE'] LOOP
            predicate := 'public.rasinayiti_is_admin()';
            IF t = 'rasinayiti_etudiants' AND policy_command <> 'DELETE' THEN
                predicate := '(public.rasinayiti_is_admin() OR (auth.uid() IS NOT NULL AND lower(email) = lower(auth.jwt()->>''email'')))';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = t AND policyname = 'leader_secure_' || lower(policy_command)) THEN
                EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR %s TO anon, authenticated %s',
                    'leader_secure_' || lower(policy_command), t, policy_command,
                    CASE policy_command WHEN 'INSERT' THEN 'WITH CHECK (' || predicate || ')'
                        WHEN 'UPDATE' THEN 'USING (' || predicate || ') WITH CHECK (' || predicate || ')'
                        ELSE 'USING (' || predicate || ')' END);
            END IF;
        END LOOP;
    END LOOP;
    FOREACH t IN ARRAY ARRAY['rasinayiti_administrateurs','rasinayiti_etudiants','rasinayiti_inscriptions','rasinayiti_inscriptions_evenements'] LOOP
        predicate := CASE t
            WHEN 'rasinayiti_inscriptions' THEN '(inscription_email = lower(auth.jwt()->>''email'') OR EXISTS (SELECT 1 FROM public.rasinayiti_etudiants e WHERE e.id = etudiant_id AND lower(e.email) = lower(auth.jwt()->>''email'')))'
            ELSE 'lower(email) = lower(auth.jwt()->>''email'')' END;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = t AND policyname = 'leader_secure_read') THEN
            EXECUTE format('CREATE POLICY leader_secure_read ON public.%I AS RESTRICTIVE FOR SELECT TO anon, authenticated USING (public.rasinayiti_is_admin() OR (auth.uid() IS NOT NULL AND %s))', t, predicate);
        END IF;
    END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.rasinayiti_event_registration_count(p_id UUID, p_confirmed BOOLEAN DEFAULT true)
RETURNS BIGINT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT count(*) FROM public.rasinayiti_inscriptions_evenements i
    JOIN public.rasinayiti_events e ON e.id = i.event_id
    WHERE i.event_id = p_id AND (NOT p_confirmed OR i.statut = 'confirme') AND e.afficher_sur_site;
$$;
REVOKE ALL ON FUNCTION public.rasinayiti_event_registration_count(UUID, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rasinayiti_event_registration_count(UUID, BOOLEAN) TO anon, authenticated, service_role;

COMMIT;
