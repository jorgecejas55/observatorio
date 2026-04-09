'use client'

import { useEffect } from 'react'

interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'info' | 'warning'
  onClose: () => void
  duration?: number
}

export default function Toast({ message, type = 'success', onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, duration)
    return () => clearTimeout(timer)
  }, [onClose, duration])

  const styles = {
    success: 'bg-green-500 text-white',
    error: 'bg-red-500 text-white',
    warning: 'bg-yellow-500 text-white',
    info: 'bg-blue-500 text-white',
  }

  const icons = {
    success: 'fa-check-circle',
    error: 'fa-times-circle',
    warning: 'fa-exclamation-triangle',
    info: 'fa-info-circle',
  }

  return (
    <div className="fixed top-4 right-4 z-[9999] animate-slide-in-right">
      <div className={`${styles[type]} px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 min-w-80 max-w-md`}>
        <i className={`fa-solid ${icons[type]} text-lg`} />
        <span className="flex-1 text-sm font-medium">{message}</span>
        <button
          onClick={onClose}
          className="w-6 h-6 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors flex-shrink-0"
          aria-label="Cerrar"
        >
          <i className="fa-solid fa-xmark text-sm" />
        </button>
      </div>
    </div>
  )
}
