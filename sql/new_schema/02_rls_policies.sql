-- ============================================================
--  RLS POLICIES - SEKIRITE
-- ============================================================

-- Aktive RLS sou tout tablo
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE formations ENABLE ROW LEVEL SECURITY;
ALTER TABLE seminaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE etudiants ENABLE ROW LEVEL SECURITY;
ALTER TABLE inscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE progressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE completions_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE galerie ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE administrateurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE parametres ENABLE ROW LEVEL SECURITY;

-- ============================================================
--  POLITIK: KATEGORI (Tout moun ka li, sèlman admin ka modifye)
-- ============================================================
CREATE POLICY "Categories visible pour tous" ON categories
    FOR SELECT USING (true);

CREATE POLICY "Categories modifiables par admin" ON categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM administrateurs 
            WHERE id = current_setting('app.current_user_id', true)::uuid 
            AND actif = true
        )
    );

-- ============================================================
--  POLITIK: FORMATIONS
-- ============================================================
CREATE POLICY "Formations publiees visibles" ON formations
    FOR SELECT USING (status = 'publie' OR status = 'en_cours');

CREATE POLICY "Formations visibles pour etudiants inscrits" ON formations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM inscriptions 
            WHERE formation_id = formations.id 
            AND etudiant_id = current_setting('app.current_user_id', true)::uuid
            AND status_inscription = 'confirme'
        )
    );

CREATE POLICY "Formations modifiables par admin" ON formations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM administrateurs 
            WHERE id = current_setting('app.current_user_id', true)::uuid 
            AND actif = true
        )
    );

-- ============================================================
--  POLITIK: SEMINAIRES
-- ============================================================
CREATE POLICY "Seminaires publies visibles" ON seminaires
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM formations 
            WHERE id = seminaires.formation_id 
            AND (status = 'publie' OR status = 'en_cours')
        )
    );

CREATE POLICY "Seminaires modifiables par admin" ON seminaires
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM administrateurs 
            WHERE id = current_setting('app.current_user_id', true)::uuid 
            AND actif = true
        )
    );

-- ============================================================
--  POLITIK: ETUDIANTS
-- ============================================================
CREATE POLICY "Etudiants voient leur propre profil" ON etudiants
    FOR SELECT USING (
        id = current_setting('app.current_user_id', true)::uuid
    );

CREATE POLICY "Etudiants modifient leur profil" ON etudiants
    FOR UPDATE USING (
        id = current_setting('app.current_user_id', true)::uuid
    );

CREATE POLICY "Admin voit tous les etudiants" ON etudiants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM administrateurs 
            WHERE id = current_setting('app.current_user_id', true)::uuid 
            AND actif = true
        )
    );

CREATE POLICY "Admin modifie tous les etudiants" ON etudiants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM administrateurs 
            WHERE id = current_setting('app.current_user_id', true)::uuid 
            AND actif = true
        )
    );

-- ============================================================
--  POLITIK: INSCRIPTIONS
-- ============================================================
CREATE POLICY "Etudiants voient leurs inscriptions" ON inscriptions
    FOR SELECT USING (
        etudiant_id = current_setting('app.current_user_id', true)::uuid
    );

CREATE POLICY "Etudiants creent inscription" ON inscriptions
    FOR INSERT WITH CHECK (
        etudiant_id = current_setting('app.current_user_id', true)::uuid
    );

CREATE POLICY "Admin voit toutes les inscriptions" ON inscriptions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM administrateurs 
            WHERE id = current_setting('app.current_user_id', true)::uuid 
            AND actif = true
        )
    );

CREATE POLICY "Admin gere toutes les inscriptions" ON inscriptions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM administrateurs 
            WHERE id = current_setting('app.current_user_id', true)::uuid 
            AND actif = true
        )
    );

-- ============================================================
--  POLITIK: PROGRESSIONS
-- ============================================================
CREATE POLICY "Etudiants voient leur progression" ON progressions
    FOR SELECT USING (
        etudiant_id = current_setting('app.current_user_id', true)::uuid
    );

CREATE POLICY "Etudiants modifient leur progression" ON progressions
    FOR ALL USING (
        etudiant_id = current_setting('app.current_user_id', true)::uuid
    );

CREATE POLICY "Admin voit toutes les progressions" ON progressions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM administrateurs 
            WHERE id = current_setting('app.current_user_id', true)::uuid 
            AND actif = true
        )
    );

-- ============================================================
--  POLITIK: MODULES
-- ============================================================
CREATE POLICY "Modules visibles pour etudiants inscrits" ON modules
    FOR SELECT USING (
        publie = true AND
        EXISTS (
            SELECT 1 FROM inscriptions 
            WHERE formation_id = modules.formation_id 
            AND etudiant_id = current_setting('app.current_user_id', true)::uuid
            AND status_inscription = 'confirme'
        )
    );

CREATE POLICY "Modules modifiables par admin" ON modules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM administrateurs 
            WHERE id = current_setting('app.current_user_id', true)::uuid 
            AND actif = true
        )
    );

-- ============================================================
--  POLITIK: GALERIE
-- ============================================================
CREATE POLICY "Galerie visible pour tous" ON galerie
    FOR SELECT USING (publie = true);

CREATE POLICY "Galerie modifiable par admin" ON galerie
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM administrateurs 
            WHERE id = current_setting('app.current_user_id', true)::uuid 
            AND actif = true
        )
    );

-- ============================================================
--  POLITIK: NOTIFICATIONS
-- ============================================================
CREATE POLICY "Etudiants voient leurs notifications" ON notifications
    FOR SELECT USING (
        etudiant_id = current_setting('app.current_user_id', true)::uuid
    );

CREATE POLICY "Etudiants marquent notifications lues" ON notifications
    FOR UPDATE USING (
        etudiant_id = current_setting('app.current_user_id', true)::uuid
    );

CREATE POLICY "Admin cree notifications" ON notifications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM administrateurs 
            WHERE id = current_setting('app.current_user_id', true)::uuid 
            AND actif = true
        )
    );

-- ============================================================
--  POLITIK: ADMINISTRATEURS
-- ============================================================
CREATE POLICY "Admin voit autres admins" ON administrateurs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM administrateurs a
            WHERE a.id = current_setting('app.current_user_id', true)::uuid 
            AND a.actif = true
        )
    );

-- ============================================================
--  POLITIK: PARAMETRES
-- ============================================================
CREATE POLICY "Parametres visibles pour tous" ON parametres
    FOR SELECT USING (true);

CREATE POLICY "Parametres modifiables par admin" ON parametres
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM administrateurs 
            WHERE id = current_setting('app.current_user_id', true)::uuid 
            AND actif = true
            AND role = 'super_admin'
        )
    );

-- ============================================================
--  FONKSIYON POU SET USER ID
-- ============================================================
CREATE OR REPLACE FUNCTION set_current_user_id(user_id UUID)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_user_id', user_id::text, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
--  VUES POU STATISTIK
-- ============================================================

-- Vue: Statistik globales
CREATE OR REPLACE VIEW vue_statistiques_globales AS
SELECT 
    (SELECT COUNT(*) FROM etudiants WHERE status = 'actif') as total_etudiants,
    (SELECT COUNT(*) FROM formations WHERE status IN ('publie', 'en_cours')) as total_formations,
    (SELECT COUNT(*) FROM seminaires WHERE status = 'planifie') as total_seminaires_planifies,
    (SELECT COUNT(*) FROM inscriptions WHERE status_inscription = 'confirme') as total_inscriptions,
    (SELECT COUNT(*) FROM formations WHERE status = 'termine') as total_formations_completees;

-- Vue: Formations populaires
CREATE OR REPLACE VIEW vue_formations_populaires AS
SELECT 
    f.id,
    f.titre,
    f.code,
    COUNT(i.id) as nb_inscriptions
FROM formations f
LEFT JOIN inscriptions i ON f.id = i.formation_id AND i.status_inscription = 'confirme'
WHERE f.status = 'publie'
GROUP BY f.id, f.titre, f.code
ORDER BY nb_inscriptions DESC;

-- Vue: Aktivite recent
CREATE OR REPLACE VIEW vue_activite_recente AS
SELECT 
    l.action,
    l.description,
    l.created_at,
    l.type_utilisateur
FROM logs_activite l
ORDER BY l.created_at DESC
LIMIT 50;

-- ============================================================
--  MESAJ SIKSE
-- ============================================================
SELECT 'RLS POLICIES KREYE AVEC SUCCES!' AS message;
