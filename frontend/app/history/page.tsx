// app/history/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Search, Filter, Eye, AlertCircle, CheckCircle, Clock, Loader2, ChevronDown } from 'lucide-react'
import { getIncidentHistory, HistoryIncident } from '@/services/api'

export default function HistoryPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [incidents, setIncidents] = useState<HistoryIncident[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchIncidents()
  }, [])

  const fetchIncidents = async () => {
    try {
      setLoading(true)
      const data = await getIncidentHistory()
      setIncidents(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load incidents')
    } finally {
      setLoading(false)
    }
  }

  const filteredIncidents = incidents.filter(incident => {
    const matchesSearch = incident.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         incident.id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesSeverity = severityFilter === 'all' || incident.severity === severityFilter
    return matchesSearch && matchesSeverity
  })

  const severityColors: Record<string, string> = {
    critical: 'bg-red-500/10 text-red-400 border-red-500/20',
    high: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    low: 'bg-green-500/10 text-green-400 border-green-500/20'
  }

  const statusIcons: Record<string, JSX.Element> = {
    resolved: <CheckCircle className="w-4 h-4 text-green-400" />,
    mitigating: <AlertCircle className="w-4 h-4 text-yellow-400" />,
    analyzing: <Clock className="w-4 h-4 text-blue-400" />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="text-center"><Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" /><p className="text-gray-400">Loading incident history...</p></div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      <div className="mb-8"><h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">Incident History</h1><p className="text-gray-400">View and analyze past incident responses</p></div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input type="text" placeholder="Search by incident ID or title..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-900 border border-gray-700 focus:border-blue-500 focus:outline-none transition-colors" />
        </div>
        <div className="relative"><Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
          <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}
            className="pl-10 pr-8 py-2 rounded-lg bg-gray-900 border border-gray-700 focus:border-blue-500 focus:outline-none appearance-none cursor-pointer">
            <option value="all">All Severities</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
          </select><ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 mb-6 flex items-center gap-3 flex-wrap">
          <AlertCircle className="w-5 h-5 text-red-400" /><span className="text-red-300">{error}</span>
          <button onClick={fetchIncidents} className="ml-auto px-3 py-1 rounded bg-red-500/20 hover:bg-red-500/30 transition-colors text-sm">Retry</button>
        </div>
      )}

      {filteredIncidents.length === 0 && !error && (
        <div className="text-center py-16"><div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4"><AlertCircle className="w-10 h-10 text-gray-600" /></div>
          <h3 className="text-lg font-semibold mb-2">No incidents found</h3><p className="text-gray-500">{searchTerm || severityFilter !== 'all' ? 'Try adjusting your filters' : 'No incidents have been analyzed yet'}</p>
        </div>
      )}

      {filteredIncidents.length > 0 && (
        <div className="rounded-xl bg-gray-900/50 border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="border-b border-gray-700 bg-gray-800/30">
                <tr><th className="text-left p-4 text-sm font-medium text-gray-400">Incident ID</th><th className="text-left p-4 text-sm font-medium text-gray-400">Title</th><th className="text-left p-4 text-sm font-medium text-gray-400">Severity</th><th className="text-left p-4 text-sm font-medium text-gray-400">Status</th><th className="text-left p-4 text-sm font-medium text-gray-400">Date</th><th className="text-left p-4 text-sm font-medium text-gray-400">Duration</th><th className="text-left p-4 text-sm font-medium text-gray-400"></th></tr>
              </thead>
              <tbody>
                {filteredIncidents.map((incident, idx) => (
                  <motion.tr key={incident.incident_id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}
                    className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors cursor-pointer" onClick={() => router.push(`/results?id=${incident.incident_id}`)}>
                    <td className="p-4 font-mono text-sm">{incident.incident_id}</td><td className="p-4 font-medium">{incident.title}</td>
                    <td className="p-4"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${severityColors[incident.severity] || severityColors.medium}`}>{incident.severity.toUpperCase()}</span></td>
                    <td className="p-4"><div className="flex items-center gap-2">{statusIcons[incident.status] || statusIcons.analyzing}<span className="text-sm capitalize">{incident.status}</span></div></td>
                    <td className="p-4 text-sm text-gray-400">{new Date(incident.created_at).toLocaleDateString()}</td><td className="p-4 text-sm font-mono text-gray-400">{incident.duration}</td>
                    <td className="p-4"><button className="p-1 rounded hover:bg-gray-700 transition-colors"><Eye className="w-4 h-4 text-gray-400" /></button></td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}