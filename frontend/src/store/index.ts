import { create } from 'zustand'
import { authAPI } from '../services/api'

interface User {
  id: string
  email: string
  username: string
  full_name?: string
  role: string
  permissions: string[]
  is_active: boolean
}

interface AppStore {
  // Auth
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login:   (username: string, password: string) => Promise<void>
  logout:  () => void
  loadUser:() => Promise<void>

  // Permissions helpers
  can:     (permission: string) => boolean
  isAdmin: () => boolean

  // UI
  sidebarOpen:   boolean
  toggleSidebar: () => void

  // Alerts
  unreadAlerts:    number
  setUnreadAlerts: (n: number) => void
}

export const useStore = create<AppStore>((set, get) => ({
  // ── Auth ────────────────────────────────────────────────
  user:            null,
  token:           localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),

  login: async (username, password) => {
    const res = await authAPI.login(username, password)
    const { access_token, user } = res.data
    localStorage.setItem('token', access_token)
    localStorage.setItem('user', JSON.stringify(user))
    set({ token: access_token, user, isAuthenticated: true })
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    set({ token: null, user: null, isAuthenticated: false })
  },

  loadUser: async () => {
    try {
      const res = await authAPI.me()
      set({ user: res.data, isAuthenticated: true })
    } catch {
      // Token expired or invalid — clear everything
      get().logout()
    }
  },

  // ── Permission helpers ───────────────────────────────────
  can: (permission: string) => {
    const { user } = get()
    if (!user) return false
    return user.permissions?.includes(permission) ?? false
  },

  isAdmin: () => {
    const { user } = get()
    return user?.role === 'admin'
  },

  // ── UI ──────────────────────────────────────────────────
  sidebarOpen:   true,
  toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),

  // ── Alerts ──────────────────────────────────────────────
  unreadAlerts:    0,
  setUnreadAlerts: (n) => set({ unreadAlerts: n }),
}))
