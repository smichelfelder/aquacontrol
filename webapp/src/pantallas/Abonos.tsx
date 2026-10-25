// Plan semanal de abonos: una fila por producto y una columna por día (lunes a domingo).
// Tocar un día pone o saca el abono; cada casilla muestra la dosis según los litros netos.
import type { ReactNode } from 'react'
import { ABONOS, type Abono } from '@/data'
import { abonosDeHoy, dosisMl, indiceDia, litrosNetos } from '@/lib/acuario'
import { useGuardado } from '@/lib/guardado'
import { useAhora } from '@/lib/use-ahora'
import { cn } from '@/lib/utils'

const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']
const CORTOS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const CORTOS3 = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

interface Fila {
  abono: Abono
  dosis: string
  dias: number[]
  veces: number
  ok: boolean   // las veces por semana están dentro de lo que pide la etiqueta
}

export function Abonos() {
  const [g, cambiar] = useGuardado()
  const ahora = useAhora()
  const hoy = indiceDia(ahora)
  const neto = litrosNetos(g)

  const filas: Fila[] = ABONOS.map((abono) => {
    const dias = g.plan[abono.id] ?? [0, 0, 0, 0, 0, 0, 0]
    const veces = dias.reduce((a, b) => a + b, 0)
    return { abono, dosis: dosisMl(neto, abono.ml, abono.litros), dias, veces, ok: veces >= abono.min && veces <= abono.max }
  })
  const cambiarDia = (f: Fila, i: number) =>
    cambiar({ plan: { ...g.plan, [f.abono.id]: f.dias.map((v, j) => (j === i ? (v ? 0 : 1) : v)) } })

  const deHoy = abonosDeHoy(g, ahora)
  const plan = { filas, hoy, cambiarDia }

  return (
    <div className="flex flex-col gap-3 md:min-h-full md:gap-4">
      {/* Móvil: lo de hoy arriba y una tarjeta por producto */}
      <div className="md:hidden"><Hoy dia={DIAS[hoy]} abonos={deHoy} /></div>
      <PlanMovil {...plan} />
      {/* Tablet: una tabla con todos los productos y lo de hoy abajo */}
      <PlanTablet {...plan} />
      <div className="hidden md:block"><Hoy dia={DIAS[hoy]} abonos={deHoy} /></div>
    </div>
  )
}

type PropsPlan = { filas: Fila[]; hoy: number; cambiarDia: (f: Fila, i: number) => void }

function PlanMovil({ filas, hoy, cambiarDia }: PropsPlan) {
  return (
    <div className="flex flex-col gap-3 md:hidden">
      <div className="text-sm text-muted-foreground">Tocá un día para poner o quitar el abono.</div>
      {filas.map((f) => (
        <section key={f.abono.id} aria-label={f.abono.nombre}
          className="flex flex-col gap-2.5 rounded-[18px] border border-border bg-panel px-3.5 py-3">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <div className="font-heading text-[17px] font-medium">{f.abono.nombre}</div>
              <div className="text-xs text-tenue">{f.abono.regla} · {f.dosis} por toma</div>
            </div>
            <Veces f={f} className="[&>div:first-child]:text-sm [&>div:last-child]:text-[11px]" />
          </div>
          <div className="grid grid-cols-7 gap-[5px]">
            {f.dias.map((on, i) => (
              <Celda key={i} f={f} i={i} on={!!on} hoy={i === hoy} onClick={() => cambiarDia(f, i)}
                className="flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-[12px] p-0">
                <span className="text-[11px] text-muted-foreground">{CORTOS[i]}</span>
                <span className="font-heading text-sm">{on ? f.dosis.replace(' ml', '') : '—'}</span>
              </Celda>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

const COLUMNAS = 'grid grid-cols-[250px_repeat(7,minmax(0,1fr))_130px] items-center gap-2'

function PlanTablet({ filas, hoy, cambiarDia }: PropsPlan) {
  return (
    <div role="table" aria-label="Plan semanal de abonos"
      className="hidden flex-col gap-2.5 rounded-[22px] border border-border bg-panel px-[22px] py-[18px] md:flex">
      <div role="row" className={COLUMNAS}>
        <span role="columnheader" className="text-sm text-muted-foreground">Tocá un día para cambiarlo</span>
        {CORTOS3.map((c, i) => (
          <span key={c} role="columnheader" aria-label={DIAS[i]}
            className={cn('rounded-[10px] py-1.5 text-center text-base',
              i === hoy ? 'bg-primary font-semibold text-primary-foreground' : 'text-[#cfe3de]')}>
            {c}
          </span>
        ))}
        <span role="columnheader" className="text-right text-sm text-muted-foreground">Por semana</span>
      </div>
      {filas.map((f) => (
        <div key={f.abono.id} role="row" className={COLUMNAS}>
          <div role="rowheader" className="flex flex-col">
            <span className="font-heading text-[19px] font-medium">{f.abono.nombre}</span>
            <span className="text-[13px] text-tenue">{f.abono.regla} · {f.dosis}</span>
          </div>
          {f.dias.map((on, i) => (
            <span key={i} role="cell" className="contents">
              <Celda f={f} i={i} on={!!on} hoy={i === hoy} onClick={() => cambiarDia(f, i)}
                className="min-h-[72px] rounded-[14px] font-heading text-xl">
                {on ? f.dosis.replace(' ml', '') : '—'}
              </Celda>
            </span>
          ))}
          <span role="cell" className="contents"><Veces f={f} className="[&>div:first-child]:text-[17px] [&>div:last-child]:text-xs" /></span>
        </div>
      ))}
    </div>
  )
}

function Celda({ f, i, on, hoy, onClick, className, children }: {
  f: Fila; i: number; on: boolean; hoy: boolean; onClick: () => void; className: string; children: ReactNode
}) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on}
      aria-label={`${f.abono.nombre}, ${DIAS[i]}${hoy ? ' (hoy)' : ''}: ${on ? 'con abono' : 'sin abono'}`}
      className={cn('cursor-pointer border transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
        on ? 'border-primary/55 bg-primary/20 text-accent-foreground hover:bg-primary/28'
          : hoy ? 'border-[rgb(170_225_212/0.35)] bg-[rgb(170_225_212/0.07)] text-[#6f8a85] hover:bg-accent'
            : 'border-[rgb(170_225_212/0.14)] bg-transparent text-[#6f8a85] hover:bg-accent',
        className)}>
      {children}
    </button>
  )
}

function Veces({ f, className }: { f: Fila; className?: string }) {
  return (
    <div className={cn('shrink-0 text-right', className)}>
      <div className={cn('font-semibold', f.ok ? 'text-primary' : 'text-aviso')}>{f.veces} × semana</div>
      <div className="text-tenue">{f.abono.frec}</div>
    </div>
  )
}

function Hoy({ dia, abonos }: { dia: string; abonos: { nombre: string; dosis: string }[] }) {
  return (
    <section aria-label="Abono de hoy"
      className="flex flex-col gap-2 rounded-[18px] border border-primary/40 bg-[rgb(12_40_31/0.78)] px-4 py-3 md:flex-row md:flex-wrap md:items-center md:gap-[18px] md:rounded-[22px] md:px-[22px] md:py-[18px]">
      <div className="text-[13px] font-semibold tracking-[0.12em] text-primary uppercase md:text-[15px]">Hoy · {dia}</div>
      <div className="flex flex-wrap gap-2 md:contents">
        {abonos.map((a) => (
          <span key={a.nombre}
            className="flex items-baseline gap-1.5 rounded-[10px] bg-primary/12 px-3 py-1.5 text-[15px] md:gap-2.5 md:rounded-[12px] md:px-4 md:py-2">
            <span className="font-semibold md:font-heading md:text-xl md:font-medium">{a.nombre}</span>
            <span className="md:font-heading md:text-lg md:text-secondary-foreground">{a.dosis}</span>
          </span>
        ))}
        {!abonos.length && <span className="text-[15px] text-[#cfe3de] md:text-lg">Hoy no toca abono</span>}
      </div>
    </section>
  )
}
