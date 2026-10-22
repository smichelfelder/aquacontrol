// Conexión con la central (ESPHome). Reemplaza a app/puente.js.
//
// Tres formas de conectarse:
//  - local: la página la sirve la central (http://aquacontrol.local); lee /events.
//  - nube: página https (Vercel); MQTT contra EMQX Cloud, donde publica la central.
//  - demo: valores de ejemplo, para desarrollar sin la central (?demo, y por defecto en `npm run dev`).
import { useSyncExternalStore } from 'react'
import type { MqttClient } from 'mqtt'

export interface Sondas {
  temp: number | null
  ph: number | null
  tds: number | null
  bateria: number | null
  nivelBajo: boolean | null      // true = hay agua en el sensor
  nivelCritico: boolean | null
  corriente: boolean | null
}

export interface Credenciales { servidor: string; usuario: string; clave: string }

export interface EstadoCentral {
  modo: 'local' | 'nube' | 'demo'
  sondas: Sondas
  conectado: boolean
  vistos: ReadonlySet<string>    // sondas y botones que anunció la central ('button/Alimentar')
  pideClave: string | null       // null: no hace falta; '' o un mensaje: mostrar la pantalla de ingreso
}

// Nombre de cada entidad en aquacontrol.yaml → clave de Sondas
const MAPA: Record<string, keyof Sondas> = {
  'sensor/Temperatura': 'temp',
  'sensor/pH': 'ph',
  'sensor/TDS': 'tds',
  'sensor/Batería': 'bateria',
  'binary_sensor/Agua en nivel bajo': 'nivelBajo',
  'binary_sensor/Agua en nivel crítico': 'nivelCritico',
  'binary_sensor/Corriente de red': 'corriente',
}

const CLAVE_MQTT = 'aquacontrol.mqtt'
const SIN_DATOS: Sondas = { temp: null, ph: null, tds: null, bateria: null, nivelBajo: null, nivelCritico: null, corriente: null }

function elegirModo(): EstadoCentral['modo'] {
  const q = new URLSearchParams(location.search)
  if (q.has('demo')) return 'demo'
  if (q.has('nube') || location.protocol === 'https:') return 'nube'
  if (q.has('local')) return 'local'
  return import.meta.env.DEV ? 'demo' : 'local'
}

let estado: EstadoCentral = { modo: elegirModo(), sondas: SIN_DATOS, conectado: false, vistos: new Set(), pideClave: null }
const subs = new Set<() => void>()
const avisar = (cambio: Partial<EstadoCentral>) => {
  estado = { ...estado, ...cambio }
  subs.forEach((f) => f())
}

let ultimo = 0  // cuándo llegó el último dato de la central
let enviar: (id: string) => Promise<boolean> = () => Promise.resolve(false)

function visto(id: string) {
  if (estado.vistos.has(id)) return
  avisar({ vistos: new Set(estado.vistos).add(id) })
}

function poner(id: string, valor: unknown) {
  ultimo = Date.now()
  visto(id)
  const k = MAPA[id]
  if (!k) return
  const v = typeof valor === 'number' && !isFinite(valor) ? null : valor
  avisar({ sondas: { ...estado.sondas, [k]: v ?? null } })
}

/* ---------- En casa: eventos de la central ---------- */
function conectarLocal() {
  const es = new EventSource('/events')
  es.addEventListener('state', (e) => {
    let d: { id?: string; value?: unknown }
    try { d = JSON.parse((e as MessageEvent).data) } catch { return }
    if (d?.id) { poner(d.id, d.value); avisar({ conectado: true }) }
  })
  // La central manda un «ping» cada pocos segundos: si dejan de llegar, no hay conexión
  es.addEventListener('ping', () => { ultimo = Date.now() })
  es.onopen = () => { ultimo = Date.now() }
  enviar = (id) => {
    const url = '/' + id.split('/').map(encodeURIComponent).join('/') + '/press'
    return fetch(url, { method: 'POST' }).then((r) => r.ok).catch(() => false)
  }
  setInterval(() => {
    const vivo = Date.now() - ultimo < 60000
    if (vivo !== estado.conectado) avisar({ conectado: vivo })
  }, 5000)
}

/* ---------- Fuera de casa: MQTT ---------- */
// La central anuncia cada sonda y botón en homeassistant/…/config (discovery) con su tema
// de estado y de orden; así no hay que repetir nombres acá.
async function conectarNube(cfg: Credenciales) {
  const { default: mqtt } = await import('mqtt')
  const temas: Record<string, string> = {}    // tema de estado → id
  const ordenes: Record<string, string> = {}  // id → tema de orden
  let enLinea = false                          // la central dice «online»
  // Puerto de MQTT por websocket seguro: HiveMQ Cloud usa 8884; EMQX y el resto, 8084
  const puerto = /hivemq\.(cloud|com)$/.test(cfg.servidor) ? 8884 : 8084
  const cli: MqttClient = mqtt.connect(`wss://${cfg.servidor}:${puerto}/mqtt`, {
    username: cfg.usuario, password: cfg.clave,
    clientId: 'app-' + Math.random().toString(16).slice(2, 10),
    reconnectPeriod: 5000, connectTimeout: 15000,
  })
  const revisar = () => avisar({ conectado: cli.connected && enLinea })
  cli.on('connect', () => {
    cli.subscribe(['homeassistant/+/aquacontrol/+/config', 'aquacontrol/status'])
    revisar()
  })
  cli.on('close', revisar)
  cli.on('error', (err) => {
    // 4/5 (MQTT 3) o 134/135 (MQTT 5): usuario o contraseña incorrectos
    const code = (err as { code?: number }).code
    if (code != null && [4, 5, 134, 135].includes(code)) {
      cli.end(true)
      olvidarClave()
      avisar({ pideClave: 'Usuario o contraseña incorrectos.' })
    }
  })
  cli.on('message', (tema, buf) => {
    const txt = buf.toString()
    if (tema === 'aquacontrol/status') { enLinea = txt === 'online'; revisar(); return }
    if (tema.endsWith('/config')) {
      let c: Record<string, string>
      try { c = JSON.parse(txt) } catch { return }
      const base = c['~'] || ''
      const t = (s?: string) => (s && s.startsWith('~') ? base + s.slice(1) : s)
      const id = tema.split('/')[1] + '/' + (c.name || c.object_id || '')
      visto(id)
      const st = t(c.stat_t || c.state_topic)
      const cmd = t(c.cmd_t || c.command_topic)
      if (cmd) ordenes[id] = cmd
      if (st && !temas[st]) { temas[st] = id; cli.subscribe(st) }
      return
    }
    const id = temas[tema]
    if (!id) return
    if (txt === 'ON' || txt === 'OFF') poner(id, txt === 'ON')
    else { const n = parseFloat(txt); poner(id, isFinite(n) ? n : null) }
  })
  enviar = (id) => {
    if (!ordenes[id] || !cli.connected) return Promise.resolve(false)
    cli.publish(ordenes[id], 'PRESS')
    return Promise.resolve(true)
  }
}

/* ---------- Demo ---------- */
function conectarDemo() {
  ;['button/Alimentar', 'button/Filtro: encender', 'button/Filtro: apagar'].forEach(visto)
  avisar({
    conectado: true,
    sondas: { temp: 25.4, ph: 6.8, tds: 180, bateria: 100, nivelBajo: true, nivelCritico: true, corriente: true },
  })
  enviar = () => Promise.resolve(true)
}

/* ---------- Credenciales de MQTT ---------- */
function leerClave(): Partial<Credenciales> {
  try { return JSON.parse(localStorage.getItem(CLAVE_MQTT) || 'null') ?? {} } catch { return {} }
}
function olvidarClave() {
  const { clave: _, ...resto } = leerClave()
  try { localStorage.setItem(CLAVE_MQTT, JSON.stringify(resto)) } catch { /* sin almacenamiento */ }
}
export const credencialesGuardadas = leerClave

export function ingresar(c: Credenciales) {
  // Acepta lo que se pegue de la consola de EMQX: sin protocolo ni puerto
  const servidor = c.servidor.trim().replace(/^[a-z]+:\/\//i, '').replace(/[:/].*$/, '')
  const cfg = { servidor, usuario: c.usuario.trim(), clave: c.clave }
  try { localStorage.setItem(CLAVE_MQTT, JSON.stringify(cfg)) } catch { /* sin almacenamiento */ }
  avisar({ pideClave: null })
  conectarNube(cfg)
}

/* ---------- Arranque ---------- */
if (estado.modo === 'demo') conectarDemo()
else if (estado.modo === 'local') conectarLocal()
else {
  const cfg = leerClave()
  if (cfg.servidor && cfg.usuario && cfg.clave) conectarNube(cfg as Credenciales)
  else avisar({ pideClave: '' })
}

export const tiene = (id: string) => estado.vistos.has(id)
export const pulsar = (id: string) => (tiene(id) ? enviar(id) : Promise.resolve(false))

export function useCentral() {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f) }, () => estado)
}
