# AquaControl

Control del acuario de casa: una central ESP32-S3 con ESPHome mide la temperatura (y, según la etapa, nivel de agua, TDS, pH y batería), avisa por Telegram y maneja el filtro y el comedero. La app para tablet y móvil muestra todo en vivo, en casa y fuera de casa.

El armado completo, etapa por etapa, está en [docs/AquaControl_Manual_de_armado_por_etapas.pdf](docs/AquaControl_Manual_de_armado_por_etapas.pdf).

## Cómo funciona

```
                    ┌──────────────► Telegram ──────────► avisos al móvil
                    │
 Central ESP32 ─────┼──► EMQX Cloud (MQTT) ◄──────────── app instalada (Vercel)
 (firmware/)        │                                     en casa o fuera de casa
                    │
                    └──► http://aquacontrol.local ◄────── app servida por la central
                                                          solo en el WiFi de casa
```

- **Telegram** funciona desde cualquier lado: la central manda los avisos hacia afuera.
- **La app en Vercel** lee los datos de EMQX Cloud, donde la central los publica, y deja ahí las órdenes («Alimentar», «Filtro»). Se instala como app, con ícono y en pantalla completa.
- **La app en la central** es la misma, servida por la propia ESP32 en `http://aquacontrol.local`. Funciona aunque se caiga internet, pero solo dentro de casa.

## Estructura

| Carpeta | Qué hay |
|---|---|
| `firmware/` | El programa de la central (`aquacontrol.yaml`) y el modelo de claves (`secrets.example.yaml`). |
| `app/` | Lo que arma la app: `build_app.py`, `puente.js` (la conexión con la central), `mqtt.min.js` y los íconos. |
| `diseno/` | El diseño de las pantallas (`Pantallas AquaControl.html`) y las fotos de los peces. |
| `web/` | La app ya armada. **No se edita a mano:** la genera `build_app.py`. Es lo que publica Vercel. |
| `docs/` | El manual de armado por etapas. |

## Puesta en marcha

### 1. Herramientas (una sola vez)

- Python 3.12 con `pip install esphome pillow` (el manual, etapa 0, explica la instalación).
- Una cuenta gratuita de [EMQX Cloud](https://www.emqx.com/en/cloud) con un deployment **Serverless** y dos usuarios en *Access Control → Authentication*: `central` (para la central) y `app` (para el móvil y la tablet).

### 2. Claves

Copiá `firmware/secrets.example.yaml` como `firmware/secrets.yaml` y completá tus valores. Ese archivo nunca se sube a GitHub.

### 3. Armar la app y cargar la central

Desde la raíz del repo:

```powershell
python app/build_app.py
cd firmware
esphome run aquacontrol.yaml
```

La primera vez elegí el puerto **COM** (por cable). Las siguientes, **Over The Air** (por WiFi). En el registro tienen que aparecer `WiFi Connected` y una línea de `mqtt` con `Connected`.

### 4. Instalar la app

Abrí la dirección de Vercel en Chrome del móvil o la tablet → menú ⋮ → **Instalar app**. La primera vez pide el servidor de EMQX, el usuario `app` y su contraseña.

## Cómo se actualiza

| Si cambiás… | Hacé |
|---|---|
| El diseño (`diseno/`) o `app/puente.js` | `python app/build_app.py`, después `esphome run` desde `firmware/` y `git push` (Vercel publica solo). |
| El programa de la central (`firmware/aquacontrol.yaml`) | `esphome run aquacontrol.yaml` desde `firmware/`. Si agregaste sondas o botones, la app los detecta sola. |
| El ícono (`web/icon.svg` lo arma `build_app.py` desde el diseño) | Volvé a dibujar `app/icons/icon-192.png` e `icon-512.png` desde ese SVG. |

Al pasar de etapa, el programa de cada etapa está en el anexo del manual. Ojo: hay que conservar los bloques `web_server` (con `js_include`) y `mqtt` de `firmware/aquacontrol.yaml`, que no están en el manual.

## Qué se ve en la app según la etapa

| Etapa | En la app |
|---|---|
| 1 · Temperatura | Temperatura en vivo, cada 60 s. El resto muestra «—». |
| 2 · Nivel de agua | Nivel: Normal, Bajo o Crítico. |
| 3 · TDS | TDS en ppm, cada 10 min. |
| 4 · pH | pH, cada 10 min. |
| 5 · Filtro y comida | Se activan «Alimentar» y «Filtro». Para apagar el filtro desde la app hace falta un botón `Filtro: apagar` en el programa. |
| 6 · Montaje definitivo | Batería y corte de luz. |

Las fichas de peces y plantas («Bien» / «Revisar») se calculan con los valores reales de las sondas. Los peces, plantas, abonos y medidas del acuario que cargás en la app se guardan en cada dispositivo por separado.

## Problemas frecuentes

- **`No such file or directory: 'aquacontrol.yaml'`:** la terminal no está en la carpeta. Primero `cd` a `firmware/`.
- **VS Code subraya `!secret` o `!lambda` en rojo:** es un falso error del editor. Para quitarlo, en la configuración de usuario: `"yaml.customTags": ["!secret scalar", "!lambda scalar"]`.
- **La app dice «sin conexión»:** la central no está publicando. Revisá que esté encendida y con WiFi, y en EMQX que haya una sesión conectada.
- **Usuario o contraseña incorrectos en la app:** la vuelve a pedir sola. Revisá el usuario `app` en EMQX.
- **El antivirus (Avast) y los certificados:** Avast intercepta las conexiones seguras del ordenador, así que `openssl` desde la PC no muestra el certificado real de EMQX. A la central no le afecta.
- **La ruta del proyecto tiene una coma (`PROYECTOS, S.L`):** por eso `aquacontrol.yaml` compila en `C:/esphome-build` (`build_path`). No lo quites.

## Seguridad

- `secrets.yaml` está en `.gitignore`: las claves no se suben nunca.
- La app no guarda ninguna clave en el código: el usuario y la contraseña de EMQX se ingresan en cada dispositivo y quedan solo ahí.
- La página de la central (`aquacontrol.local`) no tiene contraseña: no abras puertos del router hacia ella.
