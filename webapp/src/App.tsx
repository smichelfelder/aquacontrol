import { useState, type ComponentType } from 'react'
import { IconoAcuario, IconoCalendario, IconoInicio, IconoPez, IconoPlanta, Logo } from '@/components/iconos'
import { useCentral } from '@/lib/central'
import { fechaTxt, horaTxt, useAhora } from '@/lib/use-ahora'
import { cn } from '@/lib/utils'
import { Ingreso } from '@/pantallas/Ingreso'
import { Abonos } from '@/pantallas/Abonos'
import { Inicio } from '@/pantallas/Inicio'

export type Seccion = 'inicio' | 'peces' | 'plantas' | 'abonos' | 'acuario'

const SECCIONES: { id: Seccion; corto: string; titulo: string; Icono: ComponentType<{ size?: number }> }[] = [
  { id: 'inicio', corto: 'Inicio', titulo: 'Inicio', Icono: IconoInicio },
  { id: 'peces', corto: 'Peces', titulo: 'Mis peces', Icono: IconoPez },
  { id: 'plantas', corto: 'Plantas', titulo: 'Mis plantas', Icono: IconoPlanta },
  { id: 'abonos', corto: 'Abonos', titulo: 'Abonos', Icono: IconoCalendario },
  { id: 'acuario', corto: 'Acuario', titulo: 'Mi acuario', Icono: IconoAcuario },
]

export default function App() {
  const central = useCentral()
  const [seccion, setSeccion] = useState<Seccion>('inicio')
  if (central.pide) return <Ingreso pide={central.pide} />
  if (central.cargando) {
    return (
      <div className="flex min-h-dvh items-center justify-center" role="status" aria-label="Cargando la cuenta">
        <span className="animate-pulse"><Logo size={56} /></span>
      </div>
    )
  }

  const actual = SECCIONES.find((s) => s.id === seccion)!
  return (
    // Móvil: barra arriba y secciones abajo. Tablet (md): secciones en una columna a la izquierda.
    <div className="flex min-h-dvh flex-col md:flex-row">
      <Secciones actual={seccion} ir={setSeccion} />
      <div className="flex min-w-0 grow flex-col pb-20 md:pb-0">
        <Encabezado titulo={actual.titulo} inicio={seccion === 'inicio'} conectado={central.conectado} />
        <main className="grow px-4 pt-1 pb-6 md:px-7 md:pb-6">
          {seccion === 'inicio' ? <Inicio ir={setSeccion} /> : seccion === 'abonos' ? <Abonos /> : <Pendiente />}
        </main>
      </div>
    </div>
  )
}

function Encabezado({ titulo, inicio, conectado }: { titulo: string; inicio: boolean; conectado: boolean }) {
  const ahora = useAhora()
  return (
    <header className="flex h-16 items-center gap-2.5 px-4 pt-[env(safe-area-inset-top)] md:h-auto md:min-h-14 md:gap-3 md:px-7 md:pt-[18px] md:pb-4">
      <span className="md:hidden"><Logo /></span>
      <div className="flex min-w-0 grow flex-col">
        <h1 className="truncate font-heading text-[22px] font-medium md:text-[30px]">{titulo}</h1>
        {inicio && <div className="hidden text-base text-muted-foreground md:block">{fechaTxt(ahora)}</div>}
      </div>
      {inicio && (
        <div className="hidden items-center gap-5 md:flex">
          <span className={cn('text-sm', conectado ? 'text-tenue' : 'text-aviso')}>{conectado ? 'en vivo' : 'sin conexión'}</span>
          <span className="font-heading text-[52px] leading-none font-medium tracking-[-0.02em]">{horaTxt(ahora)}</span>
        </div>
      )}
    </header>
  )
}

function Secciones({ actual, ir }: { actual: Seccion; ir: (s: Seccion) => void }) {
  return (
    <nav aria-label="Secciones"
      className={cn(
        'fixed inset-x-0 bottom-0 z-10 grid h-20 grid-cols-5 border-t border-[rgb(170_225_212/0.1)] bg-barra pt-2.5 pb-[env(safe-area-inset-bottom)]',
        'md:sticky md:top-0 md:flex md:h-dvh md:w-24 md:shrink-0 md:flex-col md:items-center md:gap-3.5 md:border-t-0 md:border-r md:bg-barra/85 md:pt-[18px]',
      )}>
      <div className="mb-3.5 hidden md:block"><Logo size={40} /></div>
      {SECCIONES.map(({ id, corto, Icono }) => {
        const on = id === actual
        return (
          <button key={id} type="button" onClick={() => ir(id)} aria-current={on ? 'page' : undefined}
            className={cn('flex cursor-pointer flex-col items-center gap-1 focus-visible:outline-none md:w-20',
              on ? 'text-accent-foreground' : 'text-muted-foreground')}>
            <span className={cn('flex h-8 w-[60px] items-center justify-center rounded-2xl transition-colors md:w-14',
              on ? 'bg-primary/22' : 'hover:bg-accent', '[button:focus-visible_&]:ring-3 [button:focus-visible_&]:ring-ring/50')}>
              <Icono size={22} />
            </span>
            <span className={cn('text-xs md:text-[13px]', on ? 'font-semibold' : 'font-medium')}>{corto}</span>
          </button>
        )
      })}
    </nav>
  )
}

function Pendiente() {
  return (
    <div className="rounded-[18px] border border-border bg-panel px-5 py-6 text-muted-foreground">
      Esta sección todavía no está en la app nueva. Por ahora usá la app anterior.
    </div>
  )
}
