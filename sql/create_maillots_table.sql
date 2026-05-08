-- ============================================================
--  KREYE TABLE MAILLOTS
--  Kreye: 2026
--  Deskripsyon: Table pour les maillots/jerseys de la boutique
-- ============================================================

CREATE TABLE IF NOT EXISTS maillots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom VARCHAR(255) NOT NULL,
    description TEXT,
    prix DECIMAL(10, 2) NOT NULL,
    devise VARCHAR(10) DEFAULT 'HTG',
    image_url_1 VARCHAR(500),
    image_url_2 VARCHAR(500),
    image_url_3 VARCHAR(500),
    est_disponible BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Ajouter un index sur est_disponible pour les performances
CREATE INDEX IF NOT EXISTS idx_maillots_disponible ON maillots(est_disponible);

-- Vérifier la création de la table
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'maillots'
ORDER BY ordinal_position;
