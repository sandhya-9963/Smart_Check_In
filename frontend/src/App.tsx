import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from './store/useAuthStore'
import { Login } from './pages/Login'
import { PatientDashboard } from './pages/PatientDashboard'
import { ReceptionDashboard } from './pages/ReceptionDashboard'
import { DoctorDashboard } from './pages/DoctorDashboard'
import { AdminDashboard } from './pages/AdminDashboard'

// Initialize React Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
})

// Protected Route Guard
interface ProtectedRouteProps {
  children: React.ReactElement
  allowedRoles?: string[]
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, role } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // If authenticated but role not allowed, redirect to respective role home
    if (role === 'admin') return <Navigate to="/admin" replace />
    if (role === 'doctor') return <Navigate to="/doctor" replace />
    if (role === 'receptionist') return <Navigate to="/reception" replace />
    return <Navigate to="/patient" replace />
  }

  return children
}

// Root redirect handler
const RootRedirect = () => {
  const { isAuthenticated, role } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (role === 'admin') return <Navigate to="/admin" replace />
  if (role === 'doctor') return <Navigate to="/doctor" replace />
  if (role === 'receptionist') return <Navigate to="/reception" replace />
  return <Navigate to="/patient" replace />
}

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public login portal */}
          <Route path="/login" element={<Login />} />

          {/* Role Protected Dashboards */}
          <Route 
            path="/patient" 
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <PatientDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/reception" 
            element={
              <ProtectedRoute allowedRoles={['receptionist', 'admin']}>
                <ReceptionDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/doctor" 
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <DoctorDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Root redirect routing */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
