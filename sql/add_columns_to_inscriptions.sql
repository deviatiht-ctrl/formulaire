-- ============================================================
--  AJOUTE KOLON POU DONE ETUDIANT NAN INSCRIPTIONS
--  Kreye: 2026
--  Deskripsyon: Ajoute kolon etudiant_prenom, etudiant_nom, etc nan table inscriptions
-- ============================================================

-- Ajoute kolon yo si yo pa egziste
ALTER TABLE inscriptions 
ADD COLUMN IF NOT EXISTS etudiant_prenom VARCHAR(100),
ADD COLUMN IF NOT EXISTS etudiant_nom VARCHAR(100),
ADD COLUMN IF NOT EXISTS etudiant_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS etudiant_telephone VARCHAR(20);

-- Konfime kolon yo te ajoute
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'inscriptions'
AND column_name LIKE 'etudiant_%'
ORDER BY column_name;
