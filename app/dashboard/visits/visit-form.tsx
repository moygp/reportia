'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createVisitRecord, registerVisitPhotos, updateVisitRecord } from './actions'
import type { ClientOption, Visit } from './types'

const inputClass =
  'mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500'

const PHOTOS_BUCKET = 'visit-photos'
const MAX_PHOTO_MB = 10

const SERVICE_SUGGESTIONS = [
  'Mantenimiento',
  'Instalación',
  'Inspección',
  'Reparación',
  'Fumigación',
  'Limpieza',
]

function todayLocal() {
  const now = new Date()
  const offsetMs = now.getTimezoneOffset() * 60000
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10)
}

function isNextRedirect(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'digest' in error &&
    String((error as { digest: unknown }).digest).startsWith('NEXT_REDIRECT')
  )
}

export function VisitForm({
  clients,
  visit,
  defaultTechnician,
}: {
  clients: ClientOption[]
  visit?: Visit
  defaultTechnician?: string
}) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSaving(true)

    const formData = new FormData(event.currentTarget)
    const files = Array.from(fileInputRef.current?.files ?? [])

    const tooBig = files.find((file) => file.size > MAX_PHOTO_MB * 1024 * 1024)
    if (tooBig) {
      setError(`“${tooBig.name}” pesa más de ${MAX_PHOTO_MB} MB. Reduce su tamaño e intenta de nuevo.`)
      setSaving(false)
      return
    }

    try {
      const result = visit ? await updateVisitRecord(formData) : await createVisitRecord(formData)

      if (!result.ok) {
        setError(result.error)
        setSaving(false)
        return
      }

      let uploadErrorMsg: string | null = null

      if (files.length > 0) {
        const supabase = createClient()
        const uploaded: string[] = []

        for (let i = 0; i < files.length; i++) {
          const file = files[i]
          setProgress(`Subiendo foto ${i + 1} de ${files.length}…`)

          const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
          const path = `${result.organizationId}/${result.visitId}/${Date.now()}-${i}.${ext}`

          const { error: uploadError } = await supabase.storage
            .from(PHOTOS_BUCKET)
            .upload(path, file, { contentType: file.type || 'image/jpeg' })

          if (uploadError) {
            uploadErrorMsg = `La visita se guardó, pero falló la subida de “${file.name}”: ${uploadError.message}. Puedes agregar las fotos faltantes desde esta pantalla.`
            break
          }

          uploaded.push(path)
        }

        if (uploaded.length > 0) {
          setProgress('Registrando fotos…')
          const registered = await registerVisitPhotos(result.visitId, uploaded)
          if (!registered.ok) {
            uploadErrorMsg =
              registered.error ?? 'Las fotos se subieron pero no se pudieron registrar. Intenta de nuevo.'
          }
        }
      }

      const target = uploadErrorMsg
        ? `/dashboard/visits/${result.visitId}?error=${encodeURIComponent(uploadErrorMsg)}`
        : `/dashboard/visits/${result.visitId}`

      router.push(target)
    } catch (err) {
      if (isNextRedirect(err)) {
        throw err
      }
      setError('Ocurrió un error inesperado. Intenta de nuevo.')
      setSaving(false)
    } finally {
      setProgress(null)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {visit && <input type="hidden" name="id" value={visit.id} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="client_id" className="block text-sm font-medium text-gray-700">
            Cliente *
          </label>
          <select
            id="client_id"
            name="client_id"
            required
            defaultValue={visit?.client_id ?? ''}
            className={inputClass}
          >
            <option value="" disabled>
              Selecciona un cliente
            </option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="visit_date" className="block text-sm font-medium text-gray-700">
            Fecha de la visita *
          </label>
          <input
            id="visit_date"
            name="visit_date"
            type="date"
            required
            defaultValue={visit?.visit_date ?? todayLocal()}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="service_type" className="block text-sm font-medium text-gray-700">
            Tipo de servicio *
          </label>
          <input
            id="service_type"
            name="service_type"
            type="text"
            required
            list="service-suggestions"
            defaultValue={visit?.service_type ?? ''}
            placeholder="Ej. Mantenimiento"
            className={inputClass}
          />
          <datalist id="service-suggestions">
            {SERVICE_SUGGESTIONS.map((service) => (
              <option key={service} value={service} />
            ))}
          </datalist>
        </div>
        <div>
          <label htmlFor="technician_name" className="block text-sm font-medium text-gray-700">
            Técnico responsable *
          </label>
          <input
            id="technician_name"
            name="technician_name"
            type="text"
            required
            defaultValue={visit?.technician_name ?? defaultTechnician ?? ''}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="work_performed" className="block text-sm font-medium text-gray-700">
          Trabajos realizados *
        </label>
        <textarea
          id="work_performed"
          name="work_performed"
          rows={4}
          required
          defaultValue={visit?.work_performed ?? ''}
          placeholder="Describe los trabajos hechos durante la visita"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="recommendations" className="block text-sm font-medium text-gray-700">
          Recomendaciones
        </label>
        <textarea
          id="recommendations"
          name="recommendations"
          rows={3}
          defaultValue={visit?.recommendations ?? ''}
          placeholder="Opcional: recomendaciones para el cliente"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="photos" className="block text-sm font-medium text-gray-700">
          {visit ? 'Agregar fotos' : 'Fotos de evidencia'}
        </label>
        <input
          id="photos"
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="mt-1 block w-full text-sm text-gray-600 file:mr-3 file:px-4 file:py-2 file:border-0 file:rounded-md file:bg-blue-50 file:text-blue-700 file:text-sm file:font-medium hover:file:bg-blue-100"
        />
        <p className="mt-1 text-xs text-gray-500">JPG, PNG o WebP. Máximo {MAX_PHOTO_MB} MB por foto.</p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {progress && (
        <div className="rounded-md bg-blue-50 border border-blue-200 p-3">
          <p className="text-sm text-blue-700">{progress}</p>
        </div>
      )}

      <div className="flex items-center space-x-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving ? 'Guardando…' : visit ? 'Guardar cambios' : 'Guardar visita'}
        </button>
        <Link
          href="/dashboard/visits"
          className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          Cancelar
        </Link>
      </div>
    </form>
  )
}
