'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { analyzeIncident } from '@/services/api'

type UploadedFiles = {
  alerts?: File
  metrics?: File
  chat?: File
  runbook?: File
  logs: File[]
}

export default function HomePage() {
  const router = useRouter()

  const [files, setFiles] = useState<UploadedFiles>({
    logs: []
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleFileChange = (
    type:
      | 'alerts'
      | 'metrics'
      | 'chat'
      | 'runbook'
      | 'logs',
    fileList: FileList | null
  ) => {
    if (!fileList || fileList.length === 0)
      return

    if (type === 'logs') {
      setFiles((prev) => ({
        ...prev,
        logs: Array.from(fileList)
      }))
    } else {
      setFiles((prev) => ({
        ...prev,
        [type]: fileList[0]
      }))
    }
  }

  const handleAnalyze = async () => {
    try {
      setError('')
      setLoading(true)

      if (
        !files.alerts ||
        !files.metrics ||
        !files.chat ||
        !files.runbook ||
        files.logs.length === 0
      ) {
        setError(
          'Please upload all required files.'
        )
        return
      }

      const result =
        await analyzeIncident({
          alerts: files.alerts,
          metrics: files.metrics,
          chat: files.chat,
          runbook: files.runbook,
          logs: files.logs
        })

      router.push(
        `/results?id=${result.incident_id}`
      )
    } catch (err: any) {
      console.error(err)
      setError(
        err.message ||
          'Failed to analyze incident'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-5xl font-bold mb-2">
          RespondIQ
        </h1>

        <p className="text-gray-400 mb-8">
          AI Incident Platform
        </p>

        <div className="grid gap-4">
          <div>
            <label className="block mb-2">
              alerts.json
            </label>
            <input
              type="file"
              accept=".json"
              onChange={(e) =>
                handleFileChange(
                  'alerts',
                  e.target.files
                )
              }
            />
          </div>

          <div>
            <label className="block mb-2">
              metrics.csv
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={(e) =>
                handleFileChange(
                  'metrics',
                  e.target.files
                )
              }
            />
          </div>

          <div>
            <label className="block mb-2">
              chat.txt
            </label>
            <input
              type="file"
              accept=".txt"
              onChange={(e) =>
                handleFileChange(
                  'chat',
                  e.target.files
                )
              }
            />
          </div>

          <div>
            <label className="block mb-2">
              runbook.md
            </label>
            <input
              type="file"
              accept=".md"
              onChange={(e) =>
                handleFileChange(
                  'runbook',
                  e.target.files
                )
              }
            />
          </div>

          <div>
            <label className="block mb-2">
              Log files
            </label>
            <input
              type="file"
              multiple
              accept=".log,.txt"
              onChange={(e) =>
                handleFileChange(
                  'logs',
                  e.target.files
                )
              }
            />
          </div>
        </div>

        {error && (
          <p className="text-red-500 mt-4">
            {error}
          </p>
        )}

        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="mt-8 bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold"
        >
          {loading
            ? 'Analyzing...'
            : 'Analyze Incident'}
        </button>
      </div>
    </main>
  )
}