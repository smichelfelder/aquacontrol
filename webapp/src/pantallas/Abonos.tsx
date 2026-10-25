import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { FRECUENCIAS, ORDEN_FRECUENCIAS, type Abono, type Frecuencia } from '@/data'
import { abonosDeHoy, diasAbono, dosis, dosisMl, fmt, indiceDia, litrosNetos, reglaAbono } from '@/lib/acuario'
import { useGuardado, type Guardado } from '@/lib/guardado'
import { useAhora } from '@/lib/use-ahora'
import { cn } from '@/lib/utils'

const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']
const CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const LETRAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

// Producto · 7 días · veces por semana (o cambiar y quitar). En tablet las columnas se achican.
const COLUMNAS = 'md:grid md:grid-cols-[150px_repeat(7,minmax(0,1fr))_96px] md:gap-1.5 lg:grid-cols-[240px_repeat(7,minmax(0,1fr))_128px] lg:gap-2.5'
const TITULO = 'text-[13px] font-semibold tracking-[0.1em] text-muted-foreground'

export function Abonos() {
  const [g, cambiar] = useGuardado()
  const ahora = useAhora()
  const neto = litrosNetos(g)
  const hoyIdx = indiceDia(ahora)
  const hoy = abonosDeHoy(g, ahora)
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState<Form | null>(null)

  const cambiarDia = (a: Abono, i: number) =>
    cambiar({ plan: { ...g.plan, [a.id]: diasAbono(g, a).map((v, j) => (j === i ? (v ? 0 : 1) : v)) } })
  const quitar = (id: string) => {
    const plan = { ...g.plan }
    delete plan[id]
    cambiar({ abonos: g.abonos.filter((a) => a.id !== id), plan })
    setForm(null)
  }

  return (
    <div className="flex flex-col gap-3.5 md:gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <span className="rounded-full border border-border bg-panel px-3.5 py-1.5 text-sm text-[#cfe3de] md:text-base">
          Dosis para {Math.round(neto)} L netos
        </span>
        <div className="flex gap-2.5">
          <Button variant="ghost" aria-pressed={editando} onClick={() => setEditando(!editando)}
            className={cn('h-12 gap-2 rounded-full border px-5 text-base font-normal',
              editando ? 'border-primary/60 bg-primary/22 text-accent-foreground hover:bg-primary/30' : 'border-input bg-panel')}>
            <IconoLapiz /> {editando ? 'Listo' : 'Editar'}
          </Button>
          <Button onClick={() => setForm(FORM_NUEVO)} className="h-12 gap-2 rounded-full px-5 text-base font-semibold">
            <IconoMas /> Agregar<span className="hidden sm:inline"> producto</span>
          </Button>
        </div>
      </div>

      {/* Lo de hoy: en tablet ya se ve en la columna resaltada */}
      <section aria-labelledby="abonos-hoy"
        className="flex flex-col gap-2 rounded-[18px] border border-primary/42 bg-[rgb(12_40_31/0.78)] px-4 py-3 md:hidden">
        <h2 id="abonos-hoy" className="text-[13px] font-semibold tracking-[0.12em] text-primary">HOY · {DIAS[hoyIdx].toUpperCase()}</h2>
        <div className="flex flex-wrap gap-2">
          {hoy.map((a) => (
            <span key={a.nombre} className="rounded-[10px] bg-primary/12 px-3 py-1.5 text-[15px]">
              <b className="font-semibold">{a.nombre}</b> {a.dosis}
            </span>
          ))}
          {!hoy.length && <span className="text-[15px] text-[#cfe3de]">Hoy no toca abono</span>}
        </div>
      </section>
      {g.abonos.length > 0 && !editando && <p className="text-sm text-muted-foreground md:hidden">Tocá un día para poner o quitar el abono.</p>}

      <section aria-label="Calendario de la semana"
        className="flex flex-col gap-3 md:gap-1.5 md:rounded-[22px] md:border md:border-border md:bg-panel md:px-5 md:pt-3.5 md:pb-3 md:backdrop-blur-sm lg:px-[22px]">
        <div aria-hidden="true" className={cn('hidden items-end border-b border-[rgb(170_225_212/0.12)] pb-2', COLUMNAS)}>
          <span className={TITULO}>PRODUCTO</span>
          {CORTOS.map((c, i) => (
            <span key={c} className={cn('rounded-[10px] py-1.5 text-center text-[15px] lg:text-base',
              i === hoyIdx ? 'bg-primary font-semibold text-primary-foreground' : 'text-[#cfe3de]')}>{c}</span>
          ))}
          <span className={cn(TITULO, 'text-right')}>{editando ? 'CAMBIAR' : 'POR SEMANA'}</span>
        </div>

        {g.abonos.map((a) => (
          <Fila key={a.id} a={a} g={g} neto={neto} hoyIdx={hoyIdx} editando={editando}
            cambiarDia={(i) => cambiarDia(a, i)} editar={() => setForm(formDe(a))} quitar={() => quitar(a.id)} />
        ))}

        {!g.abonos.length && (
          <div className="flex flex-col items-center gap-1.5 rounded-[18px] border border-border bg-panel px-4 py-7 text-center md:border-0 md:bg-transparent">
            <span className="font-heading text-xl md:text-[22px]">Todavía no hay productos</span>
            <span className="text-[15px] text-muted-foreground md:text-base">Tocá «Agregar producto» y cargá la dosis que indica la etiqueta.</span>
          </div>
        )}
      </section>

      <Formulario form={form} setForm={setForm} neto={neto} g={g} cambiar={cambiar} quitar={quitar} />
    </div>
  )
}

function Fila({ a, g, neto, hoyIdx, editando, cambiarDia, editar, quitar }: {
  a: Abono; g: Guardado; neto: number; hoyIdx: number; editando: boolean
  cambiarDia: (i: number) => void; editar: () => void; quitar: () => void
}) {
  const dias = diasAbono(g, a)
  const veces = dias.reduce((s, v) => s + v, 0)
  const f = FRECUENCIAS[a.frec]
  const ok = veces >= f.min && veces <= f.max
  const toma = fmt(dosis(neto, a.ml, a.litros), 1)

  const semana = (
    <span className="flex flex-col items-end">
      <span className={cn('font-heading text-base font-semibold md:text-xl md:font-normal lg:text-[22px]', ok ? 'text-primary' : 'text-aviso')}>
        {veces} ×<span className="md:hidden"> semana</span>
      </span>
      <span className="text-right text-[11px] text-tenue md:text-[13px]">{f.corto}</span>
    </span>
  )
  const acciones = (
    <span className="flex justify-end gap-2">
      <Button variant="ghost" onClick={editar} aria-label={'Cambiar ' + a.nombre}
        className="size-12 rounded-[14px] border border-primary/35 bg-[rgb(170_225_212/0.08)] p-0 md:size-11 lg:size-[52px]"><IconoLapiz size={20} /></Button>
      <Button variant="ghost" onClick={quitar} aria-label={'Quitar ' + a.nombre + ' de la lista'}
        className="size-12 rounded-[14px] border border-alerta/55 bg-alerta/12 p-0 text-[#f6b8b8] hover:bg-alerta/20 hover:text-[#f6b8b8] md:size-11 lg:size-[52px]"><IconoTacho size={20} /></Button>
    </span>
  )

  return (
    <div className={cn('flex flex-col gap-2.5 rounded-[18px] border border-border bg-panel px-3.5 py-3',
      'md:items-center md:rounded-none md:border-0 md:bg-transparent md:px-0 md:py-1.5', COLUMNAS)}>
      <div className="flex items-center justify-between gap-2 md:block md:min-w-0">
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate font-heading text-[17px] font-medium md:text-lg lg:text-xl">{a.nombre}</span>
          <span className="text-xs text-tenue md:text-[13px] md:text-muted-foreground lg:text-sm">
            {reglaAbono(a)} · {toma} ml por toma
          </span>
        </span>
        <span className="shrink-0 md:hidden">{editando ? acciones : semana}</span>
      </div>

      <div className="grid grid-cols-7 gap-1.5 md:contents">
        {dias.map((on, i) => (
          <button key={i} type="button" onClick={() => cambiarDia(i)} aria-pressed={!!on}
            aria-label={`${a.nombre}, ${DIAS[i]}${on ? ', con abono' : ', sin abono'}`}
            className={cn('flex min-h-[52px] cursor-pointer flex-col items-center justify-center gap-0.5 rounded-[12px] border p-0 transition-colors md:min-h-16 md:rounded-[14px]',
              'focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
              on ? 'border-primary/55 bg-primary/20 text-accent-foreground hover:bg-primary/28'
                : cn('text-[#6f8a85] hover:bg-accent', i === hoyIdx ? 'border-[rgb(170_225_212/0.35)] bg-[rgb(170_225_212/0.07)] md:border-[rgb(170_225_212/0.14)]' : 'border-[rgb(170_225_212/0.14)]'))}>
            <span className="text-[11px] text-muted-foreground md:hidden">{LETRAS[i]}</span>
            <span className="font-heading text-sm md:text-base lg:text-lg">{on ? toma : '—'}</span>
            {!!on && <span className="hidden text-xs md:block">ml</span>}
          </button>
        ))}
      </div>

      <div className="hidden md:block">{editando ? acciones : semana}</div>
    </div>
  )
}

/* ---------- Agregar o cambiar un producto ---------- */

interface Form { id: string | null; nombre: string; ml: string; litros: string; frec: Frecuencia; intento: boolean }

const FORM_NUEVO: Form = { id: null, nombre: '', ml: '', litros: '', frec: '1-2', intento: false }
const formDe = (a: Abono): Form => ({ id: a.id, nombre: a.nombre, ml: fmt(a.ml, 1).replace(',0', ''), litros: String(a.litros), frec: a.frec, intento: false })

const nuevoId = () => 'a' + Date.now().toString(36)

/** Un número mayor que cero; acepta coma decimal. */
const numero = (s: string) => {
  const v = parseFloat(s.replace(',', '.'))
  return isFinite(v) && v > 0 ? v : null
}

function Formulario({ form, setForm, neto, g, cambiar, quitar }: {
  form: Form | null; setForm: (f: Form | null) => void; neto: number
  g: Guardado; cambiar: (p: Partial<Guardado>) => void; quitar: (id: string) => void
}) {
  // Lo último que se mostró, para que no se vacíe mientras se cierra
  const [ultimo, setUltimo] = useState(form ?? FORM_NUEVO)
  if (form && form !== ultimo) setUltimo(form)
  const f = form ?? ultimo

  const nombre = f.nombre.trim()
  const ml = numero(f.ml)
  const litros = numero(f.litros)
  const valido = nombre.length > 0 && ml != null && litros != null
  const poner = (p: Partial<Form>) => setForm({ ...f, ...p })

  const guardar = () => {
    if (!valido) { poner({ intento: true }); return }
    const datos = { nombre, ml, litros: Math.round(litros), frec: f.frec }
    const antes = g.abonos.find((a) => a.id === f.id)
    if (antes) {
      // Si cambió la frecuencia, los días vuelven a los de la etiqueta
      const plan = antes.frec === f.frec ? g.plan : { ...g.plan, [antes.id]: FRECUENCIAS[f.frec].plan }
      // El nombre corto era para el nombre de antes
      const corto = antes.nombre === nombre ? antes.corto : undefined
      cambiar({ abonos: g.abonos.map((a) => (a.id === antes.id ? { ...a, ...datos, corto } : a)), plan })
    } else {
      const id = nuevoId()
      cambiar({ abonos: [...g.abonos, { id, ...datos }], plan: { ...g.plan, [id]: FRECUENCIAS[f.frec].plan } })
    }
    setForm(null)
  }

  const campo = 'h-[54px] rounded-[12px] bg-muted font-heading text-[22px] text-foreground md:h-[54px] md:text-[22px]'
  const mal = (x: boolean) => (f.intento && x) || undefined

  return (
    <Dialog open={!!form} onOpenChange={(abierto) => { if (!abierto) setForm(null) }}>
      <DialogContent className="flex max-w-[620px] flex-col gap-[18px] px-5 py-6 md:px-[30px] md:py-[26px]">
        <DialogTitle className="pr-10 text-2xl md:text-[26px]">{f.id ? 'Cambiar producto' : 'Agregar producto'}</DialogTitle>

        <label htmlFor="ab-nombre" className="flex flex-col gap-1.5 text-base text-[#cfe3de]">
          Nombre del producto
          <Input id="ab-nombre" value={f.nombre} onChange={(e) => poner({ nombre: e.target.value })} placeholder="Ej.: Seachem Flourish"
            aria-invalid={mal(!nombre)} className={cn(campo, 'px-4 font-sans text-xl md:text-xl')} />
        </label>

        <div role="group" aria-labelledby="ab-dosis" className="flex flex-col gap-1.5">
          <span id="ab-dosis" className="text-base text-[#cfe3de]">Dosis que indica la etiqueta</span>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[19px]">
            <Input type="number" inputMode="decimal" min={0} step={0.5} aria-label="Mililitros" value={f.ml}
              onChange={(e) => poner({ ml: e.target.value })} aria-invalid={mal(ml == null)} className={cn(campo, 'w-[110px] text-center')} />
            <span>ml cada</span>
            <Input type="number" inputMode="numeric" min={1} step={1} aria-label="Litros" value={f.litros}
              onChange={(e) => poner({ litros: e.target.value })} aria-invalid={mal(litros == null)} className={cn(campo, 'w-[120px] text-center')} />
            <span>litros</span>
          </div>
        </div>

        <div role="group" aria-labelledby="ab-frec" className="flex flex-col gap-2">
          <span id="ab-frec" className="text-base text-[#cfe3de]">Cada cuánto, según la etiqueta</span>
          <div className="flex flex-wrap gap-2">
            {ORDEN_FRECUENCIAS.map((k) => {
              const on = f.frec === k
              return (
                <Button key={k} variant="ghost" aria-pressed={on} onClick={() => poner({ frec: k })}
                  className={cn('h-12 rounded-full border px-[18px] text-base font-normal',
                    on ? 'border-primary/60 bg-primary/22 text-accent-foreground hover:bg-primary/30' : 'border-input bg-transparent text-[#cfe3de]')}>
                  {FRECUENCIAS[k].txt}
                </Button>
              )
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-[14px] bg-primary/12 px-[18px] py-3.5" aria-live="polite">
          <span className="text-base text-[#cfe3de]">Para tus {Math.round(neto)} L:</span>
          <span className="font-heading text-[26px] font-medium text-primary">{ml != null && litros != null ? dosisMl(neto, ml, litros) : '— ml'}</span>
          <span className="text-base text-[#cfe3de]">por toma</span>
        </div>

        {f.intento && !valido && <p role="alert" className="-mt-2 text-sm text-alerta">Completá el nombre y la dosis de la etiqueta.</p>}

        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div>
            {f.id && (
              <Button variant="ghost" onClick={() => quitar(f.id!)}
                className="h-12 rounded-[12px] border border-alerta/55 bg-transparent px-[18px] text-base font-normal text-[#f6b8b8] hover:bg-alerta/12 hover:text-[#f6b8b8]">
                Quitar de la lista
              </Button>
            )}
          </div>
          <div className="flex gap-2.5">
            <Button variant="ghost" onClick={() => setForm(null)} className="h-12 rounded-[12px] border border-input bg-transparent px-5 text-[17px] font-normal">Cancelar</Button>
            <Button onClick={guardar} aria-disabled={!valido}
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

const Trazo = ({ size = 18, d }: { size?: number; d: string }) => (
  <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
)
const IconoLapiz = ({ size }: { size?: number }) => <Trazo size={size} d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" />
const IconoMas = () => <Trazo d="M12 5v14M5 12h14" />
const IconoTacho = ({ size }: { size?: number }) => <Trazo size={size} d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
