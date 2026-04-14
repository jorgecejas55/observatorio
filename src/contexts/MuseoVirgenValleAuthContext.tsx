'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import MuseoVirgenValleAuthService from '@/services/museoVirgenValleAuthService'
import type { User, LoginResponse } from '@/services/museoVirgenValleAuthService'

type AuthEvent = 'SIGNED_IN' | 'SIGNED_OUT'
type AuthCallback = (event: AuthEvent, session: { user: User | null }, user: User | null) => void

interface MuseoVirgenValleAuthContextType {
  user: User | null
  loading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<LoginResponse>
  logout: () => Promise<{ success: boolean }>
  getUserInfo: () => User | null
  isAuthenticated: () => boolean
  isAdmin: () => boolean
}

const MuseoVirgenValleAuthContext = createContext<MuseoVirgenValleAuthContextType>({
  user: null,
  loading: true,
  error: null,
  login: async () => ({ success: false, message: 'No inicializado' }),
  logout: async () => ({ success: false }),
  getUserInfo: () => null,
  isAuthenticated: () => false,
  isAdmin: () => false,
})

export const useMuseoVirgenValleAuth = () => {
  const context = useContext(MuseoVirgenValleAuthContext)
  if (!context) {
    throw new Error('useMuseoVirgenValleAuth debe usarse dentro de MuseoVirgenValleAuthProvider')
  }
  return context
}

export const MuseoVirgenValleAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sessionListeners, setSessionListeners] = useState<AuthCallback[]>([])

  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        const currentUser = MuseoVirgenValleAuthService.getCurrentUser()
        if (mounted) {
          setUser(currentUser)
        }
      } catch (err) {
        console.error('Error inicializando auth de Museo Virgen del Valle:', err)
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
    }
  }, [])

  const notifyListeners = (event: AuthEvent, user: User | null) => {
    sessionListeners.forEach((cb) => cb(event, { user }, user))
  }

  const login = async (email: string, password: string): Promise<LoginResponse> => {
    try {
      setError(null)
      const result = await MuseoVirgenValleAuthService.login(email, password)

      if (result.success && result.user) {
        setUser(result.user)
        notifyListeners('SIGNED_IN', result.user)
        return { success: true, user: result.user }
      } else {
        setError(result.message || 'Error en el login')
        return { success: false, message: result.message }
      }
    } catch (err) {
      const errorMessage = 'Error inesperado durante el login'
      setError(errorMessage)
      return { success: false, message: errorMessage }
    }
  }

  const logout = async () => {
    try {
      setError(null)
      MuseoVirgenValleAuthService.logout()
      setUser(null)
      notifyListeners('SIGNED_OUT', null)
      return { success: true }
    } catch (err) {
      const errorMessage = 'Error inesperado al cerrar sesión'
      setError(errorMessage)
      return { success: false }
    }
  }

  const getUserInfo = () => {
    return MuseoVirgenValleAuthService.getCurrentUser()
  }

  const isAuthenticated = () => {
    return !!user
  }

  const isAdmin = () => {
    return MuseoVirgenValleAuthService.isAdmin()
  }

  const onAuthStateChange = (callback: AuthCallback) => {
    setSessionListeners((prev) => [...prev, callback])
    return {
      unsubscribe: () => {
        setSessionListeners((prev) => prev.filter((cb) => cb !== callback))
      },
    }
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

  return (
    <MuseoVirgenValleAuthContext.Provider value={value}>
      {children}
    </MuseoVirgenValleAuthContext.Provider>
  )
}

export default MuseoVirgenValleAuthContext
