-- A returning customer is found by whichever contact detail they give at the
-- counter. Phone already works this way; email did not exist as a column at
-- all, so a customer who gave an email the first time could never be matched
-- against it on a later visit.
alter table public.customers
  add column email text;

alter table public.customers
  add constraint customers_email_format
  check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');

-- Mirrors customers_phone_unique_live: unique while the customer is live and
-- the field is actually filled in, case-insensitive so "Foo@x.com" and
-- "foo@x.com" are the same lookup.
create unique index customers_email_unique_live
  on public.customers (lower(email))
  where (email is not null and deleted_at is null);

comment on column public.customers.email is
  'Optional. Whichever of phone/email a customer gives at the counter is what finds them on a later visit — both are searched.';
