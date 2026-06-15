'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { generateVisitReport } from './actions'

export function GenerateReportButton({
  visitId,
  hasReports,
}: {
  visitId: string
  hasReports: boolean
}) {
  const router = useRouter()
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)

  async function handleClick() {
    setGenerating(true)
    setError(null)
    setWarning(null)

    try {
      const result = await generateVisitReport(visitId)
      if (!result.ok) {
        setError(result.error)
      } else {
        if (result.warning) setWarning(result.warning)
        router.refresh()
      }
    } catch {
      setError('Ocurrió un error inesperado al generar el reporte.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleClick}
        disabled={generating}
        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {generating ? 'Generando reporte…' : hasReports ? 'Generar nuevo reporte' : 'Generar reporte'}
      </button>

      {generating && (
        <p className="text-xs text-gray-500">
          Redactando con IA y armando el PDF — puede tardar hasta un minuto…
        </p>
      )}

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {warning && (
        <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
          <p className="text-sm text-amber-800">{warning}</p>
        </div>
      )}
    </div>
  )
}
