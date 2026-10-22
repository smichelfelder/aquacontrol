-- Carga (o cambia) la clave con la que la central sube las lecturas al historial.
-- Tiene que ser la misma que supabase_clave_central en firmware/secrets.yaml.
--
-- Copiá esto en Supabase → SQL Editor, reemplazá los dos valores entre <> y apretá Run.
-- La clave: al menos 20 caracteres al azar (por ejemplo, de un generador de contraseñas, sin comillas).
-- No guardes los valores reales en este archivo: se sube a GitHub.

update public.cuenta set clave_central = '<clave larga de la central>'
where usuario = (select id from auth.users where email = '<tu email de AquaControl>');

-- Para comprobarlo, después de flashear la central: a los 5 minutos tiene que aparecer una lectura.
select momento, temp from public.lecturas order by momento desc limit 5;
