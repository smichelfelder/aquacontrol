// Historial de temperatura: lo sube la central a Supabase cada 5 min (supabase/esquema.sql) y
// acá se lee agrupado. Cada período trae todos sus tramos, también los vacíos, para que se vean
// los huecos (central apagada o sin internet).
import { useEffect, useState } from 'react'
import { hayCuenta, leerHistorial, type FilaHistorial } from './cuenta'

export type Periodo = 'dia' | 'semana' | 'mes' | 'ano'

export interface Tramo {
  inicio: Date
  promedio: number | null
  minimo: number | null
  maximo: number | null
}

export type Historial =
  | { estado: 'cargando'; tramos?: Tramo[] }
  | { estado: 'listo'; tramos: Tramo[] }
  | { estado: 'error'; mensaje: string }

const dos = (n: number) => String(n).padStart(2, '0')

/** Comienzo de cada tramo del período, del más viejo al actual (en la hora del dispositivo). */
function tramos(periodo: Periodo, ahora = new Date()): Date[] {
  const d = new Date(ahora)
  if (periodo === 'dia') {
    d.setMinutes(0, 0, 0)
    return Array.from({ length: 24 }, (_, i) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours() - 23 + i))
  }
  if (periodo === 'ano') return Array.from({ length: 12 }, (_, i) => new Date(d.getFullYear(), d.getMonth() - 11 + i, 1))
  const n = periodo === 'semana' ? 7 : 30
  return Array.from({ length: n }, (_, i) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - n + 1 + i))
}

function clave(periodo: Periodo, f: Date) {
  const base = f.getFullYear() + '-' + dos(f.getMonth() + 1)
  if (periodo === 'ano') return base
  const dia = base + '-' + dos(f.getDate())
  return periodo === 'dia' ? dia + ' ' + dos(f.getHours()) : dia
}

function armar(periodo: Periodo, filas: FilaHistorial[]): Tramo[] {
  const por = new Map(filas.map((f) => [clave(periodo, new Date(f.momento)), f]))
  return tramos(periodo).map((inicio) => {
    const f = por.get(clave(periodo, inicio))
    return { inicio, promedio: f?.promedio ?? null, minimo: f?.minimo ?? null, maximo: f?.maximo ?? null }
  })
}

/** Datos de ejemplo para el modo demo: ciclo de día y noche alrededor de 25 °C. */
function demo(periodo: Periodo): Tramo[] {
  return tramos(periodo).map((inicio, i) => {
    const h = inicio.getHours() + (periodo === 'dia' ? 0.5 : 12)
    const ciclo = periodo === 'dia' ? Math.sin(((h - 9) / 24) * 2 * Math.PI) * 0.6 : 0
    const estacion = periodo === 'ano' ? Math.sin(((inicio.getMonth() - 3) / 12) * 2 * Math.PI) * 0.8 : 0
    const ruido = Math.sin(i * 12.9898) * 0.25
    const promedio = 25.2 + ciclo + estacion + ruido
    const ancho = periodo === 'dia' ? 0.15 : 0.7
    return { inicio, promedio, minimo: promedio - ancho, maximo: promedio + ancho * 0.8 }
  })
}

export function useHistorial(periodo: Periodo, modo: 'local' | 'nube' | 'demo'): Historial {
  const lee = modo === 'nube' && hayCuenta
  // Lo último que llegó de la cuenta y de qué período es: mientras carga otro, se sigue viendo
  const [leido, setLeido] = useState<{ periodo: Periodo; h: Historial } | null>(null)
  useEffect(() => {
    if (!lee) return
    let vigente = true
    leerHistorial(periodo)
      .then((filas) => { if (vigente) setLeido({ periodo, h: { estado: 'listo', tramos: armar(periodo, filas) } }) })
      .catch(() => { if (vigente) setLeido({ periodo, h: { estado: 'error', mensaje: 'No se pudo leer el historial. Revisá la conexión.' } }) })
    return () => { vigente = false }
  }, [periodo, lee])

  if (modo === 'demo') return { estado: 'listo', tramos: demo(periodo) }
  if (!lee) return { estado: 'error', mensaje: 'El historial se guarda en la cuenta: abrí la app desde internet para verlo.' }
  if (leido?.periodo === periodo) return leido.h
  return { estado: 'cargando', tramos: leido?.h.estado === 'listo' ? leido.h.tramos : undefined }
}
