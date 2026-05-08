-- ============================================================
--  AJOUTE UNIQUE CONSTRAINT POUR INSCRIPTIONS EVENEMENTS
--  Kreye: 2026
--  Deskripsyon: Empêcher un email de s'inscrire plusieurs fois au même événement
-- ============================================================

-- Ajouter la colonne quiz_score si elle n'existe pas
ALTER TABLE inscriptions_evenements
ADD COLUMN IF NOT EXISTS quiz_score INTEGER DEFAULT 0;

-- Supprimer les doublons existants d'abord
DELETE FROM inscriptions_evenements a
WHERE id IN (
    SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (
            PARTITION BY event_id, email 
            ORDER BY created_at
        ) as row_num
        FROM inscriptions_evenements
    ) t
    WHERE row_num > 1
);

-- Ajouter la contrainte unique seulement si elle n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_event_email'
        AND conrelid = 'inscriptions_evenements'::regclass
    ) THEN
        ALTER TABLE inscriptions_evenements
        ADD CONSTRAINT unique_event_email UNIQUE (event_id, email);
    END IF;
END $$;

-- Vérifier la contrainte
SELECT 
    constraint_name,
    constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'inscriptions_evenements'
AND constraint_name = 'unique_event_email';
