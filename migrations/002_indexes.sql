CREATE UNIQUE INDEX IF NOT EXISTS idx_slots_unique_time ON slots(start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_created ON bookings(created_at);
