// Lo que el usuario carga en la app (peces, plantas, plan de abonos, medidas). Queda en cada
// dispositivo, con la misma clave que la app anterior: al cambiar de app no se pierde nada.
import { useCallback, useSyncExternalStore } from 'react'

const CLAVE = 'aquacontrol.v1'

export interface Guardado {
  peces: { id: string; cant: number }[]
  mias: string[]                                   // ids de plantas
  plan: Record<'ec' | 'fl' | 'k', number[]>        // lunes a domingo, 1 = toca
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
    { id: 'guppy', cant: 8 }, { id: 'molly', cant: 4 }, { id: 'neon', cant: 12 },
    { id: 'cory', cant: 6 }, { id: 'garra', cant: 3 },
  ],
  mias: ['rotala-rotundifolia', 'hygrophila-polysperma', 'anubias-barteri', 'musgo-christmas', 'monte-carlo', 'staurogyne-repens'],
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
    return { ...INICIAL, ...g }
  } catch {
    return INICIAL
  }
}

let actual = leer()
const subs = new Set<() => void>()

function escribir(g: Guardado) {
  actual = g
  try { localStorage.setItem(CLAVE, JSON.stringify(g)) } catch { /* sin almacenamiento */ }
  subs.forEach((f) => f())
}

const suscribir = (f: () => void) => { subs.add(f); return () => subs.delete(f) }

export function useGuardado() {
  const g = useSyncExternalStore(suscribir, () => actual)
  const cambiar = useCallback((parcial: Partial<Guardado>) => escribir({ ...actual, ...parcial }), [])
  return [g, cambiar] as const
}
