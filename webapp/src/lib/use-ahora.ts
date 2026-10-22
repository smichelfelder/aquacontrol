import { useEffect, useState } from 'react'

/** La hora actual, refrescada cada 20 s (reloj, fecha y «próxima toma»). */
export function useAhora() {
  const [ahora, setAhora] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), 20000)
    return () => clearInterval(id)
  }, [])
  return ahora
}

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const dos = (n: number) => String(n).padStart(2, '0')

export const fechaTxt = (d: Date) => {
  const dia = DIAS[d.getDay()]
  return dia[0].toUpperCase() + dia.slice(1) + ', ' + d.getDate() + ' de ' + MESES[d.getMonth()]
}
export const horaTxt = (d: Date) => dos(d.getHours()) + ':' + dos(d.getMinutes())
export const diaISO = (d: Date) => d.getFullYear() + '-' + dos(d.getMonth() + 1) + '-' + dos(d.getDate())
