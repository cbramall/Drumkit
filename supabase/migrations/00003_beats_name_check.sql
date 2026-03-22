-- Add server-side validation for beat names to match the client-side rules:
-- max 100 characters, only letters/numbers/spaces/hyphens/underscores/apostrophes/periods.
-- This prevents malicious clients from bypassing React-side validation.

alter table beats
  add constraint beats_name_length check (char_length(name) <= 100),
  add constraint beats_name_chars  check (name ~ '^[a-zA-Z0-9 _\-''.]+$');
