create type public.app_role as enum ('admin','user');
create table public.user_roles (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade not null, role app_role not null, unique(user_id, role));
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role app_role) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.user_roles where user_id=_user_id and role=_role) $$;

create or replace function public.handle_first_admin() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if not exists (select 1 from public.user_roles where role='admin') then
    insert into public.user_roles(user_id, role) values (new.id, 'admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_created_admin after insert on auth.users for each row execute function public.handle_first_admin();

create table public.categories (id uuid primary key default gen_random_uuid(), name text not null, sort_order int not null default 0, created_at timestamptz not null default now());
grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;
grant all on public.categories to service_role;
alter table public.categories enable row level security;
create policy "public read cats" on public.categories for select using (true);
create policy "admin write cats" on public.categories for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.products (id uuid primary key default gen_random_uuid(), name text not null, description text, price numeric(12,2) not null default 0, image_url text, category_id uuid references public.categories(id) on delete set null, in_stock boolean not null default true, created_at timestamptz not null default now());
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "public read products" on public.products for select using (true);
create policy "admin write products" on public.products for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.orders (id uuid primary key default gen_random_uuid(), customer_name text not null, phone text not null, address text not null, notes text, items jsonb not null, total numeric(12,2) not null, status text not null default 'pending', created_at timestamptz not null default now());
grant insert on public.orders to anon, authenticated;
grant select, update, delete on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "anyone can place order" on public.orders for insert to anon, authenticated with check (status='pending' and length(customer_name) between 1 and 200 and length(phone) between 5 and 30 and length(address) between 3 and 1000);
create policy "admin read orders" on public.orders for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admin update orders" on public.orders for update to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admin delete orders" on public.orders for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create policy "admin upload images" on storage.objects for insert to authenticated with check (bucket_id='product-images' and public.has_role(auth.uid(),'admin'));
create policy "admin delete images" on storage.objects for delete to authenticated using (bucket_id='product-images' and public.has_role(auth.uid(),'admin'));

insert into public.categories(name, sort_order) values ('General',0);