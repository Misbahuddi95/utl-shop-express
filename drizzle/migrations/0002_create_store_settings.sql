create table public.store_settings (
  key text primary key,
  value text not null default ''
);
grant select on public.store_settings to anon, authenticated;
grant insert, update on public.store_settings to authenticated;
grant all on public.store_settings to service_role;
alter table public.store_settings enable row level security;
create policy "public read settings" on public.store_settings for select using (true);
create policy "admin insert settings" on public.store_settings for insert to authenticated
  with check (has_role(auth.uid(), 'admin'::app_role));
create policy "admin update settings" on public.store_settings for update to authenticated
  using (has_role(auth.uid(), 'admin'::app_role));