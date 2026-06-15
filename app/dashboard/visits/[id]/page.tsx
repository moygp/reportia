import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { VisitForm } from '../visit-form'
import { deleteVisitPhoto, deleteVisitRecord } from '../actions'
import { GenerateReportButton } from '../../reports/generate-report-button'
import type { ClientOption, Photo, PhotoWithUrl, Visit } from '../types'

export const maxDuration = 60

const PHOTOS_BUCKET = 'visit-photos'
const REPORTS_BUCKET = 'visit-reports'

type ReportRow = {
  id: string
  visit_id: string
  pdf_url: string
  generated_at: string | null
  created_at: string
}

type ReportWithUrl = ReportRow & { signedUrl: string | null }

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function VisitDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { id } = await params
  const { error } = await searchParams

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: visitData } = await supabase.from('visits').select('*').eq('id', id).single()

  if (!visitData) {
    notFound()
  }

  const visit = visitData as Visit

  const [{ data: clientsData }, { data: photosData }, { data: reportsData }] = await Promise.all([
    supabase.from('clients').select('id, name').order('name', { ascending: true }),
    supabase
      .from('photos')
      .select('*')
      .eq('visit_id', id)
      .order('uploaded_at', { ascending: true }),
    supabase
      .from('reports')
      .select('*')
      .eq('visit_id', id)
      .order('created_at', { ascending: false }),
  ])

  const clients = (clientsData ?? []) as ClientOption[]
  const photos = (photosData ?? []) as Photo[]
  const reports = (reportsData ?? []) as ReportRow[]
  const clientName = clients.find((c) => c.id === visit.client_id)?.name ?? 'Cliente'

  let photosWithUrl: PhotoWithUrl[] = photos.map((photo) => ({ ...photo, signedUrl: null }))

  if (photos.length > 0) {
    const paths = photos.map((photo) => photo.storage_url)
    const { data: signed } = await supabase.storage
      .from(PHOTOS_BUCKET)
      .createSignedUrls(paths, 3600)

    const signedByPath = new Map(
      (signed ?? []).map((item) => [item.path ?? '', item.signedUrl])
    )

    photosWithUrl = photos.map((photo) => ({
      ...photo,
      signedUrl: signedByPath.get(photo.storage_url) ?? null,
    }))
  }

  let reportsWithUrl: ReportWithUrl[] = reports.map((report) => ({ ...report, signedUrl: null }))

  if (reports.length > 0) {
    const reportPaths = reports.map((report) => report.pdf_url)
    const { data: signedReports } = await supabase.storage
      .from(REPORTS_BUCKET)
      .createSignedUrls(reportPaths, 3600)

    const signedByPath = new Map(
      (signedReports ?? []).map((item) => [item.path ?? '', item.signedUrl])
    )

    reportsWithUrl = reports.map((report) => ({
      ...report,
      signedUrl: signedByPath.get(report.pdf_url) ?? null,
    }))
  }

  return (
    <div className="max-w-3xl space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow px-6 py-4">
        <h2 className="text-xl font-bold text-gray-900">
          {clientName} {'\u00B7'} {formatDate(visit.visit_date)}
        </h2>
        <p className="text-sm text-gray-600">
          {visit.service_type} {'\u00B7'} {visit.technician_name}
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Reportes</h3>
        <p className="text-sm text-gray-600 mb-4">
          Genera el reporte profesional en PDF con los datos y la evidencia de esta visita.
        </p>

        <GenerateReportButton visitId={visit.id} hasReports={reportsWithUrl.length > 0} />

        {reportsWithUrl.length > 0 && (
          <div className="mt-4 divide-y divide-gray-100 border-t border-gray-100">
            {reportsWithUrl.map((report) => (
              <div key={report.id} className="py-2.5 flex items-center justify-between gap-3">
                <span className="text-sm text-gray-700">
                  Reporte del {formatDateTime(report.generated_at ?? report.created_at)}
                </span>
                {report.signedUrl ? (
                  
                    href={report.signedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-blue-600 hover:text-blue-500 whitespace-nowrap"
                  >
                    Descargar PDF
                  </a>
                ) : (
                  <span className="text-xs text-gray-400">No disponible</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Datos de la visita</h3>
        <VisitForm clients={clients} visit={visit} />
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          Evidencia fotografica ({photosWithUrl.length})
        </h3>

        {photosWithUrl.length === 0 ? (
          <p className="text-sm text-gray-600">
            Esta visita aun no tiene fotos. Agregalas desde el formulario de arriba.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {photosWithUrl.map((photo) => (
              <div key={photo.id} className="border border-gray-200 rounded-md overflow-hidden">
                {photo.signedUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photo.signedUrl}
                    alt={photo.description ?? 'Foto de la visita'}
                    className="w-full h-32 object-cover"
                  />
                ) : (
                  <div className="w-full h-32 bg-gray-100 flex items-center justify-center">
                    <span className="text-xs text-gray-500">No disponible</span>
                  </div>
                )}
                <div className="px-2 py-1.5 flex items-center justify-end bg-gray-50">
                  <form action={deleteVisitPhoto}>
                    <input type="hidden" name="id" value={photo.id} />
                    <input type="hidden" name="visit_id" value={visit.id} />
                    <button
                      type="submit"
                      className="text-xs font-medium text-red-600 hover:text-red-500"
                    >
                      Eliminar
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6 border border-red-100">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Eliminar visita</h3>
        <p className="text-sm text-gray-600 mb-4">
          Esta accion no se puede deshacer. Se eliminaran la visita, sus fotos y sus reportes.
        </p>
        <form action={deleteVisitRecord}>
          <input type="hidden" name="id" value={visit.id} />
          <button
            type="submit"
            className="px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Eliminar visita
          </button>
        </form>
      </div>
    </div>
  )
}
