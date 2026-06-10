import { ClientForm } from '../client-form'
import { createClientRecord } from '../actions'

export default async function NewClientPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <div className="max-w-2xl">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-1">Nuevo cliente</h2>
        <p className="text-sm text-gray-600 mb-6">
          Registra un cliente para generar sus reportes de servicio.
        </p>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <ClientForm action={createClientRecord} submitLabel="Guardar cliente" />
      </div>
    </div>
  )
}
