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

`vite-plugin-pwa` arma el manifest y el service worker (configurados en `vite.config.ts`). El service worker guarda la app en el dispositivo para que abra sin internet y se actualiza solo: la versión nueva entra la próxima vez que se abre la app. Nunca guarda los datos de la central (`/events` y los botones). Los íconos están en `public/` y son los mismos de `app/icons/`.

El service worker solo funciona en `https` o en `localhost`. Por eso no corre en la versión que sirve la central (`http://aquacontrol.local`).

## Publicación en Vercel

`vercel.json` (en esta carpeta) ya está listo: build de Vite, `dist/` como salida, sin caché para `sw.js` y el manifest, y caché larga para `assets/`. Además, Vercel no vuelve a compilar si un `git push` no cambia nada de `webapp/`.

Hoy el proyecto de Vercel publica `web/` (la app anterior) según el `vercel.json` de la raíz. Para pasar a la app nueva:

1. **Mientras se migra: un proyecto de prueba.** En Vercel → *Add New → Project* → importar este repo → *Root Directory*: `webapp`. Vercel detecta Vite y lee este `vercel.json`. Queda en otra dirección (por ejemplo `aquacontrol-nueva.vercel.app`), con los datos del dispositivo por separado.
2. **Cuando estén todas las pantallas: el cambio.** En el proyecto actual → *Settings → Build and Deployment → Root Directory*: `webapp`. La dirección sigue siendo la misma, así que no se pierde nada de lo guardado en cada dispositivo, y el `sw.js` nuevo reemplaza solo al anterior. Después se pueden borrar `web/`, `app/` y el `vercel.json` de la raíz.

## Estructura

| Archivo | Qué hay |
|---|---|
| `src/App.tsx` | Marco de la app: secciones (abajo en el móvil, a la izquierda en la tablet) y encabezado. |
| `src/pantallas/` | Una pantalla por sección. Por ahora están `Inicio` e `Ingreso` (los datos de EMQX). |
| `src/lib/central.ts` | Conexión con la central: SSE en casa, MQTT en la nube y demo. Reemplaza a `app/puente.js`. |
| `src/lib/guardado.ts` | Lo que se carga en la app (peces, plantas, plan de abonos, medidas). Queda en cada dispositivo, con la misma clave que la app anterior. |
| `src/lib/acuario.ts` | Cálculos: litros netos, dosis, objetivos según los peces y estado de cada especie. |
| `src/data/` | Biblioteca de peces y plantas, sacada del diseño. |
| `src/components/ui/` | Componentes de shadcn (`npx shadcn@latest add <componente>`). |
| `src/index.css` | Colores y tipografías del diseño, puestos como variables de Tailwind y de shadcn. |

## Pendiente

- Pantallas: Mis peces, Mis plantas, Abonos y Mi acuario, con las fotos de los peces.
- Crear el proyecto de prueba en Vercel y, al terminar, hacer el cambio (ver «Publicación en Vercel»).
- Decidir qué versión sirve la central en `http://aquacontrol.local`.
