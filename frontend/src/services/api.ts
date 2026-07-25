import axios from 'axios'
import { useAuthStore } from '../store/useAuthStore'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

export const api = axios.create({
  baseURL: API_URL,
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const authService = {
  login: async (credentials: any) => {
    const res = await api.post('/auth/login', credentials)
    return res.data
  },
  signup: async (userData: any) => {
    const res = await api.post('/auth/signup', userData)
    return res.data
  },
  getDepartments: async () => {
    const res = await api.get('/auth/departments')
    return res.data
  },
  me: async () => {
    const res = await api.get('/auth/me')
    return res.data
  }
}

export const appointmentService = {
  getAppointments: async () => {
    const res = await api.get('/appointments')
    return res.data
  },
  getTodayAppointments: async () => {
    const res = await api.get('/appointments/today')
    return res.data
  },
  createAppointment: async (apptData: any) => {
    const res = await api.post('/appointments/', apptData)
    return res.data
  },
  checkIn: async (checkinData: { appointment_id: number; method: string; device_info?: string }) => {
    const res = await api.post('/appointments/check-in', checkinData)
    return res.data
  }
}

export const patientService = {
  getPatients: async () => {
    const res = await api.get('/patients')
    return res.data
  },
  getQueueStatus: async (apptId: number) => {
    const res = await api.get(`/patients/queue/${apptId}`)
    return res.data
  },
  registerWalkIn: async (walkInData: any) => {
    const res = await api.post('/patients/walk-in', walkInData)
    return res.data
  }
}

export const doctorService = {
  getDoctors: async () => {
    const res = await api.get('/doctors')
    return res.data
  },
  getQueue: async () => {
    const res = await api.get('/doctors/queue')
    return res.data
  },
  updateStatus: async (apptId: number, status: string) => {
    const res = await api.post(`/doctors/status/${apptId}?status_str=${status}`)
    return res.data
  },
  announceDelay: async (minutes: number) => {
    const res = await api.post(`/doctors/delay?delay_minutes=${minutes}`)
    return res.data
  }
}

export const adminService = {
  getStats: async () => {
    const res = await api.get('/admin/stats')
    return res.data
  },
  getPeakHours: async () => {
    const res = await api.get('/admin/peak-hours')
    return res.data
  },
  getDevices: async () => {
    const res = await api.get('/admin/devices')
    return res.data
  },
  getAuditLogs: async () => {
    const res = await api.get('/admin/audit-logs')
    return res.data
  },
  getUsers: async () => {
    const res = await api.get('/admin/users')
    return res.data
  },
  toggleUserActive: async (userId: number) => {
    const res = await api.post(`/admin/users/${userId}/toggle-active`)
    return res.data
  }
}

export const notificationService = {
  getNotifications: async () => {
    const res = await api.get('/notifications')
    return res.data
  },
  markRead: async (notifId: number) => {
    const res = await api.post(`/notifications/read/${notifId}`)
    return res.data
  },
  markAllRead: async () => {
    const res = await api.post('/notifications/read-all')
    return res.data
  }
}
