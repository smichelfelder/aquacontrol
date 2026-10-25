// Lo que el usuario carga en la app (peces, plantas, plan de abonos, medidas). Queda en cada
// dispositivo, con la misma clave que la app anterior: al cambiar de app no se pierde nada.
import { useCallback, useSyncExternalStore } from 'react'
import { ABONOS, type Abono } from '@/data'

const CLAVE = 'aquacontrol.v1'

/** Una especie mía. cant es el total (la app anterior solo guardaba eso); sin m, h y s son todos sin sexar. */
export interface MiPez { id: string; cant: number; m?: number; h?: number; s?: number }

export interface Guardado {
  peces: MiPez[]
  mias: string[]                                   // ids de plantas
  abonos: Abono[]                                  // la lista de «Abonos»
  plan: Record<string, number[]>                   // id del abono → lunes a domingo, 1 = toca
  largo: string
  ancho: string
  alto: string
  abono: string    // 'AAAA-MM-DD HH:MM' del último abono marcado
  filtro: boolean  // lo último que se pidió al filtro
  comida: number   // cuándo se dio de comer (ms)
  sel?: string
  selP?: string
}

// Los valores de ejemplo del diseño
const INICIAL: Guardado = {
  peces: [
    { id: 'guppy', cant: 8, m: 2, h: 6, s: 0 }, { id: 'molly', cant: 4, m: 1, h: 3, s: 0 }, { id: 'neon', cant: 12 },
    { id: 'cory', cant: 6 }, { id: 'garra', cant: 3 },
  ],
  mias: ['rotala-rotundifolia', 'hygrophila-polysperma', 'anubias-barteri', 'musgo-christmas', 'monte-carlo', 'staurogyne-repens'],
  abonos: ABONOS,
  plan: { ec: [1, 1, 1, 1, 1, 1, 1], fl: [1, 0, 0, 1, 0, 0, 0], k: [0, 1, 0, 0, 1, 0, 1] },
  largo: '121', ancho: '41', alto: '55',
  abono: '', filtro: true, comida: 0,
}

function leer(): Guardado {
  try {
    const g = JSON.parse(localStorage.getItem(CLAVE) || 'null') ?? {}
    // La app anterior guardaba abono y comida como booleanos al principio
    if (typeof g.abono !== 'string') delete g.abono
    if (typeof g.comida !== 'number') delete g.comida
    if (!Array.isArray(g.abonos)) delete g.abonos  // la app anterior no tenía la lista
    return { ...INICIAL, ...g }
  } catch {
    return INICIAL
  }
}

let actual = leer()
const subs = new Set<() => void>()
const cambiosDelUsuario = new Set<(g: Guardado) => void>()

function escribir(g: Guardado) {
  actual = g
  try { localStorage.setItem(CLAVE, JSON.stringify(g)) } catch { /* sin almacenamiento */ }
  subs.forEach((f) => f())
}

const suscribir = (f: () => void) => { subs.add(f); return () => subs.delete(f) }

export const guardadoActual = () => actual

/** Lo que llega de la cuenta: reemplaza lo de este dispositivo sin volver a subirlo. */
export function reemplazarGuardado(g: Partial<Guardado>) {
  escribir({ ...INICIAL, ...g })
}

/** Avisa cada cambio hecho en la app (para subirlo a la cuenta). */
export function alCambiarGuardado(f: (g: Guardado) => void) {
  cambiosDelUsuario.add(f)
  return () => { cambiosDelUsuario.delete(f) }
}

export function useGuardado() {
  const g = useSyncExternalStore(suscribir, () => actual)
  const cambiar = useCallback((parcial: Partial<Guardado>) => {
    escribir({ ...actual, ...parcial })
    cambiosDelUsuario.forEach((f) => f(actual))
  }, [])
  return [g, cambiar] as const
}
