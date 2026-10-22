// Cálculos del acuario: los mismos que hacía renderVals() del diseño, sin nada de pantalla.
import { ABONOS, PECES, PLANTAS, type Pez, type Planta, type Rango } from '@/data'
import type { Guardado } from './guardado'
import type { Sondas } from './central'

export type Nivel = 0 | 1 | 2  // bien · revisar · problema

// Hasta que se puedan cargar en «Mi acuario», como en el diseño
const LUZ_ACUARIO: 0 | 1 | 2 = 1  // media
const CO2_ACUARIO = true

/** 25,4 · sin dato: — */
export const fmt = (v: number | null | undefined, decimales: number) =>
  v == null ? '—' : v.toFixed(decimales).replace('.', ',')

const dentro = (v: number | null, r: Rango) => v == null || (v >= r[0] && v <= r[1])

const medida = (s: string) => {
  const v = parseFloat(String(s).replace(',', '.'))
  return isFinite(v) && v >= 10 && v <= 400 ? v : null
}

/** Litros netos: el bruto menos un 15 % de sustrato y decoración. */
export function litrosNetos(g: Guardado) {
  const L = medida(g.largo) ?? 121
  const A = medida(g.ancho) ?? 41
  const H = medida(g.alto) ?? 55
  return (L * A * H) / 1000 * 0.85
}

export function dosisMl(neto: number, ml: number, litros: number) {
  return fmt(Math.round((neto / litros) * ml * 10) / 10, 1) + ' ml'
}

/** Lunes = 0, como el plan de abonos. */
export const indiceDia = (d: Date) => (d.getDay() + 6) % 7

export function abonosDeHoy(g: Guardado, hoy: Date) {
  const neto = litrosNetos(g)
  const i = indiceDia(hoy)
  return ABONOS.filter((a) => g.plan[a.id]?.[i]).map((a) => ({ nombre: a.corto, dosis: dosisMl(neto, a.ml, a.litros) }))
}

/** Rango que les sirve a todos mis peces a la vez para una sonda. */
export function objetivo(g: Guardado, clave: 't' | 'p' | 'd', valor: number | null) {
  const peces = misPeces(g)
  if (!peces.length) return { rango: null, ok: true }
  const lo = Math.max(...peces.map((p) => p[clave][0]))
  const hi = Math.min(...peces.map((p) => p[clave][1]))
  if (lo > hi) return { rango: null, ok: false }
  return { rango: [lo, hi] as Rango, ok: dentro(valor, [lo, hi]) }
}

export const misPeces = (g: Guardado): Pez[] => g.peces.filter((p) => PECES[p.id]).map((p) => PECES[p.id])
export const misPlantas = (g: Guardado): Planta[] => g.mias.filter((id) => PLANTAS[id]).map((id) => PLANTAS[id])

/** Cuántas cosas hay que revisar de un pez: agua fuera de rango y convivencia. */
export function problemasPez(g: Guardado, s: Sondas, pez: Pez) {
  let n = 0
  if (!dentro(s.temp, pez.t)) n++
  if (!dentro(s.ph, pez.p)) n++
  if (!dentro(s.tds, pez.d)) n++
  for (const otro of misPeces(g)) {
    if (otro.id === pez.id) continue
    const tComun = Math.min(otro.t[1], pez.t[1]) - Math.max(otro.t[0], pez.t[0])
    const pComun = Math.min(otro.p[1], pez.p[1]) - Math.max(otro.p[0], pez.p[0])
    if (tComun < 0.5 || pComun < 0.2) n++
    if (pez.extra[otro.id]) n++
    if (otro.extra[pez.id]) n++
  }
  return n
}

export function nivelPlanta(s: Sondas, pl: Planta): Nivel {
  let nivel: Nivel = 0
  const sube = (n: Nivel) => { if (n > nivel) nivel = n }
  if (!dentro(s.temp, pl.t)) sube(1)
  if (!dentro(s.ph, pl.p)) sube(1)
  if (pl.luz > LUZ_ACUARIO) sube(pl.luz - LUZ_ACUARIO >= 2 ? 2 : 1)
  if (!CO2_ACUARIO && pl.co2 === 2) sube(2)
  if (!CO2_ACUARIO && pl.co2 === 1) sube(1)
  return nivel
}

export function nivelAgua(s: Sondas) {
  if (s.nivelBajo == null && s.nivelCritico == null) return { txt: '—', sub: 'Sensores sin conectar', tono: 'sin-dato' as const }
  if (s.nivelCritico === false) return { txt: 'Crítico', sub: 'Bajó 5 cm: revisá si hay una pérdida', tono: 'alerta' as const }
  if (s.nivelBajo === false) return { txt: 'Bajo', sub: 'Bajó 2 cm: reponé agua', tono: 'aviso' as const }
  return { txt: 'Normal', sub: 'Ambos sensores con agua', tono: 'bien' as const }
}
