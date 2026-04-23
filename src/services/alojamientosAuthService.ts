import type { User, LoginResponse } from './appsScriptAuthService'

const SESSION_TTL = 8 * 60 * 60 * 1000

type AuthEvent = 'SIGNED_IN' | 'SIGNED_OUT'
type AuthCallback = (event: AuthEvent, session: { user: User | null }, user: User | null) => void

class AlojamientosAuthService {
  private currentUser: User | null = null
  private sessionListeners: AuthCallback[] = []
  private STORAGE_KEY = 'alojamientos_user_session'

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadUserFromStorage()
    }
  }

  private loadUserFromStorage(): void {
    const raw = localStorage.getItem(this.STORAGE_KEY)
    if (!raw) { this.currentUser = null; return }
    const { user, createdAt } = JSON.parse(raw)
    if (Date.now() - createdAt > SESSION_TTL) {
      localStorage.removeItem(this.STORAGE_KEY)
      this.currentUser = null
    } else {
      this.currentUser = user
    }
  }

  async initialize(): Promise<User | null> {
    this.loadUserFromStorage()
    return this.currentUser
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      const response = await fetch('/api/alojamientos/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const result = await response.json()

      if (result.success && result.user) {
        this.currentUser = result.user
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify({ user: result.user, createdAt: Date.now() }))
        this.notifyListeners('SIGNED_IN', result.user)
        return { success: true, user: result.user }
      } else {
        return { success: false, message: result.message || 'Credenciales inválidas' }
      }
    } catch (error) {
      console.error('❌ Error en login:', error)
      return { success: false, message: 'Error inesperado durante el login' }
    }
  }

  async logout(): Promise<{ success: boolean }> {
    localStorage.removeItem(this.STORAGE_KEY)
    this.currentUser = null
    this.notifyListeners('SIGNED_OUT', null)
    return { success: true }
  }

  getCurrentUser(): User | null {
    return this.currentUser
  }

  getUserInfo(): User | null {
    return this.currentUser
  }

  isAdmin(): boolean {
    return this.currentUser?.rol === 'admin'
  }

  isAuthenticated(): boolean {
    return !!this.currentUser
  }

  onAuthStateChange(callback: AuthCallback): { unsubscribe: () => void } {
    this.sessionListeners.push(callback)
    return {
      unsubscribe: () => {
        this.sessionListeners = this.sessionListeners.filter((cb) => cb !== callback)
      },
    }
  }

  private notifyListeners(event: AuthEvent, user: User | null): void {
    this.sessionListeners.forEach((cb) => cb(event, { user }, user))
  }
}

export const alojamientosAuthService = new AlojamientosAuthService()
export default alojamientosAuthService
