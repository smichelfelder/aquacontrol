// Íconos de trazo del diseño (24×24). Se dibujan con currentColor.
import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement> & { size?: number }

function Trazo({ size = 24, strokeWidth = 1.8, children, ...props }: P) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      {children}
    </svg>
  )
}

export const IconoInicio = (p: P) => <Trazo {...p}><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" /></Trazo>
export const IconoPez = (p: P) => <Trazo {...p}><path d="M3 12c3-4 7-6 11-6 3 0 5 2 7 6-2 4-4 6-7 6-4 0-8-2-11-6zM3 12l-1-3M3 12l-1 3" /></Trazo>
export const IconoComida = (p: P) => <Trazo {...p}><path d="M3 12c3-4 7-6 11-6 3 0 5 2 7 6-2 4-4 6-7 6-4 0-8-2-11-6zM3 12l-1-3M3 12l-1 3" /><circle cx="16" cy="11" r="0.8" /></Trazo>
export const IconoPlanta = (p: P) => <Trazo {...p}><path d="M12 21V9M12 13c-3 0-5-2-5.5-5 3 0 5 2 5.5 5zM12 10c2.5 0 4.5-2 5-5-3 0-4.6 2-5 5zM12 17c2.5 0 4.5-1.6 5-4-2.6 0-4.5 1.6-5 4z" /></Trazo>
export const IconoCalendario = (p: P) => <Trazo {...p}><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4" /></Trazo>
export const IconoAcuario = (p: P) => <Trazo {...p}><rect x="3" y="5" width="18" height="13" rx="1.5" /><path d="M3 9.5h18M7 18v2M17 18v2" /></Trazo>
export const IconoOlas = (p: P) => <Trazo {...p}><path d="M4 7c3 0 3 2 6 2s3-2 6-2 3 2 4 2M4 12c3 0 3 2 6 2s3-2 6-2 3 2 4 2M4 17c3 0 3 2 6 2s3-2 6-2 3 2 4 2" /></Trazo>
export const IconoFlecha = (p: P) => <Trazo strokeWidth={2} {...p}><path d="M9 6l6 6-6 6" /></Trazo>

/** La gota de AquaControl (página «Logo AquaControl» del diseño). */
export function Logo({ size = 28, color = '#7fd6b4' }: { size?: number; color?: string }) {
  const claro = `color-mix(in srgb, ${color} 28%, #ffffff)`
  return (
    <svg role="img" aria-label="AquaControl" width={size} height={size} viewBox="0 0 48 48">
      <defs>
        <clipPath id="gota"><path d="M24 3C24 3 8.5 19.5 8.5 30.5a15.5 15.5 0 0 0 31 0C39.5 19.5 24 3 24 3Z" /></clipPath>
      </defs>
      <g clipPath="url(#gota)">
        <path d="M24 3C24 3 8.5 19.5 8.5 30.5a15.5 15.5 0 0 0 31 0C39.5 19.5 24 3 24 3Z" fill={color} />
        <path d="M24 36.4C20.93 40.08 16.48 43.85 10.5 47.5L10.5 60L37.5 60L37.5 47.5C31.52 43.85 27.07 40.08 24 36.4Z" fill={claro} />
        <path d="M24 14.5C30.73 19.1 31.44 27.47 24 36.4C16.56 27.47 17.27 19.1 24 14.5Z" fill={`color-mix(in srgb, ${color} 62%, #0b1d20)`} />
        <path d="M24 14.5C33.5 21 31 35 10.5 47.5M24 14.5C14.5 21 17 35 37.5 47.5" fill="none" stroke="#0b1d20" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="24" cy="20.9" r="1.25" fill={claro} />
      </g>
    </svg>
  )
}
