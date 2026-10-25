// Conexión con la central (ESPHome). Reemplaza a app/puente.js.
//
// Tres formas de conectarse:
//  - local: la página la sirve la central (http://aquacontrol.local); lee /events.
//  - nube: página https (Vercel); MQTT contra EMQX Cloud, donde publica la central. Los datos
//    de EMQX salen de la cuenta de AquaControl (lib/cuenta.ts) o, sin cuenta, del dispositivo.
//  - demo: valores de ejemplo, para desarrollar sin la central (?demo, y por defecto en `npm run dev`).
import { useSyncExternalStore } from 'react'
import type { MqttClient } from 'mqtt'
import { abrirCuenta, entrar, hayCuenta, haySesion, salir, type Credenciales } from './cuenta'

export interface Sondas {
  temp: number | null
  ph: number | null
  tds: number | null
  bateria: number | null
  nivelBajo: boolean | null      // true = hay agua en el sensor
  nivelCritico: boolean | null
  corriente: boolean | null
  tempMin: number | null         // avisos por Telegram: los fija «Mi acuario» en la central
  tempMax: number | null
}

export type { Credenciales }

/**
 * Qué pantalla mostrar antes de la app: la cuenta de AquaControl, los datos de EMQX (solo sin
 * cuenta) o un aviso (con cuenta, los datos de EMQX se cargan en Supabase y no en la app).
 */
export type Pide = { que: 'cuenta' | 'mqtt' | 'aviso'; error: string } | null

export interface EstadoCentral {
  modo: 'local' | 'nube' | 'demo'
  sondas: Sondas
  conectado: boolean
  vistos: ReadonlySet<string>    // sondas y botones que anunció la central ('button/Alimentar')
  pide: Pide                     // null: no hace falta ingresar nada
  cargando: boolean              // esperando la cuenta (sesión o datos)
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
  'number/Temperatura mínima': 'tempMin',
  'number/Temperatura máxima': 'tempMax',
}

const CLAVE_MQTT = 'aquacontrol.mqtt'
const SIN_DATOS: Sondas = {
  temp: null, ph: null, tds: null, bateria: null, nivelBajo: null, nivelCritico: null, corriente: null, tempMin: null, tempMax: null,
}

function elegirModo(): EstadoCentral['modo'] {
  const q = new URLSearchParams(location.search)
  if (q.has('demo')) return 'demo'
  if (q.has('nube') || location.protocol === 'https:') return 'nube'
  if (q.has('local')) return 'local'
  return import.meta.env.DEV ? 'demo' : 'local'
}

let estado: EstadoCentral = { modo: elegirModo(), sondas: SIN_DATOS, conectado: false, vistos: new Set(), pide: null, cargando: false }
const subs = new Set<() => void>()
const avisar = (cambio: Partial<EstadoCentral>) => {
  estado = { ...estado, ...cambio }
  subs.forEach((f) => f())
}

let ultimo = 0  // cuándo llegó el último dato de la central
// Botones: sin valor (PRESS). Números (number/…): el valor nuevo.
let enviar: (id: string, valor?: number) => Promise<boolean> = () => Promise.resolve(false)

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
  enviar = (id, valor) => {
    const url = '/' + id.split('/').map(encodeURIComponent).join('/') + (valor == null ? '/press' : '/set?value=' + valor)
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
      avisar({ pide: hayCuenta
        ? { que: 'aviso', error: 'EMQX rechazó el usuario o la contraseña guardados en la cuenta. Corregilos en Supabase.' }
        : { que: 'mqtt', error: 'EMQX rechazó el usuario o la contraseña.' } })
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
  enviar = (id, valor) => {
    if (!ordenes[id] || !cli.connected) return Promise.resolve(false)
    cli.publish(ordenes[id], valor == null ? 'PRESS' : String(valor))
    return Promise.resolve(true)
  }
}

/* ---------- Demo ---------- */
function conectarDemo() {
  ;['button/Alimentar', 'button/Filtro: encender', 'button/Filtro: apagar', 'number/Temperatura mínima', 'number/Temperatura máxima'].forEach(visto)
  avisar({
    conectado: true,
    sondas: { temp: 25.4, ph: 6.8, tds: 180, bateria: 100, nivelBajo: true, nivelCritico: true, corriente: true, tempMin: 24, tempMax: 27 },
  })
  enviar = (id, valor) => {
    // La central de verdad devuelve el valor nuevo como estado: acá se simula con un poco de demora
    if (valor != null) setTimeout(() => poner(id, valor), 300)
    return Promise.resolve(true)
  }
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
const completas = (c: Partial<Credenciales> | null): c is Credenciales => !!(c?.servidor && c.usuario && c.clave)

function usarMqtt(cfg: Credenciales) {
  // Copia en el dispositivo: si la cuenta no responde, igual se conecta
  try { localStorage.setItem(CLAVE_MQTT, JSON.stringify(cfg)) } catch { /* sin almacenamiento */ }
  avisar({ pide: null, cargando: false })
  conectarNube(cfg)
}

/** Pantalla de EMQX (solo sin cuenta): los datos quedan en este dispositivo. */
export async function ingresarMqtt(c: Credenciales) {
  // Acepta lo que se pegue de la consola de EMQX: sin protocolo ni puerto
  const servidor = c.servidor.trim().replace(/^[a-z]+:\/\//i, '').replace(/[:/].*$/, '')
  usarMqtt({ servidor, usuario: c.usuario.trim(), clave: c.clave })
}

/** Con cuenta: cerrar la sesión y volver a la pantalla de ingreso. */
export async function cerrarSesion() {
  await salir()
  olvidarClave()
  location.reload()
}

/** Pantalla de la cuenta de AquaControl. */
export async function ingresarCuenta(email: string, clave: string) {
  const error = await entrar(email, clave)
  if (error) { avisar({ pide: { que: 'cuenta', error } }); return }
  await seguirConCuenta()
}

async function seguirConCuenta() {
  avisar({ cargando: true })
  try {
    const mqtt = await abrirCuenta()
    if (completas(mqtt)) usarMqtt(mqtt)
    else avisar({ pide: { que: 'aviso', error: 'La cuenta todavía no tiene los datos de EMQX. Se cargan una sola vez en Supabase.' }, cargando: false })
  } catch {
    // Sin respuesta de la cuenta: lo último que se usó en este dispositivo
    const local = leerClave()
    if (completas(local)) usarMqtt(local)
    else avisar({ pide: { que: 'cuenta', error: 'No se pudo leer la cuenta. Revisá la conexión.' }, cargando: false })
  }
}

/* ---------- Arranque ---------- */
if (estado.modo === 'demo') conectarDemo()
else if (estado.modo === 'local') conectarLocal()
else if (hayCuenta) {
  avisar({ cargando: true })
  haySesion().then((si) => (si ? seguirConCuenta() : avisar({ pide: { que: 'cuenta', error: '' }, cargando: false })))
} else {
  // Sin cuenta configurada: los datos de EMQX se piden en cada dispositivo
  const cfg = leerClave()
  if (completas(cfg)) usarMqtt(cfg)
  else avisar({ pide: { que: 'mqtt', error: '' } })
}

export const tiene = (id: string) => estado.vistos.has(id)
export const pulsar = (id: string) => (tiene(id) ? enviar(id) : Promise.resolve(false))
/** Cambia un número de la central (number/…). */
export const fijar = (id: string, valor: number) => (tiene(id) ? enviar(id, valor) : Promise.resolve(false))

export function useCentral() {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f) }, () => estado)
}
