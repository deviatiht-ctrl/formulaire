-- ============================================================
--  AJOUTE KOLON MANKAN NAN TABLE EVENTS
--  Kreye: 2026
--  Deskripsyon: Ajoute kolon has_quiz, inscription_ouverte, places_max, whatsapp_link, images, duration
-- ============================================================

-- Ajoute kolon yo si yo pa egziste
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS has_quiz BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS inscription_ouverte BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS places_max INTEGER,
ADD COLUMN IF NOT EXISTS whatsapp_link VARCHAR(500),
ADD COLUMN IF NOT EXISTS images TEXT[], -- Array d'images
ADD COLUMN IF NOT EXISTS duration VARCHAR(100), -- Ex: "2 jours", "1 mois", "3 heures"

-- Konfime kolon yo te ajoute
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'events'
AND column_name IN ('has_quiz', 'inscription_ouverte', 'places_max', 'whatsapp_link', 'images', 'duration')
ORDER BY column_name;
