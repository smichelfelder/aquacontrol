# AquaControl · app nueva

La app de tablet y móvil reescrita en **Vite + React + TypeScript + Tailwind + shadcn/ui**. Va a reemplazar a la que hoy arma `app/build_app.py` a partir del diseño. Mientras dure la migración, la app publicada sigue siendo la de `web/`.

## Uso

Desde esta carpeta (`webapp/`):

```powershell
npm install       # la primera vez
npm run dev       # http://localhost:5173, con datos de ejemplo
npm run build     # deja la app en dist/
npm run preview   # sirve dist/ en http://localhost:4173 (con service worker)
```

En `npm run dev` la app arranca en modo **demo**, con valores de ejemplo, porque no hay ninguna central en `localhost`. Para probar otros modos:

- `?demo`: valores de ejemplo (en `npm run preview` hace falta ponerlo).
- `?nube`: se conecta a EMQX Cloud y pide servidor, usuario y contraseña.
- `?local`: lee `/events` como si la sirviera la central.

## App instalable (PWA)

`vite-plugin-pwa` arma el manifest y el service worker (configurados en `vite.config.ts`). El service worker guarda la app en el dispositivo para que abra sin internet y se actualiza solo: cuando hay una versión nueva publicada (se busca cada vez que se vuelve a la app), la baja y recarga la página con ella. Nunca guarda los datos de la central (`/events` y los botones). Los íconos están en `public/` y son los mismos de `app/icons/`.

El service worker solo funciona en `https` o en `localhost`. Por eso no corre en la versión que sirve la central (`http://aquacontrol.local`).

## Cuenta (Supabase)

Fuera de casa, la app se usa con **un único usuario con contraseña**. Los dispositivos nuevos no se pueden registrar solos: solo entra ese usuario. En la cuenta quedan guardados:

- **Los datos de EMQX:** se cargan una sola vez desde Supabase (paso 6). La app nunca los pide: todos los dispositivos usan siempre los mismos.
- **Peces, plantas, plan de abonos y medidas del acuario:** se ven iguales en todos los dispositivos. Cada cambio se sube enseguida, y al volver a la app se trae lo que se haya cambiado desde otro lado.

Cada dispositivo pide solo el usuario y la contraseña de AquaControl, **una sola vez**, porque la sesión queda abierta. La primera vez que se entra, la cuenta se queda con los peces y plantas que ya había en ese dispositivo.

Las reglas de la tabla hacen que solo ese usuario pueda leer su fila. Si Supabase no responde, la app usa los últimos datos de EMQX que guardó en el dispositivo.

Sin las variables `VITE_SUPABASE_*`, la app funciona como antes: pide los datos de EMQX en cada dispositivo. La versión que sirve la central en casa no usa la cuenta.

### Puesta en marcha (una sola vez)

1. En [supabase.com](https://supabase.com), creá un proyecto gratuito (región *Central EU (Frankfurt)*, cerca de EMQX).
2. En **SQL Editor**, pegá [supabase/esquema.sql](supabase/esquema.sql) y apretá **Run**.
3. En **Authentication → Sign In / Providers**, desactivá *Allow new users to sign up*.
4. En **Authentication → Users → Add user → Create new user**, poné tu email y una contraseña larga que no uses en otro lado, y marcá *Auto Confirm User*.
5. En **Project Settings → API Keys**, copiá la *Project URL* y la *publishable key*:
   - Para desarrollar: copiá `.env.example` como `.env.local` y completalo. `.env.local` no se sube a GitHub.
   - En Vercel: en el proyecto, **Settings → Environment Variables**, cargá `VITE_SUPABASE_URL` y `VITE_SUPABASE_KEY` y volvé a publicar.
6. En **SQL Editor**, pegá [supabase/cargar-emqx.sql](supabase/cargar-emqx.sql), reemplazá los valores entre `<>` (servidor, usuario y contraseña de EMQX, y tu email) y apretá **Run**. Los valores reales ponelos solo en Supabase, no en el archivo. Para cambiar los datos de EMQX más adelante, se repite este paso.

7. **Historial de temperatura:** si la base ya estaba armada, volvé a pegar [supabase/esquema.sql](supabase/esquema.sql) (se puede repetir sin perder nada). Después pegá [supabase/cargar-central.sql](supabase/cargar-central.sql) con una clave larga para la central, y poné esa misma clave en `firmware/secrets.yaml` (`supabase_clave_central`), junto con `supabase_lectura_url` y `supabase_key` (ver `secrets.example.yaml`). Volvé a flashear la central: desde ahí guarda una lectura cada 5 minutos, aunque no haya ninguna app abierta. El historial empieza vacío.

Si la cuenta no tiene los datos de EMQX, o EMQX los rechaza, la app muestra un aviso con **Reintentar** y **Cerrar sesión**, en lugar de pedirlos.

La *publishable key* puede estar en la app: sola no da acceso a nada, porque las reglas de la tabla piden haber entrado con el usuario.

Ojo: Supabase pausa los proyectos gratuitos que pasan una semana sin uso. Si pasa, se reactiva con un clic desde el panel de Supabase; mientras tanto la app sigue conectándose con los datos de EMQX guardados en cada dispositivo.

## Publicación en Vercel

`vercel.json` (en esta carpeta) ya está listo: build de Vite, `dist/` como salida, sin caché para `sw.js` y el manifest, y caché larga para `assets/`. Además, Vercel no vuelve a compilar si un `git push` no cambia nada de `webapp/`.

Hoy el proyecto de Vercel publica `web/` (la app anterior) según el `vercel.json` de la raíz. Para pasar a la app nueva:

1. **Mientras se migra: un proyecto de prueba.** En Vercel → *Add New → Project* → importar este repo → *Root Directory*: `webapp`. Vercel detecta Vite y lee este `vercel.json`. Queda en otra dirección (por ejemplo `aquacontrol-nueva.vercel.app`), con los datos del dispositivo por separado.
2. **Cuando estén todas las pantallas: el cambio.** En el proyecto actual → *Settings → Build and Deployment → Root Directory*: `webapp`. La dirección sigue siendo la misma, así que no se pierde nada de lo guardado en cada dispositivo, y el `sw.js` nuevo reemplaza solo al anterior. Después se pueden borrar `web/`, `app/` y el `vercel.json` de la raíz.

## Estructura

| Archivo | Qué hay |
|---|---|
| `src/App.tsx` | Marco de la app: secciones (abajo en el móvil, a la izquierda en la tablet) y encabezado. |
| `src/pantallas/` | Una pantalla por sección. Por ahora están `Inicio`, `MiAcuario` (medidas, litros, rango de los avisos de temperatura, equipo y abonos) e `Ingreso` (la cuenta, los avisos y, sin cuenta, los datos de EMQX). |
| `src/components/Acuario3D.tsx` | El acuario en 3D a escala, con las medidas en las aristas. Se gira arrastrando. |
| `src/lib/central.ts` | Conexión con la central: SSE en casa, MQTT en la nube y demo. Reemplaza a `app/puente.js`. |
| `src/lib/cuenta.ts` | La cuenta en Supabase: entrar, datos de EMQX y sincronización de lo cargado en la app. |
| `src/lib/guardado.ts` | Lo que se carga en la app (peces, plantas, plan de abonos, medidas). Queda en el dispositivo, con la misma clave que la app anterior, y se sincroniza con la cuenta. |
| `supabase/esquema.sql` | La tabla de la cuenta, la de las lecturas y sus permisos. |
| `supabase/cargar-emqx.sql` | Carga o cambia los datos de EMQX de la cuenta. |
| `supabase/cargar-central.sql` | Carga o cambia la clave con la que la central sube el historial. |
| `src/lib/historial.ts` | Lee el historial de temperatura agrupado (día, semana, mes, año); en demo, datos de ejemplo. |
| `src/components/HistorialTemperatura.tsx` | El gráfico del historial, que se abre al tocar la temperatura en Inicio. |
| `src/lib/acuario.ts` | Cálculos: medidas y litros netos, dosis, equipo, ocupación de peces, objetivos según los peces y estado de cada especie. |
| `src/data/` | Biblioteca de peces y plantas, sacada del diseño. |
| `src/components/ui/` | Componentes de shadcn (`npx shadcn@latest add <componente>`). |
| `src/index.css` | Colores y tipografías del diseño, puestos como variables de Tailwind y de shadcn. |

## Pendiente

- Pantallas: Mis peces, Mis plantas y Abonos, con las fotos de los peces.
- Crear el proyecto de prueba en Vercel y, al terminar, hacer el cambio (ver «Publicación en Vercel»).
- Crear el proyecto de Supabase y el usuario (ver «Cuenta»).
- Decidir qué versión sirve la central en `http://aquacontrol.local`.
