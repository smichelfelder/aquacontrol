// El horario del alimentador: qué toma viene y si la comida de recién todavía tiene el filtro en pausa.
import { indiceDia } from './acuario'
import type { Guardado, Toma } from './guardado'

const dos = (n: number) => String(n).padStart(2, '0')
export const horaToma = (t: { h: number; m: number }) => dos(t.h) + ':' + dos(t.m)
export const minutos = (t: { h: number; m: number }) => t.h * 60 + t.m
export const vueltasTxt = (v: number) => v + (v === 1 ? ' vuelta' : ' vueltas')

/** Las tomas que vienen desde ahora, en orden; off = días desde hoy. */
export function proximasTomas(tomas: Toma[], ahora: Date, dias = 15) {
  const hoy = indiceDia(ahora)
  const ya = ahora.getHours() * 60 + ahora.getMinutes()
  const activas = tomas.filter((t) => t.activa).sort((a, b) => minutos(a) - minutos(b))
  const futuras: { t: Toma; off: number }[] = []
  for (let off = 0; off < dias; off++) {
    const d = (hoy + off) % 7
    activas.forEach((t) => { if (t.dias[d] && (off > 0 || minutos(t) > ya)) futuras.push({ t, off }) })
  }
  return futuras
}

/** La comida que se dio a mano hace menos de la pausa del filtro. */
export const comidaServida = (g: Guardado, ahora: Date) => ahora.getTime() - g.comida < g.pausa * 60 * 1000
