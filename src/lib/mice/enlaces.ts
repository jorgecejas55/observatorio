/**
 * Los teléfonos del directorio son de 10 dígitos (característica + número), casi todos
 * celulares: +54 9 es el formato que funciona para llamar y para WhatsApp desde
 * cualquier celular.
 */
function numeroInternacional(telefono: string): string {
  return `549${telefono.replace(/\D/g, '')}`
}

export function hrefLlamada(telefono: string): string {
  return `tel:+${numeroInternacional(telefono)}`
}

export function hrefWhatsapp(telefono: string): string {
  return `https://wa.me/${numeroInternacional(telefono)}`
}

export function webSinProtocolo(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '')
}
