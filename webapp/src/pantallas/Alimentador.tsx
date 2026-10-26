import { useEffect, useState, type ReactNode } from 'react'
import { IconoMas } from '@/components/iconos'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { indiceDia } from '@/lib/acuario'
import { pulsar, tiene, useCentral } from '@/lib/central'
import { comidaServida, horaToma, minutos, proximasTomas, vueltasTxt } from '@/lib/comida'
import { useGuardado, type Toma } from '@/lib/guardado'
import { useAhora } from '@/lib/use-ahora'
import { cn } from '@/lib/utils'
import type { Barra } from '@/App'

const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']
const CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const LETRAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const CAPACIDAD = 40  // vueltas que entran en el tambor lleno
const PAUSAS = [5, 10, 15]

// Toma · 7 días · activa. Las del diseño desde 1280 px; más chico, las columnas se achican.
const COLUMNAS = 'md:grid md:grid-cols-[120px_repeat(7,minmax(0,1fr))_76px] md:gap-1.5 lg:grid-cols-[104px_repeat(7,minmax(0,1fr))_64px] xl:grid-cols-[150px_repeat(7,minmax(0,1fr))_120px] xl:gap-2'
const TITULO = 'text-[13px] font-semibold tracking-[0.1em] text-muted-foreground'
const TARJETA = 'rounded-[20px] border border-border bg-panel px-4 py-3.5 backdrop-blur-sm md:rounded-[22px] md:px-5 md:py-4'
const pildora = (on: boolean) => on
  ? 'border-primary/60 bg-primary/22 text-accent-foreground hover:bg-primary/30'
  : 'border-input bg-transparent text-[#cfe3de]'

export function Alimentador({ barra }: { barra: (b: Barra | null) => void }) {
  const central = useCentral()
  const [g, cambiar] = useGuardado()
  const ahora = useAhora()
  const [form, setForm] = useState<Form | null>(null)
  const hoy = indiceDia(ahora)
  const ya = ahora.getHours() * 60 + ahora.getMinutes()

  const orden = [...g.tomas].sort((a, b) => minutos(a) - minutos(b))
  const activas = orden.filter((t) => t.activa)
  const futuras = proximasTomas(g.tomas, ahora)
  const prox = futuras[0]
  const proxId = prox?.off === 0 ? prox.t.id : null

  const porDia = DIAS.map((_, d) => activas.filter((t) => t.dias[d]).length)
  const total = porDia.reduce((a, b) => a + b, 0)
  const ayuno = DIAS.filter((_, d) => !porDia[d])
  const ayunoTxt = !activas.length ? '' : !ayuno.length ? 'Sin día de ayuno.'
    : ayuno.length === 1 ? `Ayuno el ${ayuno[0]}.` : `Ayuno: ${ayuno.join(', ')}.`

  const nueva = () => setForm(FORM_NUEVO)
  useEffect(() => {
    barra({ titulo: 'Horario de comida', junto: <PorSemana total={total} />, accion: <BotonAgregar onClick={() => setForm(FORM_NUEVO)} /> })
  }, [total, barra])
  useEffect(() => () => barra(null), [barra])

  const cambiarToma = (id: string, p: Partial<Toma>) => cambiar({ tomas: g.tomas.map((t) => (t.id === id ? { ...t, ...p } : t)) })
  const quitar = (id: string) => { cambiar({ tomas: g.tomas.filter((t) => t.id !== id) }); setForm(null) }

  return (
    <div className="flex flex-col gap-3.5 md:gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_330px] lg:grid-rows-[auto_auto_1fr]">
      <div className="flex flex-wrap items-center justify-between gap-2.5 md:hidden">
        <PorSemana total={total} />
        <BotonAgregar onClick={nueva} />
      </div>

      <Proxima prox={prox} ahora={ahora} servida={comidaServida(g, ahora)} pausa={g.pausa}
        hayComedero={tiene('button/Alimentar')} alimentar={() => { pulsar('button/Alimentar'); cambiar({ comida: Date.now(), filtro: true }) }} />

      <section aria-label="Tomas de la semana"
        className="flex flex-col gap-3 md:gap-1.5 md:rounded-[22px] md:border md:border-border md:bg-panel md:px-5 md:pt-3.5 md:pb-3 md:backdrop-blur-sm lg:col-start-1 lg:row-span-3 lg:row-start-1 lg:px-[22px]">
        <div aria-hidden="true" className={cn('hidden items-end border-b border-[rgb(170_225_212/0.12)] pb-2', COLUMNAS)}>
          <span className={TITULO}>TOMA</span>
          {CORTOS.map((c, i) => (
            <span key={c} className={cn('rounded-[10px] py-1.5 text-center text-[15px] xl:text-base',
              i === hoy ? 'bg-primary font-semibold text-primary-foreground' : 'text-[#cfe3de]')}>{c}</span>
          ))}
          <span className={cn(TITULO, 'text-right')}>ACTIVA</span>
        </div>

        {orden.map((t) => {
          const editar = () => setForm({ id: t.id, h: t.h, m: t.m, dias: [...t.dias], vueltas: t.vueltas, intento: false })
          const activa = <Interruptor on={t.activa} label={`Toma de las ${horaToma(t)}, ${t.activa ? 'activa' : 'en pausa'}`}
            onClick={() => cambiarToma(t.id, { activa: !t.activa })} />
          return (
            <div key={t.id} className={cn('flex flex-col gap-2.5 rounded-[18px] border border-border bg-panel px-3.5 py-3',
              'md:items-center md:rounded-none md:border-0 md:bg-transparent md:px-0 md:py-[7px]', COLUMNAS, !t.activa && 'opacity-50')}>
              <div className="flex items-center justify-between gap-2 md:block">
                <button type="button" onClick={editar} aria-label={`Cambiar la toma de las ${horaToma(t)}`}
                  className="flex cursor-pointer flex-col items-start gap-0.5 rounded-[12px] py-1 text-left focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none md:min-h-16">
                  <span className="flex items-center gap-2">
                    <span className="font-heading text-[26px] leading-[1.1] font-medium tabular-nums xl:text-[30px]">{horaToma(t)}</span>
                    <IconoLapiz />
                  </span>
                  <span className="text-sm text-muted-foreground">{vueltasTxt(t.vueltas)}</span>
                </button>
                <span className="md:hidden">{activa}</span>
              </div>

              <div className="grid grid-cols-7 gap-1.5 md:contents">
                {t.dias.map((on, i) => {
                  let sub = on ? (t.vueltas === 1 ? 'vuelta' : 'vueltas') : ''
                  if (on && i === hoy && t.activa) {
                    if (minutos(t) <= ya) sub = 'hecha'
                    else if (t.id === proxId) sub = 'próxima'
                  }
                  return (
                    <button key={i} type="button" aria-pressed={!!on}
                      aria-label={`${horaToma(t)}, ${DIAS[i]}${on ? ', con comida' : ', sin comida'}`}
                      onClick={() => cambiarToma(t.id, { dias: t.dias.map((v, j) => (j === i ? (v ? 0 : 1) : v)) })}
                      className={cn('flex min-h-[52px] cursor-pointer flex-col items-center justify-center gap-0.5 rounded-[12px] border p-0 transition-colors md:min-h-16 md:rounded-[14px]',
                        'focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
                        on ? 'border-primary/55 bg-primary/20 text-accent-foreground hover:bg-primary/28'
                          : cn('border-[rgb(170_225_212/0.14)] text-[#6f8a85] hover:bg-accent', i === hoy && 'bg-[rgb(170_225_212/0.06)]'))}>
                      <span className="text-[11px] text-muted-foreground md:hidden">{LETRAS[i]}</span>
                      <span className="font-heading text-base font-medium md:text-lg">{on ? `${t.vueltas}×` : '—'}</span>
                      {sub && <span className={cn('hidden text-xs md:block lg:hidden xl:block', sub === 'próxima' ? 'text-primary' : 'text-muted-foreground')}>{sub}</span>}
                    </button>
                  )
                })}
              </div>

              <div className="hidden justify-end md:flex">{activa}</div>
            </div>
          )
        })}

        {!g.tomas.length && (
          <div className="flex flex-col items-center gap-1.5 rounded-[18px] border border-border bg-panel px-4 py-7 text-center md:border-0 md:bg-transparent">
            <span className="font-heading text-xl md:text-[22px]">No hay tomas programadas</span>
            <span className="text-[15px] text-muted-foreground md:text-base">Tocá «Agregar toma» y elegí la hora y los días.</span>
          </div>
        )}

        {g.tomas.length > 0 && (
          <p className="flex items-start gap-2.5 text-sm text-muted-foreground md:mt-auto md:border-t md:border-[rgb(170_225_212/0.12)] md:pt-3 md:text-[15px]">
            <IconoInfo />
            <span>{ayunoTxt} Tocá un día para activarlo o quitarlo; tocá la hora para cambiarla.</span>
          </p>
        )}
      </section>

      <Estado tambor={central.sondas.tambor} bateria={central.sondas.bateriaAlim} conectado={central.conectado}
        hayComedero={tiene('button/Alimentar')} futuras={futuras} ahora={ahora} />

      <div role="group" aria-labelledby="pausa-filtro" className={cn(TARJETA, 'flex flex-col gap-2.5 lg:self-start')}>
        <span id="pausa-filtro" className="text-base">Filtro apagado en cada toma</span>
        <div className="grid grid-cols-3 gap-2">
          {PAUSAS.map((n) => (
            <Button key={n} variant="ghost" aria-pressed={g.pausa === n} onClick={() => cambiar({ pausa: n })}
              className={cn('h-12 rounded-[12px] border text-base font-normal', pildora(g.pausa === n))}>{n} min</Button>
          ))}
        </div>
      </div>

      <Formulario form={form} setForm={setForm} tomas={g.tomas} quitar={quitar}
        guardar={(t) => cambiar({ tomas: g.tomas.some((x) => x.id === t.id) ? g.tomas.map((x) => (x.id === t.id ? t : x)) : [...g.tomas, t] })} />
    </div>
  )
}

const PorSemana = ({ total }: { total: number }) => (
  <span className="rounded-full border border-border bg-panel px-3.5 py-1.5 text-sm whitespace-nowrap text-[#cfe3de] md:text-base">
    {total} {total === 1 ? 'toma' : 'tomas'} por semana
  </span>
)

const BotonAgregar = ({ onClick }: { onClick: () => void }) => (
  <Button onClick={onClick} className="h-12 gap-2 rounded-full px-5 text-base font-semibold md:px-[22px] md:text-[17px]">
    <IconoMas size={18} /> Agregar toma
  </Button>
)

function Interruptor({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={onClick}
      className="group flex h-12 w-[72px] cursor-pointer items-center justify-end focus-visible:outline-none">
      <span className={cn('relative h-8 w-[58px] rounded-full transition-colors group-focus-visible:ring-3 group-focus-visible:ring-ring/50',
        on ? 'bg-primary' : 'bg-[rgb(170_225_212/0.22)]')}>
        <span className={cn('absolute top-1 size-6 rounded-full bg-[#f2f7f6] transition-[left]', on ? 'left-[30px]' : 'left-1')} />
      </span>
    </button>
  )
}

/** «mié 29 oct» dentro de off días. */
function fecha(ahora: Date, off: number) {
  const d = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + off)
  return `${CORTOS[indiceDia(d)].toLowerCase()} ${d.getDate()} ${MESES[d.getMonth()]}`
}

type Futuras = ReturnType<typeof proximasTomas>

function Proxima({ prox, ahora, servida, pausa, hayComedero, alimentar }: {
  prox?: Futuras[number]; ahora: Date; servida: boolean; pausa: number; hayComedero: boolean; alimentar: () => void
}) {
  let dia = ''
  let sub = 'Activá una toma para programar la comida.'
  if (prox) {
    const falta = prox.off * 1440 + minutos(prox.t) - (ahora.getHours() * 60 + ahora.getMinutes())
    const h = Math.floor(falta / 60)
    dia = prox.off === 0 ? 'Hoy' : prox.off === 1 ? 'Mañana' : fecha(ahora, prox.off)
    sub = `En ${h > 0 ? h + ' h ' : ''}${falta % 60} min · ${vueltasTxt(prox.t.vueltas)}`
  }
  return (
    <section aria-labelledby="proxima-toma"
      className="flex flex-col gap-2.5 rounded-[20px] border border-primary/42 bg-[rgb(12_40_31/0.74)] px-4 py-3.5 backdrop-blur-sm md:rounded-[22px] md:px-5 md:py-4 lg:col-start-2 lg:row-start-1">
      <h2 id="proxima-toma" className="text-[13px] font-semibold tracking-[0.12em] text-primary md:text-sm">PRÓXIMA TOMA</h2>
      <div className="flex items-baseline gap-3">
        <span className="font-heading text-[40px] leading-none font-medium tabular-nums md:text-[46px]">{prox ? horaToma(prox.t) : '--:--'}</span>
        <span className="text-[17px] text-[#d6f3e6]">{dia}</span>
      </div>
      <span className="text-[15px] text-muted-foreground">{sub}</span>
      {servida ? (
        <span role="status" className="flex min-h-[50px] items-center justify-center gap-2 rounded-[14px] border border-primary/35 text-base text-[#d6f3e6]">
          <IconoListo /> Servida · filtro en pausa {pausa} min
        </span>
      ) : (
        <Button variant="ghost" onClick={alimentar} disabled={!hayComedero}
          className="h-[50px] rounded-[14px] border border-primary/55 bg-primary/14 text-[17px] font-semibold text-accent-foreground hover:bg-primary/22">
          Alimentar ahora
        </Button>
      )}
      {!hayComedero && <span className="text-sm text-tenue">Se activa en la etapa 5</span>}
    </section>
  )
}

function Estado({ tambor, bateria, conectado, hayComedero, futuras, ahora }: {
  tambor: number | null; bateria: number | null; conectado: boolean; hayComedero: boolean; futuras: Futuras; ahora: Date
}) {
  const pct = tambor == null ? null : Math.max(0, Math.min(100, Math.round(tambor / CAPACIDAD * 100)))
  const color = pct == null ? 'bg-tenue' : pct <= 15 ? 'bg-alerta' : pct <= 35 ? 'bg-aviso' : 'bg-primary'
  const texto = pct == null ? 'text-tenue' : pct <= 15 ? 'text-alerta' : pct <= 35 ? 'text-aviso' : 'text-primary'

  // Hasta cuándo alcanza lo que queda en el tambor
  let alcanza = 'Se activa en la etapa 5'
  if (tambor != null) {
    let quedan = tambor
    let ultima: Futuras[number] | null = null
    for (const f of futuras) {
      if (quedan < f.t.vueltas) break
      quedan -= f.t.vueltas
      ultima = f
    }
    alcanza = !futuras.length ? 'Sin tomas activas.'
      : !ultima ? 'Rellená el tambor antes de la próxima toma.'
        : (ultima === futuras[futuras.length - 1] ? 'Alcanza para más de dos semanas' : `Alcanza hasta el ${fecha(ahora, ultima.off)}, ${horaToma(ultima.t)}`)
          + '. Se recalcula sola al sacar el tambor para rellenarlo.'
  }
  const enLinea = conectado && hayComedero

  return (
    <section aria-labelledby="estado-alimentador" className={cn(TARJETA, 'flex flex-col gap-3 lg:col-start-2 lg:row-start-2')}>
      <h2 id="estado-alimentador" className="text-[13px] font-semibold tracking-[0.12em] text-tenue md:text-sm">ALIMENTADOR</h2>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between">
          <span className="text-base">Comida en el tambor</span>
          <span className={cn('font-heading text-lg', texto)}>{pct == null ? '—' : pct + '%'}</span>
        </div>
        <span className="block h-2 overflow-hidden rounded-full bg-[rgb(170_225_212/0.14)]">
          <span className={cn('block h-2 rounded-full', color)} style={{ width: (pct ?? 0) + '%' }} />
        </span>
        <span className="text-sm text-muted-foreground">{alcanza}</span>
      </div>
      <div className="flex items-baseline justify-between gap-2.5">
        <span className="text-base">Batería</span>
        <span className="text-[15px] text-[#cfe3de]">{bateria == null ? '—' : Math.round(bateria) + ' %'}</span>
      </div>
      <div className="flex items-center justify-between gap-2.5">
        <span className="text-base">Conexión</span>
        <span className="flex items-center gap-2 text-[15px] text-[#cfe3de]">
          <span className={cn('block size-[9px] rounded-full', enLinea ? 'bg-primary' : 'bg-aviso')} />
          {enLinea ? 'En línea' : hayComedero ? 'Sin conexión' : 'Sin instalar'}
        </span>
      </div>
    </section>
  )
}

/* ---------- Agregar o cambiar una toma ---------- */

interface Form { id: string | null; h: number; m: number; dias: number[]; vueltas: number; intento: boolean }

const FORM_NUEVO: Form = { id: null, h: 12, m: 0, dias: [1, 1, 1, 1, 1, 1, 1], vueltas: 1, intento: false }
const PRESETS = [
  { txt: 'Todos los días', d: [1, 1, 1, 1, 1, 1, 1] },
  { txt: 'Lunes a sábado', d: [1, 1, 1, 1, 1, 1, 0] },
  { txt: 'Lunes a viernes', d: [1, 1, 1, 1, 1, 0, 0] },
  { txt: 'Fin de semana', d: [0, 0, 0, 0, 0, 1, 1] },
]

function Formulario({ form, setForm, tomas, guardar, quitar }: {
  form: Form | null; setForm: (f: Form | null) => void; tomas: Toma[]; guardar: (t: Toma) => void; quitar: (id: string) => void
}) {
  // Lo último que se mostró, para que no se vacíe mientras se cierra
  const [ultimo, setUltimo] = useState(form ?? FORM_NUEVO)
  if (form && form !== ultimo) setUltimo(form)
  const f = form ?? ultimo

  const sinDias = f.dias.every((v) => !v)
  const repetida = tomas.some((t) => t.id !== f.id && t.h === f.h && t.m === f.m)
  const valido = !sinDias && !repetida
  const error = repetida ? `Ya hay una toma a las ${horaToma(f)}. Elegí otra hora.` : sinDias && f.intento ? 'Elegí al menos un día.' : ''
  const poner = (p: Partial<Form>) => setForm({ ...f, ...p })
  const mover = (dm: number) => {
    const tot = ((minutos(f) + dm) % 1440 + 1440) % 1440
    poner({ h: Math.floor(tot / 60), m: tot % 60 })
  }

  const listo = () => {
    if (!valido) { poner({ intento: true }); return }
    const antes = tomas.find((t) => t.id === f.id)
    guardar({ id: antes?.id ?? 't' + Date.now().toString(36), h: f.h, m: f.m, dias: [...f.dias], vueltas: f.vueltas, activa: antes?.activa ?? true })
    setForm(null)
  }

  const paso = 'size-11 rounded-[14px] border border-[rgb(170_225_212/0.3)] bg-[rgb(170_225_212/0.08)] p-0 md:size-[54px]'
  const numero = 'w-12 text-center font-heading text-[34px] font-medium tabular-nums md:w-[84px] md:text-[44px]'
  const boton = (txt: string, dm: number) => (
    <Button variant="ghost" onClick={() => mover(dm)} aria-label={txt} className={paso}>
      {dm > 0 ? <IconoMas size={20} /> : <IconoMenos />}
    </Button>
  )

  return (
    <Dialog open={!!form} onOpenChange={(abierto) => { if (!abierto) setForm(null) }}>
      <DialogContent className="flex max-w-[640px] flex-col gap-[18px] px-5 py-6 md:px-[30px] md:py-6">
        <DialogTitle className="pr-10 text-2xl md:text-[26px]">{f.id ? 'Cambiar toma' : 'Nueva toma'}</DialogTitle>

        <div role="group" aria-labelledby="toma-hora" className="flex flex-col gap-2">
          <span id="toma-hora" className="text-base text-[#cfe3de]">Hora</span>
          <div className="flex items-center gap-2 md:gap-3.5">
            <div className="flex items-center gap-1 md:gap-2">
              {boton('Una hora menos', -60)}
              <span aria-live="polite" className={numero}>{String(f.h).padStart(2, '0')}</span>
              {boton('Una hora más', 60)}
            </div>
            <span className="font-heading text-[32px] text-tenue md:text-[40px]">:</span>
            <div className="flex items-center gap-1 md:gap-2">
              {boton('15 minutos menos', -15)}
              <span aria-live="polite" className={numero}>{String(f.m).padStart(2, '0')}</span>
              {boton('15 minutos más', 15)}
            </div>
          </div>
        </div>

        <div role="group" aria-labelledby="toma-dias" className="flex flex-col gap-2">
          <span id="toma-dias" className="text-base text-[#cfe3de]">Días</span>
          <div className="grid grid-cols-7 gap-1.5 md:gap-2">
            {LETRAS.map((l, i) => (
              <Button key={i} variant="ghost" aria-pressed={!!f.dias[i]} aria-label={DIAS[i]}
                onClick={() => poner({ dias: f.dias.map((v, j) => (j === i ? (v ? 0 : 1) : v)) })}
                className={cn('h-[52px] rounded-[14px] border p-0 text-[17px] font-semibold', pildora(!!f.dias[i]))}>{l}</Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => {
              const on = p.d.every((v, i) => v === f.dias[i])
              return (
                <Button key={p.txt} variant="ghost" aria-pressed={on} onClick={() => poner({ dias: [...p.d] })}
                  className={cn('h-11 rounded-full border px-4 text-[15px] font-normal', pildora(on))}>{p.txt}</Button>
              )
            })}
          </div>
        </div>

        <div role="group" aria-labelledby="toma-vueltas" className="flex flex-col gap-2">
          <span id="toma-vueltas" className="text-base text-[#cfe3de]">Cantidad: vueltas del tambor</span>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3].map((n) => (
              <Button key={n} variant="ghost" aria-pressed={f.vueltas === n} onClick={() => poner({ vueltas: n })}
                className={cn('h-12 rounded-[12px] border px-5 text-base font-normal', pildora(f.vueltas === n))}>{vueltasTxt(n)}</Button>
            ))}
          </div>
        </div>

        {error && <p role="alert" className="-mt-2 text-[15px] text-[#f6b8b8]">{error}</p>}

        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div>
            {f.id && (
              <Button variant="ghost" onClick={() => quitar(f.id!)}
                className="h-12 rounded-[12px] border border-alerta/55 bg-transparent px-[18px] text-base font-normal text-[#f6b8b8] hover:bg-alerta/12 hover:text-[#f6b8b8]">
                Quitar toma
              </Button>
            )}
          </div>
          <div className="flex gap-2.5">
            <Button variant="ghost" onClick={() => setForm(null)} className="h-12 rounded-[12px] border border-input bg-transparent px-5 text-[17px] font-normal">Cancelar</Button>
            <Button onClick={listo} aria-disabled={!valido}
              className={cn('h-12 rounded-[12px] px-6 text-[17px] font-semibold', !valido && 'bg-[rgb(170_225_212/0.18)] text-tenue hover:bg-[rgb(170_225_212/0.24)]')}>
              {f.id ? 'Guardar' : 'Agregar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ---------- Íconos de esta pantalla (los del diseño) ---------- */

const Trazo = ({ size = 18, ancho = 2, children }: { size?: number; ancho?: number; children: ReactNode }) => (
  <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={ancho} strokeLinecap="round" strokeLinejoin="round" className="shrink-0">{children}</svg>
)
const IconoLapiz = () => <span className="text-tenue"><Trazo size={16}><path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" /></Trazo></span>
const IconoMenos = () => <Trazo size={20} ancho={2.2}><path d="M5 12h14" /></Trazo>
const IconoListo = () => <Trazo><path d="M5 12l5 5L20 7" /></Trazo>
const IconoInfo = () => <span className="mt-0.5"><Trazo ancho={1.8}><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16v.01" /></Trazo></span>
