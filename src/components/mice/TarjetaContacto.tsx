import type { ContactoMice } from '@/data/mice-ecosistema'

interface Enlace {
  href: string
  icono: string
  etiqueta: string
  esExterno: boolean
}

/**
 * Los teléfonos del listado son de 10 dígitos (característica + número), casi todos
 * celulares: +54 9 es el formato que funciona para llamar y para WhatsApp desde
 * cualquier celular.
 */
function numeroInternacional(telefono: string): string {
  return `549${telefono.replace(/\D/g, '')}`
}

function webSinProtocolo(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '')
}

function enlacesDeTelefono(telefono: string): Enlace[] {
  const numero = numeroInternacional(telefono)
  return [
    { href: `tel:+${numero}`, icono: 'fa-solid fa-phone', etiqueta: telefono, esExterno: false },
    { href: `https://wa.me/${numero}`, icono: 'fa-brands fa-whatsapp', etiqueta: 'WhatsApp', esExterno: true },
  ]
}

/** Arma los enlaces de contacto a partir de los campos que estén cargados. */
export function enlacesDeContacto(contacto: ContactoMice): Enlace[] {
  const enlaces = (contacto.telefonos ?? []).flatMap(enlacesDeTelefono)
  if (contacto.email) {
    enlaces.push({ href: `mailto:${contacto.email}`, icono: 'fa-solid fa-envelope', etiqueta: contacto.email, esExterno: false })
  }
  if (contacto.web) {
    enlaces.push({ href: contacto.web, icono: 'fa-solid fa-globe', etiqueta: webSinProtocolo(contacto.web), esExterno: true })
  }
  if (contacto.instagram) {
    enlaces.push({ href: `https://instagram.com/${contacto.instagram}`, icono: 'fa-brands fa-instagram', etiqueta: `@${contacto.instagram}`, esExterno: true })
  }
  return enlaces
}

export default function TarjetaContacto({ contacto }: { contacto: ContactoMice }) {
  const enlaces = enlacesDeContacto(contacto)

  return (
    <article className="card p-4">
      <h4 className="font-bold text-text-primary leading-snug">{contacto.nombre}</h4>
      {contacto.referente && (
        <p className="text-sm text-text-secondary mt-1">
          <i className="fa-solid fa-user w-4 text-center mr-1" aria-hidden="true" />
          {contacto.referente}
        </p>
      )}

      {enlaces.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {enlaces.map(enlace => (
            <li key={enlace.href}>
              <a
                href={enlace.href}
                {...(enlace.esExterno && { target: '_blank', rel: 'noopener noreferrer' })}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1.5 text-sm text-text-primary hover:border-primary hover:text-primary break-all"
              >
                <i className={`${enlace.icono} text-primary`} aria-hidden="true" />
                {enlace.etiqueta}
              </a>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}
