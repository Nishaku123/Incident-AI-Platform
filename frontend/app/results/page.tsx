// app/results/page.tsx
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import { 
  AlertTriangle, CheckCircle, Clock, Download, FileText, Target,
  Calendar, Server, Code, Shield, Activity, Loader2, ChevronDown, ChevronUp
} from 'lucide-react'
import {
  getIncidentResult,
  downloadReport,
  downloadActions
} from '@/services/api'

function ResultsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const incidentId = searchParams.get('id')
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<AnalysisResponse | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'report'>('overview')
  const [timelineExpanded, setTimelineExpanded] = useState(true)

  useEffect(() => {
    if (!incidentId) {
      router.push('/')
      return
    }

    const fetchResults = async () => {
      try {
        const result = await getIncidentResult(incidentId)
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load results')
      } finally {
        setLoading(false)
      }
    }

    fetchResults()
  }, [incidentId, router])

  const severityConfig = {
    critical: { color: 'bg-red-500/10 text-red-400 border-red-500/20', label: 'CRITICAL' },
    high: { color: 'bg-orange-500/10 text-orange-400 border-orange-500/20', label: 'HIGH' },
    medium: { color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', label: 'MEDIUM' },
    low: { color: 'bg-green-500/10 text-green-400 border-green-500/20', label: 'LOW' }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading analysis results...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-400">{error || 'Failed to load results'}</p>
          <button onClick={() => router.push('/')} className="mt-4 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors">
            Go Back
          </button>
        </div>
      </div>
    )
  }

  const hasMetrics = data.metrics && Object.values(data.metrics).some(v => v !== undefined)
  const hasTimeline = data.timeline && data.timeline.length > 0

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Incident {data.incident_id}</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${severityConfig[data.severity]?.color || severityConfig.medium.color}`}>
                {severityConfig[data.severity]?.label || data.severity.toUpperCase()}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mt-2">
              <div className="flex items-center gap-1"><Calendar className="w-4 h-4" /><span>{new Date().toLocaleDateString()}</span></div>
              <div className="flex items-center gap-1"><Clock className="w-4 h-4" /><span>MTTR: {data.impact?.mttr || 'N/A'}</span></div>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => downloadReport(data.incident_id)} className="px-4 py-2 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors flex items-center gap-2">
              <Download className="w-4 h-4" /> Report
            </button>
            <button onClick={() => downloadActions(data.incident_id)} className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white flex items-center gap-2">
              <Code className="w-4 h-4" /> Action Items
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      {hasMetrics && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          {data.metrics.timeline_accuracy !== undefined && (
            <MetricCard title="Timeline Accuracy" value={data.metrics.timeline_accuracy} unit="%" color="#3b82f6" />
          )}
          {data.metrics.evidence_coverage !== undefined && (
            <MetricCard title="Evidence Coverage" value={data.metrics.evidence_coverage} unit="%" color="#8b5cf6" />
          )}
          {data.metrics.hallucination_rate !== undefined && (
            <MetricCard title="Hallucination Rate" value={data.metrics.hallucination_rate} unit="%" color="#10b981" inverse />
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-800 mb-6">
        <div className="flex gap-6 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'timeline', label: 'Timeline', disabled: !hasTimeline },
            { id: 'report', label: 'Report' }
          ].map((tab) => (
            <button key={tab.id} disabled={tab.disabled}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 text-sm font-medium transition-colors relative whitespace-nowrap ${tab.disabled ? 'text-gray-600 cursor-not-allowed' : activeTab === tab.id ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
            >
              {tab.label}
              {activeTab === tab.id && !tab.disabled && (
                <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-600" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl bg-gray-900/50 border border-gray-700 p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-red-400" />Root Cause Analysis</h3>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/20">
                  <p className="text-red-300 font-mono text-sm">{data.root_cause || 'Analysis in progress...'}</p>
                </div>
                {data.impact && (
                  <div className="space-y-3">
                    <div className="flex items-start gap-3"><Shield className="w-4 h-4 text-blue-400 mt-0.5" />
                      <div><p className="text-sm font-medium">Impact Assessment</p><p className="text-sm text-gray-400">{data.impact.users_affected?.toLocaleString() || 'N/A'} users affected • ${data.impact.estimated_loss?.toLocaleString() || 'N/A'} estimated loss</p></div>
                    </div>
                    {data.affected_services && data.affected_services.length > 0 && (
                      <div className="flex items-start gap-3"><Activity className="w-4 h-4 text-purple-400 mt-0.5" />
                        <div><p className="text-sm font-medium">Affected Services</p><div className="flex gap-2 mt-1 flex-wrap">{data.affected_services.map(s => (<span key={s} className="px-2 py-0.5 rounded text-xs bg-red-500/10 text-red-400">{s}</span>))}</div></div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {data.action_items && data.action_items.length > 0 && (
              <div className="rounded-xl bg-gray-900/50 border border-gray-700 p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-400" />Action Items</h3>
                <div className="space-y-3">
                  {data.action_items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/30 border border-gray-700">
                      <div className={`w-2 h-2 rounded-full ${item.priority === 'P0' ? 'bg-red-500' : item.priority === 'P1' ? 'bg-orange-500' : 'bg-yellow-500'}`} />
                      <span className="flex-1 text-sm">{item.title}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-700">{item.priority}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'timeline' && hasTimeline && (
          <div className="rounded-xl bg-gray-900/50 border border-gray-700 p-6">
            <button onClick={() => setTimelineExpanded(!timelineExpanded)} className="flex items-center justify-between w-full mb-6">
              <h3 className="font-semibold">Incident Timeline</h3>
              {timelineExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            {timelineExpanded && (
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-px bg-gradient-to-b from-blue-500 via-purple-500 to-transparent" />
                <div className="space-y-6">
                  {data.timeline.map((event, idx) => (
                    <motion.div key={idx} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                      className="relative pl-10">
                      <div className={`absolute left-0 w-3 h-3 rounded-full mt-1.5 ${event.severity === 'error' ? 'bg-red-500 ring-4 ring-red-500/20' : event.severity === 'warning' ? 'bg-yellow-500 ring-4 ring-yellow-500/20' : event.severity === 'success' ? 'bg-green-500 ring-4 ring-green-500/20' : 'bg-blue-500 ring-4 ring-blue-500/20'}`} />
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4"><span className="text-sm font-mono text-gray-500">{event.time}</span><span className="text-gray-200">{event.event}</span></div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'report' && (
          <div className="rounded-xl bg-gray-900/50 border border-gray-700 overflow-hidden">
            <div className="border-b border-gray-700 p-4 bg-gray-800/30 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              <span className="font-mono text-sm">incident_report_{data.incident_id}.md</span>
            </div>
            <div className="p-6 markdown-body">
              <ReactMarkdown>{data.report_markdown || '# No report available\n\nThe incident report could not be generated.'}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function MetricCard({ title, value, unit, color, inverse }: { title: string; value: number; unit: string; color: string; inverse?: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-gradient-to-br from-gray-900 to-gray-800/50 border border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4"><span className="text-gray-400 text-sm">{title}</span><Target className="w-5 h-5" style={{ color }} /></div>
      <div className="text-3xl font-bold">{value}{unit}</div>
      <div className="w-full h-2 bg-gray-700 rounded-full mt-3 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${inverse ? 100 - value : value}%`, backgroundColor: color }} />
      </div>
    </motion.div>
  )
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-[80vh]"><Loader2 className="w-12 h-12 animate-spin text-blue-500" /></div>}>
      <ResultsContent />
    </Suspense>
  )
}