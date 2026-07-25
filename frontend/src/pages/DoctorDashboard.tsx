import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { doctorService } from '../services/api'
import { Layout } from '../components/Layout'
import { 
  Users, User, Clock, AlertTriangle, Play, Check, 
  HelpCircle, Calendar, ShieldCheck, RefreshCw, Send, CheckCircle2 
} from 'lucide-react'

export const DoctorDashboard: React.FC = () => {
  const queryClient = useQueryClient()
  const [selectedApptId, setSelectedApptId] = useState<number | null>(null)
  const [delayMinutes, setDelayMinutes] = useState<number>(15)
  const [delayAnnounced, setDelayAnnounced] = useState(false)

  // 1. Fetch doctor queue
  const { data: queueData, isLoading: queueLoading } = useQuery({
    queryKey: ['doctor-queue'],
    queryFn: doctorService.getQueue,
    refetchInterval: 10000 // Refetch every 10s
  })

  // 2. Mutation for updating appointment status
  const updateStatusMutation = useMutation({
    mutationFn: ({ apptId, status }: { apptId: number; status: string }) => 
      doctorService.updateStatus(apptId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-queue'] })
      // If the currently selected appointment is completed or cancelled, clear selection
      if (selectedApptId) {
        const remaining = queueData?.queue.find((q: any) => q.appointment_id === selectedApptId)
        if (!remaining || remaining.status === 'completed' || remaining.status === 'cancelled') {
          setSelectedApptId(null)
        }
      }
    }
  })

  // 3. Mutation for announcing delay
  const announceDelayMutation = useMutation({
    mutationFn: doctorService.announceDelay,
    onSuccess: () => {
      setDelayAnnounced(true)
      setTimeout(() => setDelayAnnounced(false), 4000)
    }
  })

  const handleStatusChange = (apptId: number, status: string) => {
    updateStatusMutation.mutate({ apptId, status })
  }

  const handleAnnounceDelay = () => {
    announceDelayMutation.mutate(delayMinutes)
  }

  const queue = queueData?.queue || []
  const totalWaiting = queueData?.total_waiting || 0
  const estimatedWait = queueData?.estimated_wait_minutes || 0

  // Find active selected appointment detailed metadata
  const activeAppt = queue.find((q: any) => q.appointment_id === selectedApptId) || queue[0]

  return (
    <Layout>
      <div className="space-y-6">
        
        {/* Header Title */}
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-black text-white font-sans">Attending Physician Panel</h2>
          <p className="text-slate-400 text-xs font-medium">
            Manage your live patient queue, review symptoms, and coordinate waiting times.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Column 1: Live Doctor Queue */}
          <div className="lg:col-span-1 glass-panel p-5 rounded-3xl border border-slate-800 flex flex-col gap-4">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Users className="w-4 h-4 text-brand-400" />
              Patient Queue ({queue.length})
            </h3>

            {queueLoading ? (
              <div className="text-center py-6 text-slate-500">Loading queue...</div>
            ) : queue.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs font-semibold">
                No patients waiting today.
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 max-h-[500px] overflow-y-auto pr-1">
                {queue.map((item: any) => {
                  const isCurrentSelection = (selectedApptId ?? queue[0]?.appointment_id) === item.appointment_id
                  return (
                    <div
                      key={item.appointment_id}
                      onClick={() => setSelectedApptId(item.appointment_id)}
                      className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                        isCurrentSelection
                          ? 'bg-brand-600/10 border-brand-500/50 glow-brand'
                          : 'bg-slate-950/40 border-slate-900 hover:border-slate-800'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className={`text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-extrabold ${
                          isCurrentSelection ? 'bg-brand-500 text-white' : 'bg-slate-900 text-slate-500 border border-slate-800'
                        }`}>
                          {item.queue_number}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wider ${
                          item.status === 'in_consultation'
                            ? 'bg-blue-500/20 text-blue-400 animate-pulse'
                            : 'bg-slate-900 text-slate-500'
                        }`}>
                          {item.status === 'in_consultation' ? 'in consult' : 'waiting'}
                        </span>
                      </div>
                      
                      <div className="text-xs font-bold text-slate-200 truncate mt-1">{item.patient_name}</div>
                      <span className="text-[10px] text-slate-500 font-mono block mt-0.5">{item.token_number}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Column 2 & 3: Selected Patient Details Card */}
          <div className="lg:col-span-2 space-y-6">
            
            {activeAppt ? (
              <div className="glass-panel p-6 rounded-3xl border border-slate-800 relative">
                <div className="absolute top-6 right-6">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                    activeAppt.status === 'in_consultation'
                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {activeAppt.status === 'in_consultation' ? 'In Consultation' : 'Waiting'}
                  </span>
                </div>

                <h3 className="text-xs uppercase font-extrabold tracking-widest text-slate-400 mb-6">
                  Active Consultation Profile
                </h3>

                <div className="space-y-6">
                  
                  {/* Name and Token */}
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/25 flex items-center justify-center text-brand-400 shrink-0">
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-white leading-none">{activeAppt.patient_name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-500 font-semibold font-mono">Token: {activeAppt.token_number}</span>
                        <span className="text-slate-700 font-bold">•</span>
                        <span className="text-xs text-slate-500 font-semibold">Queue Position: #{activeAppt.queue_number}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-800/80 my-4" />

                  {/* Consultation Specifics */}
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start gap-3">
                      <HelpCircle className="w-4 h-4 text-slate-500 mt-1 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide block">Reason for Visit</span>
                        <p className="text-xs text-slate-300 font-medium leading-relaxed mt-0.5">
                          Patient checks in for clinical sports evaluation regarding hamstring recovery, pain, and general athletic physical.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <ShieldCheck className="w-4 h-4 text-slate-500 mt-1 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide block">Security Audit Status</span>
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider mt-1 inline-block">
                          QR Verified Device Check-In
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-800/80 my-4" />

                  {/* Consultation Actions */}
                  <div className="flex items-center gap-3 pt-2">
                    {activeAppt.status === 'checked_in' ? (
                      <button
                        onClick={() => handleStatusChange(activeAppt.appointment_id, 'in_consultation')}
                        disabled={updateStatusMutation.isPending}
                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs py-3.5 rounded-xl transition-all shadow-lg hover:shadow-blue-500/15 flex items-center justify-center gap-2"
                      >
                        <Play className="w-4 h-4" /> Call Patient to Consultation
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStatusChange(activeAppt.appointment_id, 'completed')}
                        disabled={updateStatusMutation.isPending}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-3.5 rounded-xl transition-all shadow-lg hover:shadow-emerald-500/15 flex items-center justify-center gap-2"
                      >
                        <Check className="w-4 h-4" /> Complete Consultation & Discharge
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleStatusChange(activeAppt.appointment_id, 'cancelled')}
                      disabled={updateStatusMutation.isPending}
                      className="bg-red-950/20 border border-red-500/20 hover:bg-red-500 text-red-400 hover:text-white transition-all font-semibold text-xs px-4 py-3.5 rounded-xl"
                    >
                      No Show / Cancel
                    </button>
                  </div>

                </div>
              </div>
            ) : (
              <div className="glass-panel p-6 rounded-3xl border border-slate-800/60 text-center py-16 flex flex-col items-center justify-center">
                <ShieldCheck className="w-10 h-10 text-slate-700 mb-3" />
                <h4 className="text-sm font-bold text-slate-400">Consultation Profile Inactive</h4>
                <p className="text-xs text-slate-500 mt-1">Select a patient from the queue to start their session.</p>
              </div>
            )}

          </div>

          {/* Column 4: Delay Alert controls */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            
            {/* Live Stats */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Queue Workload</span>
              <div className="text-2xl font-extrabold text-white mt-1">{totalWaiting} Waiting</div>
              <div className="text-xs text-slate-400 mt-1">Est. wait backlog: {estimatedWait} mins</div>
            </div>

            {/* Delay Alert Broadcast Card */}
            <div className="glass-card p-5 rounded-3xl border border-slate-800 flex flex-col gap-4">
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Announce Delay
              </h3>
              
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Running behind schedule? Choose a delay duration. Checked-in patients of your department will instantly receive wait-time adjustments and warnings.
              </p>

              <div className="grid grid-cols-3 gap-2">
                {[10, 15, 30].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => setDelayMinutes(mins)}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                      delayMinutes === mins
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                        : 'bg-slate-950 border-slate-900 text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    +{mins}m
                  </button>
                ))}
              </div>

              {delayAnnounced ? (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl text-center text-xs font-semibold flex items-center gap-1.5 justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Delay Broadcasted!</span>
                </div>
              ) : (
                <button
                  onClick={handleAnnounceDelay}
                  disabled={announceDelayMutation.isPending}
                  className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" /> Broadcast Delay
                </button>
              )}
            </div>

          </div>

        </div>

      </div>
    </Layout>
  )
}
