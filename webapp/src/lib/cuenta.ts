// La cuenta de AquaControl en Supabase: un único usuario con contraseña (sin registro abierto).
// Guarda los datos de EMQX (se cargan una vez desde Supabase: supabase/cargar-emqx.sql) y lo que
// se carga en la app, así cada dispositivo solo tiene que entrar con ese usuario.
// La tabla y sus permisos están en supabase/esquema.sql.
import { createClient } from '@supabase/supabase-js'
import { alCambiarGuardado, guardadoActual, reemplazarGuardado, type Guardado } from './guardado'

export interface Credenciales { servidor: string; usuario: string; clave: string }

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const CLAVE = import.meta.env.VITE_SUPABASE_KEY as string | undefined

/** Sin estas variables la app pide los datos de EMQX en cada dispositivo, como antes. */
export const hayCuenta = !!(URL && CLAVE)
const sb = hayCuenta ? createClient(URL!, CLAVE!) : null

async function usuarioId() {
  const { data } = await sb!.auth.getSession()
  return data.session?.user.id ?? null
}

export const haySesion = async () => !!(sb && (await usuarioId()))

/** Devuelve un mensaje si no pudo entrar. */
export async function entrar(email: string, clave: string) {
  const { error } = await sb!.auth.signInWithPassword({ email: email.trim(), password: clave })
  if (!error) return null
  if (error.code === 'invalid_credentials') return 'Usuario o contraseña incorrectos.'
  if (error.name === 'AuthRetryableFetchError') return 'No se pudo conectar con la cuenta. Revisá la conexión.'
  return 'No se pudo entrar: ' + error.message
}

export const salir = () => sb?.auth.signOut()

async function leerFila() {
  const { data, error } = await sb!.from('cuenta').select('mqtt, datos').maybeSingle()
  if (error) throw error
  return data as { mqtt: Credenciales | null; datos: Partial<Guardado> | null } | null
}

async function escribirFila(cambios: { datos: Guardado }) {
  const usuario = await usuarioId()
  if (!usuario) return false
  const { error } = await sb!.from('cuenta').upsert({ usuario, ...cambios, actualizado: new Date().toISOString() })
  return !error
}

/* ---------- Peces, plantas y abonos: iguales en todos los dispositivos ---------- */
let pendiente = false  // hay cambios de este dispositivo que todavía no se subieron
let espera: ReturnType<typeof setTimeout> | undefined

async function subir() {
  pendiente = !(await escribirFila({ datos: guardadoActual() }))
}

async function bajar() {
  if (pendiente) await subir()       // primero lo que se cambió sin conexión
  if (pendiente) return
  const fila = await leerFila().catch(() => undefined)
  if (fila?.datos) reemplazarGuardado(fila.datos)
}

/**
 * Trae la cuenta después de entrar: devuelve los datos de EMQX (o null si todavía no se
 * cargaron) y deja sincronizados peces, plantas y abonos.
 */
export async function abrirCuenta() {
  const fila = await leerFila()
  // La primera vez, la cuenta se queda con lo que ya había en este dispositivo
  if (fila?.datos) reemplazarGuardado(fila.datos)
  else await subir()

  alCambiarGuardado(() => {
    pendiente = true
    clearTimeout(espera)
    espera = setTimeout(subir, 800)
  })
  // Al volver a la app, lo que se haya cambiado desde otro dispositivo
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') bajar() })
  window.addEventListener('online', () => { if (pendiente) subir() })
  return fila?.mqtt ?? null
}
