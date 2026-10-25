import { useEffect, useState, type ReactNode } from 'react'
import { IconoBuscar, IconoMas } from '@/components/iconos'
import { Button } from '@/components/ui/button'
import { PECES, type Pez, type Rango } from '@/data'
import { FOTOS, fondoFoto } from '@/data/fotos'
import {
  avisoSexos, conSexos, convivencia, fmt, medidas, nivelOcupacion, ocupacion, problemasAgua, reparto, sexos,
  type Aviso, type Nivel, type Sexos,
} from '@/lib/acuario'
import { useCentral, type Sondas } from '@/lib/central'
import { useGuardado, type Guardado } from '@/lib/guardado'
import { useAncha } from '@/lib/use-ancha'
import { cn } from '@/lib/utils'
import type { Barra } from '@/App'

// Como la pantalla de 7" del diseño («mis peces y agregar especie»). En pantalla ancha la lista va
// con la ficha al lado y el buscador con la especie elegida; más angosta se ve una cosa por vez.
type Vista = 'lista' | 'detalle' | 'agregar' | 'candidato'

const PANEL = 'rounded-[22px] border border-border bg-panel backdrop-blur-[8px]'
// En pantalla ancha todo entra en el alto de la pantalla y cada panel tiene su propio scroll
const ALTO = 'lg:h-[calc(100dvh-118px)] lg:min-h-[520px]'
const SCROLL = 'lg:min-h-0 lg:overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
const ETIQUETA = 'text-sm tracking-[0.08em] text-tenue'
const TEXTO = ['text-primary', 'text-aviso', 'text-alerta']
const FONDO = ['bg-primary', 'bg-aviso', 'bg-alerta']
const VEREDICTO = ['Compatible', 'Con cuidado', 'No recomendada']
const SELLO = ['bg-primary/16 text-secondary-foreground', 'bg-aviso text-[#2a1606]', 'bg-alerta text-[#2b0c0c]']
const SEXOS = [['m', 'Machos'], ['h', 'Hembras'], ['s', 'Sin sexar']] as const

const BIBLIOTECA = Object.values(PECES).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
const sinTildes = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
const peor = (l: Aviso[]): Nivel => l.reduce<Nivel>((n, a) => (a.nivel > n ? a.nivel : n), 0)
const tallaTxt = (p: Pez) => fmt(p.talla, 1).replace(',0', '')

export function Peces({ barra }: { barra: (b: Barra | null) => void }) {
  const [g, cambiar] = useGuardado()
  const s = useCentral().sondas
  const ancha = useAncha()
  const [vista, setVista] = useState<Vista>('lista')
  const [aviso, setAviso] = useState('')
  const [q, setQ] = useState('')
  const [cand, setCand] = useState(() => ({ id: 'oto', ...reparto('oto', PECES.oto?.min ?? 1) }))

  const mios = g.peces.filter((p) => PECES[p.id])
  const sel = mios.find((p) => p.id === g.sel) ?? mios[0]
  const pezCand = PECES[cand.id] ?? BIBLIOTECA[0]
  let v = vista
  if (ancha && vista === 'detalle') v = 'lista'
  if (ancha && vista === 'candidato') v = 'agregar'
  if (v === 'detalle' && !sel) v = 'lista'

  const irAgregar = () => { setVista('agregar'); setAviso('') }
  const titulo = v === 'lista' ? 'Mis peces' : v === 'agregar' ? 'Agregar especie' : v === 'detalle' ? PECES[sel!.id].nombre : pezCand.nombre
  const ahora = `Ahora: ${fmt(s.temp, 1)} °C · pH ${fmt(s.ph, 1)} · ${s.tds == null ? '—' : Math.round(s.tds)} ppm`
  useEffect(() => {
    const junto = <Ahora txt={ahora} />
    if (v === 'lista') {
      barra({ titulo, junto, accion: <>{aviso && <Hecho txt={aviso} />}<BotonAgregar onClick={irAgregar} /></> })
    } else if (ancha) {
      barra({ titulo, junto, accion: <BotonMisPeces onClick={() => setVista('lista')} /> })
    } else {
      barra({ titulo, junto, atras: () => setVista(v === 'candidato' ? 'agregar' : 'lista') })
    }
  }, [v, ancha, titulo, ahora, aviso, barra])
  useEffect(() => () => barra(null), [barra])
  // Cada vista arranca desde arriba
  useEffect(() => { window.scrollTo(0, 0) }, [v])

  const cambiarSexo = (id: string, k: keyof Sexos, delta: number) => {
    const actual = g.peces.find((p) => p.id === id)
    if (!actual) return
    const x = sexos(actual)
    x[k] = Math.max(0, x[k] + delta)
    const sigue = x.m + x.h + x.s > 0
    const peces = sigue ? g.peces.map((p) => (p.id === id ? conSexos(id, x) : p)) : g.peces.filter((p) => p.id !== id)
    cambiar({ peces, sel: sigue ? id : peces[0]?.id })
    if (!sigue) setVista('lista')
    setAviso('')
  }
  const abrir = (id: string) => {
    cambiar({ sel: id })
    setAviso('')
    if (!ancha) setVista('detalle')
  }
  const elegir = (id: string) => {
    setCand({ id, ...reparto(id, PECES[id].min) })
    if (!ancha) setVista('candidato')
  }
  const agregar = () => {
    const n = cand.m + cand.h + cand.s
    if (!n) return
    const ya = g.peces.find((p) => p.id === pezCand.id)
    const suma = (x: Sexos): Sexos => ({ m: x.m + cand.m, h: x.h + cand.h, s: x.s + cand.s })
    const peces = ya
      ? g.peces.map((p) => (p.id === pezCand.id ? conSexos(p.id, suma(sexos(p))) : p))
      : [...g.peces, conSexos(pezCand.id, cand)]
    cambiar({ peces, sel: pezCand.id })
    setQ('')
    setAviso(`Agregado: ${n} × ${pezCand.nombre}`)
    setVista('lista')
  }

  if (v === 'agregar' || v === 'candidato') {
    return (
      <div className={cn('flex flex-col gap-4 lg:grid lg:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-[420px_minmax(0,1fr)]', ALTO)}>
        {v === 'agregar' && <Buscador g={g} s={s} q={q} setQ={setQ} marcado={ancha ? pezCand.id : undefined} elegir={elegir} />}
        {(ancha || v === 'candidato') && (
          <Candidato g={g} s={s} pez={pezCand} n={cand} agregar={agregar}
            cambiar={(k, d) => setCand({ ...cand, [k]: Math.min(99, Math.max(0, cand[k] + d)) })} />
        )}
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_380px]', ALTO)}>
      {v === 'lista' && (
        <div className="flex flex-col gap-3 pb-16 md:pb-0 lg:min-h-0">
          <div className="flex flex-col items-start gap-2 md:hidden">
            <Ahora txt={ahora} />
            {aviso && <Hecho txt={aviso} />}
          </div>
          <MisPeces g={g} s={s} marcado={ancha ? sel?.id : undefined} abrir={abrir} />
          <BotonAgregar onClick={irAgregar}
            className="fixed right-4 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-10 h-14 rounded-2xl shadow-[0_6px_18px_rgb(0_0_0/0.35)] md:hidden" />
        </div>
      )}
      {(ancha || v === 'detalle') && (
        sel ? <Ficha g={g} s={s} pez={PECES[sel.id]} x={sexos(sel)} cambiar={(k, d) => cambiarSexo(sel.id, k, d)} />
          : <SinEspecies />
      )}
    </div>
  )
}

/* ---------- Barra de arriba ---------- */

function Ahora({ txt }: { txt: string }) {
  return (
    <span className="ml-1.5 block truncate rounded-full border border-border bg-[rgb(9_24_26/0.66)] px-3.5 py-1.5 text-[15px] whitespace-nowrap text-[#cfe3de] max-md:ml-0 md:text-base">
      {txt}
    </span>
  )
}

function Hecho({ txt }: { txt: string }) {
  return (
    <span role="status" className="flex min-h-11 items-center gap-2 rounded-full bg-primary/16 px-4 text-base whitespace-nowrap text-secondary-foreground">
      <Trazo d="M5 12l5 5L20 7" size={18} /> {txt}
    </span>
  )
}

function BotonAgregar({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <Button onClick={onClick} className={cn('h-11 gap-2 rounded-full px-5 text-[17px] font-semibold [&_svg]:size-[18px]', className)}>
      <IconoMas /> Agregar especie
    </Button>
  )
}

function BotonMisPeces({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ghost" onClick={onClick}
      className="h-11 gap-2 rounded-full border border-input bg-[rgb(9_24_26/0.66)] px-5 text-[17px] font-normal [&_svg]:size-[18px]">
      <Trazo d="M15 6l-6 6 6 6" /> Mis peces
    </Button>
  )
}

/* ---------- Mis peces ---------- */

function MisPeces({ g, s, marcado, abrir }: { g: Guardado; s: Sondas; marcado?: string; abrir: (id: string) => void }) {
  const oc = ocupacion(g)
  const mios = g.peces.filter((p) => PECES[p.id])
  return (
    <section aria-label="Mis peces" className={cn(PANEL, 'flex flex-col gap-1.5 px-3 py-3 md:px-[18px] md:py-3.5 lg:min-h-0 lg:grow')}>
      <div className="flex flex-col gap-2 px-1 pt-1.5 pb-3 sm:flex-row sm:items-center sm:gap-[18px] sm:px-3">
        <div className="flex items-baseline justify-between gap-0.5 sm:min-w-[150px] sm:flex-col sm:items-start">
          <span className="text-[13px] tracking-[0.08em] text-tenue">OCUPACIÓN</span>
          <span className={cn('font-heading text-[28px] font-medium', TEXTO[oc.nivel])}>{oc.pct} %</span>
        </div>
        <div className="flex grow flex-col gap-2">
          <div className="relative h-3 rounded-full bg-[rgb(170_225_212/0.14)]" role="presentation">
            <div className={cn('absolute inset-y-0 left-0 rounded-full transition-[width]', FONDO[oc.nivel])} style={{ width: Math.min(100, oc.pct) + '%' }} />
            <div className="absolute -top-1 left-[80%] h-5 w-0.5 bg-[#cfe3de]" />
          </div>
          <div className="flex flex-wrap justify-between gap-x-3 text-sm text-muted-foreground">
            <span>{Math.round(oc.usados)} cm de peces adultos en {Math.round(oc.neto)} L netos</span>
            <span>Límite cómodo 80 %</span>
          </div>
        </div>
      </div>

      <div className={cn('flex grow flex-col gap-1.5 border-t border-[rgb(170_225_212/0.12)] pt-2', SCROLL)}>
        {mios.map((p) => <Fila key={p.id} pez={PECES[p.id]} x={sexos(p)} s={s} marcado={p.id === marcado} onClick={() => abrir(p.id)} />)}
        {!mios.length && (
          <div className="flex flex-col items-center gap-1.5 px-4 py-7 text-center">
            <span className="font-heading text-xl">Todavía no hay peces</span>
            <span className="text-[15px] text-muted-foreground">Tocá «Agregar especie» y elegí los que tenés.</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-[18px] gap-y-1 px-1 pt-1.5 text-sm text-tenue sm:px-3">
        <span className="flex items-center gap-2"><span className="inline-block h-4 w-[3px] rounded-sm bg-[#f7fbfa]" />Valor actual de la sonda</span>
        <span className="flex items-center gap-2"><span className="inline-block h-2 w-[22px] rounded-full bg-primary" />Rango ideal, dentro</span>
        <span className="flex items-center gap-2"><span className="inline-block h-2 w-[22px] rounded-full bg-aviso" />Rango ideal, fuera</span>
      </div>
    </section>
  )
}

function Fila({ pez, x, s, marcado, onClick }: { pez: Pez; x: Sexos; s: Sondas; marcado: boolean; onClick: () => void }) {
  const revisar = problemasAgua(s, pez).length > 0
  return (
    <button type="button" onClick={onClick} aria-current={marcado || undefined}
      className={cn('grid shrink-0 cursor-pointer grid-cols-[62px_minmax(0,1fr)] items-center gap-x-3.5 rounded-[14px] border px-3 py-2.5 text-left transition-colors',
        'focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
        marcado ? 'border-[rgb(170_225_212/0.35)] bg-accent' : 'border-transparent hover:bg-[rgb(170_225_212/0.05)]')}>
      <Foto id={pez.id} className="h-[52px] w-[62px] rounded-xl" />
      <span className="flex min-w-0 flex-col gap-2">
        <span className="flex min-w-0 items-center gap-3 sm:gap-3.5">
          <span className="min-w-0 grow truncate font-heading text-lg font-medium sm:text-xl">{pez.nombre}</span>
          <ContadorSexos x={x} />
          {revisar && (
            <span role="img" aria-label="Revisar: hay parámetros fuera de rango"
              className="flex size-[30px] shrink-0 items-center justify-center rounded-full border border-aviso bg-aviso/18 text-aviso">
              <Alerta size={16} />
            </span>
          )}
        </span>
        <span className="grid grid-cols-3 gap-3 sm:gap-[22px]">
          <Barrita nombre="TEMP." r={pez.t} lo={18} hi={30} v={s.temp} txt={`${pez.t[0]}–${pez.t[1]} °C`} />
          <Barrita nombre="PH" r={pez.p} lo={5.5} hi={8.5} v={s.ph} txt={`${fmt(pez.p[0], 1)}–${fmt(pez.p[1], 1)}`} />
          <Barrita nombre="TDS" r={pez.d} lo={0} hi={500} v={s.tds} txt={`${pez.d[0]}–${pez.d[1]} ppm`} />
        </span>
      </span>
    </button>
  )
}

const SEXO_ICONO = {
  m: { color: '#8cc6f0', d: <><circle cx="10" cy="14" r="6" /><path d="M14.5 9.5L20 4M15 4h5v5" /></>, uno: 'macho', varios: 'machos' },
  h: { color: '#f2a6c9', d: <><circle cx="12" cy="9" r="6" /><path d="M12 15v7M8.5 19h7" /></>, uno: 'hembra', varios: 'hembras' },
  s: { color: '#a7c0bb', d: <><circle cx="12" cy="12" r="8" /><path d="M9.8 9.6a2.3 2.3 0 0 1 4.4 1c0 1.6-2.2 1.9-2.2 3.2M12 17v.3" /></>, uno: 'sin sexar', varios: 'sin sexar' },
}

function ContadorSexos({ x }: { x: Sexos }) {
  return (['m', 'h', 's'] as const).filter((k) => x[k] > 0).map((k) => {
    const i = SEXO_ICONO[k]
    return (
      <span key={k} role="img" aria-label={`${x[k]} ${x[k] === 1 ? i.uno : i.varios}`} className="flex shrink-0 items-center gap-1 font-heading text-base sm:text-lg">
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={i.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">{i.d}</svg>
        <span>{x[k]}</span>
      </span>
    )
  })
}

/** El rango que pide el pez sobre una escala fija, con la marca del valor actual de la sonda. */
function Barrita({ nombre, r, lo, hi, v, txt }: { nombre: string; r: Rango; lo: number; hi: number; v: number | null; txt: string }) {
  const pct = (x: number) => Math.max(0, Math.min(100, ((x - lo) / (hi - lo)) * 100))
  const ok = v == null || (v >= r[0] && v <= r[1])
  return (
    <span className="flex min-w-0 flex-col gap-1.5">
      <span className="flex flex-wrap justify-between gap-x-1.5 text-[13px]">
        <span className="tracking-[0.06em] text-tenue">{nombre}</span>
        <span className="text-[#cfe3de]">{txt}</span>
      </span>
      <span className="relative mt-auto block h-2 rounded-full bg-[rgb(170_225_212/0.14)]">
        <span className={cn('absolute inset-y-0 block rounded-full', ok ? 'bg-primary' : 'bg-aviso')}
          style={{ left: pct(r[0]) + '%', width: pct(r[1]) - pct(r[0]) + '%' }} />
        {v != null && <span className="absolute -top-[5px] -ml-px block h-[18px] w-[3px] rounded-sm bg-[#f7fbfa]" style={{ left: pct(v) + '%' }} />}
      </span>
    </span>
  )
}

/* ---------- Ficha de una especie mía ---------- */

function Ficha({ g, s, pez, x, cambiar }: {
  g: Guardado; s: Sondas; pez: Pez; x: Sexos; cambiar: (k: keyof Sexos, delta: number) => void
}) {
  const m = medidas(g)
  const oc = ocupacion(g)
  const entran = Math.floor(Math.max(0, oc.neto * 0.8 - oc.usados) / pez.talla)
  const cabe = m.neto >= pez.minL && m.largo >= pez.minLargo
  const sexo = avisoSexos(pez.id, x.m, x.h)
  const problemas = [...problemasAgua(s, pez), ...(sexo && sexo.nivel > 0 ? [sexo] : []), ...convivencia(g, s, pez).avisos]
  const nivel = peor(problemas)

  return (
    <section aria-label={'Ficha de ' + pez.nombre} className={cn(PANEL, 'flex flex-col gap-2.5 px-[18px] py-4 md:px-[22px] md:py-[18px]', SCROLL)}>
      <Foto id={pez.id} alt={'Foto de ' + pez.nombre} className="h-40 w-full rounded-[14px]" vacia="h-16 w-full" />
      <div className="flex flex-col gap-0.5">
        <h2 className="font-heading text-2xl font-medium">{pez.nombre}</h2>
        <span className="text-sm text-tenue italic">{pez.cientifico}</span>
      </div>
      <dl className="grid grid-cols-[82px_minmax(0,1fr)] items-center gap-x-2.5 gap-y-[7px] text-[15px]">
        <dt className="text-tenue">Zona</dt><dd>{pez.zona}</dd>
        <dt className="text-tenue">Grupo</dt><dd>{pez.grupo}</dd>
        <dt className="text-tenue">Tenés</dt><dd>{x.m + x.h + x.s} de {tallaTxt(pez)} cm</dd>
        {SEXOS.map(([k, nombre]) => (
          <Paso key={k} nombre={nombre} n={x[k]} menos={() => cambiar(k, -1)} mas={() => cambiar(k, 1)} />
        ))}
        <dt className="text-tenue">Mínimo</dt>
        <dd>{pez.minL} L y {pez.minLargo} cm de largo {cabe ? '✓' : '(acuario chico)'}</dd>
        <dt className="text-tenue">Caben</dt>
        <dd className={entran > 0 ? '' : 'text-aviso'}>{entran > 0 ? `hasta ${entran} más` : 'ninguno más'}</dd>
      </dl>
      <p className="text-sm leading-[1.45] text-[#cfe3de]">{pez.nota}</p>
      <div className="flex flex-col gap-2 border-t border-[rgb(170_225_212/0.14)] pt-3">
        <h3 className={cn('flex items-center gap-2 text-sm font-semibold tracking-[0.1em]', TEXTO[nivel])}>
          <Alerta size={16} /> QUÉ REVISAR
        </h3>
        <Avisos lista={problemas.length ? problemas : [{ txt: 'Todo en orden para esta especie.', nivel: 0 }]} chico />
      </div>
    </section>
  )
}

function SinEspecies() {
  return (
    <section className={cn(PANEL, 'flex flex-col gap-2.5 px-[22px] py-[18px]')}>
      <div className="flex h-16 items-center justify-center rounded-[14px] border border-dashed border-[rgb(170_225_212/0.3)] text-sm text-tenue">Sin foto todavía</div>
      <h2 className="font-heading text-2xl font-medium">Sin especies</h2>
      <p className="text-sm leading-[1.45] text-[#cfe3de]">Agregá tu primera especie.</p>
    </section>
  )
}

/** Machos, hembras o sin sexar en la ficha: va como fila de la lista de datos. */
function Paso({ nombre, n, menos, mas }: { nombre: string; n: number; menos: () => void; mas: () => void }) {
  return (
    <>
      <dt className="text-tenue">{nombre}</dt>
      <dd className="flex items-center gap-2.5">
        <Mas onClick={menos} label={`${nombre}: uno menos`}>−</Mas>
        <span aria-live="polite" className="min-w-7 text-center font-heading text-xl tabular-nums">{n}</span>
        <Mas onClick={mas} label={`${nombre}: uno más`}>+</Mas>
      </dd>
    </>
  )
}

function Mas({ onClick, label, children }: { onClick: () => void; label: string; children: ReactNode }) {
  return (
    <Button variant="outline" onClick={onClick} aria-label={label}
      className="size-11 rounded-xl border-[rgb(170_225_212/0.3)] bg-transparent p-0 text-[22px] font-normal">{children}</Button>
  )
}

/* ---------- Agregar especie ---------- */

function Buscador({ g, s, q, setQ, marcado, elegir }: {
  g: Guardado; s: Sondas; q: string; setQ: (q: string) => void; marcado?: string; elegir: (id: string) => void
}) {
  const busca = sinTildes(q.trim())
  const lista = BIBLIOTECA.filter((p) => !busca || sinTildes(p.nombre + ' ' + p.cientifico).includes(busca))
  return (
    <section aria-label="Biblioteca de especies" className={cn(PANEL, 'flex flex-col gap-3 p-4 md:p-[18px] lg:min-h-0')}>
      <label htmlFor="buscar-pez" className={ETIQUETA}>BUSCAR EN LA BIBLIOTECA</label>
      <div className="flex min-h-[52px] items-center gap-2.5 rounded-[14px] border border-input bg-muted px-4 focus-within:ring-3 focus-within:ring-ring/50">
        <IconoBuscar size={20} className="shrink-0 text-muted-foreground" />
        <input id="buscar-pez" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Otocinclus, gamba, betta…" autoComplete="off"
          className="min-w-0 grow bg-transparent text-[19px] outline-none placeholder:text-[#7f9893]" />
      </div>
      <div className={cn('flex grow flex-col gap-1', SCROLL)}>
        {lista.map((p) => {
          const nivel = convivencia(g, s, p).nivel
          const tengo = g.peces.find((x) => x.id === p.id)
          const on = p.id === marcado
          return (
            <button key={p.id} type="button" onClick={() => elegir(p.id)} aria-current={on || undefined}
              className={cn('relative flex min-h-[60px] shrink-0 cursor-pointer items-center justify-between gap-2.5 rounded-xl border px-3.5 py-2 text-left transition-colors',
                'focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
                on ? 'border-[rgb(170_225_212/0.35)] bg-accent' : 'border-transparent hover:bg-[rgb(170_225_212/0.05)]')}>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="font-heading text-lg font-medium">{p.nombre}</span>
                <span className="text-sm text-tenue">{tengo ? 'Ya tenés ' + tengo.cant : p.cientifico}</span>
              </span>
              <span className={cn('size-3 shrink-0 rounded-full', FONDO[nivel])} />
              <span className="sr-only">{VEREDICTO[nivel]}</span>
            </button>
          )
        })}
        {!lista.length && <div className="p-3.5 text-[15px] text-[#cfe3de]">No está en la biblioteca.</div>}
      </div>
      <div className="flex flex-wrap gap-x-3.5 gap-y-1 text-[13px] text-tenue">
        {VEREDICTO.map((txt, i) => (
          <span key={txt} className="flex items-center gap-1.5"><span className={cn('inline-block size-2.5 rounded-full', FONDO[i])} />{txt}</span>
        ))}
      </div>
    </section>
  )
}

function Candidato({ g, s, pez, n, cambiar, agregar }: {
  g: Guardado; s: Sondas; pez: Pez; n: Sexos; cambiar: (k: keyof Sexos, delta: number) => void; agregar: () => void
}) {
  const m = medidas(g)
  const oc = ocupacion(g)
  const conv = convivencia(g, s, pez)
  const total = n.m + n.h + n.s
  const nuevoPct = Math.round(((oc.usados + total * pez.talla) / oc.neto) * 100)
  const chico = m.neto < pez.minL || m.largo < pez.minLargo
  let nivel = conv.nivel
  if (nuevoPct > 100 || chico) nivel = 2
  else if (nuevoPct > 80 && nivel < 1) nivel = 1
  const avisos: Aviso[] = [
    { txt: `Con ${total} más, la ocupación pasa de ${oc.pct} % a ${nuevoPct} %.`, nivel: nivelOcupacion(nuevoPct) },
    ...(chico ? [{ txt: `Necesita al menos ${pez.minL} L y ${pez.minLargo} cm de largo.`, nivel: 2 as const }] : []),
    ...(conv.avisos.length ? conv.avisos : [{ txt: 'Convive sin problemas con tus especies.', nivel: 0 as const }]),
  ]
  const ya = g.peces.find((p) => p.id === pez.id)
  const yaX = ya ? sexos(ya) : { m: 0, h: 0, s: 0 }
  const sexo = avisoSexos(pez.id, n.m + yaX.m, n.h + yaX.h)

  const parametros = [
    { nombre: 'Temperatura', v: s.temp, r: pez.t, pide: `${pez.t[0]}–${pez.t[1]} °C`, txt: (v: number) => fmt(v, 1) + ' °C' },
    { nombre: 'pH', v: s.ph, r: pez.p, pide: `${fmt(pez.p[0], 1)}–${fmt(pez.p[1], 1)}`, txt: (v: number) => fmt(v, 1) },
    { nombre: 'TDS aprox.', v: s.tds, r: pez.d, pide: `${pez.d[0]}–${pez.d[1]} ppm`, txt: (v: number) => Math.round(v) + ' ppm' },
  ]

  return (
    <section aria-label={pez.nombre} className={cn(PANEL, 'flex flex-col gap-4 px-4 py-4 md:px-[26px] md:py-[22px] lg:min-h-0')}>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-4">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-[18px]">
          <Foto id={pez.id} alt={'Foto de ' + pez.nombre} className="h-44 w-full rounded-[14px] sm:h-28 sm:w-[150px]" vacia="h-28 w-[150px]" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 className="font-heading text-[26px] font-medium md:text-[30px]">{pez.nombre}</h2>
            <span className="text-[15px] text-tenue italic">{pez.cientifico} · {pez.zona}</span>
          </div>
        </div>
        <span className={cn('self-start rounded-full px-4 py-2 text-base font-semibold whitespace-nowrap', SELLO[nivel])}>{VEREDICTO[nivel]}</span>
      </div>

      <div className={cn('grid gap-[18px] sm:grid-cols-2 lg:grow lg:grid-cols-1 xl:grid-cols-2', SCROLL)}>
        <div className="flex flex-col gap-2.5">
          <h3 className={ETIQUETA}>TU AGUA VS. LO QUE PIDE</h3>
          {parametros.map((p) => {
            const ok = p.v == null || (p.v >= p.r[0] && p.v <= p.r[1])
            return (
              <div key={p.nombre} className="flex items-center justify-between gap-3 rounded-xl bg-[rgb(170_225_212/0.06)] px-3.5 py-2.5">
                <span className="flex flex-col gap-0.5">
                  <span className="text-[15px] text-muted-foreground">{p.nombre}</span>
                  <span className="font-heading text-[19px]">{p.pide}</span>
                </span>
                <span className={cn('flex items-center gap-2 text-base', p.v == null ? 'text-tenue' : ok ? 'text-primary' : 'text-aviso')}>
                  <span>{p.v == null ? '—' : p.txt(p.v)}</span>
                  {p.v != null && <span className="font-semibold">{ok ? '✓' : p.v < p.r[0] ? '↓ bajo' : '↑ alto'}</span>}
                </span>
              </div>
            )
          })}
          <p className="text-[15px] leading-normal text-[#cfe3de]">{pez.nota}</p>
        </div>
        <div className="flex flex-col gap-2.5">
          <h3 className={ETIQUETA}>CONVIVENCIA Y ESPACIO</h3>
          <Avisos lista={avisos} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[rgb(170_225_212/0.14)] pt-3.5">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-end gap-3.5">
            {SEXOS.map(([k, nombre]) => (
              <div key={k} role="group" aria-label={nombre} className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">{nombre}</span>
                <div className="flex items-center gap-1.5">
                  <Mas onClick={() => cambiar(k, -1)} label={`${nombre}: uno menos`}>−</Mas>
                  <span aria-live="polite" className="min-w-8 text-center font-heading text-2xl tabular-nums">{n[k]}</span>
                  <Mas onClick={() => cambiar(k, 1)} label={`${nombre}: uno más`}>+</Mas>
                </div>
              </div>
            ))}
          </div>
          <span className={cn('text-sm', sexo && sexo.nivel > 0 ? TEXTO[sexo.nivel] : 'text-tenue')}>
            {sexo ? sexo.txt : 'Recomendado: ' + pez.grupo}
          </span>
        </div>
        <Button onClick={agregar} aria-disabled={!total}
          className={cn('h-[54px] rounded-[14px] px-6 text-[17px] font-semibold max-sm:w-full',
            !total && 'bg-[rgb(170_225_212/0.18)] text-tenue hover:bg-[rgb(170_225_212/0.24)]')}>
          {!total ? 'Elegí cuántos' : ya ? `Sumar ${total}` : `Agregar ${total}`}
        </Button>
      </div>
    </section>
  )
}

/* ---------- Piezas ---------- */

function Foto({ id, alt = '', className, vacia }: { id: string; alt?: string; className: string; vacia?: string }) {
  if (!FOTOS[id]) {
    return vacia
      ? <div className={cn('flex shrink-0 items-center justify-center rounded-[14px] border border-dashed border-[rgb(170_225_212/0.3)] text-center text-[13px] text-tenue', vacia)}>Sin foto todavía</div>
      : <span aria-hidden="true" className={cn('block shrink-0 bg-[rgb(170_225_212/0.1)]', className)} />
  }
  return (
    <img src={FOTOS[id]} alt={alt} loading="lazy" decoding="async" style={{ background: fondoFoto(id) }}
      className={cn('block shrink-0 object-contain', className)} />
  )
}

function Avisos({ lista, chico }: { lista: Aviso[]; chico?: boolean }) {
  return (
    <ul className="flex flex-col gap-2">
      {lista.map((a) => (
        <li key={a.txt} className={cn('flex items-start gap-2.5 leading-[1.45]', chico ? 'text-sm' : 'text-[15px]')}>
          <span aria-hidden="true" className={cn('mt-1.5 shrink-0 rounded-full', chico ? 'size-[9px]' : 'size-2.5', FONDO[a.nivel])} />
          <span className="text-[#e3eeeb]">{a.txt}</span>
        </li>
      ))}
    </ul>
  )
}

const Trazo = ({ d, size = 18 }: { d: string; size?: number }) => (
  <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
)
const Alerta = ({ size }: { size: number }) => <Trazo size={size} d="M12 4l9 16H3zM12 10v4M12 17v.5" />
