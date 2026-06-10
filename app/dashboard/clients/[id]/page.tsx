import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ClientForm } from '../client-form'
import { deleteClientRecord, updateClientRecord } from '../actions'
import type { Client } from '../types'

export default async function EditClientPage({
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

  const { data } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single()

  if (!data) {
    notFound()
  }

  const client = data as Client

  return (
    <div className="max-w-2xl space-y-4">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-1">Editar cliente</h2>
        <p className="text-sm text-gray-600 mb-6">{client.name}</p>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <ClientForm action={updateClientRecord} client={client} submitLabel="Guardar cambios" />
      </div>

      <div className="bg-white rounded-lg shadow p-6 border border-red-100">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Eliminar cliente</h3>
        <p className="text-sm text-gray-600 mb-4">
          Esta acción no se puede deshacer. Se eliminará el cliente y su información.
        </p>
        <form action={deleteClientRecord}>
          <input type="hidden" name="id" value={client.id} />
          <button
            type="submit"
            className="px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Eliminar cliente
          </button>
        </form>
      </div>
    </div>
  )
}
