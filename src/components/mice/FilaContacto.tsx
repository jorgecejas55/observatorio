import type { ContactoMice } from '@/data/mice-ecosistema'
import { hrefLlamada, hrefWhatsapp, webSinProtocolo } from '@/lib/mice/enlaces'

const ATRIBUTOS_EXTERNOS = { target: '_blank', rel: 'noopener noreferrer' } as const

const BOTON_ICONO =
  'flex items-center justify-center w-11 h-11 rounded-xl transition-colors flex-shrink-0'

function FilaTelefono({ telefono, nombre }: { telefono: string; nombre: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex-1 text-sm font-medium text-text-primary tabular-nums">{telefono}</span>
      <a
        href={hrefLlamada(telefono)}
        aria-label={`Llamar a ${nombre} al ${telefono}`}
        className={`${BOTON_ICONO} bg-primary/10 text-primary hover:bg-primary hover:text-white`}
      >
        <i className="fa-solid fa-phone" aria-hidden="true" />
      </a>
      <a
        href={hrefWhatsapp(telefono)}
        {...ATRIBUTOS_EXTERNOS}
        aria-label={`Escribir por WhatsApp a ${nombre} al ${telefono}`}
        className={`${BOTON_ICONO} bg-green-50 text-green-600 hover:bg-green-600 hover:text-white`}
      >
        <i className="fa-brands fa-whatsapp text-lg" aria-hidden="true" />
      </a>
    </div>
  )
}

function EnlacesWeb({ contacto }: { contacto: ContactoMice }) {
  const enlaces = [
    contacto.email && { href: `mailto:${contacto.email}`, icono: 'fa-solid fa-envelope', texto: contacto.email },
    contacto.web && { href: contacto.web, icono: 'fa-solid fa-globe', texto: webSinProtocolo(contacto.web), externo: true },
    contacto.instagram && { href: `https://instagram.com/${contacto.instagram}`, icono: 'fa-brands fa-instagram', texto: `@${contacto.instagram}`, externo: true },
  ].filter(Boolean) as { href: string; icono: string; texto: string; externo?: boolean }[]

  if (enlaces.length === 0) return null

  return (
    <div className="mt-2 flex flex-col gap-1.5">
      {enlaces.map(enlace => (
        <a
          key={enlace.href}
          href={enlace.href}
          {...(enlace.externo && ATRIBUTOS_EXTERNOS)}
          className="inline-flex items-center gap-2 text-sm text-primary hover:underline break-all"
        >
          <i className={`${enlace.icono} w-4 text-center`} aria-hidden="true" />
          {enlace.texto}
        </a>
      ))}
    </div>
  )
}

export default function FilaContacto({ contacto }: { contacto: ContactoMice }) {
  return (
    <li className="px-4 py-3.5">
      <p className="font-semibold text-text-primary leading-snug">{contacto.nombre}</p>
      {contacto.referente && (
        <p className="text-sm text-text-secondary mt-0.5">{contacto.referente}</p>
      )}

      {contacto.telefonos && contacto.telefonos.length > 0 && (
        <div className="mt-2 flex flex-col gap-1.5">
          {contacto.telefonos.map(telefono => (
            <FilaTelefono key={telefono} telefono={telefono} nombre={contacto.nombre} />
          ))}
        </div>
      )}

      <EnlacesWeb contacto={contacto} />
    </li>
  )
}
