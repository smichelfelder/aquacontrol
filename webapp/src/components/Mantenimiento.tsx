// Las piezas del modo mantenimiento en Inicio (pantalla «inicio» del diseño): la etiqueta de la
// barra, el cambio de agua, los paneles mientras dura y al volver, y los diálogos para empezar,
// ver el historial y registrar lo que se hizo.
import { useState, type ReactNode } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { IconoBorrar, IconoCambioAgua, IconoEditar, IconoFlecha, IconoFlechaIzq, IconoLlave, IconoReanudar } from '@/components/iconos'
import { fmt, litrosNetos } from '@/lib/acuario'
import type { RegMant } from '@/lib/guardado'
import { DURACIONES, faltan, haceTxt, medianoche, ordenado, reloj, TAREAS, type Mantenimiento } from '@/lib/mantenimiento'
import { useAhora } from '@/lib/use-ahora'
import { cn } from '@/lib/utils'

const DIA = 86400000
const SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const FOCO = 'focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none'
const BOTON = cn('cursor-pointer transition-[filter] hover:brightness-110 disabled:cursor-default', FOCO)
const SECUNDARIO = cn(BOTON, 'rounded-xl border border-input bg-transparent text-secondary-foreground hover:bg-accent')

const fechaCorta = (ms: number) => { const d = new Date(ms); return SEMANA[d.getDay()] + ' ' + d.getDate() + ' ' + MESES[d.getMonth()] }
const tareaTxt = (t: string, pct: number) => (t === 'Cambio de agua' ? `${t} · ${pct} %` : t)

/** Al lado del título: «Mantenimiento · 59:12» o «Volviendo a la normalidad». */
export function EtiquetaMant({ mt }: { mt: Mantenimiento }) {
  const { m, ahora } = mt
  if (!m) return null
  const activo = m.modo === 'activo'
  return (
    <span className={cn('flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-[13px] font-semibold whitespace-nowrap md:text-sm',
      activo ? 'border-mant/50 bg-mant/16 text-mant' : 'border-primary/45 bg-primary/14 text-[#a6e6cc]')}>
      <span className={cn('size-2 rounded-full', activo ? 'bg-mant' : 'bg-primary')} />
      {activo ? `Mantenimiento · ${reloj(faltan(m.fin, ahora))}` : 'Volviendo a la normalidad'}
    </span>
  )
}

/** Un botón de una fila de opciones (duración, %, tareas). */
function Opcion({ sel, onClick, tono = 'mant', className, children }: {
  sel: boolean; onClick: () => void; tono?: 'mant' | 'bien'; className?: string; children: ReactNode
}) {
  return (
    <button type="button" onClick={onClick} aria-pressed={sel}
      className={cn(BOTON, 'min-h-11 rounded-xl border px-3.5 font-semibold',
        tono === 'mant' ? 'border-mant/45' : 'border-primary/45',
        sel ? (tono === 'mant' ? 'bg-mant text-[#2a1d02]' : 'bg-primary text-primary-foreground')
          : (tono === 'mant' ? 'bg-transparent text-[#f6dca6]' : 'bg-transparent text-secondary-foreground'),
        className)}>
      {children}
    </button>
  )
}

/** Columna izquierda mientras dura: cuánta agua sacar y a qué temperatura poner la nueva. */
export function CambioAgua({ mt, temp }: { mt: Mantenimiento; temp: number | null }) {
  const { g, cambiar } = mt
  const neto = Math.round(litrosNetos(g))
  return (
    <section aria-labelledby="cambio-agua"
      className="flex flex-col gap-3.5 rounded-[20px] border border-mant/42 bg-[rgb(40_32_12/0.72)] px-4 py-3.5 backdrop-blur-sm md:col-start-1 md:row-start-1 md:rounded-[22px] md:px-6 md:py-4">
      <div className="flex min-h-11 flex-wrap items-center justify-between gap-2.5">
        <h2 id="cambio-agua" className="flex items-center gap-2.5 text-[13px] font-semibold tracking-[0.12em] text-mant md:text-base">
          <IconoCambioAgua size={20} /> CAMBIO DE AGUA
        </h2>
        <div role="group" aria-label="Porcentaje a cambiar" className="flex gap-2">
          {[20, 30, 50].map((p) => (
            <Opcion key={p} sel={g.mantPct === p} onClick={() => cambiar({ mantPct: p })} className="min-w-16 text-base md:text-[17px]">{p} %</Opcion>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5 md:gap-3.5">
        <div className="flex flex-col gap-1 rounded-2xl bg-mant/10 px-4 py-3 md:px-[18px] md:py-3.5">
          <span className="text-sm text-[#e6d3a8] md:text-[15px]">Sacá</span>
          <span className="font-heading text-[32px] leading-[1.1] font-medium md:text-[44px]">{Math.round(neto * g.mantPct / 100)} L</span>
          <span className="text-xs text-[#c9b88f] md:text-sm">{g.mantPct} % de {neto} L netos</span>
        </div>
        <div className="flex flex-col gap-1 rounded-2xl bg-mant/10 px-4 py-3 md:px-[18px] md:py-3.5">
          <span className="text-sm text-[#e6d3a8] md:text-[15px]">Agua nueva a</span>
          <span className="font-heading text-[32px] leading-[1.1] font-medium md:text-[44px]">{fmt(temp, 1)} °C</span>
          <span className="text-xs text-[#c9b88f] md:text-sm">La temperatura actual del acuario</span>
        </div>
      </div>
      <p className="text-sm text-[#e6d3a8] md:text-[15px]">Acondicioná el agua nueva antes de echarla al acuario.</p>
    </section>
  )
}

const EQUIPOS = [
  { nombre: 'CO2', estado: 'Apagado' },
  { nombre: 'Filtro', estado: 'Apagado' },
  { nombre: 'Calentador', estado: 'Apagado' },
  { nombre: 'Sondas', estado: 'Sin alarmas' },
  { nombre: 'Alimentador', estado: 'Sin tomas' },
]

/** Columna derecha mientras dura: cuenta regresiva, qué está apagado, +15 min y terminar. */
export function PanelActivo({ mt }: { mt: Mantenimiento }) {
  const { m, ahora } = mt
  if (m?.modo !== 'activo') return null
  const resto = faltan(m.fin, ahora)
  const poco = resto <= 300
  return (
    <section aria-label="Mantenimiento activo"
      className="flex flex-col gap-3 rounded-[20px] border border-mant/55 bg-[rgb(40_32_12/0.78)] px-4 py-4 backdrop-blur-sm md:flex-1 md:rounded-[22px] md:px-6 md:py-[18px]">
      <h2 className="flex items-center gap-2.5 text-[13px] font-semibold tracking-[0.12em] text-mant md:text-base">
        <IconoLlave size={20} /> MANTENIMIENTO
      </h2>
      <div className="flex flex-col gap-0.5">
        <span aria-live="polite" className="font-heading text-[48px] leading-none font-medium tracking-[-0.02em] md:text-[56px]">{reloj(resto)}</span>
        <span className={cn('text-sm md:text-[15px]', poco ? 'text-[#ffb08a]' : 'text-[#e6d3a8]')}>
          {poco ? 'Termina pronto · ¿necesitás más tiempo?' : 'restantes · después todo vuelve solo'}
        </span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {EQUIPOS.map((e) => (
          <li key={e.nombre} className="flex items-center gap-2.5 text-[15px] md:text-base">
            <span className="size-2 shrink-0 rounded-full bg-mant" />
            <span className="grow font-semibold">{e.nombre}</span>
            <span className="text-[#e6d3a8]">{e.estado}</span>
          </li>
        ))}
      </ul>
      <div className="mt-auto grid grid-cols-2 gap-2.5 pt-1">
        <button type="button" onClick={mt.masTiempo}
          className={cn(BOTON, 'min-h-[52px] rounded-[14px] border border-mant/55 bg-transparent text-lg font-semibold text-[#f6dca6]')}>+15 min</button>
        <button type="button" onClick={mt.terminar}
          className={cn(BOTON, 'min-h-[52px] rounded-[14px] bg-mant text-lg font-semibold text-[#2a1d02]')}>Terminar</button>
      </div>
    </section>
  )
}

/** Columna derecha al terminar: lo que se va encendiendo, en orden, y para adelantarlo. */
export function PanelReanudando({ mt }: { mt: Mantenimiento }) {
  const { m, ahora, reanudar } = mt
  if (m?.modo !== 'reanudando') return null
  const c = faltan(m.calentador, ahora)
  const p = faltan(m.sondas, ahora)
  const co2Ok = c === 0 || m.co2
  const pasos = [
    { nombre: 'Filtro', estado: 'Encendido', ok: true },
    { nombre: 'Calentador', estado: c > 0 ? `En ${reloj(c)} · que esté sumergido` : 'Encendido', ok: c === 0, boton: 'Encender ya', forzar: () => reanudar({ calentador: 0 }) },
    { nombre: 'CO2', estado: co2Ok ? 'Según su horario' : 'Después del calentador', ok: co2Ok, boton: 'Activar ya', forzar: () => reanudar({ co2: true }) },
    { nombre: 'Sondas', estado: p > 0 ? `Alarmas en ${reloj(p)}` : 'Normal, con alarmas', ok: p === 0, boton: 'Activar ya', forzar: () => reanudar({ sondas: 0 }) },
    { nombre: 'Alimentador', estado: 'Según su horario', ok: true },
  ]
  const pendientes = !(c === 0 && p === 0 && co2Ok)
  return (
    <section aria-label="Volviendo a la normalidad"
      className="flex flex-col gap-3.5 rounded-[20px] border border-primary/42 bg-[rgb(12_40_31/0.78)] px-4 py-4 backdrop-blur-sm md:flex-1 md:rounded-[22px] md:px-6 md:py-[18px]">
      <h2 className="flex items-center gap-2.5 text-[13px] font-semibold tracking-[0.12em] text-primary md:text-base">
        <IconoReanudar size={20} /> VOLVIENDO A LA NORMALIDAD
      </h2>
      <ol className="flex flex-col gap-1.5">
        {pasos.map((x) => (
          <li key={x.nombre} className="flex min-h-11 items-center gap-3">
            <span className={cn('flex size-[26px] shrink-0 items-center justify-center rounded-full text-[13px] font-bold',
              x.ok ? 'bg-primary text-primary-foreground' : 'bg-mant/22 text-mant')}>{x.ok ? '✓' : '…'}</span>
            <span className="flex min-w-0 grow flex-col gap-px">
              <span className="text-base font-semibold md:text-[17px]">{x.nombre}</span>
              <span className={cn('text-[13px] md:text-sm', x.ok ? 'text-muted-foreground' : 'text-mant')}>{x.estado}</span>
            </span>
            {!x.ok && x.forzar && (
              <button type="button" onClick={x.forzar} aria-label={`${x.boton}: ${x.nombre}`}
                className={cn(BOTON, 'min-h-11 shrink-0 rounded-xl border border-mant/55 bg-transparent px-3.5 text-[15px] font-semibold text-[#f6dca6]')}>
                {x.boton}
              </button>
            )}
          </li>
        ))}
      </ol>
      {pendientes && (
        <button type="button" onClick={() => reanudar({ calentador: 0, sondas: 0, co2: true })}
          className={cn(BOTON, 'mt-auto min-h-[52px] rounded-[14px] bg-primary text-lg font-semibold text-primary-foreground')}>
          Encender todo ahora
        </button>
      )}
    </section>
  )
}

const EMPEZAR = [
  { nombre: 'CO2', txt: 'Se apaga primero' },
  { nombre: 'Filtro', txt: 'Se apaga' },
  { nombre: 'Calentador', txt: 'Se apaga, antes de bajar el nivel' },
  { nombre: 'Sondas', txt: 'Siguen midiendo, sin alarmas ni registro' },
  { nombre: 'Alimentador', txt: 'Sin tomas automáticas' },
]

/** El diálogo del botón «Mantenimiento»: empezar (qué se apaga y cuánto tiempo) o el historial. */
export function DialogoMant({ mt, abierto, cambiarAbierto }: { mt: Mantenimiento; abierto: boolean; cambiarAbierto: (a: boolean) => void }) {
  const [tab, setTab] = useState<'empezar' | 'historial'>('empezar')
  const { g, cambiar } = mt
  const abrir = (a: boolean) => { if (a) setTab('empezar'); cambiarAbierto(a) }
  const pestana = (id: typeof tab) => cn(BOTON, 'min-h-11 rounded-[10px] px-6 text-base font-semibold md:text-[17px]',
    tab === id ? 'bg-mant text-[#2a1d02]' : 'bg-transparent text-secondary-foreground')
  return (
    <Dialog open={abierto} onOpenChange={abrir}>
      <DialogContent className="flex max-w-[800px] flex-col gap-4 border-mant/40 bg-[#10272a] px-4 pt-5 pb-5 md:h-[664px] md:px-8 md:pt-6 md:pb-7">
        <DialogTitle className="pr-10 text-2xl md:text-[30px] md:leading-[48px]">Mantenimiento</DialogTitle>
        <div role="tablist" aria-label="Mantenimiento" className="flex gap-1.5 self-start rounded-[14px] bg-muted p-1">
          <button type="button" role="tab" aria-selected={tab === 'empezar'} onClick={() => setTab('empezar')} className={pestana('empezar')}>Empezar</button>
          <button type="button" role="tab" aria-selected={tab === 'historial'} onClick={() => setTab('historial')} className={pestana('historial')}>
            Historial · {g.mantHist.length}
          </button>
        </div>

        {tab === 'empezar' ? (
          <div role="tabpanel" aria-label="Empezar" className="flex min-h-0 grow flex-col gap-4">
            <DialogDescription className="text-base text-muted-foreground md:text-[17px]">
              Para cambiar el agua, podar o limpiar con el acuario en calma.
            </DialogDescription>
            <ul className="flex flex-col border-t border-[rgb(170_225_212/0.14)]">
              {EMPEZAR.map((e) => (
                <li key={e.nombre} className="flex min-h-[42px] items-center gap-3 border-b border-[rgb(170_225_212/0.14)] py-1.5 text-[15px] md:text-[17px]">
                  <span className="w-28 shrink-0 font-semibold md:w-[130px]">{e.nombre}</span>
                  <span className="text-[#e6d3a8]">{e.txt}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center justify-between gap-3 md:gap-4">
              <span className="text-base font-semibold md:text-[17px]">Duración</span>
              <div role="group" aria-label="Duración" className="flex gap-2">
                {DURACIONES.map((d) => (
                  <Opcion key={d} sel={g.mantDur === d} onClick={() => cambiar({ mantDur: d })} className="min-h-12 min-w-[84px] text-base md:min-w-[92px] md:text-[17px]">{d} min</Opcion>
                ))}
              </div>
            </div>
            <p className="text-sm text-tenue md:text-[15px]">Al terminar el tiempo todo vuelve solo. Si se corta la luz, el acuario arranca en modo normal.</p>
            <div className="mt-auto flex justify-end gap-3">
              <button type="button" onClick={() => abrir(false)} className={cn(SECUNDARIO, 'min-h-[52px] rounded-[14px] px-6 text-lg')}>Cancelar</button>
              <button type="button" onClick={() => { mt.empezar(); abrir(false) }}
                className={cn(BOTON, 'min-h-[52px] rounded-[14px] bg-mant px-7 text-lg font-semibold text-[#2a1d02]')}>Empezar</button>
            </div>
          </div>
        ) : <Historial mt={mt} />}
      </DialogContent>
    </Dialog>
  )
}

type Borrador = { fecha: number; tareas: string[]; pct: number }

function Historial({ mt }: { mt: Mantenimiento }) {
  const { g, cambiar } = mt
  const [editId, setEditId] = useState<string | null>(null)
  const [b, setB] = useState<Borrador | null>(null)
  const [borrarId, setBorrarId] = useState<string | null>(null)
  const [todo, setTodo] = useState(false)
  const hoy = medianoche(useAhora().getTime())
  const lista = ordenado(g.mantHist)
  const cerrar = () => { setEditId(null); setB(null); setBorrarId(null); setTodo(false) }

  return (
    <div role="tabpanel" aria-label="Historial" className="flex min-h-0 grow flex-col gap-3">
      <div className="flex min-h-0 grow flex-col gap-2.5 overflow-y-auto pr-1.5">
        {lista.map((e) => {
          const editando = editId === e.id && !!b
          const confirmando = borrarId === e.id
          const ft = fechaCorta(e.fecha)
          const tags = TAREAS.filter((t) => e.tareas.includes(t)).map((t) => tareaTxt(t, e.pct))
          return (
            <div key={e.id} className={cn('flex shrink-0 flex-col gap-3 rounded-2xl border bg-[rgb(170_225_212/0.06)] py-2.5 pr-3.5 pl-4 md:pl-[18px]',
              editando ? 'border-primary/50' : confirmando ? 'border-[#ffb08a]/50' : 'border-[rgb(170_225_212/0.12)]')}>
              {!editando && !confirmando && (
                <div className="flex flex-wrap items-center gap-3 md:flex-nowrap md:gap-4">
                  <div className="flex w-[150px] shrink-0 flex-col gap-0.5">
                    <span className="font-heading text-lg font-medium">{ft}</span>
                    <span className="text-sm text-tenue">{haceTxt(e.fecha, hoy)}</span>
                  </div>
                  <div className="order-last flex min-w-0 grow basis-full flex-wrap gap-1.5 md:order-none md:basis-auto">
                    {(tags.length ? tags : ['Sin tareas']).map((t) => (
                      <span key={t} className="rounded-full bg-primary/14 px-3 py-[5px] text-sm text-secondary-foreground md:text-[15px]">{t}</span>
                    ))}
                  </div>
                  <div className="ml-auto flex shrink-0 gap-2">
                    <button type="button" aria-label={`Editar ${ft}`} className={cn(SECUNDARIO, 'flex size-12 items-center justify-center')}
                      onClick={() => { cerrar(); setEditId(e.id); setB({ fecha: e.fecha, tareas: [...e.tareas], pct: e.pct }) }}>
                      <IconoEditar size={20} />
                    </button>
                    <button type="button" aria-label={`Borrar ${ft}`} onClick={() => { cerrar(); setBorrarId(e.id) }}
                      className={cn(BOTON, 'flex size-12 items-center justify-center rounded-xl border border-[#ffb08a]/40 bg-transparent text-[#ffb08a]')}>
                      <IconoBorrar size={20} />
                    </button>
                  </div>
                </div>
              )}

              {confirmando && (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="grow text-base md:text-[17px]">¿Borrar el mantenimiento del {ft}?</span>
                  <button type="button" onClick={() => setBorrarId(null)} className={cn(SECUNDARIO, 'min-h-12 px-5 text-base md:text-[17px]')}>No</button>
                  <button type="button" onClick={() => { cambiar({ mantHist: g.mantHist.filter((x) => x.id !== e.id) }); setBorrarId(null) }}
                    className={cn(BOTON, 'min-h-12 rounded-xl bg-[#ffb08a] px-5 text-base font-semibold text-[#2a0f02] md:text-[17px]')}>Sí, borrar</button>
                </div>
              )}

              {editando && b && (
                <div className="flex flex-col gap-3 py-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="w-[120px] text-base font-semibold">Fecha</span>
                    <div className="flex items-center gap-2.5">
                      <button type="button" aria-label="Día anterior" onClick={() => setB({ ...b, fecha: b.fecha - DIA })}
                        className={cn(SECUNDARIO, 'flex size-12 items-center justify-center')}><IconoFlechaIzq size={20} /></button>
                      <span className="min-w-[150px] text-center font-heading text-lg md:min-w-[190px]">{fechaCorta(b.fecha)}</span>
                      <button type="button" aria-label="Día siguiente" disabled={b.fecha >= hoy} onClick={() => setB({ ...b, fecha: Math.min(hoy, b.fecha + DIA) })}
                        className={cn(SECUNDARIO, 'flex size-12 items-center justify-center disabled:opacity-35')}><IconoFlecha size={20} /></button>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-start gap-2.5">
                    <span className="w-[120px] shrink-0 pt-3 text-base font-semibold">Tareas</span>
                    <div role="group" aria-label="Tareas" className="flex flex-1 flex-wrap gap-2">
                      {TAREAS.map((t) => {
                        const sel = b.tareas.includes(t)
                        return (
                          <Opcion key={t} tono="bien" sel={sel} className="text-base"
                            onClick={() => setB({ ...b, tareas: sel ? b.tareas.filter((x) => x !== t) : [...b.tareas, t] })}>
                            {(sel ? '✓ ' : '') + t}
                          </Opcion>
                        )
                      })}
                    </div>
                  </div>
                  {b.tareas.includes('Cambio de agua') && (
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="w-[120px] shrink-0 text-base font-semibold">Agua cambiada</span>
                      <div role="group" aria-label="Porcentaje de agua cambiada" className="flex flex-wrap gap-2">
                        {[10, 20, 30, 40, 50].map((p) => (
                          <Opcion key={p} sel={b.pct === p} onClick={() => setB({ ...b, pct: p })} className="min-w-16 px-3 text-base">{p} %</Opcion>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex justify-end gap-2.5">
                    <button type="button" onClick={cerrar} className={cn(SECUNDARIO, 'min-h-12 px-5 text-base md:text-[17px]')}>Cancelar</button>
                    <button type="button" disabled={!b.tareas.length}
                      onClick={() => { cambiar({ mantHist: g.mantHist.map((x) => (x.id === e.id ? { ...x, ...b } : x)) }); cerrar() }}
                      className={cn(BOTON, 'min-h-12 rounded-xl bg-primary px-6 text-base font-semibold text-primary-foreground disabled:opacity-40 md:text-[17px]')}>
                      Guardar cambios
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
        {!lista.length && <div className="py-10 text-center text-base text-muted-foreground md:text-[17px]">Todavía no hay mantenimientos registrados.</div>}
      </div>

      {lista.length > 0 && !todo && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-tenue">Tocá el lápiz para corregir un día, o la papelera para borrarlo.</span>
          <button type="button" onClick={() => { cerrar(); setTodo(true) }}
            className={cn(BOTON, 'min-h-12 shrink-0 rounded-xl border border-[#ffb08a]/45 bg-transparent px-5 text-base font-semibold text-[#ffb08a]')}>
            Borrar todo el historial
          </button>
        </div>
      )}
      {lista.length > 0 && todo && (
        <div className="flex flex-wrap items-center gap-3 rounded-[14px] border border-[#ffb08a]/40 bg-[#ffb08a]/12 py-2.5 pr-3.5 pl-[18px]">
          <span className="grow text-base">Se borran los {lista.length} registros. No se puede deshacer.</span>
          <button type="button" onClick={() => setTodo(false)} className={cn(SECUNDARIO, 'min-h-12 px-5 text-base')}>Cancelar</button>
          <button type="button" onClick={() => { cambiar({ mantHist: [] }); cerrar() }}
            className={cn(BOTON, 'min-h-12 rounded-xl bg-[#ffb08a] px-5 text-base font-semibold text-[#2a0f02]')}>Borrar todo</button>
        </div>
      )}
    </div>
  )
}

/** Al terminar: qué se hizo, para el historial. */
export function DialogoRegistro({ mt }: { mt: Mantenimiento }) {
  const { g, m, reanudar } = mt
  const abierto = m?.modo === 'reanudando' && m.registro
  const [hechas, setHechas] = useState<string[]>([])
  const omitir = () => { setHechas([]); reanudar({ registro: false }) }
  const guardar = () => {
    const tareas = TAREAS.filter((t) => hechas.includes(t))
    setHechas([])
    if (!tareas.length) { reanudar({ registro: false }); return }
    const nuevo: RegMant = { id: 'm' + Date.now().toString(36), fecha: medianoche(Date.now()), tareas, pct: g.mantPct }
    reanudar({ registro: false }, { mantHist: [...g.mantHist, nuevo] })
  }
  return (
    <Dialog open={abierto} onOpenChange={(a) => { if (!a) omitir() }}>
      <DialogContent className="flex max-w-[660px] flex-col gap-5 border-primary/40 bg-[#10272a] px-5 py-6 md:px-9 md:py-[30px]">
        <div className="flex flex-col gap-1.5 pr-10">
          <DialogTitle className="text-2xl md:text-[30px]">Mantenimiento terminado</DialogTitle>
          <DialogDescription className="text-base text-muted-foreground md:text-[17px]">El filtro ya está en marcha. ¿Qué hiciste hoy?</DialogDescription>
        </div>
        <div role="group" aria-label="Tareas hechas" className="flex flex-wrap gap-2.5">
          {TAREAS.map((t) => {
            const sel = hechas.includes(t)
            return (
              <Opcion key={t} tono="bien" sel={sel} className="min-h-[52px] rounded-[14px] px-5 text-base md:text-lg"
                onClick={() => setHechas(sel ? hechas.filter((x) => x !== t) : [...hechas, t])}>
                {(sel ? '✓ ' : '') + tareaTxt(t, g.mantPct)}
              </Opcion>
            )
          })}
        </div>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={omitir} className={cn(SECUNDARIO, 'min-h-[52px] rounded-[14px] px-6 text-lg')}>Omitir</button>
          <button type="button" onClick={guardar} className={cn(BOTON, 'min-h-[52px] rounded-[14px] bg-primary px-7 text-lg font-semibold text-primary-foreground')}>Guardar</button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
