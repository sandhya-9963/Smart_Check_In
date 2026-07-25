import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, QrCode, Play, AlertCircle, RefreshCw } from 'lucide-react'

interface QRScannerProps {
  scheduledAppointments: any[]
  onScanSuccess: (appointmentId: number) => Promise<void>
  isScanning: boolean
}

export const QRScanner: React.FC<QRScannerProps> = ({
  scheduledAppointments,
  onScanSuccess,
  isScanning
}) => {
  const [useSimulated, setUseSimulated] = useState(true)
  const [selectedApptId, setSelectedApptId] = useState<string>('')
  const [scanError, setScanError] = useState<string | null>(null)

  const handleSimulateScan = async () => {
    if (!selectedApptId) {
      setScanError("Please select an appointment to simulate scanning.")
      return
    }
    setScanError(null)
    try {
      await onScanSuccess(parseInt(selectedApptId, 10))
    } catch (err: any) {
      setScanError(err.response?.data?.detail || "Scan failed. Please try again.")
    }
  }

  return (
    <div className="w-full">
      {/* Tab Selector */}
      <div className="flex border-b border-slate-800 mb-6 bg-slate-900/40 p-1 rounded-lg">
        <button
          onClick={() => setUseSimulated(true)}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-md transition-all ${
            useSimulated 
              ? 'bg-brand-600 text-white shadow-md' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <QrCode className="w-4 h-4" />
          Simulated Scan (Interactive)
        </button>
        <button
          onClick={() => {
            setUseSimulated(false)
            setScanError(null)
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-md transition-all ${
            !useSimulated 
              ? 'bg-brand-600 text-white shadow-md' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Camera className="w-4 h-4" />
          Live Camera View
        </button>
      </div>

      <AnimatePresence mode="wait">
        {useSimulated ? (
          <motion.div
            key="simulated"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col gap-4"
          >
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Select Patient Appointment to Scan
              </label>
              
              {scheduledAppointments.length === 0 ? (
                <div className="text-slate-500 text-xs py-3 text-center">
                  No scheduled appointments today. Please register a walk-in patient or check the database.
                </div>
              ) : (
                <select
                  value={selectedApptId}
                  onChange={(e) => setSelectedApptId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500 transition-colors"
                >
                  <option value="">-- Choose Patient Appointment --</option>
                  {scheduledAppointments.map((appt) => (
                    <option key={appt.id} value={appt.id}>
                      {appt.patient?.user?.full_name} - {appt.doctor?.user?.full_name} ({appt.doctor?.department?.name})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {scanError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{scanError}</span>
              </div>
            )}

            <button
              onClick={handleSimulateScan}
              disabled={isScanning || scheduledAppointments.length === 0}
              className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all shadow-lg hover:shadow-brand-500/15"
            >
              {isScanning ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {isScanning ? 'Verifying Check-In...' : 'Trigger QR Beep Scan'}
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="camera"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col items-center gap-4"
          >
            {/* Mock Camera Viewfinder */}
            <div className="relative w-full aspect-video bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden flex items-center justify-center flex-col">
              {/* Corner brackets */}
              <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-brand-400 rounded-tl-md" />
              <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-brand-400 rounded-tr-md" />
              <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-brand-400 rounded-bl-md" />
              <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-brand-400 rounded-br-md" />

              {/* Animated laser line */}
              <div className="scanner-line" />

              <Camera className="w-12 h-12 text-slate-600 mb-2 animate-pulse" />
              <span className="text-slate-400 text-xs font-semibold">Webcam scan ready...</span>
              <span className="text-slate-600 text-[10px] mt-1">Please present check-in QR code.</span>
            </div>
            
            <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/60 text-[11px] text-slate-400 text-center leading-relaxed">
              Camera access is secured via SSL. For this evaluation or offline presentation, please use the <strong className="text-brand-300">Simulated Scan</strong> tab to verify real-time event broadcasts.
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
