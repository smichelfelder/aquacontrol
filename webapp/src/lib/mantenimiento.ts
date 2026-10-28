// Modo mantenimiento (pantalla «inicio» del diseño): apaga CO2, filtro y calentador para cambiar
// el agua o podar; al terminar el tiempo vuelve todo solo, en orden, y pregunta qué se hizo.
// De la central solo se maneja el filtro; lo demás se muestra según el diseño.
import { useEffect, useState } from 'react'
import { pulsar } from './central'
import { useGuardado, type Guardado, type Mant, type RegMant } from './guardado'

export const TAREAS = ['Cambio de agua', 'Poda', 'Limpieza de filtro', 'Vidrios', 'Sustrato']
export const DURACIONES = [30, 60, 90]

const SEG = 1000
const CALENTADOR = 150 * SEG  // el calentador espera a que vuelva a estar sumergido
const SONDAS = 900 * SEG      // las sondas se estabilizan antes de volver a dar alarmas

/** Segundos que faltan para t (ms). */
export const faltan = (t: number, ahora: number) => Math.max(0, Math.ceil((t - ahora) / SEG))

/** 125 → «2:05». */
export const reloj = (seg: number) => Math.floor(seg / 60) + ':' + String(seg % 60).padStart(2, '0')

const DIA = 86400000
export const medianoche = (ms: number) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime() }
export const haceTxt = (ms: number, hoy: number) => {
  const n = Math.round((hoy - ms) / DIA)
  return n <= 0 ? 'Hoy' : n === 1 ? 'Ayer' : `Hace ${n} días`
}
export const ordenado = (h: RegMant[]) => h.slice().sort((a, b) => b.fecha - a.fecha)

/** Subtítulo del botón de Inicio. */
export function ultimoCambio(h: RegMant[], ahora: Date) {
  const u = ordenado(h).find((e) => e.tareas.includes('Cambio de agua'))
  return u ? 'Último cambio de agua: ' + haceTxt(u.fecha, medianoche(ahora.getTime())).toLowerCase() : 'Sin cambios de agua registrados'
}

/** Lo que dicen las sondas mientras están en pausa, o null si están normales. */
export function notaSondas({ m, ahora }: { m: Mant | null; ahora: number }) {
  if (m?.modo === 'activo') return 'Sin alarmas · no se registra'
  if (m?.modo === 'reanudando' && m.sondas > ahora) return 'Estabilizando · ' + reloj(faltan(m.sondas, ahora))
  return null
}

export function useMantenimiento() {
  const [g, cambiar] = useGuardado()
  const m = g.mant
  // Mientras dura, la cuenta regresiva va por segundo
  const [ahora, setAhora] = useState(() => Date.now())
  useEffect(() => {
    if (!m) return
    const ya = setTimeout(() => setAhora(Date.now()), 0)
    const id = setInterval(() => setAhora(Date.now()), SEG)
    return () => { clearTimeout(ya); clearInterval(id) }
  }, [m])

  const terminar = () => {
    pulsar('button/Filtro: encender')
    const t = Date.now()
    cambiar({ mant: { modo: 'reanudando', calentador: t + CALENTADOR, sondas: t + SONDAS, co2: false, registro: true }, filtro: true, comida: 0 })
  }

  // Pasó el tiempo: vuelve todo. Ya encendido todo y registrado lo hecho: modo normal.
  useEffect(() => {
    if (m?.modo === 'activo' && m.fin <= ahora) terminar()
    else if (m?.modo === 'reanudando' && !m.registro && m.calentador <= ahora && m.sondas <= ahora) cambiar({ mant: null })
  })

  const reanudar = (p: Partial<Extract<Mant, { modo: 'reanudando' }>>, extra: Partial<Guardado> = {}) => {
    if (m?.modo !== 'reanudando') return
    const nuevo = { ...m, ...p }
    // Sin nada pendiente ni por registrar, vuelve al modo normal
    cambiar({ ...extra, mant: !nuevo.registro && nuevo.calentador <= Date.now() && nuevo.sondas <= Date.now() ? null : nuevo })
  }

  return {
    g, ahora, m,
    empezar: () => {
      pulsar('button/Filtro: apagar')
      cambiar({ mant: { modo: 'activo', fin: Date.now() + g.mantDur * 60 * SEG }, filtro: false, comida: 0 })
    },
    masTiempo: () => m?.modo === 'activo' && cambiar({ mant: { ...m, fin: m.fin + 15 * 60 * SEG } }),
    terminar,
    reanudar,
    cambiar: (p: Partial<Guardado>) => cambiar(p),
  }
}

export type Mantenimiento = ReturnType<typeof useMantenimiento>
