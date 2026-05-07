-- ============================================================
--  TABLE EVENTS POU EVENMAN PIBLIK
--  Kreye: 2026
--  Deskripsyon: Table pou estoke evenman ak flyers
-- ============================================================

CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titre VARCHAR(255) NOT NULL,
    description TEXT,
    flyer_url VARCHAR(500),
    flyer_public_id VARCHAR(255),
    date_evenement TIMESTAMP,
    heure_evenement TIME,
    lieu VARCHAR(255),
    type_evenement VARCHAR(50) DEFAULT 'in_person', -- 'in_person', 'online', 'hybrid'
    est_payant BOOLEAN DEFAULT false,
    prix DECIMAL(10,2) DEFAULT 0,
    devise VARCHAR(10) DEFAULT 'HTG',
    sponsors TEXT[], -- Array de sponsors
    status VARCHAR(50) DEFAULT 'actif', -- 'actif', 'archive', 'brouillon'
    afficher_sur_site BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT check_prix_positive CHECK (prix >= 0)
);

-- Trigger pou update updated_at
DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Admin ka tout
DROP POLICY IF EXISTS "Admins can manage events" ON events;
CREATE POLICY "Admins can manage events" ON events
    FOR ALL
    USING (auth.uid() IN (SELECT id FROM administrateurs));

-- Public ka we evenman aktif
DROP POLICY IF EXISTS "Public can view active events" ON events;
CREATE POLICY "Public can view active events" ON events
    FOR SELECT
    USING (status = 'actif' AND afficher_sur_site = true);

-- Index pou performans
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date_evenement);

-- Insert yon evenman test (opsyonel)
-- INSERT INTO events (titre, description, date_evenement, lieu, type_evenement, est_payant, prix, status)
-- VALUES ('Evenman Test', 'Sa se yon evenman test', NOW() + INTERVAL '7 days', 'Pòtoprens', 'in_person', true, 5000, 'actif');
