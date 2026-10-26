import { useState, type ComponentType, type ReactNode } from 'react'
import { IconoAcuario, IconoAlimentador, IconoCalendario, IconoInicio, IconoPez, IconoPlanta, IconoSalir, IconoVolver, Logo } from '@/components/iconos'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { cerrarSesion, useCentral } from '@/lib/central'
import { hayCuenta } from '@/lib/cuenta'
import { fechaTxt, horaTxt, useAhora } from '@/lib/use-ahora'
import { cn } from '@/lib/utils'
import { Abonos } from '@/pantallas/Abonos'
import { Alimentador } from '@/pantallas/Alimentador'
import { Ingreso } from '@/pantallas/Ingreso'
import { Inicio } from '@/pantallas/Inicio'
import { MiAcuario } from '@/pantallas/MiAcuario'
import { Peces } from '@/pantallas/Peces'

export type Seccion = 'inicio' | 'peces' | 'plantas' | 'abonos' | 'comida' | 'acuario'

/** Lo que una pantalla pone en la barra de arriba: otro título, volver y, solo en tablet, algo al lado del título y a la derecha. */
export interface Barra { titulo: string; atras?: () => void; junto?: ReactNode; accion?: ReactNode }

const SECCIONES: { id: Seccion; corto: string; titulo: string; Icono: ComponentType<{ size?: number }> }[] = [
  { id: 'inicio', corto: 'Inicio', titulo: 'Inicio', Icono: IconoInicio },
  { id: 'peces', corto: 'Peces', titulo: 'Mis peces', Icono: IconoPez },
  { id: 'plantas', corto: 'Plantas', titulo: 'Mis plantas', Icono: IconoPlanta },
  { id: 'abonos', corto: 'Abonos', titulo: 'Abonos', Icono: IconoCalendario },
  { id: 'comida', corto: 'Comida', titulo: 'Horario de comida', Icono: IconoAlimentador },
  { id: 'acuario', corto: 'Acuario', titulo: 'Mi acuario', Icono: IconoAcuario },
]

export default function App() {
  const central = useCentral()
  const [seccion, setSeccion] = useState<Seccion>('inicio')
  const [saliendo, setSaliendo] = useState(false)
  const [barra, setBarra] = useState<Barra | null>(null)
  if (central.pide) return <Ingreso pide={central.pide} />
  if (central.cargando) {
    return (
      <div className="flex min-h-dvh items-center justify-center" role="status" aria-label="Cargando la cuenta">
        <span className="animate-pulse"><Logo size={56} /></span>
      </div>
    )
  }

  const actual = SECCIONES.find((s) => s.id === seccion)!
  // Cerrar sesión solo tiene sentido con la cuenta (fuera de casa); en demo se ve igual, para probarlo
  const salir = (hayCuenta && central.modo === 'nube') || central.modo === 'demo' ? () => setSaliendo(true) : undefined
  return (
    // Móvil: barra arriba y secciones abajo. Tablet (md): secciones en una columna a la izquierda.
    <div className="flex min-h-dvh flex-col md:flex-row">
      <Secciones actual={seccion} ir={setSeccion} salir={salir} />
      <div className="flex min-w-0 grow flex-col pb-20 md:pb-0">
        <Encabezado titulo={barra?.titulo ?? actual.titulo} atras={barra?.atras} junto={barra?.junto} accion={barra?.accion}
          inicio={seccion === 'inicio'} conectado={central.conectado} salir={salir} />
        <main className="grow px-4 pt-1 pb-6 md:px-7 md:pb-6">
          {seccion === 'inicio' ? <Inicio ir={setSeccion} />
            : seccion === 'abonos' ? <Abonos />
              : seccion === 'comida' ? <Alimentador barra={setBarra} />
              : seccion === 'acuario' ? <MiAcuario ir={setSeccion} />
                : seccion === 'peces' ? <Peces barra={setBarra} /> : <Pendiente />}
        </main>
      </div>
      <CerrarSesion abierto={saliendo} cambiar={setSaliendo} />
    </div>
  )
}

/** Pide confirmación: después hay que volver a entrar con el usuario y la contraseña. */
function CerrarSesion({ abierto, cambiar }: { abierto: boolean; cambiar: (abierto: boolean) => void }) {
  return (
    <Dialog open={abierto} onOpenChange={cambiar}>
      <DialogContent className="flex max-w-sm flex-col gap-3 px-5 pt-5 pb-5 md:px-6 md:pt-6">
        <DialogTitle className="pr-10">¿Cerrar sesión en este dispositivo?</DialogTitle>
        <DialogDescription className="text-[15px]">
          Para volver a usar la app acá vas a tener que entrar de nuevo con el usuario y la contraseña de AquaControl.
        </DialogDescription>
        <div className="mt-2 flex flex-col gap-2 md:flex-row-reverse">
          <Button onClick={cerrarSesion} className="h-12 rounded-full px-6 text-base font-semibold">Cerrar sesión</Button>
          <Button variant="ghost" onClick={() => cambiar(false)} className="h-12 rounded-full px-6 text-base text-muted-foreground">Cancelar</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const BOTON_SALIR = 'cursor-pointer items-center justify-center rounded-2xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none'

function Encabezado({ titulo, atras, junto, accion, inicio, conectado, salir }: {
  titulo: string; atras?: () => void; junto?: ReactNode; accion?: ReactNode; inicio: boolean; conectado: boolean; salir?: () => void
}) {
  const ahora = useAhora()
  return (
    <header className="flex h-16 items-center gap-2.5 px-4 pt-[env(safe-area-inset-top)] md:h-auto md:min-h-14 md:gap-3 md:px-7 md:pt-[18px] md:pb-4">
      {atras ? (
        <button type="button" onClick={atras} aria-label="Volver"
          className="-ml-2 flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none md:ml-0 md:border md:border-[rgb(170_225_212/0.25)]">
          <IconoVolver size={22} />
        </button>
      ) : <span className="md:hidden"><Logo /></span>}
      <div className="flex min-w-0 grow items-center gap-[22px]">
        <div className="flex min-w-0 flex-col">
          <h1 className="truncate font-heading text-[22px] font-medium md:text-[30px]">{titulo}</h1>
          {inicio && <div className="hidden text-base text-muted-foreground md:block">{fechaTxt(ahora)}</div>}
        </div>
        {junto && <div className="hidden min-w-0 md:block">{junto}</div>}
      </div>
      {inicio && (
        <div className="hidden items-center gap-5 md:flex">
          <span className={cn('text-sm', conectado ? 'text-tenue' : 'text-aviso')}>{conectado ? 'en vivo' : 'sin conexión'}</span>
          <span className="font-heading text-[52px] leading-none font-medium tracking-[-0.02em]">{horaTxt(ahora)}</span>
        </div>
      )}
      {accion && <div className="hidden shrink-0 items-center gap-2.5 md:flex">{accion}</div>}
      {/* En el móvil no hay menú lateral: cerrar sesión va arriba a la derecha */}
      {salir && (
        <button type="button" onClick={salir} aria-label="Cerrar sesión" className={cn(BOTON_SALIR, 'flex size-11 shrink-0 md:hidden')}>
          <IconoSalir size={22} />
        </button>
      )}
    </header>
  )
}

function Secciones({ actual, ir, salir }: { actual: Seccion; ir: (s: Seccion) => void; salir?: () => void }) {
  return (
    <nav aria-label="Secciones"
      className={cn(
        'fixed inset-x-0 bottom-0 z-10 grid h-20 grid-cols-6 border-t border-[rgb(170_225_212/0.1)] bg-barra pt-2.5 pb-[env(safe-area-inset-bottom)]',
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
      {salir && (
        <button type="button" onClick={salir} aria-label="Cerrar sesión" title="Cerrar sesión"
          className={cn(BOTON_SALIR, 'mt-auto mb-[max(18px,env(safe-area-inset-bottom))] hidden size-14 md:flex')}>
          <IconoSalir size={24} />
        </button>
      )}
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
