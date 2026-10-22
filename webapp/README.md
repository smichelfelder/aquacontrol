# AquaControl · app nueva

La app de tablet y móvil reescrita en **Vite + React + TypeScript + Tailwind + shadcn/ui**. Va a reemplazar a la que hoy arma `app/build_app.py` a partir del diseño. Mientras dure la migración, la app publicada sigue siendo la de `web/`.

## Uso

Desde esta carpeta (`webapp/`):

```powershell
npm install       # la primera vez
npm run dev       # http://localhost:5173, con datos de ejemplo
npm run build     # deja la app en dist/
```

En `npm run dev` la app arranca en modo **demo**, con valores de ejemplo, porque no hay ninguna central en `localhost`. Para probar otros modos:

- `?nube`: se conecta a EMQX Cloud y pide servidor, usuario y contraseña.
- `?local`: lee `/events` como si la sirviera la central.

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
- PWA: manifest y service worker (`vite-plugin-pwa`).
- Publicar en Vercel desde `webapp/dist` en lugar de `web/`.
- Decidir qué versión sirve la central en `http://aquacontrol.local`.
