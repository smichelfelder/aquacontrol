import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { credencialesGuardadas, ingresar } from '@/lib/central'

/** Datos de EMQX Cloud: se piden una sola vez por dispositivo (solo en la app de la nube). */
export function Ingreso({ error }: { error: string }) {
  const previas = credencialesGuardadas()
  const [servidor, setServidor] = useState(previas.servidor ?? '')
  const [usuario, setUsuario] = useState(previas.usuario ?? '')
  const [clave, setClave] = useState('')

  const enviar = (e: FormEvent) => {
    e.preventDefault()
    ingresar({ servidor, usuario, clave })
  }

  const campo = 'h-[50px] rounded-[14px] bg-panel px-3.5 text-base md:text-base'
  return (
    <form onSubmit={enviar} className="mx-auto flex max-w-[360px] flex-col gap-3.5 px-6 pt-[12vh] pb-6">
      <h1 className="mb-1 text-[28px] font-medium">Aqua<b className="font-semibold text-primary">Control</b></h1>
      <p className="text-sm text-muted-foreground">Datos de tu servidor MQTT (EMQX Cloud). Se piden una sola vez en este dispositivo.</p>
      {error && <p role="alert" className="text-sm text-alerta">{error}</p>}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="servidor" className="text-muted-foreground">Servidor</Label>
        <Input id="servidor" required autoComplete="off" placeholder="xxxx.ala.eu-central-1.emqxsl.com"
          value={servidor} onChange={(e) => setServidor(e.target.value)} className={campo} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="usuario" className="text-muted-foreground">Usuario</Label>
        <Input id="usuario" required autoComplete="username" value={usuario} onChange={(e) => setUsuario(e.target.value)} className={campo} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="clave" className="text-muted-foreground">Contraseña</Label>
        <Input id="clave" type="password" required autoComplete="current-password" value={clave} onChange={(e) => setClave(e.target.value)} className={campo} />
      </div>
      <Button type="submit" className="mt-1.5 h-[52px] rounded-full text-base font-semibold">Entrar</Button>
    </form>
  )
}
