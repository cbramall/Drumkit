-- Allow beats to be shared publicly via a link.
-- is_public defaults to false so existing beats remain private.
alter table beats
  add column is_public boolean not null default false;

-- Allow anyone (including unauthenticated visitors) to read a beat that has
-- been explicitly shared.  The existing "Users can manage own beats" policy
-- already covers all operations for the owner; this second policy handles the
-- read-only public case.
create policy "Anyone can read public beats"
  on beats for select
  using (is_public = true);
