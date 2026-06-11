import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { VisitForm } from '../visit-form'
import { deleteVisitPhoto, deleteVisitRecord } from '../actions'
import type { ClientOption, Photo, PhotoWithUrl, Visit } from '../types'

const PHOTOS_BUCKET = 'visit-photos'

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
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

  const [{ data: clientsData }, { data: photosData }] = await Promise.all([
    supabase.from('clients').select('id, name').order('name', { ascending: true }),
    supabase
      .from('photos')
      .select('*')
      .eq('visit_id', id)
      .order('uploaded_at', { ascending: true }),
  ])

  const clients = (clientsData ?? []) as ClientOption[]
  const photos = (photosData ?? []) as Photo[]
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

  return (
    <div className="max-w-3xl space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-1">
          {clientName} · {formatDate(visit.visit_date)}
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          {visit.service_type} · {visit.technician_name}
        </p>

        <VisitForm clients={clients} visit={visit} />
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          Evidencia fotográfica ({photosWithUrl.length})
        </h3>

        {photosWithUrl.length === 0 ? (
          <p className="text-sm text-gray-600">
            Esta visita aún no tiene fotos. Agrégalas desde el formulario de arriba.
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
          Esta acción no se puede deshacer. Se eliminarán la visita, sus fotos y sus reportes.
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
