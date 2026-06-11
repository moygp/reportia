import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { VisitForm } from '../visit-form'
import type { ClientOption } from '../types'

export default async function NewVisitPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [{ data: clientsData }, { data: profile }] = await Promise.all([
    supabase.from('clients').select('id, name').order('name', { ascending: true }),
    supabase.from('profiles').select('full_name').eq('id', user.id).single(),
  ])

  const clients = (clientsData ?? []) as ClientOption[]

  if (clients.length === 0) {
    return (
      <div className="max-w-2xl">
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Primero registra un cliente</h2>
          <p className="text-sm text-gray-600 mb-6">
            Cada visita se asocia a un cliente. Registra uno y regresa para capturar la visita.
          </p>
          <Link
            href="/dashboard/clients/new"
            className="inline-block px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            Registrar cliente
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-1">Nueva visita</h2>
        <p className="text-sm text-gray-600 mb-6">
          Captura la visita de campo con su evidencia fotográfica.
        </p>

        <VisitForm clients={clients} defaultTechnician={profile?.full_name ?? ''} />
      </div>
    </div>
  )
}
