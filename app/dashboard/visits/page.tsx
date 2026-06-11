import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Visit } from './types'

type VisitListRow = Visit & {
  client: { name: string } | null
  photos: { count: number }[]
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function statusBadge(status: string) {
  if (status === 'completed') {
    return { label: 'Completada', className: 'bg-green-100 text-green-800' }
  }
  if (status === 'sent') {
    return { label: 'Reporte enviado', className: 'bg-blue-100 text-blue-800' }
  }
  return { label: 'Sin reporte', className: 'bg-amber-100 text-amber-800' }
}

export default async function VisitsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data } = await supabase
    .from('visits')
    .select('*, client:clients(name), photos(count)')
    .order('visit_date', { ascending: false })
    .order('created_at', { ascending: false })

  const visits = (data ?? []) as unknown as VisitListRow[]

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Visitas</h2>
          <p className="text-sm text-gray-600 mt-1">
            {visits.length === 0
              ? 'Aún no tienes visitas registradas'
              : `${visits.length} visita${visits.length === 1 ? '' : 's'} registrada${visits.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <Link
          href="/dashboard/visits/new"
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Nueva visita
        </Link>
      </div>

      {visits.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-gray-600 mb-4">
            Registra la primera visita de campo para después generar su reporte.
          </p>
          <Link
            href="/dashboard/visits/new"
            className="inline-block px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            Registrar visita
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Servicio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Técnico
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fotos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {visits.map((visit) => {
                const badge = statusBadge(visit.status)
                const photoCount = visit.photos?.[0]?.count ?? 0

                return (
                  <tr key={visit.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(visit.visit_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm font-medium text-gray-900">
                        {visit.client?.name ?? '—'}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {visit.service_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {visit.technician_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{photoCount}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Link
                        href={`/dashboard/visits/${visit.id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-500"
                      >
                        Ver detalle
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
