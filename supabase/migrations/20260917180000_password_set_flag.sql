-- An invited account has an auth.users row but no password: inviteUserByEmail
-- creates the user and mails a link, it never sets a password. Until they
-- follow that link and choose one, the account is real but not usable, and
-- nothing else in the schema records that distinction.
--
-- Defaults to true so every existing account — created the old way, with a
-- password an admin set on the spot — is unaffected by this migration.
alter table public.profiles
  add column password_set boolean not null default true;

comment on column public.profiles.password_set is
  'false only between an email invite being sent and the recipient choosing their own password. Read by the app to route them to the set-password screen before anywhere else.';

-- profiles already has a table-wide UPDATE grant for `authenticated`
-- (20260917170000_reset_table_grants.sql), and profiles_update_self lets a
-- signed-in user update their own row — that combination is exactly what a
-- self-service "set my password" step needs, with no new grant required.
-- prevent_profile_privilege_escalation() only blocks role/branch_id/is_active/
-- deleted_at/auth_id on self-updates; password_set is deliberately not in
-- that list, and this migration does not need to touch that function.
