"""Arma la app de AquaControl (tablet y móvil) a partir del diseño.

Lee «Pantallas AquaControl.html», toma las pantallas «Tablet Android 10"» y
«Móvil Android», les cambia los valores simulados por los de la central y
genera dos salidas:
  - firmware/aquacontrol_app.js: la app que sirve la central en casa (js_include).
  - web/: la app instalable que publica Vercel.

Uso, desde la raíz del repo:
    python app/build_app.py
"""

import base64
import gzip
import hashlib
import io
import json
import re
import shutil
import sys
from pathlib import Path

from PIL import Image

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parent
DISENO = RAIZ / "diseno" / "Pantallas AquaControl.html"
FOTOS_DIR = RAIZ / "diseno" / "fotos-peces"
SALIDA = RAIZ / "firmware" / "aquacontrol_app.js"
WEB = RAIZ / "web"  # versión instalable que publica Vercel
PUENTE = AQUI / "puente.js"
ICONOS = AQUI / "icons"  # PNG dibujados desde web/icon.svg (ver README)

PANTALLAS = {"tablet": 'Tablet Android 10"', "movil": "Móvil Android"}
FOTO_ANCHO = 320  # px: alcanza para las miniaturas y el detalle


def bloque(html, tipo):
    m = re.search(r'<script type="__bundler/' + tipo + r'">\s*(.*?)\s*</script>', html, re.S)
    if not m:
        raise SystemExit(f"No encontré el bloque {tipo} en el diseño")
    return json.loads(m.group(1))


def recursos(html):
    out = {}
    for uuid, r in bloque(html, "manifest").items():
        datos = base64.b64decode(r["data"])
        if r.get("compressed"):
            datos = gzip.decompress(datos)
        out[uuid] = (r["mime"], datos)
    return out


def reemplazar(texto, viejo, nuevo, veces=1):
    n = texto.count(viejo)
    if n != veces:
        raise SystemExit(f"Esperaba {veces} vez/veces «{viejo[:60]}» y aparece {n}. ¿Cambió el diseño?")
    return texto.replace(viejo, nuevo)


def regex(texto, patron, nuevo, minimo=1):
    texto, n = re.subn(patron, nuevo, texto)
    if n < minimo:
        raise SystemExit(f"El patrón «{patron}» no encontró nada. ¿Cambió el diseño?")
    return texto


def adaptar_logica(t):
    """Cambia los valores simulados del diseño por los de la central."""
    # Estado guardado en el dispositivo y aviso de datos nuevos de la central
    t = reemplazar(t, "      largo: '121', ancho: '41', alto: '55'\n    };\n",
                   "      largo: '121', ancho: '41', alto: '55'\n    };\n"
                   "    Object.assign(this.state, window.AQ.cargar());\n")
    t = reemplazar(t, "  lib() {",
                   "  componentDidMount() { this._off = window.AQ.subscribe(() => this.setState({ _aq: Date.now() })); }\n"
                   "  componentWillUnmount() { if (this._off) this._off(); }\n"
                   "  lib() {")

    # Sondas: valores reales; null si la sonda todavía no está conectada
    t = reemplazar(t, "const t = this.props.tempActual ?? 25.4;", "const aq = window.AQ.v;\n    const t = aq.temp;")
    t = reemplazar(t, "const ph = this.props.phActual ?? 6.8;", "const ph = aq.ph;")
    t = reemplazar(t, "const tds = this.props.tdsActual ?? 180;", "const tds = aq.tds;\n    window.AQ.guardar(this.state);")
    t = reemplazar(t, "const fmt = (v, d) => v.toFixed(d)", "const fmt = (v, d) => v == null ? '—' : v.toFixed(d)")
    # Sin dato no se marca nada como fuera de rango
    t = reemplazar(t, "const inR = (v, r) => v >= r[0] && v <= r[1];",
                   "const inR = (v, r) => v == null || (v >= r[0] && v <= r[1]);")
    t = regex(t, r"if \((t|ph|tds) < ([\w.\[\]]+) \|\| \1 > ([\w.\[\]]+)\) ",
              r"if (\1 != null && (\1 < \2 || \1 > \3)) ", minimo=5)
    t = regex(t, r"(?<![\w.])(t|ph|tds) >= ([\w.\[\]]+) && \1 <= ([\w.\[\]]+)",
              r"(\1 == null || (\1 >= \2 && \1 <= \3))", minimo=8)
    t = reemplazar(t, "ok: v >= lo && v <= hi", "ok: v == null || (v >= lo && v <= hi)")
    t = reemplazar(t, "tdsTxt: String(Math.round(tds))", "tdsTxt: tds == null ? '—' : String(Math.round(tds))")
    t = regex(t, r"Math\.round\(tds\) \+ ' ppm'", "(tds == null ? '—' : Math.round(tds)) + ' ppm'", minimo=1)

    # Fecha y hora reales
    t = reemplazar(t, "const hoyIdx = Math.max(0, nombresDia.indexOf(this.props.dia ?? 'lunes'));",
                   "const ahora = new Date();\n"
                   "    const hoyIdx = (ahora.getDay() + 6) % 7;\n"
                   "    const dos = (n) => String(n).padStart(2, '0');\n"
                   "    const horaTxt = dos(ahora.getHours()) + ':' + dos(ahora.getMinutes());\n"
                   "    const hoyISO = ahora.getFullYear() + '-' + dos(ahora.getMonth() + 1) + '-' + dos(ahora.getDate());\n"
                   "    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];\n"
                   "    const abonoHoy = typeof st.abono === 'string' && st.abono.slice(0, 10) === hoyISO;\n"
                   "    const comidaOn = typeof st.comida === 'number' && Date.now() - st.comida < 10 * 60 * 1000;\n"
                   "    const horasComida = [9, 19];  // igual que hours: en aquacontrol.yaml\n"
                   "    const proxima = horasComida.find((h) => h > ahora.getHours()) ?? horasComida[0];\n"
                   "    const hayComedero = window.AQ.tiene('button/Alimentar');\n"
                   "    const hayFiltro = window.AQ.tiene('button/Filtro: encender');\n"
                   "    const filtroOn = hayFiltro && !comidaOn && st.filtro;")
    t = reemplazar(t, "fechaTxt: nombreDia + ', ' + (19 + hoyIdx) + ' de octubre',",
                   "fechaTxt: nombreDia + ', ' + ahora.getDate() + ' de ' + meses[ahora.getMonth()],")
    t = reemplazar(t, "hora: '17:19',", "hora: horaTxt,\n      abonoHora: abonoHoy ? st.abono.slice(11) : '',\n"
                   "      wifiOp: window.AQ.conectado ? 1 : 0.3,\n"
                   "      actualizado: window.AQ.conectado ? 'en vivo' : 'sin conexión',")
    # Sin dato, el valor va en gris y no en naranja de alerta
    for k, v in (("tCol", "t"), ("phCol", "ph"), ("tdsCol", "tds")):
        r = {"t": "rT", "ph": "rP", "tds": "rD"}[v]
        t = reemplazar(t, f"{k}: {r}.ok ?", f"{k}: {v} == null || {r}.ok ?")
    t = reemplazar(t, "abonoPendiente: hayAbono && !st.abono,", "abonoPendiente: hayAbono && !abonoHoy,")
    t = reemplazar(t, "abonoHecho: hayAbono && st.abono,", "abonoHecho: hayAbono && abonoHoy,")
    t = reemplazar(t, "marcarAbono: () => this.setState({ abono: !st.abono }),",
                   "marcarAbono: () => this.setState({ abono: abonoHoy ? '' : hoyISO + ' ' + horaTxt }),")

    # Nivel de agua según los dos sensores
    t = reemplazar(t, "    return {\n      accent: accent,",
                   "    const nb = aq.nivelBajo, nc = aq.nivelCritico;\n"
                   "    const nivel = nb == null && nc == null ? ['—', 'Sensores sin conectar', '#93aea8']\n"
                   "      : nc === false ? ['Crítico', 'Bajó 5 cm: revisá si hay una pérdida', red]\n"
                   "      : nb === false ? ['Bajo', 'Bajó 2 cm: reponé agua', amber]\n"
                   "      : ['Normal', 'Ambos sensores con agua', accent];\n"
                   "    return {\n      accent: accent,\n"
                   "      nivelTxt: nivel[0], nivelSub: nivel[1], nivelCol: nivel[2],")

    # Comida y filtro: botones de la central
    t = reemplazar(t, "alimTitulo: st.comida ?", "alimTitulo: comidaOn ?")
    t = reemplazar(t, "alimSub: st.comida ? 'Filtro en pausa 10 min' : 'Próxima toma: 20:00',",
                   "alimSub: !hayComedero ? 'Se activa en la etapa 5' : (comidaOn ? 'Filtro en pausa 10 min' : 'Próxima toma: ' + proxima + ':00'),")
    t = reemplazar(t, "alimentar: () => this.setState({ comida: true, filtro: false }),",
                   "alimentar: () => { if (!hayComedero || comidaOn) return; window.AQ.press('button/Alimentar'); this.setState({ comida: Date.now(), filtro: true }); },")
    t = reemplazar(t, "filtroSub: st.filtro ? 'Encendido' : (st.comida ? 'En pausa · vuelve solo' : 'Apagado'),",
                   "filtroSub: !hayFiltro ? 'Se activa en la etapa 5' : (filtroOn ? 'Encendido' : (comidaOn ? 'En pausa · vuelve solo' : 'Apagado')),")
    t = reemplazar(t, "toggleFiltro: () => this.setState({ filtro: !st.filtro, comida: false }),",
                   "toggleFiltro: () => { if (!hayFiltro) return; window.AQ.press(filtroOn ? 'button/Filtro: apagar' : 'button/Filtro: encender'); this.setState({ filtro: !filtroOn, comida: 0 }); },")
    t = reemplazar(t, "switchBg: st.filtro ?", "switchBg: filtroOn ?")
    t = reemplazar(t, "switchLeft: st.filtro ?", "switchLeft: filtroOn ?")

    # Fotos de los peces: miniaturas incluidas en la app
    t = regex(t, r"(\w+): '/_blob/[0-9a-f]+'", r"\1: (window.AQ_FOTOS['\1'] || '')", minimo=10)
    return t


def adaptar_plantilla(html):
    html = reemplazar(html, "<span>17:19</span>", "<span>{{hora}}</span>")
    html = reemplazar(html, 'fill="#e8f1ef"><path d="M12 20l-11-12a16 16 0 0 1 22 0z">',
                      'fill="#e8f1ef" style="opacity: {{wifiOp}}"><path d="M12 20l-11-12a16 16 0 0 1 22 0z">')
    html = reemplazar(html, "✓ Hecho a las 17:19", "✓ Hecho a las {{abonoHora}}")
    html = regex(html, r'(color: )\{\{accent\}\}(">)Normal(</div>)', r"\1{{nivelCol}}\2{{nivelTxt}}\3")
    html = reemplazar(html, ">Ambos sensores con agua<", ">{{nivelSub}}<")
    html = html.replace(">hace 2 min<", ">{{actualizado}}<")  # solo en el móvil
    return html


def pantalla(exterior, titulo):
    plantilla = bloque(exterior, "template")
    m = re.search(r'<h2>' + re.escape(titulo) + r'[^<]*</h2><iframe src="about:blank#([0-9a-f-]{36})', plantilla)
    if not m:
        raise SystemExit(f"No encontré la pantalla «{titulo}» en el diseño")
    mime, pagina = recursos(exterior)[m.group(1)]
    pagina = pagina.decode("utf-8")
    res = recursos(pagina)
    externos = {e["uuid"]: e["id"] for e in bloque(pagina, "ext_resources")}
    html = bloque(pagina, "template")

    scripts = {}
    for uuid, (mime, datos) in res.items():
        if mime.startswith("font/"):
            uri = f"data:{mime};base64," + base64.b64encode(datos).decode()
            html = html.replace(uuid, uri)
        elif "javascript" in mime:
            scripts[externos.get(uuid, "runtime")] = datos.decode("utf-8")
            html = html.replace(f'<script src="{uuid}"></script>', "")
    if "runtime" not in scripts:
        raise SystemExit("No encontré el motor de la pantalla (dc-runtime)")

    a = html.index('<script type="text/x-dc"')
    a = html.index(">", a) + 1
    b = html.index("</script>", a)
    html = html[:a] + adaptar_logica(html[a:b]) + html[b:]
    return adaptar_plantilla(html), scripts


def fotos():
    out = {}
    for f in sorted(FOTOS_DIR.glob("f-*.*")):
        img = Image.open(f).convert("RGB")
        img.thumbnail((FOTO_ANCHO, FOTO_ANCHO))
        buf = io.BytesIO()
        img.save(buf, "WEBP", quality=72, method=6)
        out[f.stem[2:]] = "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode()
    return out


def icono_svg(exterior):
    """El ícono de app del diseño (página «Logo AquaControl»): la gota sobre el cuadrado oscuro."""
    plantilla = bloque(exterior, "template")
    m = re.search(r'<h2>Logo AquaControl</h2><iframe src="about:blank#([0-9a-f-]{36})', plantilla)
    if not m:
        raise SystemExit("No encontré la página «Logo AquaControl» en el diseño")
    pagina = recursos(exterior)[m.group(1)][1].decode("utf-8")
    html = bloque(pagina, "template")
    gota = re.search(r'<svg role="img" aria-label="Icono de AquaControl".*?</svg>', html, re.S)
    if not gota:
        raise SystemExit("No encontré el ícono de app en «Logo AquaControl»")
    g = gota.group(0).replace("{{accent}}", "#7fd6b4").replace("sc-camel-view-box", "viewBox")
    g = re.sub(r'<svg [^>]*>', "", g, count=1).replace("</svg>", "")
    # 512×512: fondo #0b1d20 a sangre (Android lo recorta con su forma) y la gota al 64 %, como en el diseño
    return ('<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 48 48">'
            '<rect width="48" height="48" fill="#0b1d20"/>'
            '<g transform="translate(24 24) scale(0.64) translate(-24 -24)">' + g + '</g></svg>')


def web(js, exterior):
    """La versión instalable (https): la publica Vercel tal cual (vercel.json)."""
    WEB.mkdir(exist_ok=True)
    (WEB / "app.js").write_text(js, encoding="utf-8")
    (WEB / "icon.svg").write_text(icono_svg(exterior), encoding="utf-8")
    version = hashlib.sha256(js.encode("utf-8")).hexdigest()[:10]
    (WEB / "index.html").write_text(
        '<!DOCTYPE html>\n<html lang="es"><head><meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        '<title>AquaControl</title>\n<meta name="theme-color" content="#0b1d20">\n'
        '<link rel="manifest" href="manifest.webmanifest">\n'
        '<link rel="icon" type="image/svg+xml" href="icon.svg">\n'
        '<link rel="apple-touch-icon" href="icon-192.png">\n'
        '<style>html,body{margin:0;background:#0b1d20}</style>\n'
        '<script src="mqtt.min.js"></script>\n'
        '</head><body>\n'
        f'<script src="app.js?v={version}"></script>\n'
        '</body></html>\n', encoding="utf-8")
    (WEB / "manifest.webmanifest").write_text(json.dumps({
        "name": "AquaControl", "short_name": "AquaControl",
        "description": "El acuario de casa: sondas, peces, plantas y abonos.",
        "start_url": "./", "scope": "./", "display": "fullscreen", "orientation": "any",
        "background_color": "#0b1d20", "theme_color": "#0b1d20", "lang": "es",
        "icons": [
            {"src": "icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"},
            {"src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},
            {"src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
        ],
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    # Primero la red (para que los cambios lleguen) y, sin conexión, lo guardado
    (WEB / "sw.js").write_text(
        f"const CACHE = 'aquacontrol-{version}';\n"
        "self.addEventListener('install', (e) => { self.skipWaiting(); });\n"
        "self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())));\n"
        "self.addEventListener('fetch', (e) => {\n"
        "  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;\n"
        "  e.respondWith(fetch(e.request).then((r) => { const c = r.clone(); caches.open(CACHE).then((k) => k.put(e.request, c)); return r; })\n"
        "    .catch(() => caches.match(e.request, { ignoreSearch: true })));\n"
        "});\n", encoding="utf-8")
    for origen in (AQUI / "mqtt.min.js", ICONOS / "icon-192.png", ICONOS / "icon-512.png"):
        if not origen.exists():
            raise SystemExit(f"Falta {origen.relative_to(RAIZ)}")
        shutil.copyfile(origen, WEB / origen.name)


def main():
    exterior = DISENO.read_text(encoding="utf-8")
    layouts, scripts = {}, {}
    for clave, titulo in PANTALLAS.items():
        layouts[clave], s = pantalla(exterior, titulo)
        scripts.update(s)
    datos = {
        "layouts": layouts,
        "runtime": scripts.pop("runtime"),
        "libs": scripts,  # React y ReactDOM, por la URL que pide el motor
        "fotos": fotos(),
    }
    js = "window.AQ_DATOS = " + json.dumps(datos, ensure_ascii=False) + ";\n" + PUENTE.read_text(encoding="utf-8")
    SALIDA.write_text(js, encoding="utf-8")
    web(js, exterior)
    kb = len(js.encode("utf-8")) / 1024
    gz = len(gzip.compress(js.encode("utf-8"))) / 1024
    print(f"Listo: {SALIDA.name} ({kb:.0f} KB, {gz:.0f} KB comprimido en la central)")


if __name__ == "__main__":
    sys.exit(main())
