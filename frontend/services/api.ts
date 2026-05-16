const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'http://127.0.0.1:8000'

export interface HistoryIncident {
  incident_id: string
  title: string
  severity: string
  status: string
  created_at: string
  duration?: string
}

export interface AnalysisResponse {
  incident_id: string
  severity: string
  root_cause: string
  impact: {
    users_affected: number
    estimated_loss: number
    mttr: string
  }
  affected_services: string[]
  metrics: {
    timeline_accuracy: number
    evidence_coverage: number
    hallucination_rate: number
  }
  timeline: {
    time: string
    event: string
    severity: string
  }[]
  report_markdown: string
  action_items: {
    id: number
    title: string
    priority: string
  }[]
}

export async function analyzeIncident(
  formData: FormData
): Promise<AnalysisResponse> {
  const response = await fetch(
    `${API_BASE_URL}/analyze`,
    {
      method: 'POST',
      body: formData
    }
  )

  if (!response.ok) {
    throw new Error(
      'Failed to analyze incident'
    )
  }

  return response.json()
}

export async function getIncidentResult(
  incidentId: string
): Promise<AnalysisResponse> {
  const response = await fetch(
    `${API_BASE_URL}/results/${incidentId}`
  )

  if (!response.ok) {
    throw new Error(
      'Failed to fetch incident result'
    )
  }

  return response.json()
}

export async function getIncidentHistory(): Promise<HistoryIncident[]> {
  const response = await fetch(
    `${API_BASE_URL}/history`
  )

  if (!response.ok) {
    throw new Error(
      'Failed to fetch incident history'
    )
  }

  const data = await response.json()

  return data.map((incident: any) => ({
    incident_id: incident.incident_id,
    title: incident.title,
    severity: incident.severity,
    status: incident.status,
    created_at: incident.created_at,
    duration: 'N/A'
  }))
}

export function downloadReport(
  incidentId: string
) {
  window.open(
    `${API_BASE_URL}/download/report/${incidentId}`,
    '_blank'
  )
}

export function downloadActions(
  incidentId: string
) {
  window.open(
    `${API_BASE_URL}/download/actions/${incidentId}`,
    '_blank'
  )
}