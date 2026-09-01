'use client'

import { useEffect } from 'react'

/**
 * Registra el SW y fuerza que las pestañas/PWA abiertas pasen a la versión
 * nueva apenas hay un deploy — sin esto, un usuario con la app abierta (o
 * instalada como PWA) puede quedarse días con un SW viejo que sirve un shell
 * cacheado desactualizado, aunque el backend ya tenga el dato correcto.
 * `registration.update()` en cada visibilitychange evita depender del chequeo
 * automático del navegador (que puede tardar horas); `controllerchange`
 * recarga UNA vez cuando el SW nuevo toma control (evita loop con el guard).
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    let refrescando = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refrescando) return
      refrescando = true
      window.location.reload()
    })

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        const chequearActualizacion = () => registration.update().catch(() => {})
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') chequearActualizacion()
        })
        window.addEventListener('focus', chequearActualizacion)
      })
      .catch((error) => {
        console.error('No se pudo registrar el service worker', error)
      })
  }, [])

  return null
}
