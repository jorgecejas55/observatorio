'use client'

import React from 'react'

interface LogoutConfirmModalProps {
  userName: string
  onConfirm: () => void
  onCancel: () => void
}

const LogoutConfirmModal = ({ userName, onConfirm, onCancel }: LogoutConfirmModalProps) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-fade-in">
        {/* Icono */}
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-100 flex items-center justify-center">
          <i className="fa-solid fa-right-from-bracket text-orange-600 text-2xl" />
        </div>

        {/* Título */}
        <h3 className="text-xl font-bold text-text-primary text-center mb-2">
          ¿Cerrar sesión?
        </h3>

        {/* Descripción */}
        <p className="text-sm text-text-secondary text-center mb-6">
          <span className="font-semibold text-text-primary">{userName}</span>, estás a punto de cerrar sesión del módulo de registro de eventos.
        </p>

        {/* Botones */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 rounded-lg border-2 border-gray-200 bg-white text-text-primary font-semibold hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-3 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
          >
            Sí, cerrar sesión
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  )
}

export default LogoutConfirmModal
