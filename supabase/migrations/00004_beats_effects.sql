-- Store FX panel slider state alongside each beat so it is restored on load.
-- Nullable so existing beats (which have no saved effects) are unaffected; the
-- client falls back to the audio engine defaults when effects IS NULL.
alter table beats
  add column effects jsonb;
