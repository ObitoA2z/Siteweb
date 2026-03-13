-- Programme de fidélité : compteur de séances et réduction automatique
ALTER TABLE customer_users ADD COLUMN loyalty_points INTEGER NOT NULL DEFAULT 0;
ALTER TABLE customer_users ADD COLUMN referral_code TEXT;
ALTER TABLE customer_users ADD COLUMN referred_by_id INTEGER REFERENCES customer_users(id);

-- SQLite ne supporte pas ADD COLUMN ... UNIQUE — index séparé obligatoire
CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_users_referral_code
  ON customer_users(referral_code) WHERE referral_code IS NOT NULL;

-- Journal des points de fidélité
CREATE TABLE IF NOT EXISTS loyalty_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL REFERENCES customer_users(id),
  event_type TEXT NOT NULL, -- 'booking_confirmed' | 'reward_applied' | 'referral_earned'
  points INTEGER NOT NULL,  -- positif = gagné, négatif = dépensé
  booking_id INTEGER REFERENCES bookings(id),
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_loyalty_customer ON loyalty_events(customer_id, created_at DESC);

-- Table des parrainages
CREATE TABLE IF NOT EXISTS referrals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  referrer_id INTEGER NOT NULL REFERENCES customer_users(id),
  referred_id INTEGER NOT NULL REFERENCES customer_users(id),
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'rewarded'
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  rewarded_at TEXT,
  UNIQUE(referred_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);

-- Index pour trouver les clientes à relancer (dernière réservation confirmée)
CREATE INDEX IF NOT EXISTS idx_bookings_customer_email_status
  ON bookings(customer_email, status, created_at DESC);
