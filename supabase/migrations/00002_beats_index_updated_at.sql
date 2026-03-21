-- Speed up per-user queries
CREATE INDEX IF NOT EXISTS beats_user_id_idx ON beats(user_id);

-- Track last modification time
ALTER TABLE beats ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS beats_updated_at ON beats;

CREATE TRIGGER beats_updated_at
  BEFORE UPDATE ON beats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
