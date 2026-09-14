-- ============================================================
--  RASIN AYITI 2.0 — ENDÈKS AK DEKLANCHÈ (INDEXES & TRIGGERS)
-- ============================================================

-- ---- 1. ENDÈKS POU OPTIMIZASYON VITÈS (INDEXES) ------------

-- Formations & Seminaires
CREATE INDEX IF NOT EXISTS idx_rasinayiti_formations_status ON public.rasinayiti_formations(status);
CREATE INDEX IF NOT EXISTS idx_rasinayiti_formations_cat ON public.rasinayiti_formations(categorie_id);
CREATE INDEX IF NOT EXISTS idx_rasinayiti_formations_feat ON public.rasinayiti_formations(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_rasinayiti_seminaires_date ON public.rasinayiti_seminaires(date_seminaire);
CREATE INDEX IF NOT EXISTS idx_rasinayiti_seminaires_form ON public.rasinayiti_seminaires(formation_id);
CREATE INDEX IF NOT EXISTS idx_rasinayiti_seminaires_status ON public.rasinayiti_seminaires(status);

-- Etudiants & Inscriptions
CREATE INDEX IF NOT EXISTS idx_rasinayiti_etudiants_email ON public.rasinayiti_etudiants(email);
CREATE INDEX IF NOT EXISTS idx_rasinayiti_etudiants_status ON public.rasinayiti_etudiants(status);
CREATE INDEX IF NOT EXISTS idx_rasinayiti_inscriptions_etud ON public.rasinayiti_inscriptions(etudiant_id);
CREATE INDEX IF NOT EXISTS idx_rasinayiti_inscriptions_form ON public.rasinayiti_inscriptions(formation_id);
CREATE INDEX IF NOT EXISTS idx_rasinayiti_inscriptions_stat ON public.rasinayiti_inscriptions(status_inscription);
CREATE INDEX IF NOT EXISTS idx_rasinayiti_inscriptions_pay ON public.rasinayiti_inscriptions(status_paiement);

-- Evenements & Quiz & Inscriptions
CREATE INDEX IF NOT EXISTS idx_rasinayiti_events_date ON public.rasinayiti_events(date_evenement);
CREATE INDEX IF NOT EXISTS idx_rasinayiti_events_status ON public.rasinayiti_events(status);
CREATE INDEX IF NOT EXISTS idx_rasinayiti_insc_events_ev ON public.rasinayiti_inscriptions_evenements(event_id);
CREATE INDEX IF NOT EXISTS idx_rasinayiti_insc_events_email ON public.rasinayiti_inscriptions_evenements(email);
CREATE INDEX IF NOT EXISTS idx_rasinayiti_event_q_active ON public.rasinayiti_event_questions(is_active) WHERE is_active = true;

-- Donations
CREATE INDEX IF NOT EXISTS idx_rasinayiti_donations_stat ON public.rasinayiti_donations(statut);
CREATE INDEX IF NOT EXISTS idx_rasinayiti_donations_date ON public.rasinayiti_donations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rasinayiti_donations_method ON public.rasinayiti_donations(methode_paiement);

-- Boutique Maillots
CREATE INDEX IF NOT EXISTS idx_rasinayiti_maillots_dispo ON public.rasinayiti_maillots(est_disponible) WHERE est_disponible = true;
CREATE INDEX IF NOT EXISTS idx_rasinayiti_m_orders_stat ON public.rasinayiti_maillot_orders(statut);
CREATE INDEX IF NOT EXISTS idx_rasinayiti_m_orders_email ON public.rasinayiti_maillot_orders(email);

-- Leaders
CREATE INDEX IF NOT EXISTS idx_rasinayiti_leaders_commune ON public.rasinayiti_leaders_v2(commune);
CREATE INDEX IF NOT EXISTS idx_rasinayiti_leaders_actif ON public.rasinayiti_leaders_v2(est_actif) WHERE est_actif = true;

-- Participants
CREATE INDEX IF NOT EXISTS idx_rasinayiti_part_email ON public.rasinayiti_participants(email);
CREATE INDEX IF NOT EXISTS idx_rasinayiti_part_statut ON public.rasinayiti_participants(statut_paiement);
CREATE INDEX IF NOT EXISTS idx_rasinayiti_part_code ON public.rasinayiti_participants(access_code) WHERE access_code IS NOT NULL;

-- Live stream
CREATE INDEX IF NOT EXISTS idx_rasinayiti_live_v_active ON public.rasinayiti_live_viewers(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_rasinayiti_live_v_seen ON public.rasinayiti_live_viewers(last_seen);
CREATE INDEX IF NOT EXISTS idx_rasinayiti_live_r_date ON public.rasinayiti_live_reactions(created_at);

-- ---- 2. FONKSYON POU DAT AKTYALIZASYON (updated_at) --------
CREATE OR REPLACE FUNCTION public.rasinayiti_update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---- 3. DEKLANCHÈ (TRIGGERS) --------------------------------
DROP TRIGGER IF EXISTS trg_rasinayiti_categories_updated_at ON public.rasinayiti_categories;
CREATE TRIGGER trg_rasinayiti_categories_updated_at BEFORE UPDATE ON public.rasinayiti_categories
    FOR EACH ROW EXECUTE FUNCTION public.rasinayiti_update_updated_at_column();

DROP TRIGGER IF EXISTS trg_rasinayiti_formations_updated_at ON public.rasinayiti_formations;
CREATE TRIGGER trg_rasinayiti_formations_updated_at BEFORE UPDATE ON public.rasinayiti_formations
    FOR EACH ROW EXECUTE FUNCTION public.rasinayiti_update_updated_at_column();

DROP TRIGGER IF EXISTS trg_rasinayiti_seminaires_updated_at ON public.rasinayiti_seminaires;
CREATE TRIGGER trg_rasinayiti_seminaires_updated_at BEFORE UPDATE ON public.rasinayiti_seminaires
    FOR EACH ROW EXECUTE FUNCTION public.rasinayiti_update_updated_at_column();

DROP TRIGGER IF EXISTS trg_rasinayiti_etudiants_updated_at ON public.rasinayiti_etudiants;
CREATE TRIGGER trg_rasinayiti_etudiants_updated_at BEFORE UPDATE ON public.rasinayiti_etudiants
    FOR EACH ROW EXECUTE FUNCTION public.rasinayiti_update_updated_at_column();

DROP TRIGGER IF EXISTS trg_rasinayiti_progressions_updated_at ON public.rasinayiti_progressions;
CREATE TRIGGER trg_rasinayiti_progressions_updated_at BEFORE UPDATE ON public.rasinayiti_progressions
    FOR EACH ROW EXECUTE FUNCTION public.rasinayiti_update_updated_at_column();

DROP TRIGGER IF EXISTS trg_rasinayiti_modules_updated_at ON public.rasinayiti_modules;
CREATE TRIGGER trg_rasinayiti_modules_updated_at BEFORE UPDATE ON public.rasinayiti_modules
    FOR EACH ROW EXECUTE FUNCTION public.rasinayiti_update_updated_at_column();

DROP TRIGGER IF EXISTS trg_rasinayiti_galerie_updated_at ON public.rasinayiti_galerie;
CREATE TRIGGER trg_rasinayiti_galerie_updated_at BEFORE UPDATE ON public.rasinayiti_galerie
    FOR EACH ROW EXECUTE FUNCTION public.rasinayiti_update_updated_at_column();

DROP TRIGGER IF EXISTS trg_rasinayiti_administrateurs_updated_at ON public.rasinayiti_administrateurs;
CREATE TRIGGER trg_rasinayiti_administrateurs_updated_at BEFORE UPDATE ON public.rasinayiti_administrateurs
    FOR EACH ROW EXECUTE FUNCTION public.rasinayiti_update_updated_at_column();

DROP TRIGGER IF EXISTS trg_rasinayiti_parametres_updated_at ON public.rasinayiti_parametres;
CREATE TRIGGER trg_rasinayiti_parametres_updated_at BEFORE UPDATE ON public.rasinayiti_parametres
    FOR EACH ROW EXECUTE FUNCTION public.rasinayiti_update_updated_at_column();

DROP TRIGGER IF EXISTS trg_rasinayiti_events_updated_at ON public.rasinayiti_events;
CREATE TRIGGER trg_rasinayiti_events_updated_at BEFORE UPDATE ON public.rasinayiti_events
    FOR EACH ROW EXECUTE FUNCTION public.rasinayiti_update_updated_at_column();

DROP TRIGGER IF EXISTS trg_rasinayiti_donations_updated_at ON public.rasinayiti_donations;
CREATE TRIGGER trg_rasinayiti_donations_updated_at BEFORE UPDATE ON public.rasinayiti_donations
    FOR EACH ROW EXECUTE FUNCTION public.rasinayiti_update_updated_at_column();

DROP TRIGGER IF EXISTS trg_rasinayiti_maillots_updated_at ON public.rasinayiti_maillots;
CREATE TRIGGER trg_rasinayiti_maillots_updated_at BEFORE UPDATE ON public.rasinayiti_maillots
    FOR EACH ROW EXECUTE FUNCTION public.rasinayiti_update_updated_at_column();

DROP TRIGGER IF EXISTS trg_rasinayiti_maillot_orders_updated_at ON public.rasinayiti_maillot_orders;
CREATE TRIGGER trg_rasinayiti_maillot_orders_updated_at BEFORE UPDATE ON public.rasinayiti_maillot_orders
    FOR EACH ROW EXECUTE FUNCTION public.rasinayiti_update_updated_at_column();

DROP TRIGGER IF EXISTS trg_rasinayiti_leaders_updated_at ON public.rasinayiti_leaders_v2;
CREATE TRIGGER trg_rasinayiti_leaders_updated_at BEFORE UPDATE ON public.rasinayiti_leaders_v2
    FOR EACH ROW EXECUTE FUNCTION public.rasinayiti_update_updated_at_column();

-- ---- 4. FONKSYON POU KONTE SPECTATEURS AN LIY ---------
CREATE OR REPLACE FUNCTION public.rasinayiti_get_active_viewers_count()
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*) FROM public.rasinayiti_live_viewers 
        WHERE is_active = true 
        AND last_seen > NOW() - INTERVAL '2 minutes'
    );
END;
$$ LANGUAGE plpgsql;
