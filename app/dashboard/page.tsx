import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type Organization = {
  id: string
  name: string
  industry: string | null
  plan: string | null
}

type DashboardProfile = {
  id: string
  full_name: string | null
  role: string | null
  organization: Organization | null
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile with organization
  const { data } = await supabase
    .from('profiles')
    .select(
      `
      id,
      full_name,
      role,
      organization:organizations (
        id,
        name,
        industry,
        plan
      )
    `
    )
    .eq('id', user.id)
    .single()

  const profile = data as unknown as DashboardProfile | null

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">¡Bienvenido a Reportia! 🎉</h2>

      {profile && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Tu perfil</h3>
            <div className="bg-gray-50 rounded-md p-4 space-y-2">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Nombre:</span> {profile.full_name}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Email:</span> {user.email}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Rol:</span> {profile.role}
              </p>
            </div>
          </div>

          {profile.organization && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Tu empresa</h3>
              <div className="bg-blue-50 rounded-md p-4 space-y-2">
                <p className="text-sm text-blue-900">
                  <span className="font-medium">Nombre:</span> {profile.organization.name}
                </p>
                <p className="text-sm text-blue-900">
                  <span className="font-medium">Industria:</span> {profile.organization.industry}
                </p>
                <p className="text-sm text-blue-900">
                  <span className="font-medium">Plan:</span> {profile.organization.plan}
                </p>
              </div>
            </div>
          )}

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Accesos rápidos</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link
                href="/dashboard/clients"
                className="block rounded-lg border border-gray-200 p-4 hover:border-blue-400 hover:shadow transition"
              >
                <p className="text-base font-semibold text-gray-900">Clientes</p>
                <p className="text-sm text-gray-600 mt-1">
                  Administra los clientes de tu empresa
                </p>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
