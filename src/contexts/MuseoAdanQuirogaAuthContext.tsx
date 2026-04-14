'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import MuseoAdanQuirogaAuthService from '@/services/museoAdanQuirogaAuthService'
import type { User, LoginResponse } from '@/services/museoAdanQuirogaAuthService'

type AuthEvent = 'SIGNED_IN' | 'SIGNED_OUT'
type AuthCallback = (event: AuthEvent, session: { user: User | null }, user: User | null) => void

interface MuseoAdanQuirogaAuthContextType {
  user: User | null
  loading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<LoginResponse>
  logout: () => Promise<{ success: boolean }>
  getUserInfo: () => User | null
  isAuthenticated: () => boolean
  isAdmin: () => boolean
}

const MuseoAdanQuirogaAuthContext = createContext<MuseoAdanQuirogaAuthContextType>({
  user: null,
  loading: true,
  error: null,
  login: async () => ({ success: false, message: 'No inicializado' }),
  logout: async () => ({ success: false }),
  getUserInfo: () => null,
  isAuthenticated: () => false,
  isAdmin: () => false,
})

export const useMuseoAdanQuirogaAuth = () => {
  const context = useContext(MuseoAdanQuirogaAuthContext)
  if (!context) {
    throw new Error('useMuseoAdanQuirogaAuth debe usarse dentro de MuseoAdanQuirogaAuthProvider')
  }
  return context
}

export const MuseoAdanQuirogaAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sessionListeners, setSessionListeners] = useState<AuthCallback[]>([])

  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        const currentUser = MuseoAdanQuirogaAuthService.getCurrentUser()
        if (mounted) {
          setUser(currentUser)
        }
      } catch (err) {
        console.error('Error inicializando auth de Museo Adán Quiroga:', err)
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
      const result = await MuseoAdanQuirogaAuthService.login(email, password)

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
      MuseoAdanQuirogaAuthService.logout()
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
    return MuseoAdanQuirogaAuthService.getCurrentUser()
  }

  const isAuthenticated = () => {
    return !!user
  }

  const isAdmin = () => {
    return MuseoAdanQuirogaAuthService.isAdmin()
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
    <MuseoAdanQuirogaAuthContext.Provider value={value}>
      {children}
    </MuseoAdanQuirogaAuthContext.Provider>
  )
}

export default MuseoAdanQuirogaAuthContext
