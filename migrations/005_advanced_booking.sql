CREATE TABLE IF NOT EXISTS business_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  open_time TEXT NOT NULL DEFAULT '09:00',
  close_time TEXT NOT NULL DEFAULT '18:00',
  break_start TEXT NOT NULL DEFAULT '13:00',
  break_end TEXT NOT NULL DEFAULT '14:00',
  working_days TEXT NOT NULL DEFAULT '1,2,3,4,5',
  daily_booking_limit INTEGER NOT NULL DEFAULT 10,
  max_overbooking INTEGER NOT NULL DEFAULT 0,
  max_cancellations_before_block INTEGER NOT NULL DEFAULT 3,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO business_settings (id) VALUES (1);

CREATE TABLE IF NOT EXISTS closed_days (
  date TEXT PRIMARY KEY,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS waitlist_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_id INTEGER NOT NULL,
  preferred_date TEXT NOT NULL,
  preferred_time TEXT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | contacted | converted | cancelled
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(service_id) REFERENCES services(id)
);

CREATE INDEX IF NOT EXISTS idx_waitlist_service_date ON waitlist_entries(service_id, preferred_date);
CREATE INDEX IF NOT EXISTS idx_waitlist_status ON waitlist_entries(status);

ALTER TABLE customer_users ADD COLUMN internal_notes TEXT;
ALTER TABLE customer_users ADD COLUMN is_vip INTEGER NOT NULL DEFAULT 0;
ALTER TABLE customer_users ADD COLUMN is_blacklisted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE customer_users ADD COLUMN cancelled_count INTEGER NOT NULL DEFAULT 0;

