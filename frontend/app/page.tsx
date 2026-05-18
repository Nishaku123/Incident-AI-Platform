'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import {
  Upload,
  FileJson,
  FileSpreadsheet,
  MessageSquare,
  FileCode,
  FileText,
  CheckCircle,
  Loader2,
  History,
  Sparkles,
  ArrowRight,
  AlertCircle,
  X
} from 'lucide-react'
import { analyzeIncident } from '@/services/api'

type FileType =
  | 'alerts.json'
  | 'metrics.csv'
  | 'chat.txt'
  | 'runbook.md'
  | 'logs'

interface UploadFile {
  id: string
  file: File
  type: FileType
  progress: number
  status: 'pending' | 'uploading' | 'success' | 'error'
}

const fileTypes: {
  type: FileType
  label: string
  icon: any
  color: string
  accept: string
}[] = [
  {
    type: 'alerts.json',
    label: 'Alerts JSON',
    icon: FileJson,
    color: 'from-blue-500 to-cyan-500',
    accept: '.json'
  },
  {
    type: 'metrics.csv',
    label: 'Metrics CSV',
    icon: FileSpreadsheet,
    color: 'from-green-500 to-emerald-500',
    accept: '.csv'
  },
  {
    type: 'chat.txt',
    label: 'Chat Transcript',
    icon: MessageSquare,
    color: 'from-purple-500 to-pink-500',
    accept: '.txt'
  },
  {
    type: 'runbook.md',
    label: 'Runbook MD',
    icon: FileCode,
    color: 'from-orange-500 to-red-500',
    accept: '.md'
  },
  {
    type: 'logs',
    label: 'Log Files',
    icon: FileText,
    color: 'from-gray-500 to-gray-600',
    accept: '.log,.txt'
  }
]

export default function HomePage() {
  const router = useRouter()

  const [files, setFiles] = useState<UploadFile[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const simulateUpload = (fileId: string) => {
    let progress = 0

    const interval = setInterval(() => {
      progress += 10

      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? {
                ...f,
                progress,
                status:
                  progress >= 100
                    ? 'success'
                    : 'uploading'
              }
            : f
        )
      )

      if (progress >= 100) {
        clearInterval(interval)
      }
    }, 100)
  }

  const onDrop = useCallback(
    (acceptedFiles: File[], fileType: FileType) => {
      const newFiles: UploadFile[] = acceptedFiles.map((file) => ({
        id:
          typeof crypto !== 'undefined' &&
          crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${file.name}`,
        file,
        type: fileType,
        progress: 0,
        status: 'pending'
      }))

      setFiles((prev) => {
        if (fileType === 'logs') {
          return [...prev, ...newFiles]
        }

        return [
          ...prev.filter((f) => f.type !== fileType),
          ...newFiles
        ]
      })

      setError(null)

      newFiles.forEach((f) => simulateUpload(f.id))
    },
    []
  )

  const removeFile = (id: string) => {
    setFiles((prev) =>
      prev.filter((f) => f.id !== id)
    )
  }

  const handleAnalyze = async () => {
    try {
      setError(null)
      setIsAnalyzing(true)

      const alertsFile = files.find(
        (f) => f.type === 'alerts.json'
      )?.file

      const metricsFile = files.find(
        (f) => f.type === 'metrics.csv'
      )?.file

      const chatFile = files.find(
        (f) => f.type === 'chat.txt'
      )?.file

      const runbookFile = files.find(
        (f) => f.type === 'runbook.md'
      )?.file

      const logFiles = files
        .filter((f) => f.type === 'logs')
        .map((f) => f.file)

      if (
        !alertsFile ||
        !metricsFile ||
        !chatFile ||
        !runbookFile ||
        logFiles.length === 0
      ) {
        setError(
          'Please upload alerts.json, metrics.csv, chat.txt, runbook.md, and at least one log file.'
        )
        setIsAnalyzing(false)
        return
      }

      const result = await analyzeIncident({
        alerts: alertsFile,
        metrics: metricsFile,
        chat: chatFile,
        runbook: runbookFile,
        logs: logFiles
      })

      router.push(`/results?id=${result.incident_id}`)
    } catch (err: any) {
      console.error(err)
      setError(
        err.message || 'Failed to analyze incident'
      )
    } finally {
      setIsAnalyzing(false)
    }
  }

  const DropzoneCard = ({
    type,
    label,
    icon: Icon,
    color,
    accept
  }: (typeof fileTypes)[0]) => {
    const {
      getRootProps,
      getInputProps,
      isDragActive
    } = useDropzone({
      onDrop: (uploadedFiles) =>
        onDrop(uploadedFiles, type),
      multiple: type === 'logs',
      accept:
        type === 'alerts.json'
          ? { 'application/json': ['.json'] }
          : type === 'metrics.csv'
          ? { 'text/csv': ['.csv'] }
          : type === 'chat.txt'
          ? { 'text/plain': ['.txt'] }
          : type === 'runbook.md'
          ? { 'text/markdown': ['.md'] }
          : {
              'text/plain': ['.log', '.txt']
            }
    })

    const selectedCount =
      type === 'logs'
        ? files.filter((f) => f.type === 'logs').length
        : files.filter((f) => f.type === type).length

    return (
      <motion.div
        whileHover={{ scale: 1.02, y: -4 }}
        transition={{
          type: 'spring',
          stiffness: 300
        }}
        {...getRootProps()}
        className={`cursor-pointer rounded-xl p-4 sm:p-6 border transition-all duration-300 min-h-[170px] sm:min-h-[210px] ${
          isDragActive
            ? 'border-blue-500 bg-blue-500/10'
            : selectedCount > 0
            ? 'border-green-500/40 bg-green-500/5'
            : 'border-gray-700 bg-gray-900/50 hover:border-gray-600 hover:bg-gray-900/80'
        }`}
      >
        <input {...getInputProps()} />

        <div
          className={`w-12 h-12 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center mb-4`}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>

        <h3 className="font-semibold text-gray-100">
          {label}
        </h3>

        <p className="text-sm text-gray-500 mt-1">
          {type === 'logs'
            ? 'Upload multiple .log files'
            : `Upload ${accept}`}
        </p>

        <p className="text-xs text-gray-600 mt-3">
          {isDragActive
            ? 'Drop files here...'
            : selectedCount > 0
            ? `${selectedCount} file selected`
            : 'Click or drag & drop'}
        </p>
      </motion.div>
    )
  }

  const hasRequiredFiles =
    Boolean(
      files.find((f) => f.type === 'alerts.json')
    ) &&
    Boolean(
      files.find((f) => f.type === 'metrics.csv')
    ) &&
    Boolean(
      files.find((f) => f.type === 'chat.txt')
    ) &&
    Boolean(
      files.find((f) => f.type === 'runbook.md')
    ) &&
    files.some((f) => f.type === 'logs')

  return (
      <div className="min-h-screen w-full overflow-x-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 blur-3xl" />

        <div className="relative px-4 sm:px-6 md:px-8 pt-10 sm:pt-14 pb-12 sm:pb-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{
              opacity: 1,
              y: 0
            }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 mb-6">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-blue-400">
                AI-Powered Incident Response
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight mb-5 bg-gradient-to-r from-gray-100 to-gray-400 bg-clip-text text-transparent">
              Analyze incidents in
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                seconds, not hours
              </span>
            </h1>

            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Upload your incident artifacts and let our AI identify root causes and generate comprehensive reports.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
          {fileTypes.map((ft) => (
            <DropzoneCard
              key={ft.type}
              {...ft}
            />
          ))}
        </div>

        {error && (
          <motion.div
            initial={{
              opacity: 0,
              y: -10
            }}
            animate={{
              opacity: 1,
              y: 0
            }}
            className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 mb-6 flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span className="text-red-300">
              {error}
            </span>
          </motion.div>
        )}

        {files.length > 0 && (
          <motion.div
            initial={{
              opacity: 0,
              y: 20
            }}
            animate={{
              opacity: 1,
              y: 0
            }}
            className="rounded-xl bg-gray-900/50 border border-gray-700 p-6 mb-8"
          >
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Upload className="w-4 h-4 text-blue-400" />
              Upload Queue ({files.length})
            </h3>

            <div className="space-y-3">
              <AnimatePresence>
                {files.map((file) => {
                  const ft =
                    fileTypes.find(
                      (f) => f.type === file.type
                    ) || fileTypes[0]

                  const Icon = ft.icon

                  return (
                    <motion.div
                      key={file.id}
                      initial={{
                        opacity: 0,
                        x: -20
                      }}
                      animate={{
                        opacity: 1,
                        x: 0
                      }}
                      exit={{
                        opacity: 0,
                        x: 20
                      }}
                      className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 rounded-lg bg-gray-800/30 border border-gray-700"
                    >
                      <div
                        className={`w-8 h-8 rounded bg-gradient-to-br ${ft.color} flex items-center justify-center`}
                      >
                        <Icon className="w-4 h-4 text-white" />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium break-all">
                            {file.file.name}
                          </span>

                          <span className="text-xs text-gray-500">
                            {(file.file.size / 1024).toFixed(1)} KB
                          </span>
                        </div>

                        <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{
                              width: `${file.progress}%`
                            }}
                            className={`h-full rounded-full bg-gradient-to-r ${ft.color}`}
                          />
                        </div>
                      </div>

                      <div className="w-8 flex justify-center">
                        {file.status === 'success' && (
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        )}

                        {file.status === 'uploading' && (
                          <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                        )}
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removeFile(file.id)
                        }}
                        className="text-gray-500 hover:text-red-400 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleAnalyze}
            disabled={!hasRequiredFiles || isAnalyzing}
            className={`w-full sm:w-auto px-6 sm:px-8 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 justify-center ${
              hasRequiredFiles && !isAnalyzing
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40'
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <ArrowRight className="w-5 h-5" />
                Analyze Incident
              </>
            )}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() =>
              router.push('/history')
            }
            className="px-8 py-3 rounded-xl font-semibold border border-gray-700 hover:border-gray-600 hover:bg-gray-800/50 transition-all duration-300 flex items-center gap-2 justify-center"
          >
            <History className="w-5 h-5" />
            View Incident History
          </motion.button>
        </div>
      </div>
    </div>
  )
}