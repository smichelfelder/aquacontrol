import { useEffect, useState, type ReactNode } from 'react'
import { IconoBuscar, IconoMas } from '@/components/iconos'
import { Button } from '@/components/ui/button'
import { PECES, type Pez } from '@/data'
import { FOTOS, fondoFoto } from '@/data/fotos'
import { convivencia, fmt, medidas, nivelOcupacion, ocupacion, problemasPez, type Aviso, type Nivel } from '@/lib/acuario'
import { useCentral, type Sondas } from '@/lib/central'
import { useGuardado, type Guardado } from '@/lib/guardado'
import { useTablet } from '@/lib/use-tablet'
import { cn } from '@/lib/utils'
import type { Barra } from '@/App'

// En el móvil se ve una por vez. En tablet la lista va con la ficha al lado (detalle = lista)
// y el buscador con la especie elegida (candidato = agregar).
type Vista = 'lista' | 'detalle' | 'agregar' | 'candidato'

const PANEL = 'rounded-[20px] border border-border bg-panel md:rounded-[22px]'
const TITULO = 'text-[13px] font-semibold tracking-[0.1em] md:text-sm'
const COLUMNAS = 'md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] md:items-start md:gap-5 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)] xl:grid-cols-[440px_minmax(0,1fr)]'
const TEXTO = ['text-primary', 'text-aviso', 'text-alerta']
const PUNTO = ['bg-primary', 'bg-aviso', 'bg-alerta']
const BORDE = ['border-primary', 'border-aviso', 'border-alerta']
const VEREDICTO = ['Compatible', 'Con cuidado', 'No recomendada']
const SELLO = ['bg-primary/16 text-secondary-foreground', 'bg-aviso text-[#2a1606]', 'bg-alerta text-[#2b0c0c]']

// La biblioteca por nombre; se busca sin tildes («neon» encuentra «Neón»)
const BIBLIOTECA = Object.values(PECES).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
const sinTildes = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

const tallaTxt = (p: Pez) => fmt(p.talla, 1).replace(',0', '')
const peor = (l: Aviso[]): Nivel => l.reduce<Nivel>((n, a) => (a.nivel > n ? a.nivel : n), 0)
const ejemplares = (n: number) => n + (n === 1 ? ' ejemplar' : ' ejemplares')

export function Peces({ barra }: { barra: (b: Barra | null) => void }) {
  const [g, cambiar] = useGuardado()
  const s = useCentral().sondas
  const tablet = useTablet()
  const [vista, setVista] = useState<Vista>('lista')
  const [aviso, setAviso] = useState('')
  const [q, setQ] = useState('')
  const [elegido, setElegido] = useState({ id: 'oto', cant: PECES.oto?.min ?? 1 })

  const mios = g.peces.filter((p) => PECES[p.id])
  const sel = mios.find((p) => p.id === g.sel) ?? mios[0]
  const cand = PECES[elegido.id] ?? BIBLIOTECA[0]
  let v = vista
  if (tablet && vista === 'detalle') v = 'lista'
  if (tablet && vista === 'candidato') v = 'agregar'
  if (v === 'detalle' && !sel) v = 'lista'

  const irAgregar = () => { setVista('agregar'); setAviso('') }
  const titulo = v === 'detalle' ? PECES[sel!.id].nombre : v === 'agregar' ? 'Agregar especie' : v === 'candidato' ? cand.nombre : ''
  useEffect(() => {
    barra(v === 'lista'
      ? { titulo: 'Mis peces', accion: <BotonAgregar onClick={irAgregar} className="h-[52px] rounded-2xl" /> }
      : { titulo, atras: () => setVista(v === 'candidato' ? 'agregar' : 'lista') })
  }, [v, titulo, barra])
  useEffect(() => () => barra(null), [barra])
  // Cada vista del móvil arranca desde arriba
  useEffect(() => { window.scrollTo(0, 0) }, [v])

  const cambiarCant = (id: string, delta: number) => {
    const peces = g.peces.map((p) => (p.id === id ? { ...p, cant: p.cant + delta } : p)).filter((p) => p.cant > 0)
    const sigue = peces.some((p) => p.id === id)
    cambiar({ peces, sel: sigue ? id : peces[0]?.id })
    if (!sigue) setVista('lista')
    setAviso('')
  }
  const abrir = (id: string) => {
    cambiar({ sel: id })
    setAviso('')
    if (!tablet) setVista('detalle')
  }
  const elegir = (id: string) => {
    setElegido({ id, cant: PECES[id].min })
    if (!tablet) setVista('candidato')
  }
  const agregar = () => {
    const ya = g.peces.some((p) => p.id === cand.id)
    const peces = ya
      ? g.peces.map((p) => (p.id === cand.id ? { ...p, cant: p.cant + elegido.cant } : p))
      : [...g.peces, { id: cand.id, cant: elegido.cant }]
    cambiar({ peces, sel: cand.id })
    setQ('')
    setAviso(`Agregado: ${elegido.cant} × ${cand.nombre}`)
    setVista('lista')
  }

  if (v === 'agregar' || v === 'candidato') {
    return (
      <div className={cn('flex flex-col gap-3', COLUMNAS)}>
        {v === 'agregar' && <Buscador g={g} s={s} q={q} setQ={setQ} marcado={tablet ? cand.id : undefined} elegir={elegir} />}
        {(tablet || v === 'candidato') && (
          <Candidato g={g} s={s} pez={cand} cant={elegido.cant} agregar={agregar}
            setCant={(cant) => setElegido({ ...elegido, cant: Math.min(99, Math.max(1, cant)) })} />
        )}
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-3', mios.length > 0 && COLUMNAS)}>
      {v === 'lista' && (
        <div className="flex flex-col gap-3 pb-16 md:pb-0">
          {aviso && (
            <div role="status" className="rounded-[14px] border border-primary/40 bg-primary/16 px-3.5 py-3 text-[15px] md:px-4 md:text-base">{aviso}</div>
          )}
          <Ocupacion g={g} />
          {mios.map((p) => (
            <Fila key={p.id} pez={PECES[p.id]} cant={p.cant} problemas={problemasPez(g, s, PECES[p.id])}
              marcado={tablet && p.id === sel?.id} onClick={() => abrir(p.id)} />
          ))}
          {!mios.length && (
            <div className={cn(PANEL, 'flex flex-col items-center gap-1.5 px-4 py-7 text-center')}>
              <span className="font-heading text-xl md:text-[22px]">Todavía no hay peces</span>
              <span className="text-[15px] text-muted-foreground md:text-base">Tocá «Agregar especie» y elegí los que tenés.</span>
            </div>
          )}
          <BotonAgregar onClick={irAgregar}
            className="fixed right-4 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-10 h-14 rounded-2xl shadow-[0_6px_18px_rgb(0_0_0/0.35)] md:hidden" />
        </div>
      )}
      {sel && (tablet || v === 'detalle') && (
        <Ficha g={g} s={s} pez={PECES[sel.id]} cant={sel.cant} menos={() => cambiarCant(sel.id, -1)} mas={() => cambiarCant(sel.id, 1)} />
      )}
    </div>
  )
}

function BotonAgregar({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <Button onClick={onClick} className={cn('gap-2 pr-5 pl-4 text-base font-semibold [&_svg]:size-[22px]', className)}>
      <IconoMas /> Agregar especie
    </Button>
  )
}

function Foto({ id, alt = '', className }: { id: string; alt?: string; className: string }) {
  if (!FOTOS[id]) return <span aria-hidden="true" className={cn('block shrink-0 bg-muted', className)} />
  return (
    <img src={FOTOS[id]} alt={alt} loading="lazy" decoding="async" style={{ background: fondoFoto(id) }}
      className={cn('block shrink-0 object-contain', className)} />
  )
}

function Contador({ n, menos, mas, nombre, className }: { n: number; menos: () => void; mas: () => void; nombre: string; className?: string }) {
  const boton = cn('shrink-0 rounded-full border-[rgb(170_225_212/0.3)] bg-transparent p-0 text-[22px] font-normal', className)
  return (
    <span className="flex items-center gap-2.5 md:gap-3">
      <Button variant="outline" onClick={menos} aria-label={`Uno menos de ${nombre}`} className={boton}>−</Button>
      <span aria-live="polite" className="min-w-8 text-center font-heading text-[22px] tabular-nums md:min-w-[34px] md:text-[26px]">{n}</span>
      <Button variant="outline" onClick={mas} aria-label={`Uno más de ${nombre}`} className={boton}>+</Button>
    </span>
  )
}

/* ---------- Mis peces ---------- */

function Ocupacion({ g }: { g: Guardado }) {
  const oc = ocupacion(g)
  return (
    <section aria-label="Ocupación del acuario" className="flex flex-col gap-2 rounded-[18px] border border-border bg-panel px-4 py-3.5 md:px-[18px]">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-muted-foreground md:text-[15px]">Ocupación del acuario</span>
        <span className={cn('font-heading text-2xl font-medium md:text-[26px]', TEXTO[oc.nivel])}>{oc.pct} %</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-[rgb(170_225_212/0.14)]" role="presentation">
        <div className={cn('h-full rounded-full transition-[width]', PUNTO[oc.nivel])} style={{ width: Math.min(100, oc.pct) + '%' }} />
      </div>
      <div className="text-[13px] text-tenue">
        {Math.round(oc.usados)} cm de peces adultos en {Math.round(oc.neto)} L · cómodo hasta 80 %
      </div>
    </section>
  )
}

function Fila({ pez, cant, problemas, marcado, onClick }: {
  pez: Pez; cant: number; problemas: Aviso[]; marcado: boolean; onClick: () => void
}) {
  const ok = problemas.length === 0
  return (
    <button type="button" onClick={onClick} aria-current={marcado || undefined}
      className={cn('flex cursor-pointer items-center gap-3 rounded-[18px] border px-3 py-2.5 text-left transition-colors',
        'focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
        marcado ? 'border-[rgb(170_225_212/0.4)] bg-accent' : 'border-[rgb(170_225_212/0.12)] bg-[rgb(9_24_26/0.6)] hover:bg-[rgb(14_34_36/0.8)]')}>
      <Foto id={pez.id} className="h-[54px] w-[72px] rounded-xl md:h-[57px] md:w-[76px]" />
      <span className="flex min-w-0 grow flex-col gap-0.5">
        <span className="font-heading text-[17px] font-medium md:text-lg">{pez.nombre}</span>
        <span className="text-[13px] text-muted-foreground md:text-sm">{ejemplares(cant)}</span>
        <span className="text-xs text-[#7f9893]">{pez.t[0]}–{pez.t[1]} °C · pH {fmt(pez.p[0], 1)}–{fmt(pez.p[1], 1)}</span>
      </span>
      <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-[13px] font-semibold md:px-3 md:text-sm', ok ? SELLO[0] : SELLO[1])}>
        {ok ? 'Bien' : 'Revisar'}
      </span>
    </button>
  )
}

function Dato({ titulo, children, className }: { titulo: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-[14px] bg-[rgb(9_24_26/0.6)] px-3 py-2.5 md:bg-[rgb(170_225_212/0.06)]', className)}>
      <div className="text-xs text-tenue">{titulo}</div>
      <div className="text-[15px]">{children}</div>
    </div>
  )
}

function Ficha({ g, s, pez, cant, menos, mas }: {
  g: Guardado; s: Sondas; pez: Pez; cant: number; menos: () => void; mas: () => void
}) {
  const m = medidas(g)
  const oc = ocupacion(g)
  const entran = Math.floor(Math.max(0, oc.neto * 0.8 - oc.usados) / pez.talla)
  const cabe = m.neto >= pez.minL && m.largo >= pez.minLargo
  const problemas = problemasPez(g, s, pez)
  const nivel = peor(problemas)

  return (
    <section aria-label={'Ficha de ' + pez.nombre}
      className="flex flex-col gap-3 md:sticky md:top-4 md:gap-3.5 md:rounded-[22px] md:border md:border-border md:bg-panel md:px-[22px] md:py-[18px]">
      <div className="flex flex-col gap-3 xl:grid xl:grid-cols-[300px_minmax(0,1fr)] xl:items-start xl:gap-5">
        <Foto id={pez.id} alt={'Foto de ' + pez.nombre} className="h-[210px] w-full rounded-[20px] md:rounded-[18px]" />
        <div className="flex flex-col gap-3">
          <div>
            <h2 className="font-heading text-2xl font-medium md:text-[28px]">{pez.nombre}</h2>
            <div className="text-sm text-tenue italic md:text-[15px]">{pez.cientifico}</div>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-border bg-panel py-2.5 pr-2.5 pl-3.5 md:justify-start md:gap-3 md:border-0 md:bg-transparent md:p-0">
            <span className="text-[15px] text-muted-foreground md:text-base">Tenés</span>
            <Contador n={cant} menos={menos} mas={mas} nombre={pez.nombre} className="size-11 md:size-[46px]" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Dato titulo="Zona">{pez.zona}</Dato>
            <Dato titulo="Grupo">{pez.grupo}</Dato>
            <Dato titulo="Talla adulta">{tallaTxt(pez)} cm</Dato>
            <Dato titulo="Caben"><span className={entran > 0 ? '' : 'text-aviso'}>{entran > 0 ? `hasta ${entran} más` : 'ninguno más'}</span></Dato>
            <Dato titulo="Acuario mínimo" className="col-span-2">
              {pez.minL} L y {pez.minLargo} cm <span className={cabe ? 'text-primary' : 'text-aviso'}>{cabe ? '✓' : '(acuario chico)'}</span>
            </Dato>
          </div>
        </div>
      </div>
      <p className="text-[15px] leading-normal text-[#cfe3de] md:text-base">{pez.nota}</p>
      <div className={cn('flex flex-col gap-2 rounded-2xl border bg-[rgb(9_24_26/0.6)] px-3.5 py-3 md:bg-transparent md:px-4 md:py-3.5', BORDE[nivel])}>
        <h3 className={cn(TITULO, TEXTO[nivel])}>QUÉ REVISAR</h3>
        <Avisos lista={problemas.length ? problemas : [{ txt: 'Todo en orden para esta especie.', nivel: 0 }]} />
      </div>
    </section>
  )
}

function Avisos({ lista }: { lista: Aviso[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {lista.map((a) => (
        <li key={a.txt} className="flex gap-2 text-sm leading-[1.4] md:gap-2.5 md:text-[15px] md:leading-[1.45]">
          <span aria-hidden="true" className={cn('mt-1.5 size-2 shrink-0 rounded-full md:mt-[7px]', PUNTO[a.nivel])} />
          <span>{a.txt}</span>
        </li>
      ))}
    </ul>
  )
}

/* ---------- Agregar especie ---------- */

function Buscador({ g, s, q, setQ, marcado, elegir }: {
  g: Guardado; s: Sondas; q: string; setQ: (q: string) => void; marcado?: string; elegir: (id: string) => void
}) {
  const busca = sinTildes(q.trim())
  const lista = BIBLIOTECA.filter((p) => !busca || sinTildes(p.nombre + ' ' + p.cientifico).includes(busca))
  return (
    <div className="flex flex-col gap-2.5">
      <label htmlFor="buscar-pez"
        className="flex min-h-[52px] items-center gap-2.5 rounded-full border border-input bg-accent px-4 focus-within:ring-3 focus-within:ring-ring/50 md:min-h-[54px] md:px-[18px]">
        <IconoBuscar size={20} className="shrink-0 text-muted-foreground" />
        <span className="sr-only">Buscar especie</span>
        <input id="buscar-pez" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar especie" autoComplete="off"
          className="min-w-0 grow bg-transparent text-base outline-none placeholder:text-[#7f9893] md:text-[17px]" />
      </label>
      <div aria-live="polite" className="text-[13px] text-tenue md:text-sm">{lista.length} de {BIBLIOTECA.length} especies</div>
      <div className="flex flex-col gap-1">
        {lista.map((p) => {
          const nivel = convivencia(g, s, p).nivel
          const tengo = g.peces.find((x) => x.id === p.id)
          const on = p.id === marcado
          return (
            <button key={p.id} type="button" onClick={() => elegir(p.id)} aria-current={on || undefined}
              className={cn('flex cursor-pointer items-center gap-3 rounded-[14px] border px-2.5 py-2 text-left transition-colors md:py-1.5',
                'focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
                on ? 'border-[rgb(170_225_212/0.35)] bg-accent' : 'border-transparent bg-[rgb(9_24_26/0.5)] hover:bg-accent md:bg-transparent')}>
              <Foto id={p.id} className="h-[42px] w-14 rounded-[10px]" />
              <span className="flex min-w-0 grow flex-col">
                <span className="text-base font-semibold">{p.nombre}</span>
                <span className="truncate text-[13px] text-tenue">{tengo ? 'Ya tenés ' + tengo.cant : p.cientifico}</span>
              </span>
              <span className={cn('size-3 shrink-0 rounded-full', PUNTO[nivel])} />
              <span className="sr-only">{VEREDICTO[nivel]}</span>
            </button>
          )
        })}
        {!lista.length && <div className="px-0 py-3 text-[15px] text-muted-foreground md:px-3">No hay especies con ese nombre.</div>}
      </div>
    </div>
  )
}

function Candidato({ g, s, pez, cant, setCant, agregar }: {
  g: Guardado; s: Sondas; pez: Pez; cant: number; setCant: (n: number) => void; agregar: () => void
}) {
  const m = medidas(g)
  const oc = ocupacion(g)
  const conv = convivencia(g, s, pez)
  const nuevoPct = Math.round(((oc.usados + cant * pez.talla) / oc.neto) * 100)
  const chico = m.neto < pez.minL || m.largo < pez.minLargo
  let nivel = conv.nivel
  if (nuevoPct > 100 || chico) nivel = 2
  else if (nuevoPct > 80 && nivel < 1) nivel = 1
  const avisos: Aviso[] = [
    { txt: `Con ${cant} más, la ocupación pasa de ${oc.pct} % a ${nuevoPct} %.`, nivel: nivelOcupacion(nuevoPct) },
    ...(chico ? [{ txt: `Necesita al menos ${pez.minL} L y ${pez.minLargo} cm de largo.`, nivel: 2 as const }] : []),
    ...(conv.avisos.length ? conv.avisos : [{ txt: 'Convive sin problemas con tus especies.', nivel: 0 as const }]),
  ]
  const ya = g.peces.find((p) => p.id === pez.id)

  const parametros = [
    { nombre: 'Temperatura', valor: s.temp, r: pez.t, txt: (v: number) => fmt(v, 1) + ' °C', pide: `${pez.t[0]}–${pez.t[1]} °C`, mal: ['↓ baja', '↑ alta'] },
    { nombre: 'pH', valor: s.ph, r: pez.p, txt: (v: number) => fmt(v, 1), pide: `${fmt(pez.p[0], 1)}–${fmt(pez.p[1], 1)}`, mal: ['↓ bajo', '↑ alto'] },
    { nombre: 'TDS', valor: s.tds, r: pez.d, txt: (v: number) => Math.round(v) + ' ppm', pide: `${pez.d[0]}–${pez.d[1]} ppm`, mal: ['↓ blanda', '↑ dura'] },
  ].map((p) => {
    const ok = p.valor == null || (p.valor >= p.r[0] && p.valor <= p.r[1])
    return {
      ...p, actual: p.valor == null ? '—' : p.txt(p.valor),
      marca: p.valor == null ? '' : ok ? '✓' : p.mal[p.valor < p.r[0] ? 0 : 1],
      color: ok ? 'text-primary' : 'text-aviso',
    }
  })

  return (
    <section aria-label={pez.nombre}
      className="flex flex-col gap-3 md:sticky md:top-4 md:gap-3.5 md:rounded-[22px] md:border md:border-border md:bg-panel md:px-[22px] md:py-[18px]">
      <div className="flex flex-col gap-3 xl:grid xl:grid-cols-[260px_minmax(0,1fr)] xl:items-start xl:gap-5">
        <Foto id={pez.id} alt={'Foto de ' + pez.nombre} className="h-[190px] w-full rounded-[20px] md:h-[180px] md:rounded-[18px]" />
        <div className="flex flex-col gap-2.5">
          <div className="flex items-start justify-between gap-2.5 md:flex-col-reverse md:justify-start">
            <div>
              <h2 className="font-heading text-[22px] font-medium md:text-[26px]">{pez.nombre}</h2>
              <div className="text-sm text-tenue italic md:text-[15px]">{pez.cientifico}</div>
            </div>
            <span className={cn('shrink-0 rounded-full px-3 py-1 text-[13px] font-semibold md:px-3.5 md:text-sm', SELLO[nivel])}>{VEREDICTO[nivel]}</span>
          </div>
          <p className="hidden text-[15px] leading-[1.45] text-[#cfe3de] md:block">{pez.nota}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[rgb(170_225_212/0.14)] bg-[rgb(9_24_26/0.6)] md:grid md:grid-cols-3 md:gap-2.5 md:overflow-visible md:border-0 md:bg-transparent">
        {parametros.map((p) => (
          <div key={p.nombre}
            className="grid grid-cols-[1fr_auto] gap-x-2 gap-y-0.5 border-b border-[rgb(170_225_212/0.08)] px-3.5 py-2.5 last:border-b-0 md:flex md:flex-col md:rounded-[14px] md:border-0 md:bg-[rgb(170_225_212/0.06)]">
            <span className="flex justify-between text-[15px] md:text-sm md:text-muted-foreground">
              {p.nombre}
              <span className={cn('hidden font-semibold md:inline', p.color)}>{p.marca}</span>
            </span>
            <span className={cn('text-sm font-semibold md:hidden', p.color)}>{p.marca}</span>
            <span className="col-span-2 text-[13px] text-tenue md:hidden">Pide {p.pide} · agua {p.actual}</span>
            <span className="hidden text-base md:block">{p.pide}</span>
            <span className="hidden text-[13px] text-tenue md:block">Agua: {p.actual}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <h3 className={cn(TITULO, 'text-muted-foreground')}>CONVIVENCIA Y ESPACIO</h3>
        <Avisos lista={avisos} />
      </div>
      <p className="text-sm leading-[1.45] text-[#cfe3de] md:hidden">{pez.nota}</p>

      <div className="mt-1 flex flex-wrap items-center gap-2.5 md:gap-3">
        <Contador n={cant} menos={() => setCant(cant - 1)} mas={() => setCant(cant + 1)} nombre={pez.nombre} className="size-12 md:size-[50px]" />
        <Button onClick={agregar} className="h-[52px] min-w-0 grow rounded-full px-[30px] text-base font-semibold md:h-[54px] md:grow-0 md:text-[17px]">
          {ya ? `Sumar ${cant} a los que tenés` : `Agregar ${cant} al acuario`}
        </Button>
      </div>
    </section>
  )
}
