import { useEffect, useRef, useState } from 'react'
import { Acuario3D } from '@/components/Acuario3D'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { equipo, fmt, medida, medidas, misPeces, objetivo, ocupacion, PARTE_AGUA } from '@/lib/acuario'
import { fijar, useCentral } from '@/lib/central'
import { useGuardado, type Guardado } from '@/lib/guardado'
import { cn } from '@/lib/utils'
import type { Seccion } from '@/App'

const TITULO = 'text-[13px] font-semibold tracking-[0.1em] text-muted-foreground md:text-sm'
const PANEL = 'rounded-[20px] border border-border bg-panel md:rounded-[22px]'
const COLOR_NIVEL = ['text-primary', 'text-aviso', 'text-alerta']

export function MiAcuario({ ir }: { ir: (s: Seccion) => void }) {
  const [g, cambiar] = useGuardado()
  const m = medidas(g)

  return (
    <div className="flex flex-col gap-3.5 md:grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:items-start md:gap-5">
      {/* Medidas, dibujo y litros */}
      <section aria-labelledby="medidas" className={cn(PANEL, 'flex flex-col gap-3.5 px-4 py-4 md:sticky md:top-4 md:px-6 md:py-5')}>
        <h2 id="medidas" className={TITULO}>MEDIDAS POR DENTRO</h2>
        <div className="grid grid-cols-3 gap-2.5 md:gap-3">
          <Medida id="largo" label="Largo" g={g} cambiar={cambiar} />
          <Medida id="ancho" label="Ancho" g={g} cambiar={cambiar} />
          <Medida id="alto" label="Alto" g={g} cambiar={cambiar} />
        </div>
        {!m.ok && <p role="alert" className="text-sm text-alerta">Cada medida tiene que estar entre 10 y 400 cm.</p>}

        <div className="-mx-1">
          <Acuario3D largo={m.largo} ancho={m.ancho} alto={m.alto} />
          <p className="mt-0.5 text-center text-xs text-tenue">Arrastrá el dibujo para girarlo</p>
        </div>

        <div className="grid grid-cols-2 gap-2.5 md:gap-3">
          <div className="rounded-2xl bg-muted px-4 py-3 md:px-[18px] md:py-3.5">
            <div className="text-sm text-muted-foreground">Volumen bruto</div>
            <div className="font-heading text-[28px] font-medium md:text-4xl">{m.ok ? Math.round(m.bruto) : '—'} L</div>
            <div className="text-xs text-tenue">{fmt(m.largo, 0)} × {fmt(m.ancho, 0)} × {fmt(m.alto, 0)} cm ÷ 1000</div>
          </div>
          <div className="rounded-2xl border border-primary/42 bg-[rgb(12_40_31/0.78)] px-4 py-3 md:px-[18px] md:py-3.5">
            <div className="text-sm text-muted-foreground">Agua real ({Math.round(PARTE_AGUA * 100)} %)</div>
            <div className="font-heading text-[28px] font-medium text-primary md:text-4xl">{m.ok ? Math.round(m.neto) : '—'} L</div>
            <div className="text-xs text-tenue">Sin sustrato ni decoración</div>
          </div>
        </div>
        <p className="text-xs text-tenue md:text-sm">
          Con estos litros se calculan las dosis de abono, cuántos peces entran y el equipo recomendado.
        </p>
      </section>

      <div className="flex flex-col gap-3.5 md:gap-4">
        <AvisosTemperatura />
        <Ocupacion g={g} ir={ir} />

        <Lista titulo="EQUIPO RECOMENDADO" filas={equipo(m.neto).map((e) => ({ ...e, sub: e.nota }))} />
      </div>
    </div>
  )
}

function Medida({ id, label, g, cambiar }: {
  id: 'largo' | 'ancho' | 'alto'; label: string; g: Guardado; cambiar: (p: Partial<Guardado>) => void
}) {
  const mal = medida(g[id]) == null
  return (
    <label htmlFor={'m-' + id} className="flex min-w-0 flex-col gap-1.5 text-sm text-muted-foreground">
      {label} (cm)
      <Input id={'m-' + id} type="number" inputMode="decimal" min={10} max={400} value={g[id]} aria-invalid={mal || undefined}
        onChange={(e) => cambiar({ [id]: e.target.value })}
        className="h-14 rounded-xl bg-muted px-3 font-heading text-xl text-foreground md:h-14 md:px-3.5 md:text-2xl" />
    </label>
  )
}

/* ---------- Rango de temperatura: la central avisa por Telegram si sale de acá ---------- */

const PASO = 0.5
const LIMITES = [15, 35] as const
const ID_MIN = 'number/Temperatura mínima'
const ID_MAX = 'number/Temperatura máxima'

function AvisosTemperatura() {
  const central = useCentral()
  const [g] = useGuardado()
  const s = central.sondas
  const hay = central.vistos.has(ID_MIN) && central.vistos.has(ID_MAX)
  const listo = hay && central.conectado && s.tempMin != null && s.tempMax != null

  // El último cambio: mientras «guardando» se muestra lo tocado, hasta que la central lo
  // devuelva como estado del número (o pasen 10 s sin respuesta)
  const [cambio, setCambio] = useState<{ min: number; max: number; estado: 'guardando' | 'guardado' | 'error' } | null>(null)
  const espera = useRef<ReturnType<typeof setTimeout>>(undefined)
  const plazo = useRef<ReturnType<typeof setTimeout>>(undefined)
  if (cambio?.estado === 'guardando' && s.tempMin === cambio.min && s.tempMax === cambio.max) {
    setCambio({ ...cambio, estado: 'guardado' })
  }
  const guardando = cambio?.estado === 'guardando'
  const min = guardando ? cambio.min : s.tempMin
  const max = guardando ? cambio.max : s.tempMax
  useEffect(() => () => { clearTimeout(espera.current); clearTimeout(plazo.current) }, [])

  const poner = (nuevo: { min: number; max: number }) => {
    setCambio({ ...nuevo, estado: 'guardando' })
    // Espera a que se deje de tocar para no mandar un cambio por cada toque
    clearTimeout(espera.current)
    clearTimeout(plazo.current)
    espera.current = setTimeout(async () => {
      const ok = (await fijar(ID_MIN, nuevo.min)) && (await fijar(ID_MAX, nuevo.max))
      const fallo = (c: typeof cambio) => (c?.estado === 'guardando' ? { ...c, estado: 'error' as const } : c)
      if (!ok) { setCambio(fallo); return }
      plazo.current = setTimeout(() => setCambio(fallo), 10000)
    }, 700)
  }
  const cambiarMin = (v: number) => { if (max != null) poner({ min: v, max }) }
  const cambiarMax = (v: number) => { if (min != null) poner({ min, max: v }) }

  const peces = misPeces(g)
  const rT = objetivo(g, 't', s.temp)
  const sugerido = rT.rango && (rT.rango[0] !== min || rT.rango[1] !== max) ? rT.rango : null
  const fuera = s.temp != null && min != null && max != null && (s.temp < min || s.temp > max)

  return (
    <section aria-labelledby="avisos-temp" className={cn(PANEL, 'flex flex-col gap-3 px-4 py-4 md:px-5 md:py-[18px]')}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="avisos-temp" className={TITULO}>AVISOS DE TEMPERATURA</h2>
        <span aria-live="polite" className={cn('text-xs md:text-sm', cambio?.estado === 'error' ? 'text-alerta' : 'text-tenue')}>
          {cambio && { guardando: 'Guardando…', guardado: '✓ Guardado en la central', error: 'No se pudo guardar' }[cambio.estado]}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">
        La central te avisa por Telegram si el agua baja de la mínima o sube de la máxima, aunque no tengas la app abierta.
      </p>

      <div className="flex flex-col gap-2">
        <Paso etiqueta="Mínima" valor={min} desactivado={!listo}
          bajar={min != null && min - PASO >= LIMITES[0] ? () => cambiarMin(min - PASO) : undefined}
          subir={min != null && max != null && min + PASO <= max - 1 ? () => cambiarMin(min + PASO) : undefined} />
        <Paso etiqueta="Máxima" valor={max} desactivado={!listo}
          bajar={min != null && max != null && max - PASO >= min + 1 ? () => cambiarMax(max - PASO) : undefined}
          subir={max != null && max + PASO <= LIMITES[1] ? () => cambiarMax(max + PASO) : undefined} />
      </div>

      {!hay ? (
        <p className="text-sm text-aviso">Para cambiarlo desde acá, volvé a cargar el programa de la central (firmware/aquacontrol.yaml).</p>
      ) : !central.conectado ? (
        <p className="text-sm text-aviso">La central no está conectada: el rango se puede cambiar cuando vuelva.</p>
      ) : (
        <>
          {s.temp != null && (
            <p className={cn('text-sm', fuera ? 'text-aviso' : 'text-muted-foreground')}>
              Ahora: {fmt(s.temp, 1)} °C · {fuera ? 'fuera del rango' : 'dentro del rango'}
            </p>
          )}
          {peces.length > 0 && !rT.rango && (
            <p className="text-sm text-aviso">Tus peces no comparten un rango de temperatura: revisá «Mis peces».</p>
          )}
          {sugerido && (
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-primary/10 px-3.5 py-2.5">
              <span className="text-sm text-secondary-foreground">Según tus peces: {fmt(sugerido[0], 1)}–{fmt(sugerido[1], 1)} °C</span>
              <Button variant="outline" disabled={sugerido[1] - sugerido[0] < 1}
                onClick={() => poner({ min: sugerido[0], max: sugerido[1] })}
                className="h-10 shrink-0 rounded-full border-primary/40 bg-transparent px-4 text-sm text-secondary-foreground">Usar</Button>
            </div>
          )}
        </>
      )}
    </section>
  )
}

function Paso({ etiqueta, valor, desactivado, bajar, subir }: {
  etiqueta: string; valor: number | null; desactivado: boolean; bajar?: () => void; subir?: () => void
}) {
  const boton = 'size-12 shrink-0 rounded-full border-primary/35 bg-transparent p-0 text-2xl font-normal text-secondary-foreground'
  return (
    <div role="group" aria-label={`Temperatura ${etiqueta.toLowerCase()}`} className="flex items-center gap-2 rounded-2xl bg-muted py-2 pr-2 pl-4">
      <span className="grow text-[15px] text-muted-foreground">{etiqueta}</span>
      <Button variant="outline" className={boton} disabled={desactivado || !bajar} onClick={bajar} aria-label={`Bajar la ${etiqueta.toLowerCase()}`}>−</Button>
      <span className="w-[104px] text-center font-heading text-[28px] leading-none font-medium tabular-nums" aria-live="polite">
        {fmt(valor, 1)}<span className="ml-0.5 text-base text-muted-foreground">°C</span>
      </span>
      <Button variant="outline" className={boton} disabled={desactivado || !subir} onClick={subir} aria-label={`Subir la ${etiqueta.toLowerCase()}`}>+</Button>
    </div>
  )
}

/* ---------- Peces según los litros ---------- */

function Ocupacion({ g, ir }: { g: Guardado; ir: (s: Seccion) => void }) {
  const oc = ocupacion(g)
  const color = COLOR_NIVEL[oc.nivel]
  const barra = ['bg-primary', 'bg-aviso', 'bg-alerta'][oc.nivel]
  return (
    <section aria-labelledby="ocupacion" className={cn(PANEL, 'flex flex-col gap-2.5 px-4 py-4 md:px-5 md:py-[18px]')}>
      <div className="flex items-center justify-between gap-3">
        <h2 id="ocupacion" className={TITULO}>PECES SEGÚN TUS LITROS</h2>
        <Button variant="outline" onClick={() => ir('peces')}
          className="h-10 rounded-full border-primary/35 bg-transparent px-3.5 text-sm font-normal text-secondary-foreground">Mis peces</Button>
      </div>
      <div className="flex items-baseline justify-between">
        <span className="text-[15px] text-muted-foreground">Ocupación</span>
        <span className={cn('font-heading text-[26px] font-medium', color)}>{oc.pct} %</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-[rgb(170_225_212/0.12)]" role="presentation">
        <div className={cn('h-full rounded-full transition-[width]', barra)} style={{ width: Math.min(100, oc.pct) + '%' }} />
      </div>
      <p className="text-sm text-tenue">
        {oc.nivel === 0 ? `Todavía entran unos ${oc.libre} cm de pez adulto.`
          : oc.nivel === 1 ? 'Está casi lleno: mejor no sumar más peces.'
            : 'Hay más peces de los que entran: el agua se ensucia rápido.'}
        {' '}Se cuenta 1 cm de pez adulto por litro neto.
      </p>
    </section>
  )
}

function Lista({ titulo, filas }: { titulo: string; filas: { nombre: string; sub: string; valor: string }[] }) {
  return (
    <section className={cn(PANEL, 'overflow-hidden')}>
      <div className="flex min-h-12 items-center justify-between gap-3 px-4 pt-3 pb-1.5 md:px-5">
        <h2 className={TITULO}>{titulo}</h2>
      </div>
      {filas.map((f) => (
        <div key={f.nombre} className="flex items-center justify-between gap-2.5 border-t border-[rgb(170_225_212/0.08)] px-4 py-3 md:px-5">
          <span className="flex min-w-0 flex-col">
            <span className="text-base md:text-[17px]">{f.nombre}</span>
            <span className="text-[13px] text-tenue">{f.sub}</span>
          </span>
          <span className="font-heading text-lg whitespace-nowrap md:text-xl">{f.valor}</span>
        </div>
      ))}
    </section>
  )
}
