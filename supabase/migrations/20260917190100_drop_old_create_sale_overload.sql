-- create or replace function does not replace a function whose parameter
-- LIST differs — Postgres treats name + signature as the identity, so adding
-- p_discount_override_token in the previous migration left two overloads of
-- create_sale() sitting side by side: the old 6-argument one and the new
-- 7-argument one. A call passing only the original 6 named arguments became
-- ambiguous between them ("Could not choose the best candidate function"),
-- which is exactly the call every existing caller makes.
drop function if exists public.create_sale(uuid, uuid, numeric, jsonb, jsonb, date);
