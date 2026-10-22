// Gráfico del historial de temperatura: promedio de cada tramo (línea), mínimo y máximo (banda)
// y el rango que les sirve a mis peces (franja). Se abre al tocar la temperatura en Inicio.
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { fmt } from '@/lib/acuario'
import type { Rango } from '@/data'
import { useHistorial, type Periodo, type Tramo } from '@/lib/historial'
import { cn } from '@/lib/utils'

const PERIODOS: { id: Periodo; txt: string; sub: string }[] = [
  { id: 'dia', txt: 'Día', sub: 'Últimas 24 horas, por hora' },
  { id: 'semana', txt: 'Semana', sub: 'Últimos 7 días, por día' },
  { id: 'mes', txt: 'Mes', sub: 'Últimos 30 días, por día' },
  { id: 'ano', txt: 'Año', sub: 'Últimos 12 meses, por mes' },
]

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const MESES_LARGO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const dos = (n: number) => String(n).padStart(2, '0')

/** Texto del eje: cada cuántos tramos va una marca y qué dice. */
function eje(periodo: Periodo, f: Date, i: number, n: number, angosto: boolean) {
  if (periodo === 'dia') return (n - 1 - i) % 4 === 0 ? dos(f.getHours()) + ' h' : null
  if (periodo === 'semana') return DIAS[f.getDay()] + ' ' + f.getDate()
  if (periodo === 'mes') return (n - 1 - i) % (angosto ? 7 : 5) === 0 ? f.getDate() + ' ' + MESES[f.getMonth()] : null
  return i % 2 === (n - 1) % 2 ? MESES[f.getMonth()] : null
}

/** Texto del tramo en el detalle: «15:00 a 16:00», «lunes 20 de octubre», «octubre de 2026». */
function tramoTxt(periodo: Periodo, f: Date) {
  if (periodo === 'dia') return `${dos(f.getHours())}:00 a ${dos((f.getHours() + 1) % 24)}:00`
  if (periodo === 'ano') return `${MESES_LARGO[f.getMonth()]} de ${f.getFullYear()}`
  const dia = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][f.getDay()]
  return `${dia} ${f.getDate()} de ${MESES_LARGO[f.getMonth()]}`
}

export function HistorialTemperatura({ abierto, cambiar, actual, rango, modo }: {
  abierto: boolean
  cambiar: (abierto: boolean) => void
  actual: number | null
  rango: Rango | null
  modo: 'local' | 'nube' | 'demo'
}) {
  const [periodo, setPeriodo] = useState<Periodo>('dia')
  return (
    <Dialog open={abierto} onOpenChange={cambiar}>
      <DialogContent className="max-w-3xl px-4 pt-4 pb-5 md:px-7 md:pt-6 md:pb-7">
        {abierto && <Contenido periodo={periodo} setPeriodo={setPeriodo} actual={actual} rango={rango} modo={modo} />}
      </DialogContent>
    </Dialog>
  )
}

function Contenido({ periodo, setPeriodo, actual, rango, modo }: {
  periodo: Periodo; setPeriodo: (p: Periodo) => void; actual: number | null; rango: Rango | null; modo: 'local' | 'nube' | 'demo'
}) {
  const h = useHistorial(periodo, modo)
  const tramos = h.estado === 'error' ? undefined : h.tramos
  const conDato = (tramos ?? []).filter((t) => t.promedio != null)
  const resumen = conDato.length ? {
    min: Math.min(...conDato.map((t) => t.minimo!)),
    max: Math.max(...conDato.map((t) => t.maximo!)),
    prom: conDato.reduce((s, t) => s + t.promedio!, 0) / conDato.length,
  } : null
  const sub = PERIODOS.find((p) => p.id === periodo)!.sub

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      <div className="pr-10">
        <DialogTitle className="md:text-2xl">Temperatura</DialogTitle>
        <DialogDescription className="md:text-base">
          Ahora {fmt(actual, 1)} °C{rango ? ` · objetivo ${fmt(rango[0], 0)}–${fmt(rango[1], 0)} °C` : ''}
        </DialogDescription>
      </div>

      <div role="radiogroup" aria-label="Período" className="grid grid-cols-4 gap-1 rounded-full bg-muted p-1">
        {PERIODOS.map((p) => (
          <button key={p.id} type="button" role="radio" aria-checked={p.id === periodo} onClick={() => setPeriodo(p.id)}
            className={cn('h-10 cursor-pointer rounded-full text-sm transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none md:h-11 md:text-base',
              p.id === periodo ? 'bg-primary font-semibold text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground')}>
            {p.txt}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 md:gap-3">
        <Dato titulo="Mínima" valor={resumen && fmt(resumen.min, 1)} />
        <Dato titulo="Promedio" valor={resumen && fmt(resumen.prom, 1)} />
        <Dato titulo="Máxima" valor={resumen && fmt(resumen.max, 1)} />
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-sm text-tenue">{sub}</div>
        {h.estado === 'error' ? (
          <Vacio>{h.mensaje}</Vacio>
        ) : !tramos ? (
          <Vacio><span className="animate-pulse">Cargando…</span></Vacio>
        ) : !conDato.length ? (
          <Vacio>Todavía no hay lecturas en este período. La central guarda una cada 5 minutos.</Vacio>
        ) : (
          <div className={cn('transition-opacity', h.estado === 'cargando' && 'opacity-50')}>
            <Grafico tramos={tramos} periodo={periodo} rango={rango} />
          </div>
        )}
      </div>

      {tramos && conDato.length > 0 && <Tabla tramos={tramos} periodo={periodo} />}
    </div>
  )
}

function Dato({ titulo, valor }: { titulo: string; valor: string | null }) {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-panel px-3 py-2.5 md:px-4 md:py-3">
      <span className="text-xs text-muted-foreground md:text-sm">{titulo}</span>
      <span className="font-heading text-2xl font-medium md:text-3xl">
        {valor ?? '—'}<span className="ml-1 text-sm font-normal text-muted-foreground md:text-base">°C</span>
      </span>
    </div>
  )
}

function Vacio({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-[220px] items-center justify-center rounded-2xl border border-dashed border-border px-6 text-center text-muted-foreground md:h-[280px]">
      {children}
    </div>
  )
}

/* ---------- Gráfico ---------- */
const COLOR = 'var(--primary)'
const SUPERFICIE = 'var(--popover)'
const M = { arriba: 12, abajo: 26, izq: 34, der: 10 }

function Grafico({ tramos, periodo, rango }: { tramos: Tramo[]; periodo: Periodo; rango: Rango | null }) {
  const caja = useRef<HTMLDivElement>(null)
  const [ancho, setAncho] = useState(600)
  const [elegido, setElegido] = useState<{ periodo: Periodo; i: number } | null>(null)
  const sel = elegido?.periodo === periodo ? elegido.i : null
  const setSel = (i: number | null | ((s: number | null) => number)) =>
    setElegido((e) => {
      const v = typeof i === 'function' ? i(e?.periodo === periodo ? e.i : null) : i
      return v == null ? null : { periodo, i: v }
    })
  useEffect(() => {
    const el = caja.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setAncho(Math.max(260, e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const alto = ancho < 500 ? 220 : 280
  const n = tramos.length
  const conDato = tramos.filter((t) => t.promedio != null)

  // Escala vertical: los datos y el rango objetivo, en pasos de medio grado
  const valores = conDato.flatMap((t) => [t.minimo!, t.maximo!]).concat(rango ?? [])
  let lo = Math.floor(Math.min(...valores) * 2) / 2 - 0.5
  let hi = Math.ceil(Math.max(...valores) * 2) / 2 + 0.5
  if (hi - lo < 2) { lo -= 0.5; hi += 0.5 }
  const paso = hi - lo > 6 ? 2 : hi - lo > 3 ? 1 : 0.5
  const marcas: number[] = []
  for (let v = Math.ceil(lo / paso) * paso; v <= hi + 1e-9; v += paso) marcas.push(v)

  const w = ancho - M.izq - M.der
  const hh = alto - M.arriba - M.abajo
  const x = (i: number) => M.izq + (n === 1 ? w / 2 : (i / (n - 1)) * w)
  const y = (v: number) => M.arriba + (1 - (v - lo) / (hi - lo)) * hh

  // Tramos seguidos con dato: la línea y la banda se cortan donde falta
  const grupos: number[][] = []
  tramos.forEach((t, i) => {
    if (t.promedio == null) return
    const ult = grupos.at(-1)
    if (ult && ult.at(-1) === i - 1) ult.push(i)
    else grupos.push([i])
  })

  const elegir = (e: PointerEvent<SVGRectElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const i = Math.round(((e.clientX - r.left) / r.width) * (n - 1))
    setSel(Math.max(0, Math.min(n - 1, i)))
  }
  const teclas = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    const d = e.key === 'ArrowLeft' ? -1 : 1
    setSel((s) => Math.max(0, Math.min(n - 1, (s ?? n - 1) + (s == null ? 0 : d))))
  }

  const t = sel != null ? tramos[sel] : null
  return (
    <div ref={caja} className="relative">
      <svg width={ancho} height={alto} className="block touch-pan-y select-none" role="img"
        aria-label={`Temperatura: ${PERIODOS.find((p) => p.id === periodo)!.sub.toLowerCase()}`}>
        {/* Rango objetivo */}
        {rango && (
          <g>
            <rect x={M.izq} width={w} y={y(Math.min(rango[1], hi))} height={Math.max(0, y(Math.max(rango[0], lo)) - y(Math.min(rango[1], hi)))}
              fill={COLOR} opacity={0.07} />
            <text x={M.izq + w - 4} y={y(Math.min(rango[1], hi)) + 13} textAnchor="end" className="fill-tenue text-[11px]">objetivo</text>
          </g>
        )}
        {/* Grilla y eje vertical */}
        {marcas.map((v) => (
          <g key={v}>
            <line x1={M.izq} x2={M.izq + w} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeWidth={1} />
            <text x={M.izq - 6} y={y(v) + 4} textAnchor="end" className="fill-tenue text-[11px] tabular-nums">{fmt(v, paso < 1 ? 1 : 0)}</text>
          </g>
        ))}
        {/* Eje horizontal */}
        {tramos.map((tr, i) => {
          const txt = eje(periodo, tr.inicio, i, n, ancho < 500)
          return txt && (
            <text key={i} x={x(i)} y={alto - 8} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}
              className="fill-tenue text-[11px]">{txt}</text>
          )
        })}
        {/* Mínimo y máximo */}
        {grupos.map((g) => (
          <path key={'b' + g[0]} fill={COLOR} opacity={0.14} d={
            g.length === 1
              ? `M${x(g[0]) - 3},${y(tramos[g[0]].maximo!)}h6V${y(tramos[g[0]].minimo!)}h-6Z`
              : 'M' + g.map((i) => `${x(i)},${y(tramos[i].maximo!)}`).join('L') + 'L' + [...g].reverse().map((i) => `${x(i)},${y(tramos[i].minimo!)}`).join('L') + 'Z'
          } />
        ))}
        {/* Promedio */}
        {grupos.map((g) => g.length === 1
          ? <circle key={'l' + g[0]} cx={x(g[0])} cy={y(tramos[g[0]].promedio!)} r={3} fill={COLOR} />
          : <path key={'l' + g[0]} d={'M' + g.map((i) => `${x(i)},${y(tramos[i].promedio!)}`).join('L')}
              fill="none" stroke={COLOR} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />)}
        {/* Selección */}
        {t && (
          <g pointerEvents="none">
            <line x1={x(sel!)} x2={x(sel!)} y1={M.arriba} y2={M.arriba + hh} stroke="var(--muted-foreground)" strokeWidth={1} />
            {t.promedio != null && <circle cx={x(sel!)} cy={y(t.promedio)} r={5} fill={COLOR} stroke={SUPERFICIE} strokeWidth={2} />}
          </g>
        )}
        <rect x={M.izq} y={M.arriba} width={w} height={hh} fill="transparent" tabIndex={0}
          aria-label="Usá las flechas para recorrer los valores" className="cursor-crosshair outline-none"
          onPointerMove={elegir} onPointerDown={elegir} onPointerLeave={(e) => e.pointerType === 'mouse' && setSel(null)}
          onKeyDown={teclas} onBlur={() => setSel(null)} />
      </svg>

      {t && (
        <div aria-live="polite"
          className="pointer-events-none absolute top-1 z-10 min-w-36 rounded-xl border border-border bg-barra px-3 py-2 shadow-lg"
          style={x(sel!) > ancho / 2 ? { right: ancho - x(sel!) + 10 } : { left: x(sel!) + 10 }}>
          <div className="text-xs text-muted-foreground">{tramoTxt(periodo, t.inicio)}</div>
          {t.promedio == null ? <div className="text-sm text-tenue">Sin lecturas</div> : (
            <>
              <div className="flex items-center gap-2">
                <span className="h-0.5 w-3 rounded-full bg-primary" />
                <span className="font-heading text-lg font-medium">{fmt(t.promedio, 1)} °C</span>
              </div>
              <div className="text-xs text-muted-foreground">mín {fmt(t.minimo, 1)} · máx {fmt(t.maximo, 1)}</div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function Tabla({ tramos, periodo }: { tramos: Tramo[]; periodo: Periodo }) {
  return (
    <details className="group text-sm">
      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Ver como tabla</summary>
      <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-border">
        <table className="w-full tabular-nums">
          <thead className="sticky top-0 bg-popover text-left text-xs text-muted-foreground">
            <tr><th className="px-3 py-2 font-normal">Cuándo</th><th className="px-3 py-2 text-right font-normal">Promedio</th>
              <th className="px-3 py-2 text-right font-normal">Mín</th><th className="px-3 py-2 text-right font-normal">Máx</th></tr>
          </thead>
          <tbody>
            {[...tramos].reverse().map((t) => (
              <tr key={t.inicio.getTime()} className="border-t border-border">
                <td className="px-3 py-1.5">{tramoTxt(periodo, t.inicio)}</td>
                <td className="px-3 py-1.5 text-right">{fmt(t.promedio, 1)}</td>
                <td className="px-3 py-1.5 text-right text-muted-foreground">{fmt(t.minimo, 1)}</td>
                <td className="px-3 py-1.5 text-right text-muted-foreground">{fmt(t.maximo, 1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}
