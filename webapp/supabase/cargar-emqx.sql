-- Carga (o cambia) los datos de EMQX Cloud de la cuenta. La app los usa en todos los dispositivos
-- y nunca los pide.
--
-- Copiá esto en Supabase → SQL Editor, reemplazá los cuatro valores entre <> y apretá Run.
-- No guardes los valores reales en este archivo: se sube a GitHub.

insert into public.cuenta (usuario, mqtt)
select id, jsonb_build_object(
  'servidor', '<xxxx.ala.eu-central-1.emqxsl.com>',  -- sin wss:// ni puerto
  'usuario',  '<app>',                               -- el usuario de EMQX para la app
  'clave',    '<contraseña de EMQX>'
)
from auth.users
where email = '<tu email de AquaControl>'
on conflict (usuario) do update set mqtt = excluded.mqtt, actualizado = now();

-- Para comprobarlo: tiene que aparecer una fila con el servidor y el usuario.
select u.email, c.mqtt ->> 'servidor' as servidor, c.mqtt ->> 'usuario' as usuario
from public.cuenta c join auth.users u on u.id = c.usuario;
