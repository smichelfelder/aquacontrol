import { useState, type FormEvent, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Logo } from '@/components/iconos'
import { cerrarSesion, credencialesGuardadas, ingresarCuenta, ingresarMqtt, type Pide } from '@/lib/central'

const CAMPO = 'h-[50px] rounded-[14px] bg-panel px-3.5 text-base md:text-base'

/** Lo que hay que ingresar para usar la app fuera de casa. */
export function Ingreso({ pide }: { pide: NonNullable<Pide> }) {
  if (pide.que === 'cuenta') return <Cuenta error={pide.error} />
  if (pide.que === 'aviso') return <Aviso texto={pide.error} />
  return <Emqx error={pide.error} />
}

/** Con cuenta, los datos de EMQX no se cargan en la app: si faltan o fallan, se avisa. */
function Aviso({ texto }: { texto: string }) {
  return (
    <div className="mx-auto flex max-w-[360px] flex-col gap-3.5 px-6 pt-[12vh] pb-6">
      <Marca />
      <p role="alert" className="text-base text-aviso">{texto}</p>
      <p className="text-sm text-muted-foreground">
        En Supabase → SQL Editor, ejecutá <code className="text-foreground">supabase/cargar-emqx.sql</code> con los datos de EMQX (ver README, «Cuenta»).
      </p>
      <Button onClick={() => location.reload()} className="mt-1.5 h-[52px] rounded-full text-base font-semibold">Reintentar</Button>
      <Button variant="ghost" onClick={cerrarSesion} className="h-11 rounded-full text-muted-foreground">Cerrar sesión</Button>
    </div>
  )
}

function Marca() {
  return (
    <h1 className="mb-1 flex items-center gap-2.5 text-[28px] font-medium">
      <Logo size={34} />
      <span>Aqua<b className="font-semibold text-primary">Control</b></span>
    </h1>
  )
}

/** La cuenta de AquaControl: un único usuario, una vez por dispositivo. */
function Cuenta({ error }: { error: string }) {
  const [email, setEmail] = useState('')
  const [clave, setClave] = useState('')
  return (
    <Formulario error={error} boton="Entrar"
      texto="Entrá con el usuario de AquaControl. Se pide una sola vez en este dispositivo."
      enviar={() => ingresarCuenta(email, clave)}>
      <Campo id="email" label="Usuario (email)">
        <Input id="email" type="email" required autoComplete="username" value={email}
          onChange={(e) => setEmail(e.target.value)} className={CAMPO} />
      </Campo>
      <Campo id="clave" label="Contraseña">
        <Input id="clave" type="password" required autoComplete="current-password" value={clave}
          onChange={(e) => setClave(e.target.value)} className={CAMPO} />
      </Campo>
    </Formulario>
  )
}

/** Datos de EMQX Cloud, solo cuando la app no tiene cuenta: quedan en este dispositivo. */
function Emqx({ error }: { error: string }) {
  const previas = credencialesGuardadas()
  const [servidor, setServidor] = useState(previas.servidor ?? '')
  const [usuario, setUsuario] = useState(previas.usuario ?? '')
  const [clave, setClave] = useState('')
  return (
    <Formulario error={error} boton="Guardar y conectar"
      texto="Datos de tu servidor MQTT (EMQX Cloud). Se piden una sola vez en este dispositivo."
      enviar={() => ingresarMqtt({ servidor, usuario, clave })}>
      <Campo id="servidor" label="Servidor">
        <Input id="servidor" required autoComplete="off" placeholder="xxxx.ala.eu-central-1.emqxsl.com"
          value={servidor} onChange={(e) => setServidor(e.target.value)} className={CAMPO} />
      </Campo>
      <Campo id="mqtt-usuario" label="Usuario de EMQX">
        <Input id="mqtt-usuario" required autoComplete="off" value={usuario}
          onChange={(e) => setUsuario(e.target.value)} className={CAMPO} />
      </Campo>
      <Campo id="mqtt-clave" label="Contraseña de EMQX">
        <Input id="mqtt-clave" type="password" required autoComplete="off" value={clave}
          onChange={(e) => setClave(e.target.value)} className={CAMPO} />
      </Campo>
    </Formulario>
  )
}

function Formulario({ texto, error, boton, enviar, children }: {
  texto: string; error: string; boton: string; enviar: () => Promise<void>; children: ReactNode
}) {
  const [enviando, setEnviando] = useState(false)
  const alEnviar = async (e: FormEvent) => {
    e.preventDefault()
    setEnviando(true)
    try { await enviar() } finally { setEnviando(false) }
  }
  return (
    <form onSubmit={alEnviar} className="mx-auto flex max-w-[360px] flex-col gap-3.5 px-6 pt-[12vh] pb-6">
      <Marca />
      <p className="text-sm text-muted-foreground">{texto}</p>
      {error && <p role="alert" className="text-sm text-alerta">{error}</p>}
      {children}
      <Button type="submit" disabled={enviando} className="mt-1.5 h-[52px] rounded-full text-base font-semibold">
        {enviando ? 'Un momento…' : boton}
      </Button>
    </form>
  )
}

function Campo({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}
