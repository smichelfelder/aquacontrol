// Cálculos del acuario: los mismos que hacía renderVals() del diseño, sin nada de pantalla.
import { FRECUENCIAS, PECES, PLANTAS, type Abono, type Pez, type Planta, type Rango } from '@/data'
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

/** Una medida en cm, si es válida (10 a 400 cm). */
export const medida = (s: string) => {
  const v = parseFloat(String(s).replace(',', '.'))
  return isFinite(v) && v >= 10 && v <= 400 ? v : null
}

/** Parte del volumen que queda para el agua: el resto es sustrato y decoración. */
export const PARTE_AGUA = 0.85

/** Medidas en cm; si alguna no es válida, se usa la del diseño para no dejar todo en blanco. */
export function medidas(g: Guardado) {
  const L = medida(g.largo), A = medida(g.ancho), H = medida(g.alto)
  const ok = L != null && A != null && H != null
  const largo = L ?? 121, ancho = A ?? 41, alto = H ?? 55
  const bruto = (largo * ancho * alto) / 1000
  return { largo, ancho, alto, ok, bruto, neto: bruto * PARTE_AGUA }
}

/** Litros netos: el bruto menos un 15 % de sustrato y decoración. */
export const litrosNetos = (g: Guardado) => medidas(g).neto

const r5 = (v: number) => Math.round(v / 5) * 5
const r10 = (v: number) => Math.round(v / 10) * 10

/** Lo que conviene según los litros netos, como en el diseño. */
export function equipo(neto: number) {
  return [
    { nombre: 'Cambio de agua semanal', valor: `${r5(neto * 0.25)} L`, nota: '25 % del volumen neto' },
    { nombre: 'Calentador', valor: `${r10(neto * 0.8)}–${r10(neto)} W`, nota: 'Unos 0,8–1 W por litro' },
    { nombre: 'Caudal del filtro', valor: `${r10(neto * 4)}–${r10(neto * 6)} L/h`, nota: '4 a 6 veces el volumen por hora' },
  ]
}

/**
 * Ocupación de peces: centímetros de pez adulto contra litros netos (1 cm por litro es el
 * 100 %). Hasta el 80 % está bien; «libre» son los cm que todavía entran hasta ese 80 %.
 */
export function ocupacion(g: Guardado) {
  const neto = litrosNetos(g)
  const usados = g.peces.reduce((a, p) => a + (PECES[p.id] ? p.cant * PECES[p.id].talla : 0), 0)
  const pct = Math.round((usados / neto) * 100)
  return { pct, usados, neto, libre: Math.max(0, Math.round(neto * 0.8 - usados)), nivel: nivelOcupacion(pct) }
}

export const nivelOcupacion = (pct: number): Nivel => (pct <= 80 ? 0 : pct <= 100 ? 1 : 2)

/** ml por toma para los litros netos, redondeado a 0,1 ml. */
export const dosis = (neto: number, ml: number, litros: number) => Math.round((neto / litros) * ml * 10) / 10

export function dosisMl(neto: number, ml: number, litros: number) {
  return fmt(dosis(neto, ml, litros), 1) + ' ml'
}

/** «5 ml cada 250 L», como lo dice la etiqueta. */
export const reglaAbono = (a: { ml: number; litros: number }) => `${fmt(a.ml, 1).replace(',0', '')} ml cada ${a.litros} L`

/** Los días de un abono; uno sin plan guardado arranca con los de su frecuencia. */
export const diasAbono = (g: Guardado, a: Abono) => g.plan[a.id] ?? FRECUENCIAS[a.frec].plan

/** Lunes = 0, como el plan de abonos. */
export const indiceDia = (d: Date) => (d.getDay() + 6) % 7

export function abonosDeHoy(g: Guardado, hoy: Date) {
  const neto = litrosNetos(g)
  const i = indiceDia(hoy)
  return g.abonos.filter((a) => diasAbono(g, a)[i]).map((a) => ({ nombre: a.corto ?? a.nombre, dosis: dosisMl(neto, a.ml, a.litros) }))
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

/** Un aviso de «Mis peces»: nivel 1 = revisar (ámbar), 2 = problema serio (rojo). */
export interface Aviso { txt: string; nivel: Nivel }

/**
 * Cómo convive un pez (uno mío o uno que se quiere sumar) con los que tengo: rangos de agua
 * que no comparten y los avisos de cada especie. El nivel también sube si el agua no le sirve.
 */
export function convivencia(g: Guardado, s: Sondas, pez: Pez) {
  const avisos: Aviso[] = []
  let dura = false
  for (const otro of misPeces(g)) {
    if (otro.id === pez.id) continue
    const falta = []
    if (Math.min(otro.t[1], pez.t[1]) - Math.max(otro.t[0], pez.t[0]) < 0.5) falta.push('temperatura')
    if (Math.min(otro.p[1], pez.p[1]) - Math.max(otro.p[0], pez.p[0]) < 0.2) falta.push('pH')
    if (falta.length) { dura = true; avisos.push({ txt: `Con ${otro.nombre}: no comparten ${falta.join(' ni ')}.`, nivel: 2 }) }
    if (pez.extra[otro.id]) avisos.push({ txt: pez.extra[otro.id], nivel: 1 })
    // Lo que avisa el otro sobre este (el guppy no sabe que el betta lo ataca)
    if (otro.extra[pez.id]) avisos.push({ txt: otro.extra[pez.id], nivel: 1 })
  }
  const agua = dentro(s.temp, pez.t) && dentro(s.ph, pez.p) && dentro(s.tds, pez.d)
  const nivel: Nivel = dura ? 2 : !agua || avisos.length ? 1 : 0
  return { avisos, nivel }
}

/** Lo que hay que revisar de un pez mío: agua fuera de rango y convivencia. */
export function problemasPez(g: Guardado, s: Sondas, pez: Pez): Aviso[] {
  const lista: Aviso[] = []
  if (s.temp != null && !dentro(s.temp, pez.t)) {
    lista.push({ txt: `Temperatura ${s.temp < pez.t[0] ? 'baja' : 'alta'}: pide ${pez.t[0]}–${pez.t[1]} °C y el agua está a ${fmt(s.temp, 1)} °C.`, nivel: 1 })
  }
  if (s.ph != null && !dentro(s.ph, pez.p)) {
    lista.push({ txt: `pH ${s.ph < pez.p[0] ? 'bajo' : 'alto'}: pide ${fmt(pez.p[0], 1)}–${fmt(pez.p[1], 1)} y el agua tiene ${fmt(s.ph, 1)}.`, nivel: 1 })
  }
  if (s.tds != null && !dentro(s.tds, pez.d)) {
    lista.push({ txt: `Agua ${s.tds < pez.d[0] ? 'demasiado blanda' : 'demasiado dura'}: pide ${pez.d[0]}–${pez.d[1]} ppm de TDS.`, nivel: 1 })
  }
  return lista.concat(convivencia(g, s, pez).avisos)
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

/** La temperatura salió del rango de avisos que se fijó en «Mi acuario» (la central avisa por Telegram). */
export const fueraDeAvisos = (s: Sondas) =>
  s.temp != null && ((s.tempMin != null && s.temp < s.tempMin) || (s.tempMax != null && s.temp > s.tempMax))

export function nivelAgua(s: Sondas) {
  if (s.nivelBajo == null && s.nivelCritico == null) return { txt: '—', sub: 'Sensores sin conectar', tono: 'sin-dato' as const }
  if (s.nivelCritico === false) return { txt: 'Crítico', sub: 'Bajó 5 cm: revisá si hay una pérdida', tono: 'alerta' as const }
  if (s.nivelBajo === false) return { txt: 'Bajo', sub: 'Bajó 2 cm: reponé agua', tono: 'aviso' as const }
  return { txt: 'Normal', sub: 'Ambos sensores con agua', tono: 'bien' as const }
}
