-- Base de datos de AquaControl en Supabase. Se pega una sola vez en SQL Editor → Run.
-- Una fila por usuario: los datos de EMQX y lo que se carga en la app.

create table if not exists public.cuenta (
  usuario uuid primary key default auth.uid() references auth.users on delete cascade,
  mqtt jsonb,                                  -- { servidor, usuario, clave } de EMQX Cloud
  datos jsonb,                                 -- peces, plantas, plan de abonos, medidas…
  actualizado timestamptz not null default now()
);

-- Cada usuario lee y escribe solo su fila. Sin sesión no se ve nada.
alter table public.cuenta enable row level security;

drop policy if exists "cada usuario, su fila" on public.cuenta;
create policy "cada usuario, su fila" on public.cuenta
  for all to authenticated
  using (usuario = (select auth.uid()))
  with check (usuario = (select auth.uid()));
