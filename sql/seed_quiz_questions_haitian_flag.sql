-- ============================================================
--  SEED QUIZ QUESTIONS - DRAPO AYISYEN & EWÒ 18 ME
--  Kreye: 2026
--  Deskripsyon: Crée la table event_questions et insère les nouvelles questions sur le drapeau haïtien et les héros du 18 mai
-- ============================================================

-- Créer la table event_questions si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.event_questions (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    question_text   TEXT NOT NULL,
    option_a        TEXT NOT NULL,
    option_b        TEXT NOT NULL,
    option_c        TEXT NOT NULL,
    option_d        TEXT NOT NULL,
    correct_option  CHAR(1) NOT NULL CHECK (correct_option IN ('A','B','C','D')),
    points          INTEGER DEFAULT 2,
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Supprimer toutes les questions existantes
DELETE FROM public.event_questions;

-- Insérer les nouvelles questions
INSERT INTO public.event_questions (question_text, option_a, option_b, option_c, option_d, correct_option, points, is_active)
VALUES 
('Ki koulè drapo ayisyen an genyen?', 
 'Vèt ak jòn', 
 'Ble ak wouj', 
 'Nwa ak blan', 
 'Wouj ak jòn', 
 'B', 
 2, 
 true),

('Ki dat Ayiti selebre fèt drapo li?', 
 '1 janvye', 
 '17 oktòb', 
 '18 me', 
 '25 desanm', 
 'C', 
 2, 
 true),

('Ki vil ki asosye ak kreyasyon drapo ayisyen an?', 
 'Jakmèl', 
 'Okay', 
 'Pòtoprens', 
 'Aks (Arcahaie)', 
 'D', 
 2, 
 true),

('Kiyes ki te koud drapo ayisyen an?', 
 'Toussaint Louverture', 
 'Catherine Flon', 
 'Alexandre Pétion', 
 'Henri Christophe', 
 'B', 
 2, 
 true),

('Ki koulè Dessalines te retire nan drapo franse a?', 
 'Ble', 
 'Wouj', 
 'Blan', 
 'Vèt', 
 'C', 
 2, 
 true),

('Kisa drapo ayisyen an reprezante?', 
 'Divizyon', 
 'Inyon ak libète', 
 'Lagè sèlman', 
 'Richès peyi a', 
 'B', 
 2, 
 true),

('Ki deviz ki sou drapo ayisyen an?', 
 'Inyon fè la fòs', 
 'Libète oswa lanmò', 
 'Ayiti pap peri', 
 'Viv ansanm', 
 'A', 
 2, 
 true),

('Ki ewo yo rele "Papa drapo ayisyen an"?', 
 'Capois-La-Mort', 
 'Henri Christophe', 
 'Jean-Jacques Dessalines', 
 'Charlemagne Péralte', 
 'C', 
 2, 
 true),

('Ki koulè ki anwo sou drapo ayisyen an?', 
 'Wouj', 
 'Ble', 
 'Blan', 
 'Vèt', 
 'B', 
 2, 
 true),

('Poukisa 18 me enpòtan pou Ayiti?', 
 'Se jou endepandans', 
 'Se jou eleksyon', 
 'Se fèt drapo ak inyon pèp ayisyen', 
 'Se fèt travay', 
 'C', 
 2, 
 true);

-- Vérification
SELECT COUNT(*) as total_questions FROM public.event_questions WHERE is_active = true;
SELECT * FROM public.event_questions ORDER BY created_at;
