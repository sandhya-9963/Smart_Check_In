import { create } from 'zustand'

interface UserState {
  token: string | null
  role: string | null
  userId: number | null
  fullName: string | null
  isAuthenticated: boolean
  login: (data: { access_token: string; role: string; user_id: number; full_name: string }) => void
  logout: () => void
}

export const useAuthStore = create<UserState>((set) => {
  // Load initial state from localStorage
  const token = localStorage.getItem('token')
  const role = localStorage.getItem('role')
  const userIdStr = localStorage.getItem('userId')
  const fullName = localStorage.getItem('fullName')
  const userId = userIdStr ? parseInt(userIdStr, 10) : null
  
  return {
    token,
    role,
    userId,
    fullName,
    isAuthenticated: !!token,
    
    login: (data) => {
      localStorage.setItem('token', data.access_token)
      localStorage.setItem('role', data.role)
      localStorage.setItem('userId', data.user_id.toString())
      localStorage.setItem('fullName', data.full_name)
      
      set({
        token: data.access_token,
        role: data.role,
        userId: data.user_id,
        fullName: data.full_name,
        isAuthenticated: true
      })
    },
    
    logout: () => {
      localStorage.removeItem('token')
      localStorage.removeItem('role')
      localStorage.removeItem('userId')
      localStorage.removeItem('fullName')
      
      set({
        token: null,
        role: null,
        userId: null,
        fullName: null,
        isAuthenticated: false
      })
    }
  }
})
