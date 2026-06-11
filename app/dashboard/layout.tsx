import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logout } from '../auth/actions/auth'

type LayoutProfile = {
  full_name: string | null
  organization: { name: string } | null
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data } = await supabase
    .from('profiles')
    .select(
      `
      full_name,
      organization:organizations (
        name
      )
    `
    )
    .eq('id', user.id)
    .single()

  const profile = data as unknown as LayoutProfile | null

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-6">
              <Link href="/dashboard" className="text-xl font-bold text-gray-900">
                Reportia
              </Link>
              {profile?.organization && (
                <span className="hidden sm:inline text-sm text-gray-600">
                  {profile.organization.name}
                </span>
              )}
              <div className="flex items-center space-x-4">
                <Link
                  href="/dashboard"
                  className="text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Inicio
                </Link>
                <Link
                  href="/dashboard/clients"
                  className="text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Clientes
                </Link>
                <Link
                  href="/dashboard/visits"
                  className="text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Visitas
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="hidden sm:inline text-sm text-gray-700">
                {profile?.full_name || user.email}
              </span>
              <form action={logout}>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Cerrar sesión
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">{children}</main>
    </div>
  )
}
