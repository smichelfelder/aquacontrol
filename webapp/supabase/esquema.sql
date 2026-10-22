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

-- ---------- Historial de las sondas ----------
-- La central sube una lectura cada 5 minutos (firmware/aquacontrol.yaml → interval) con
-- registrar_lectura y su propia clave, sin entrar con el usuario. La app la lee con historial().
-- Esta parte se agregó después: si la base ya estaba armada, se puede volver a pegar todo el archivo.

alter table public.cuenta add column if not exists clave_central text unique;  -- la carga supabase/cargar-central.sql

create table if not exists public.lecturas (
  usuario uuid not null references auth.users on delete cascade,
  momento timestamptz not null default now(),
  temp real                                    -- °C
);
create index if not exists lecturas_usuario_momento on public.lecturas (usuario, momento);

-- El usuario solo lee sus lecturas. Nadie escribe directo: solo registrar_lectura.
alter table public.lecturas enable row level security;
drop policy if exists "cada usuario, sus lecturas" on public.lecturas;
create policy "cada usuario, sus lecturas" on public.lecturas
  for select to authenticated
  using (usuario = (select auth.uid()));

-- La llama la central. Con una clave que no es la de ninguna cuenta, no guarda nada.
create or replace function public.registrar_lectura(clave text, temp real)
returns void language sql security definer set search_path = '' as $$
  insert into public.lecturas (usuario, temp)
  select usuario, temp from public.cuenta
  where clave_central = clave and length(clave) >= 20 and temp between -10 and 60;
$$;
revoke all on function public.registrar_lectura(text, real) from public;
grant execute on function public.registrar_lectura(text, real) to anon, authenticated;

-- Promedio, mínimo y máximo en hora de España:
--   dia: últimas 24 h por hora · semana: 7 días por día · mes: 30 días por día · ano: 12 meses por mes
create or replace function public.historial(periodo text)
returns table (momento timestamptz, promedio real, minimo real, maximo real)
language sql stable security invoker set search_path = '' as $$
  with p as (
    select case periodo when 'dia' then 'hour' when 'ano' then 'month' else 'day' end as paso,
           now() - case periodo when 'dia' then interval '24 hours' when 'semana' then interval '7 days'
                                when 'mes' then interval '30 days' else interval '12 months' end as desde
  )
  select date_trunc(p.paso, l.momento at time zone 'Europe/Madrid') at time zone 'Europe/Madrid',
         avg(l.temp)::real, min(l.temp), max(l.temp)
  from public.lecturas l, p
  where l.momento >= p.desde and l.temp is not null
  group by 1 order by 1;
$$;
revoke all on function public.historial(text) from public;
grant execute on function public.historial(text) to authenticated;
