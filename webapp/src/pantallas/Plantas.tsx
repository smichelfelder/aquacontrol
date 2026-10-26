import { useEffect, useState } from 'react'
import { IconoBuscar, IconoMas } from '@/components/iconos'
import { Button } from '@/components/ui/button'
import { PLANTAS, type Planta, type Rango } from '@/data'
import { CREDITOS_PLANTAS, FOTOS_PLANTAS } from '@/data/fotos'
import { CO2_ACUARIO, LUZ_ACUARIO, fmt, problemasPlanta, type Aviso, type Nivel } from '@/lib/acuario'
import { useCentral, type Sondas } from '@/lib/central'
import { useGuardado, type Guardado } from '@/lib/guardado'
import { useAncha } from '@/lib/use-ancha'
import { cn } from '@/lib/utils'
import type { Barra } from '@/App'

// Como la pantalla de 7" del diseño («mis plantas y agregar planta»), igual que «Mis peces»: en
// pantalla ancha la lista va con la ficha al lado; más angosta se ve una cosa por vez.
type Vista = 'lista' | 'detalle' | 'agregar' | 'candidato'

const PANEL = 'rounded-[22px] border border-border bg-panel backdrop-blur-[8px]'
// En pantalla ancha todo entra en el alto de la pantalla y cada panel tiene su propio scroll
const ALTO = 'lg:h-[calc(100dvh-118px)] lg:min-h-[520px]'
const SCROLL = 'lg:min-h-0 lg:overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
const ETIQUETA = 'text-sm tracking-[0.08em] text-tenue'
const FONDO = ['bg-primary', 'bg-aviso', 'bg-alerta']
const VEREDICTO = ['Compatible', 'Con cuidado', 'No recomendada']
const SELLO = ['bg-primary/16 text-secondary-foreground', 'bg-aviso text-[#2a1606]', 'bg-alerta text-[#2b0c0c]']

const DIF = ['Fácil', 'Media', 'Avanzada']
const CREC = ['Lento', 'Medio', 'Rápido']
const CO2 = ['No necesita', 'Recomendado', 'Necesario']
const LUZ = ['Baja', 'Media', 'Alta']
const TIPOS = ['Todas', 'Tallo', 'Roseta', 'Tapizante', 'Epífita', 'Musgo', 'Flotante', 'Bulbo']

const BIBLIOTECA = Object.values(PLANTAS).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
const sinTildes = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
const peor = (l: Aviso[]): Nivel => l.reduce<Nivel>((n, a) => (a.nivel > n ? a.nivel : n), 0)
const luzOk = (pl: Planta) => pl.luz <= LUZ_ACUARIO
const co2Ok = (pl: Planta) => CO2_ACUARIO || pl.co2 === 0

export function Plantas({ barra }: { barra: (b: Barra | null) => void }) {
  const [g, cambiar] = useGuardado()
  const s = useCentral().sondas
  const ancha = useAncha()
  const [vista, setVista] = useState<Vista>('lista')
  const [aviso, setAviso] = useState('')
  const [q, setQ] = useState('')
  const [tipo, setTipo] = useState('Todas')
  const [cand, setCand] = useState('monte-carlo')

  const mias = g.mias.filter((id) => PLANTAS[id])
  const sel = mias.includes(g.selP ?? '') ? g.selP! : mias[0]
  const plCand = PLANTAS[cand] ?? BIBLIOTECA[0]
  let v = vista
  if (ancha && vista === 'detalle') v = 'lista'
  if (ancha && vista === 'candidato') v = 'agregar'
  if (v === 'detalle' && !sel) v = 'lista'

  const irAgregar = () => { setVista('agregar'); setAviso('') }
  const titulo = v === 'lista' ? 'Mis plantas' : v === 'agregar' ? 'Agregar planta' : v === 'detalle' ? PLANTAS[sel!].nombre : plCand.nombre
  const ahora = `Luz ${LUZ[LUZ_ACUARIO].toLowerCase()} · CO₂ ${CO2_ACUARIO ? 'sí' : 'no'} · ${fmt(s.temp, 1)} °C · pH ${fmt(s.ph, 1)}`
  useEffect(() => {
    const junto = <Ahora txt={ahora} />
    if (v === 'lista') {
      barra({ titulo, junto, accion: <>{aviso && <Hecho txt={aviso} />}<BotonAgregar onClick={irAgregar} /></> })
    } else if (ancha) {
      barra({ titulo, junto, accion: <BotonMisPlantas onClick={() => setVista('lista')} /> })
    } else {
      barra({ titulo, junto, atras: () => setVista(v === 'candidato' ? 'agregar' : 'lista') })
    }
  }, [v, ancha, titulo, ahora, aviso, barra])
  useEffect(() => () => barra(null), [barra])
  // Cada vista arranca desde arriba
  useEffect(() => { window.scrollTo(0, 0) }, [v])

  const abrir = (id: string) => {
    cambiar({ selP: id })
    setAviso('')
    if (!ancha) setVista('detalle')
  }
  const quitar = (id: string) => {
    const nuevas = g.mias.filter((x) => x !== id)
    cambiar({ mias: nuevas, selP: nuevas[0] })
    setAviso('Quitada: ' + PLANTAS[id].nombre)
    setVista('lista')
  }
  const elegir = (id: string) => {
    setCand(id)
    if (!ancha) setVista('candidato')
  }
  const agregar = () => {
    if (g.mias.includes(plCand.id)) return
    cambiar({ mias: [...g.mias, plCand.id], selP: plCand.id })
    setQ('')
    setAviso('Agregada: ' + plCand.nombre)
    setVista('lista')
  }

  if (v === 'agregar' || v === 'candidato') {
    return (
      <div className={cn('flex flex-col gap-4 lg:grid lg:grid-cols-[380px_minmax(0,1fr)] xl:grid-cols-[440px_minmax(0,1fr)]', ALTO)}>
        {v === 'agregar' && (
          <Buscador g={g} s={s} q={q} setQ={setQ} tipo={tipo} setTipo={setTipo} marcado={ancha ? plCand.id : undefined} elegir={elegir} />
        )}
        {(ancha || v === 'candidato') && <Candidato g={g} s={s} pl={plCand} agregar={agregar} />}
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_380px]', ALTO)}>
      {v === 'lista' && (
        <div className="flex flex-col gap-3 pb-16 md:pb-0 lg:min-h-0">
          <div className="flex flex-col items-start gap-2 md:hidden">
            <Ahora txt={ahora} />
            {aviso && <Hecho txt={aviso} />}
          </div>
          <MisPlantas g={g} s={s} marcado={ancha ? sel : undefined} abrir={abrir} />
          <BotonAgregar onClick={irAgregar}
            className="fixed right-4 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-10 h-14 rounded-2xl shadow-[0_6px_18px_rgb(0_0_0/0.35)] md:hidden" />
        </div>
      )}
      {(ancha || v === 'detalle') && (
        <div className="flex flex-col gap-4 lg:min-h-0">
          {sel ? <Ficha pl={PLANTAS[sel]} quitar={() => quitar(sel)} /> : <SinPlantas />}
          {/* En pantalla ancha, lo de todas las plantas; en la ficha suelta, solo lo de esa */}
          <QueRevisar s={s} plantas={ancha ? mias.map((id) => PLANTAS[id]) : sel ? [PLANTAS[sel]] : []} />
        </div>
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
      <IconoMas /> Agregar planta
    </Button>
  )
}

function BotonMisPlantas({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ghost" onClick={onClick}
      className="h-11 gap-2 rounded-full border border-input bg-[rgb(9_24_26/0.66)] px-5 text-[17px] font-normal [&_svg]:size-[18px]">
      <Trazo d="M15 6l-6 6 6 6" /> Mis plantas
    </Button>
  )
}

/* ---------- Mis plantas ---------- */

function MisPlantas({ g, s, marcado, abrir }: { g: Guardado; s: Sondas; marcado?: string; abrir: (id: string) => void }) {
  const mias = g.mias.filter((id) => PLANTAS[id]).map((id) => PLANTAS[id])
  const cuenta = [0, 0, 0]
  mias.forEach((pl) => { cuenta[pl.dif] += 1 })
  const rapidas = mias.filter((pl) => pl.crec === 2).length
  return (
    <section aria-label="Mis plantas" className={cn(PANEL, 'flex flex-col gap-1.5 px-3 py-3 md:px-[18px] md:py-3.5 lg:min-h-0 lg:grow')}>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-2 px-1 pt-1.5 pb-3 sm:flex sm:items-start sm:gap-[22px] sm:px-3">
        <div className="row-span-2 flex flex-col gap-0.5">
          <dt className="text-[13px] tracking-[0.08em] text-tenue">PLANTAS</dt>
          <dd className="font-heading text-[28px] font-medium">{mias.length}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-[13px] tracking-[0.08em] text-tenue">DIFICULTAD</dt>
          <dd className="text-base sm:text-[17px]">{cuenta[0]} fáciles · {cuenta[1]} medias · {cuenta[2]} avanzadas</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-[13px] tracking-[0.08em] text-tenue">CRECIMIENTO RÁPIDO</dt>
          <dd className="text-base sm:text-[17px]">{rapidas} {rapidas === 1 ? '(pide poda frecuente)' : '(piden poda frecuente)'}</dd>
        </div>
      </dl>

      <div className={cn('flex grow flex-col gap-1.5 border-t border-[rgb(170_225_212/0.12)] pt-2', SCROLL)}>
        {mias.map((pl) => <Fila key={pl.id} pl={pl} s={s} marcado={pl.id === marcado} onClick={() => abrir(pl.id)} />)}
        {!mias.length && (
          <div className="flex flex-col items-center gap-1.5 px-4 py-7 text-center">
            <span className="font-heading text-xl">Todavía no hay plantas</span>
            <span className="text-[15px] text-muted-foreground">Tocá «Agregar planta» y elegí las que tenés.</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-[18px] gap-y-1 px-1 pt-1.5 text-sm text-tenue sm:px-3">
        <span className="flex items-center gap-2"><span className="inline-block h-4 w-[3px] rounded-sm bg-[#f7fbfa]" />Valor actual de la sonda</span>
        <span className="flex items-center gap-2"><span className="inline-block h-2 w-[22px] rounded-full bg-primary" />Lo tiene</span>
        <span className="flex items-center gap-2"><span className="inline-block h-2 w-[22px] rounded-full bg-aviso" />Le falta o está fuera</span>
      </div>
    </section>
  )
}

function Fila({ pl, s, marcado, onClick }: { pl: Planta; s: Sondas; marcado: boolean; onClick: () => void }) {
  const nivel = peor(problemasPlanta(s, pl))
  const co2Mal = pl.co2 === 2 ? 'bg-alerta' : 'bg-aviso'
  return (
    <button type="button" onClick={onClick} aria-current={marcado || undefined}
      className={cn('grid shrink-0 cursor-pointer grid-cols-[62px_minmax(0,1fr)] items-center gap-x-3.5 rounded-[14px] border px-3 py-2.5 text-left transition-colors',
        'focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
        marcado ? 'border-[rgb(170_225_212/0.35)] bg-accent' : 'border-transparent hover:bg-[rgb(170_225_212/0.05)]')}>
      <Foto id={pl.id} className="h-[52px] w-[62px] rounded-xl" />
      <span className="flex min-w-0 flex-col gap-2.5">
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex min-w-0 grow flex-col sm:flex-row sm:items-baseline sm:gap-2.5">
            <span className="truncate font-heading text-lg font-medium sm:shrink-0 sm:text-xl">{pl.nombre}</span>
            <span className="truncate text-sm text-tenue">{pl.tipo} · {pl.zona}</span>
          </span>
          {nivel > 0 && (
            <span role="img" aria-label={nivel === 2 ? 'No recomendada: revisá esta planta' : 'Revisar esta planta'}
              className={cn('flex size-[30px] shrink-0 items-center justify-center rounded-full border',
                nivel === 2 ? 'border-alerta bg-alerta/18 text-alerta' : 'border-aviso bg-aviso/18 text-aviso')}>
              <Alerta size={16} />
            </span>
          )}
        </span>
        <span className="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-4 sm:gap-6 lg:grid-cols-2 lg:gap-x-4 lg:gap-y-2.5 xl:grid-cols-4 xl:gap-6">
          <Niveles nombre="LUZ" n={pl.luz} txt={LUZ[pl.luz]} ok={luzOk(pl)} color={luzOk(pl) ? 'bg-primary' : 'bg-aviso'} />
          <Niveles nombre="CO₂" n={pl.co2} txt={CO2[pl.co2]} ok={co2Ok(pl)} color={co2Ok(pl) ? 'bg-primary' : co2Mal} />
          <Barrita nombre="TEMP." r={pl.t} lo={14} hi={32} v={s.temp} txt={`${pl.t[0]}–${pl.t[1]} °C`} />
          <Barrita nombre="PH" r={pl.p} lo={5} hi={9} v={s.ph} txt={`${fmt(pl.p[0], 1)}–${fmt(pl.p[1], 1)}`} />
        </span>
      </span>
    </button>
  )
}

/** Luz o CO₂ en tres rayitas, como en el diseño: una para «baja» o «no necesita», tres para lo máximo. */
function Niveles({ nombre, n, txt, ok, color }: { nombre: string; n: number; txt: string; ok: boolean; color: string }) {
  return (
    <span className="flex min-w-0 flex-col gap-1.5">
      <span className="flex flex-wrap justify-between gap-x-1.5 text-[13px]">
        <span className="tracking-[0.06em] text-tenue">{nombre}</span>
        <span className={ok ? 'text-[#b5cbc6]' : color.replace('bg-', 'text-')}>{txt}</span>
      </span>
      <span aria-hidden="true" className="mt-auto grid grid-cols-3 gap-1">
        {[0, 1, 2].map((i) => (
          <span key={i} className={cn('block h-2 rounded', i <= n ? color : 'bg-[rgb(170_225_212/0.16)]')} />
        ))}
      </span>
    </span>
  )
}

/** El rango que pide la planta sobre una escala fija, con la marca del valor actual de la sonda. */
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

/* ---------- Ficha de una planta mía ---------- */

function Ficha({ pl, quitar }: { pl: Planta; quitar: () => void }) {
  return (
    <section aria-label={'Ficha de ' + pl.nombre} className={cn(PANEL, 'flex flex-col gap-2.5 px-[18px] py-4 md:px-[22px] md:py-[18px]', SCROLL)}>
      <div className="flex flex-col gap-1.5">
        <Foto id={pl.id} alt={'Foto de ' + pl.nombre} className="h-44 w-full rounded-[14px] lg:h-[150px]" vacia="h-16 w-full" />
        <Credito id={pl.id} />
      </div>
      <div className="flex flex-col gap-0.5">
        <h2 className="font-heading text-[23px] font-medium">{pl.nombre}</h2>
        <span className="text-sm text-tenue italic">{pl.cientifico}</span>
      </div>
      <dl className="grid grid-cols-[104px_minmax(0,1fr)] gap-x-2.5 gap-y-[7px] text-[15px]">
        <dt className="text-tenue">Tipo</dt><dd>{pl.tipo}</dd>
        <dt className="text-tenue">Ubicación</dt><dd>{pl.zona}</dd>
        <dt className="text-tenue">Dificultad</dt><dd>{DIF[pl.dif]}</dd>
        <dt className="text-tenue">Crecimiento</dt><dd>{CREC[pl.crec]}</dd>
      </dl>
      <p className="text-sm leading-[1.45] text-[#cfe3de]">{pl.nota}</p>
      <Button variant="outline" onClick={quitar}
        className="h-11 self-start rounded-xl border-alerta/50 bg-transparent px-4 text-[15px] font-normal text-[#f6c4c4] hover:bg-alerta/10 hover:text-[#f6c4c4]">
        Quitar de mis plantas
      </Button>
    </section>
  )
}

function SinPlantas() {
  return (
    <section className={cn(PANEL, 'flex flex-col gap-2.5 px-[22px] py-[18px]')}>
      <div className="flex h-16 items-center justify-center rounded-[14px] border border-dashed border-[rgb(170_225_212/0.3)] text-sm text-tenue">Sin foto todavía</div>
      <h2 className="font-heading text-2xl font-medium">Sin plantas</h2>
      <p className="text-sm leading-[1.45] text-[#cfe3de]">Agregá tu primera planta.</p>
    </section>
  )
}

/** El panel ámbar del diseño: hasta 5 cosas a revisar, con el nombre de la planta adelante. */
function QueRevisar({ s, plantas }: { s: Sondas; plantas: Planta[] }) {
  const varias = plantas.length > 1
  const lista = plantas.flatMap((pl) => problemasPlanta(s, pl).map((a) => ({
    ...a, txt: varias ? `${pl.nombre}: ${a.txt.charAt(0).toLowerCase()}${a.txt.slice(1)}` : a.txt,
  })))
  if (!plantas.length) return null
  return (
    <section aria-label="Qué revisar"
      className={cn('flex flex-col gap-2 rounded-[22px] border border-aviso/45 bg-[rgb(52_33_16/0.72)] px-[22px] py-4 backdrop-blur-[8px] lg:min-h-[140px] lg:grow lg:basis-0', SCROLL)}>
      <h3 className="flex items-center gap-2.5 text-[15px] font-semibold tracking-[0.12em] text-aviso">
        <Alerta size={18} /> QUÉ REVISAR
      </h3>
      {lista.length ? (
        <ul className="flex flex-col gap-2">
          {lista.slice(0, 5).map((a) => (
            <li key={a.txt} className="flex items-start gap-2.5 text-[15px] leading-[1.45] text-[#f6e2cf]">
              <span aria-hidden="true" className={cn('mt-1.5 size-2.5 shrink-0 rounded-full', FONDO[a.nivel])} />
              {a.txt}
            </li>
          ))}
          {lista.length > 5 && <li className="text-sm text-[#e0c8b0]">Y {lista.length - 5} más: tocá cada planta para verlas.</li>}
        </ul>
      ) : (
        <p className="text-[15px] text-[#f6e2cf]">{varias ? 'Todas tus plantas tienen lo que necesitan.' : 'Tu acuario le da todo lo que necesita.'}</p>
      )}
    </section>
  )
}

/* ---------- Agregar planta ---------- */

function Buscador({ g, s, q, setQ, tipo, setTipo, marcado, elegir }: {
  g: Guardado; s: Sondas; q: string; setQ: (q: string) => void; tipo: string; setTipo: (t: string) => void
  marcado?: string; elegir: (id: string) => void
}) {
  const busca = sinTildes(q.trim())
  const lista = BIBLIOTECA.filter((pl) =>
    (tipo === 'Todas' || pl.tipo === tipo) && (!busca || sinTildes(pl.nombre + ' ' + pl.cientifico).includes(busca)))
  return (
    <section aria-label="Biblioteca de plantas" className={cn(PANEL, 'flex flex-col gap-3 p-4 md:p-[18px] lg:min-h-0')}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor="buscar-planta" className={ETIQUETA}>BUSCAR EN LA BIBLIOTECA</label>
        <span className="text-sm text-tenue" aria-live="polite">{lista.length} de {BIBLIOTECA.length} especies</span>
      </div>
      <div className="flex min-h-[52px] items-center gap-2.5 rounded-[14px] border border-input bg-muted px-4 focus-within:ring-3 focus-within:ring-ring/50">
        <IconoBuscar size={20} className="shrink-0 text-muted-foreground" />
        <input id="buscar-planta" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rotala, anubias, musgo…" autoComplete="off"
          className="min-w-0 grow bg-transparent text-[19px] outline-none placeholder:text-[#7f9893]" />
      </div>
      <div role="group" aria-label="Tipo de planta" className="flex flex-wrap gap-1.5">
        {TIPOS.map((t) => (
          <button key={t} type="button" onClick={() => setTipo(t)} aria-pressed={t === tipo}
            className={cn('min-h-9 cursor-pointer rounded-full border px-3 text-sm transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
              t === tipo ? 'border-primary bg-primary font-semibold text-primary-foreground' : 'border-[rgb(170_225_212/0.25)] text-[#cfe3de] hover:bg-[rgb(170_225_212/0.06)]')}>
            {t}
          </button>
        ))}
      </div>
      <div className={cn('flex grow flex-col gap-1', SCROLL)}>
        {lista.map((pl) => {
          const nivel = peor(problemasPlanta(s, pl))
          const on = pl.id === marcado
          return (
            <button key={pl.id} type="button" onClick={() => elegir(pl.id)} aria-current={on || undefined}
              className={cn('flex min-h-[58px] shrink-0 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors',
                'focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
                on ? 'border-[rgb(170_225_212/0.35)] bg-accent' : 'border-transparent hover:bg-[rgb(170_225_212/0.05)]')}>
              <Foto id={pl.id} className="h-10 w-12 rounded-lg" />
              <span className="flex min-w-0 grow flex-col gap-0.5">
                <span className="truncate font-heading text-[17px] font-medium">{pl.nombre}</span>
                <span className="truncate text-[13px] text-tenue">{g.mias.includes(pl.id) ? 'Ya la tenés · ' : ''}{pl.tipo} · {DIF[pl.dif]}</span>
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

function Candidato({ g, s, pl, agregar }: { g: Guardado; s: Sondas; pl: Planta; agregar: () => void }) {
  const problemas = problemasPlanta(s, pl)
  const nivel = peor(problemas)
  const avisos: (Aviso | { txt: string; nivel: 'info' })[] = problemas.length ? [...problemas] : [{ txt: 'Tu acuario le da todo lo que necesita.', nivel: 0 }]
  if (pl.crec === 2) avisos.push({ txt: 'Crece rápido: va a pedir poda y abono frecuentes.', nivel: 'info' })
  const ya = g.mias.includes(pl.id)
  const dentro = (v: number | null, r: Rango) => v == null || (v >= r[0] && v <= r[1])

  const parametros = [
    { nombre: 'Temperatura', pide: `${pl.t[0]}–${pl.t[1]} °C`, actual: fmt(s.temp, 1) + ' °C', ok: dentro(s.temp, pl.t), sin: s.temp == null,
      mal: s.temp != null && s.temp < pl.t[0] ? '↓ baja' : '↑ alta' },
    { nombre: 'pH', pide: `${fmt(pl.p[0], 1)}–${fmt(pl.p[1], 1)}`, actual: fmt(s.ph, 1), ok: dentro(s.ph, pl.p), sin: s.ph == null,
      mal: s.ph != null && s.ph < pl.p[0] ? '↓ bajo' : '↑ alto' },
    { nombre: 'Luz', pide: LUZ[pl.luz], actual: 'Tenés ' + LUZ[LUZ_ACUARIO].toLowerCase(), ok: luzOk(pl), sin: false, mal: 'falta luz' },
    { nombre: 'CO₂', pide: CO2[pl.co2], actual: CO2_ACUARIO ? 'Tenés CO₂' : 'Sin CO₂', ok: co2Ok(pl), sin: false,
      mal: pl.co2 === 2 ? 'necesario' : 'recomendado' },
  ]

  return (
    <section aria-label={pl.nombre} className={cn(PANEL, 'flex flex-col gap-4 px-4 py-4 md:px-[26px] md:py-[22px] lg:min-h-0')}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-1 sm:flex-row sm:items-center sm:gap-[18px]">
          <Foto id={pl.id} alt={'Foto de ' + pl.nombre} className="h-48 w-full rounded-[14px] sm:h-28 sm:w-[150px]" vacia="h-28 w-full sm:w-[150px]" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 className="font-heading text-[26px] font-medium md:text-[30px]">{pl.nombre}</h2>
            <span className="text-[15px] text-tenue"><i>{pl.cientifico}</i> · {pl.tipo} · {pl.zona}</span>
            <Credito id={pl.id} />
          </div>
        </div>
        <span className={cn('self-start rounded-full px-4 py-2 text-base font-semibold whitespace-nowrap', SELLO[nivel])}>{VEREDICTO[nivel]}</span>
      </div>

      <div className={cn('flex flex-col gap-4 lg:grow', SCROLL)}>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {parametros.map((p) => (
            <div key={p.nombre} className="flex items-center justify-between gap-3 rounded-xl bg-[rgb(170_225_212/0.06)] px-3.5 py-2.5">
              <span className="flex flex-col gap-0.5">
                <span className="text-sm text-muted-foreground">{p.nombre}</span>
                <span className="font-heading text-lg">{p.pide}</span>
              </span>
              <span className={cn('flex flex-col items-end gap-0.5 text-sm', p.sin ? 'text-tenue' : p.ok ? 'text-primary' : 'text-aviso')}>
                <span>{p.actual}</span>
                {!p.sin && <span className="font-semibold">{p.ok ? '✓' : p.mal}</span>}
              </span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-[15px]">
          <span><span className="text-tenue">Dificultad: </span>{DIF[pl.dif]}</span>
          <span><span className="text-tenue">Crecimiento: </span>{CREC[pl.crec]}</span>
        </div>
        <p className="text-base leading-normal text-[#cfe3de]">{pl.nota}</p>
        <ul className="flex flex-col gap-2">
          {avisos.map((a) => (
            <li key={a.txt} className="flex items-start gap-2.5 text-[15px] leading-[1.45]">
              <span aria-hidden="true" className={cn('mt-1.5 size-2.5 shrink-0 rounded-full', a.nivel === 'info' ? 'bg-[#8cc6f0]' : FONDO[a.nivel])} />
              <span className="text-[#e3eeeb]">{a.txt}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex justify-end border-t border-[rgb(170_225_212/0.14)] pt-3.5">
        {ya ? (
          <span className="flex min-h-[54px] items-center gap-2 text-[17px] text-secondary-foreground">
            <Trazo d="M5 12l5 5L20 7" /> Ya está en tus plantas
          </span>
        ) : (
          <Button onClick={agregar} className="h-[54px] rounded-[14px] px-7 text-[19px] font-semibold max-sm:w-full">Agregar a mis plantas</Button>
        )}
      </div>
    </section>
  )
}

/* ---------- Piezas ---------- */

function Foto({ id, alt = '', className, vacia }: { id: string; alt?: string; className: string; vacia?: string }) {
  if (!FOTOS_PLANTAS[id]) {
    return vacia
      ? <div className={cn('flex shrink-0 items-center justify-center rounded-[14px] border border-dashed border-[rgb(170_225_212/0.3)] text-center text-[13px] text-tenue', vacia)}>Sin foto todavía</div>
      : <span aria-hidden="true" className={cn('block shrink-0 bg-[rgb(170_225_212/0.1)]', className)} />
  }
  return (
    <img src={FOTOS_PLANTAS[id]} alt={alt} loading="lazy" decoding="async"
      className={cn('block shrink-0 bg-[#08090a] object-cover', className)} />
  )
}

/** Quién sacó la foto y con qué licencia (lo piden CC BY y CC BY-SA), con el enlace a la original. */
function Credito({ id }: { id: string }) {
  const c = CREDITOS_PLANTAS[id]
  if (!c || !FOTOS_PLANTAS[id]) return null
  const autor = c.autor.replace(/^\w+:User:/, '')
  return (
    <p className="text-xs leading-snug text-tenue">
      {c.especie && <>Foto de referencia: <i>{c.especie}</i>. </>}
      <a href={c.fuente} target="_blank" rel="noopener noreferrer" className="underline decoration-[rgb(170_225_212/0.35)] underline-offset-2 hover:text-[#cfe3de]">
        {autor}
      </a>
      {' · '}{c.licencia}
    </p>
  )
}

const Trazo = ({ d, size = 18 }: { d: string; size?: number }) => (
  <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
)
const Alerta = ({ size }: { size: number }) => <Trazo size={size} d="M12 4l9 16H3zM12 10v4M12 17v.5" />
