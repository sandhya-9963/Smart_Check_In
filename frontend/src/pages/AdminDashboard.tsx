import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminService } from '../services/api'
import { Layout } from '../components/Layout'
import { 
  Users, UserCheck, ShieldAlert, BarChart3, 
  Terminal, ShieldCheck, RefreshCw, Cpu, Activity, Ban 
} from 'lucide-react'

export const AdminDashboard: React.FC = () => {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'analytics' | 'users' | 'audit'>('analytics')

  // 1. Fetch system statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: adminService.getStats
  })

  // 2. Fetch peak hours
  const { data: peakHours = [] } = useQuery({
    queryKey: ['peak-hours'],
    queryFn: adminService.getPeakHours,
    enabled: activeTab === 'analytics'
  })

  // 3. Fetch device monitor
  const { data: devices = [] } = useQuery({
    queryKey: ['devices'],
    queryFn: adminService.getDevices,
    enabled: activeTab === 'analytics',
    refetchInterval: 15000
  })

  // 4. Fetch user list
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: adminService.getUsers,
    enabled: activeTab === 'users'
  })

  // 5. Fetch audit logs
  const { data: auditLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: adminService.getAuditLogs,
    enabled: activeTab === 'audit'
  })

  // 6. User toggle active status mutation
  const toggleUserActiveMutation = useMutation({
    mutationFn: adminService.toggleUserActive,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
    }
  })

  const getHourLabel = (hour: number) => {
    if (hour === 12) return '12 PM'
    if (hour > 12) return `${hour - 12} PM`
    return `${hour} AM`
  }

  const renderAnalytics = () => {
    // Find max count to scale SVG bar heights properly
    const maxCount = peakHours.length > 0 ? Math.max(...peakHours.map((h: any) => h.count)) : 10
    
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Custom Peak Hour CSS Bar Chart */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-slate-800">
          <div className="flex flex-col gap-1 mb-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-brand-400" />
              Peak Check-In Hours Analysis (Last 30 Days)
            </h3>
            <p className="text-slate-400 text-xs font-medium">
              Check-in throughput frequencies tracking operational peak workloads.
            </p>
          </div>

          {peakHours.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">No analytics data available.</div>
          ) : (
            <div className="flex items-end justify-between gap-2 h-64 pt-6 px-4">
              {peakHours.map((h: any) => {
                const percentage = maxCount > 0 ? (h.count / maxCount) * 100 : 0
                return (
                  <div key={h.hour} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                    
                    {/* Tooltip */}
                    <div className="bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-[9px] font-bold text-brand-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      {h.count} scans
                    </div>

                    {/* Bar */}
                    <div 
                      style={{ height: `${Math.max(5, percentage)}%` }} 
                      className="w-full bg-gradient-to-t from-brand-700 to-brand-400 rounded-t-lg group-hover:from-brand-600 group-hover:to-brand-300 transition-all shadow-md group-hover:shadow-brand-500/20"
                    />

                    {/* Label */}
                    <span className="text-[9px] text-slate-500 font-bold whitespace-nowrap rotate-45 sm:rotate-0 mt-1">
                      {getHourLabel(h.hour)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right Side: Device Monitoring Panel */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Cpu className="w-4 h-4 text-brand-400" />
              Device Status Monitoring
            </h3>
            <p className="text-slate-400 text-xs font-medium">Live check-in kiosk terminals online status.</p>
          </div>

          <div className="flex flex-col gap-3">
            {devices.map((device: any) => (
              <div 
                key={device.device_id}
                className="bg-slate-950/40 border border-slate-900/60 p-3.5 rounded-xl flex items-center justify-between"
              >
                <div>
                  <span className="font-bold text-white text-xs block">{device.name}</span>
                  <span className="text-[9px] text-slate-500 font-mono block mt-0.5">{device.device_id}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${device.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                  <span className={`text-[10px] uppercase font-bold tracking-wide ${device.status === 'online' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {device.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    )
  }

  const renderUsers = () => {
    return (
      <div className="glass-panel p-6 rounded-3xl border border-slate-800">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
          <Users className="w-4 h-4 text-brand-400" />
          Active Directory User Accounts
        </h3>

        {usersLoading ? (
          <div className="text-center py-6 text-slate-500">Loading user catalog...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] text-slate-500 uppercase tracking-widest font-extrabold">
                  <th className="pb-3 font-semibold">User</th>
                  <th className="pb-3 font-semibold">System Role</th>
                  <th className="pb-3 font-semibold">Account Status</th>
                  <th className="pb-3 font-semibold text-right">Administrative Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {users.map((u: any) => (
                  <tr key={u.id} className="hover:bg-slate-900/20">
                    <td className="py-4">
                      <div className="font-bold text-white">{u.full_name}</div>
                      <span className="text-[10px] text-slate-500 mt-0.5 block">{u.email}</span>
                    </td>
                    <td className="py-4">
                      <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-extrabold tracking-wide ${
                        u.role === 'admin' 
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
                          : u.role === 'doctor'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : u.role === 'receptionist'
                              ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                              : 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <span className={`font-semibold ${u.is_active ? 'text-emerald-400' : 'text-red-400'}`}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 text-right">
                      <button
                        onClick={() => toggleUserActiveMutation.mutate(u.id)}
                        className={`text-[10px] font-bold py-1.5 px-3 rounded-lg border transition-all ${
                          u.is_active
                            ? 'bg-red-950/20 border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white'
                            : 'bg-emerald-950/20 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white'
                        }`}
                      >
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  const renderAuditLogs = () => {
    return (
      <div className="glass-panel p-6 rounded-3xl border border-slate-800">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-brand-400" />
          Security Audit Logs & Event Trace
        </h3>

        {logsLoading ? (
          <div className="text-center py-6 text-slate-500">Loading audit records...</div>
        ) : (
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] text-slate-500 uppercase tracking-widest font-extrabold">
                  <th className="pb-3 font-semibold">Timestamp</th>
                  <th className="pb-3 font-semibold">Operator</th>
                  <th className="pb-3 font-semibold">Action Event</th>
                  <th className="pb-3 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-[11px] font-medium text-slate-400">
                {auditLogs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-slate-900/10">
                    <td className="py-3 font-mono text-slate-500">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-3">
                      <span className="text-slate-300 font-bold">{log.user_email || 'System'}</span>
                    </td>
                    <td className="py-3">
                      <span className="text-brand-300 font-semibold">{log.action}</span>
                    </td>
                    <td className="py-3 max-w-sm truncate text-slate-400 font-mono" title={log.details}>
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        
        {/* Title */}
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-black text-white font-sans">Administrative Center</h2>
          <p className="text-slate-400 text-xs font-medium">
            Monitor system-wide metrics, review audits, and manage credentials access.
          </p>
        </div>

        {/* Global Statistics Indicators */}
        {statsLoading ? (
          <div className="text-center py-6 text-slate-500">Loading metrics...</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Patients</span>
              <span className="text-2xl font-extrabold text-white mt-1">{stats?.total_patients}</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Specialists</span>
              <span className="text-2xl font-extrabold text-white mt-1">{stats?.total_doctors}</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Appointments Booked</span>
              <span className="text-2xl font-extrabold text-white mt-1">{stats?.total_appointments}</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col">
              <span className="text-[10px] text-teal-400 font-bold uppercase tracking-wider">QR Code Usage Rate</span>
              <span className="text-2xl font-extrabold text-teal-300 mt-1">{stats?.qr_checkin_rate}%</span>
            </div>
          </div>
        )}

        {/* Custom Tab Selectors */}
        <div className="flex border-b border-slate-800 bg-slate-900/30 p-1 rounded-xl w-full max-w-md">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'analytics' 
                ? 'bg-brand-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Workload & Analytics
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'users' 
                ? 'bg-brand-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            User Management
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'audit' 
                ? 'bg-brand-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Audit Trails
          </button>
        </div>

        {/* Tab Content Display */}
        {activeTab === 'analytics' && renderAnalytics()}
        {activeTab === 'users' && renderUsers()}
        {activeTab === 'audit' && renderAuditLogs()}

      </div>
    </Layout>
  )
}
