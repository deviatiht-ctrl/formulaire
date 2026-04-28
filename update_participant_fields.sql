-- ============================================================
-- UPDATE_PARTICIPANT_FIELDS.SQL - Nouveaux champs inscription
-- Kouri sa nan Supabase > SQL Editor
-- ============================================================

-- 1. Ajoute kolòn nouvo
ALTER TABLE participants ADD COLUMN IF NOT EXISTS departement TEXT;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS tranche_age TEXT;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS whatsapp TEXT;

-- 2. Index pou rechèch vit
CREATE INDEX IF NOT EXISTS idx_participants_departement ON participants(departement);
CREATE INDEX IF NOT EXISTS idx_participants_tranche_age ON participants(tranche_age);
CREATE INDEX IF NOT EXISTS idx_participants_whatsapp ON participants(whatsapp);

-- 3. Fonksyon pou jwenn tout nimewo WhatsApp (pou gwoup)
CREATE OR REPLACE FUNCTION get_all_whatsapp_numbers()
RETURNS TABLE(whatsapp_number TEXT, nom_complet TEXT, departement TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.whatsapp,
        CONCAT(p.prenom, ' ', p.nom) as nom_complet,
        p.departement
    FROM participants p
    WHERE p.whatsapp IS NOT NULL AND p.whatsapp != ''
    ORDER BY p.departement, p.nom;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Fonksyon pou jwenn statistik pa depatman
CREATE OR REPLACE FUNCTION get_stats_by_department()
RETURNS TABLE(departement TEXT, total BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(p.departement, 'Non spécifié') as departement,
        COUNT(*) as total
    FROM participants p
    GROUP BY p.departement
    ORDER BY total DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Fonksyon pou jwenn statistik pa tranch laj
CREATE OR REPLACE FUNCTION get_stats_by_age()
RETURNS TABLE(tranche_age TEXT, total BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(p.tranche_age, 'Non spécifié') as tranche_age,
        COUNT(*) as total
    FROM participants p
    GROUP BY p.tranche_age
    ORDER BY total DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Verifye:
-- SELECT * FROM get_all_whatsapp_numbers();
-- SELECT * FROM get_stats_by_department();
-- SELECT * FROM get_stats_by_age();
-- ============================================================
