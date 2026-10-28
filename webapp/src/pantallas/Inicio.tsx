import { useState, type ComponentProps, type ReactNode } from 'react'
import { HistorialTemperatura } from '@/components/HistorialTemperatura'
import { CambioAgua, DialogoMant, DialogoRegistro, EtiquetaMant, PanelActivo, PanelReanudando } from '@/components/Mantenimiento'
import { Button } from '@/components/ui/button'
import { IconoAcuario, IconoComida, IconoFlecha, IconoLlave, IconoOlas, IconoPez, IconoPlanta } from '@/components/iconos'
import {
  abonosDeHoy, fmt, fueraDeAvisos, litrosNetos, misPeces, misPlantas, nivelAgua, nivelPlanta, objetivo, problemasPez,
} from '@/lib/acuario'
import { pulsar, tiene, useCentral } from '@/lib/central'
import { comidaServida, horaToma, proximasTomas } from '@/lib/comida'
import { useGuardado } from '@/lib/guardado'
import { diaISO, fechaTxt, horaTxt, useAhora } from '@/lib/use-ahora'
import { notaSondas, ultimoCambio, type Mantenimiento } from '@/lib/mantenimiento'
import { cn } from '@/lib/utils'
import type { Seccion } from '@/App'

export function Inicio({ ir, mt }: { ir: (s: Seccion) => void; mt: Mantenimiento }) {
  const central = useCentral()
  const [g, cambiar] = useGuardado()
  const ahora = useAhora()
  const s = central.sondas
  const [historial, setHistorial] = useState(false)
  const [verMant, setVerMant] = useState(false)

  // Mantenimiento: mientras dura cambia el abono por el cambio de agua y las acciones por la cuenta regresiva
  const activo = mt.m?.modo === 'activo'
  const reanudando = mt.m?.modo === 'reanudando'
  const nota = notaSondas(mt)

  // Sondas y su objetivo según los peces que tengo
  const rT = objetivo(g, 't', s.temp)
  const rP = objetivo(g, 'p', s.ph)
  const rD = objetivo(g, 'd', s.tds)
  const objTxt = (r: ReturnType<typeof objetivo>, dec: number, unidad: string) =>
    !misPeces(g).length ? 'Sin especies'
      : r.rango ? `Objetivo ${fmt(r.rango[0], dec)}–${fmt(r.rango[1], dec)}${unidad}` : 'Sin rango común'
  const nivel = nivelAgua(s)

  // Abono
  const hoy = abonosDeHoy(g, ahora)
  const abonoHoy = g.abono.slice(0, 10) === diaISO(ahora)
  const marcarAbono = () => cambiar({ abono: abonoHoy ? '' : diaISO(ahora) + ' ' + horaTxt(ahora) })

  // Comedero y filtro (se activan en la etapa 5)
  const hayComedero = tiene('button/Alimentar')
  const hayFiltro = tiene('button/Filtro: encender')
  const comidaOn = comidaServida(g, ahora)
  const filtroOn = hayFiltro && !comidaOn && g.filtro
  const proxima = proximasTomas(g.tomas, ahora, 8)[0]
  const alimentar = () => {
    if (!hayComedero || comidaOn) return
    pulsar('button/Alimentar')
    cambiar({ comida: Date.now(), filtro: true })
  }
  const cambiarFiltro = () => {
    if (!hayFiltro) return
    pulsar(filtroOn ? 'button/Filtro: apagar' : 'button/Filtro: encender')
    cambiar({ filtro: !filtroOn, comida: 0 })
  }

  // Resúmenes
  const peces = misPeces(g)
  const pecesRevisar = peces.filter((p) => problemasPez(g, s, p).length > 0).length
  const plantas = misPlantas(g)
  const plantasRevisar = plantas.filter((p) => nivelPlanta(s, p) > 0).length

  return (
    <div className="flex flex-col gap-3.5 md:min-h-full md:gap-4">
      <div className="flex items-baseline justify-between md:hidden">
        <div className="font-heading text-xl">{fechaTxt(ahora)}</div>
        <div className="text-[13px] text-tenue">{central.conectado ? 'en vivo' : 'sin conexión'}</div>
      </div>
      {mt.m && <div className="-mt-1 md:hidden"><EtiquetaMant mt={mt} /></div>}

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-4">
        <Sonda titulo="Temperatura" valor={fmt(s.temp, 1)} unidad="°C" alerta={s.temp != null && (!rT.ok || fueraDeAvisos(s))} pie={objTxt(rT, 0, ' °C')} nota={nota}
          onClick={() => setHistorial(true)} />
        <Sonda titulo="pH" valor={fmt(s.ph, 1)} alerta={s.ph != null && !rP.ok} pie={objTxt(rP, 1, '')} nota={nota} />
        <Sonda titulo="TDS" valor={s.tds == null ? '—' : String(Math.round(s.tds))} unidad="ppm" alerta={s.tds != null && !rD.ok} pie={objTxt(rD, 0, ' ppm')} nota={nota} />
        <Sonda titulo="Nivel de agua" valor={nivel.txt} pie={nivel.sub} nota={nota} palabra
          tono={{ bien: 'text-primary', aviso: 'text-aviso', alerta: 'text-alerta', 'sin-dato': 'text-tenue' }[nivel.tono]} />
      </div>
      <HistorialTemperatura abierto={historial} cambiar={setHistorial} actual={s.temp} rango={rT.rango} modo={central.modo} />

      <div className="flex flex-col gap-3.5 md:grid md:flex-1 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] md:grid-rows-[1fr_auto] md:gap-4">
        {/* Abono de hoy (en mantenimiento, el cambio de agua) */}
        {activo ? <CambioAgua mt={mt} temp={s.temp} /> : (
        <section aria-labelledby="abono-hoy"
          className="flex flex-col gap-3 rounded-[20px] border border-primary/40 bg-[rgb(12_40_31/0.78)] px-4 py-3.5 md:col-start-1 md:row-start-1 md:gap-3.5 md:rounded-[22px] md:px-6 md:py-[18px]">
          <div className="flex items-center justify-between">
            <h2 id="abono-hoy" className="text-[13px] font-semibold tracking-[0.12em] text-primary md:text-base">ABONO DE HOY</h2>
            <Button variant="outline" onClick={() => ir('abonos')}
              className="h-10 rounded-full border-primary/35 bg-transparent px-3.5 text-sm font-normal text-secondary-foreground md:h-11 md:px-[18px] md:text-base">
              Calendario
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 md:gap-2.5">
            {hoy.map((a) => (
              <span key={a.nombre} className="flex items-baseline gap-2 rounded-xl bg-primary/12 px-3.5 py-2 font-heading md:gap-3 md:rounded-[14px] md:px-[18px] md:py-2.5">
                <span className="text-lg font-medium md:text-2xl">{a.nombre}</span>
                <span className="text-base text-secondary-foreground md:text-[22px]">{a.dosis}</span>
              </span>
            ))}
            {!hoy.length && <span className="font-heading text-lg text-[#cfe3de] md:text-2xl">Hoy no toca abono</span>}
          </div>
          {hoy.length > 0 && (
            <Button onClick={marcarAbono} variant={abonoHoy ? 'outline' : 'default'}
              className={cn('mt-auto h-12 rounded-full text-base md:h-[52px] md:self-start md:px-7 md:text-lg',
                abonoHoy ? 'border-primary/50 bg-transparent font-normal text-secondary-foreground' : 'font-semibold')}>
              {abonoHoy ? `✓ Hecho a las ${g.abono.slice(11)}` : 'Marcar como hecho'}
            </Button>
          )}
        </section>
        )}

        {/* Comida, filtro y mantenimiento */}
        <div className="flex flex-col gap-3.5 md:col-start-2 md:row-span-2 md:row-start-1 md:gap-4">
          {activo ? <PanelActivo mt={mt} /> : reanudando ? <PanelReanudando mt={mt} /> : <>
          <Accion icono={<IconoComida />} onClick={alimentar} disabled={!hayComedero}
            titulo={comidaOn ? 'Comida servida' : 'Alimentar ahora'}
            sub={!hayComedero ? 'Se activa en la etapa 5' : comidaOn ? `Filtro en pausa ${g.pausa} min`
              : proxima ? `Próxima toma: ${proxima.off === 1 ? 'mañana ' : ''}${horaToma(proxima.t)}` : 'Sin tomas programadas'} />
          <Accion icono={<IconoOlas />} onClick={cambiarFiltro} disabled={!hayFiltro}
            role="switch" aria-checked={filtroOn}
            titulo="Filtro"
            sub={!hayFiltro ? 'Se activa en la etapa 5' : filtroOn ? 'Encendido' : comidaOn ? 'En pausa · vuelve solo' : 'Apagado'}>
            <span className={cn('relative h-8 w-[58px] shrink-0 rounded-full transition-colors', filtroOn ? 'bg-primary' : 'bg-[rgb(170_225_212/0.22)]')}>
              <span className={cn('absolute top-1 size-6 rounded-full bg-[#f2f7f6] transition-[left]', filtroOn ? 'left-[30px]' : 'left-1')} />
            </span>
          </Accion>
          <Accion icono={<IconoLlave />} onClick={() => setVerMant(true)} titulo="Mantenimiento" sub={ultimoCambio(g.mantHist, ahora)}
            className="border-mant/36" caja="bg-mant/16 text-mant">
            <IconoFlecha size={22} className="shrink-0 text-mant" />
          </Accion>
          </>}
        </div>
        <DialogoMant mt={mt} abierto={verMant} cambiarAbierto={setVerMant} />
        <DialogoRegistro mt={mt} />

        {/* Accesos */}
        <nav aria-label="Mi acuario" className="flex flex-col gap-2 md:col-start-1 md:row-start-2 md:grid md:grid-cols-3 md:gap-3.5">
          <Acceso onClick={() => ir('peces')} titulo="Mis peces"
            sub={pecesRevisar ? `${pecesRevisar} a revisar` : `${peces.length} especies · bien`}
            subColor={pecesRevisar ? 'text-aviso' : 'text-bien'}
            icono={<IconoPez />} caja="bg-aviso text-[#2a1606]" marco="border-aviso/45 bg-[rgb(52_33_16/0.55)] md:border-aviso/50 md:bg-[rgb(52_33_16/0.6)]" />
          <Acceso onClick={() => ir('plantas')} titulo="Mis plantas"
            sub={plantasRevisar ? `${plantasRevisar} a revisar` : `${plantas.length} especies · bien`}
            subColor={plantasRevisar ? 'text-aviso' : 'text-bien'}
            icono={<IconoPlanta />} caja="bg-planta text-[#173404]" marco="border-planta/45 bg-[rgb(22_52_30/0.6)] md:border-planta/50 md:bg-[rgb(22_52_30/0.66)]" />
          <Acceso onClick={() => ir('acuario')} titulo="Mi acuario"
            sub={`${Math.round(litrosNetos(g))} L netos`} subColor="text-muted-foreground"
            icono={<IconoAcuario />} caja="bg-primary text-primary-foreground" marco="border-primary/30 bg-[rgb(14_44_40/0.6)] md:border-primary/40 md:bg-[rgb(14_44_40/0.66)]" />
        </nav>
      </div>
    </div>
  )
}

/** Con onClick se puede tocar (abre el historial) y muestra una flecha. Con palabra, el valor es texto («Normal») y va más chico para entrar en la columna. */
/** nota: en mantenimiento reemplaza al pie (las sondas siguen midiendo, sin alarmas). */
function Sonda({ titulo, valor, unidad, pie, nota, alerta, tono, palabra, onClick }: {
  titulo: string; valor: string; unidad?: string; pie: string; nota?: string | null; alerta?: boolean; tono?: string; palabra?: boolean; onClick?: () => void
}) {
  const Caja = onClick ? 'button' : 'div'
  return (
    <Caja {...(onClick && { type: 'button' as const, onClick, 'aria-label': `${titulo}: ${valor} ${unidad ?? ''}. Ver historial` })}
      className={cn('flex flex-col gap-1 rounded-[18px] border border-border bg-panel px-4 py-3.5 text-left md:gap-1.5 md:rounded-[20px] md:px-5 md:py-4',
        onClick && 'cursor-pointer transition-colors hover:bg-[rgb(14_34_36/0.8)] focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none')}>
      <div className="flex items-center justify-between text-sm text-muted-foreground md:text-base">
        {titulo}
        {onClick && <IconoFlecha size={18} className="shrink-0 text-tenue" />}
      </div>
      <div className="flex items-baseline gap-1 md:gap-1.5">
        <span className={cn('font-heading text-[34px] leading-[1.15] font-medium md:text-[50px] md:leading-[1.1]', palabra && 'md:text-[38px] md:leading-[1.45]',
          tono ?? (alerta ? 'text-aviso' : 'text-foreground'))}>
          {valor}
        </span>
        {unidad && <span className="text-base text-muted-foreground md:text-[22px]">{unidad}</span>}
      </div>
      <div className={cn('text-xs md:text-sm', nota ? 'text-mant' : 'text-tenue')}>{nota ?? pie}</div>
    </Caja>
  )
}

function Accion({ icono, titulo, sub, children, className, caja, ...props }: {
  icono: ReactNode; titulo: string; sub: string; children?: ReactNode; caja?: string
} & ComponentProps<'button'>) {
  return (
    <button type="button" {...props}
      className={cn('flex items-center gap-3.5 rounded-[20px] border border-border bg-panel px-4 py-3.5 text-left transition-colors',
        'enabled:cursor-pointer enabled:hover:bg-[rgb(14_34_36/0.8)] focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
        'md:flex-1 md:gap-4 md:rounded-[22px] md:px-5 md:py-[18px]', className)}>
      <span className={cn('flex size-12 shrink-0 items-center justify-center rounded-[14px] md:size-14 md:rounded-2xl [&_svg]:size-[26px] md:[&_svg]:size-[30px]',
        caja ?? 'bg-primary/14 text-secondary-foreground')}>
        {icono}
      </span>
      <span className="flex grow flex-col gap-0.5 md:gap-1">
        <span className="font-heading text-[19px] font-medium md:text-2xl">{titulo}</span>
        <span className="text-sm text-muted-foreground md:text-base">{sub}</span>
      </span>
      {children}
    </button>
  )
}

function Acceso({ titulo, sub, subColor, icono, caja, marco, onClick }: {
  titulo: string; sub: string; subColor: string; icono: ReactNode; caja: string; marco: string; onClick: () => void
}) {
  return (
    <button type="button" onClick={onClick}
      className={cn('flex min-h-16 cursor-pointer items-center gap-3 rounded-[18px] border px-3.5 text-left transition-[filter] hover:brightness-125',
        'focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none md:flex-col md:items-start md:gap-2.5 md:rounded-[22px] md:p-4', marco)}>
      <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl md:size-[50px] md:rounded-[15px] md:[&_svg]:size-7', caja)}>
        {icono}
      </span>
      <span className="flex min-w-0 grow flex-col md:gap-0.5">
        <span className="font-heading text-[17px] md:text-xl md:font-medium">{titulo}</span>
        <span className={cn('text-[13px] md:text-sm', subColor)}>{sub}</span>
      </span>
      <IconoFlecha size={20} className="shrink-0 text-muted-foreground md:hidden" />
    </button>
  )
}
