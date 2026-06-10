import Link from 'next/link'
import type { Client } from './types'

const inputClass =
  'mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500'

export function ClientForm({
  action,
  client,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>
  client?: Client
  submitLabel: string
}) {
  return (
    <form action={action} className="space-y-4">
      {client && <input type="hidden" name="id" value={client.id} />}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Nombre del cliente *
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={client?.name ?? ''}
          placeholder="Ej. MSCI, Kohler, La Intuición"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="contact_name" className="block text-sm font-medium text-gray-700">
            Persona de contacto
          </label>
          <input
            id="contact_name"
            name="contact_name"
            type="text"
            defaultValue={client?.contact_name ?? ''}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
            Teléfono
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={client?.phone ?? ''}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          defaultValue={client?.email ?? ''}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="address" className="block text-sm font-medium text-gray-700">
          Dirección
        </label>
        <input
          id="address"
          name="address"
          type="text"
          defaultValue={client?.address ?? ''}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
          Notas
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={client?.notes ?? ''}
          className={inputClass}
        />
      </div>

      <div className="flex items-center space-x-3 pt-2">
        <button
          type="submit"
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {submitLabel}
        </button>
        <Link
          href="/dashboard/clients"
          className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          Cancelar
        </Link>
      </div>
    </form>
  )
}
