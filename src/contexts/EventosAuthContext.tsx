'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { eventosAuthService } from '@/services/eventosAuthService'
import type { User, LoginResponse } from '@/services/appsScriptAuthService'

interface EventosAuthContextType {
  user: User | null
  loading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<LoginResponse>
  logout: () => Promise<{ success: boolean }>
  getUserInfo: () => User | null
  isAuthenticated: () => boolean
  isAdmin: () => boolean
}

const EventosAuthContext = createContext<EventosAuthContextType>({
  user: null,
  loading: true,
  error: null,
  login: async () => ({ success: false, message: 'No inicializado' }),
  logout: async () => ({ success: false }),
  getUserInfo: () => null,
  isAuthenticated: () => false,
  isAdmin: () => false,
})

export const useEventosAuth = () => {
  const context = useContext(EventosAuthContext)
  if (!context) {
    throw new Error('useEventosAuth debe usarse dentro de EventosAuthProvider')
  }
  return context
}

export const EventosAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    let authSubscription: { unsubscribe: () => void } | null = null

    const initializeAuth = async () => {
      try {
        const currentUser = await eventosAuthService.initialize()
        if (mounted) {
          setUser(currentUser)
        }

        authSubscription = eventosAuthService.onAuthStateChange((event, session, authUser) => {
          if (mounted) {
            setUser(authUser)
            setError(null)
          }
        })
      } catch (err) {
        console.error('Error inicializando auth de eventos:', err)
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Error desconocido')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initializeAuth()

    return () => {
      mounted = false
      if (authSubscription) {
        authSubscription.unsubscribe()
      }
    }
  }, [])

  const login = async (email: string, password: string): Promise<LoginResponse> => {
    try {
      setError(null)
      const result = await eventosAuthService.login(email, password)
      if (!result.success) {
        setError(result.message || 'Error en el login')
      }
      return result
    } catch (err) {
      const errorMessage = 'Error inesperado durante el login'
      setError(errorMessage)
      return { success: false, message: errorMessage }
    }
  }

  const logout = async () => {
    try {
      setError(null)
      const result = await eventosAuthService.logout()
      if (!result.success) {
        setError('Error al cerrar sesión')
      }
      return result
    } catch (err) {
      const errorMessage = 'Error inesperado al cerrar sesión'
      setError(errorMessage)
      return { success: false }
    }
  }

  const getUserInfo = () => {
    return eventosAuthService.getUserInfo()
  }

  const isAuthenticated = () => {
    return !!user
  }

  const isAdmin = () => {
    return eventosAuthService.isAdmin()
  }

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    getUserInfo,
    isAuthenticated,
    isAdmin,
  }

  return <EventosAuthContext.Provider value={value}>{children}</EventosAuthContext.Provider>
}

export default EventosAuthContext
