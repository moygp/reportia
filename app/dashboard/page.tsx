import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logout } from '../auth/actions/auth'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile with organization
  const { data: profile } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      role,
      organization:organizations (
        id,
        name,
        industry,
        plan
      )
    `)
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Reportia</h1>
              {profile?.organization && (
                <span className="ml-4 text-sm text-gray-600">
                  {profile.organization.name}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">{profile?.full_name || user.email}</span>
              <form action={logout}>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900">
                  Cerrar sesión
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">¡Bienvenido a Reportia! 🎉</h2>
            
            {profile && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Tu perfil</h3>
                  <div className="bg-gray-50 rounded-md p-4 space-y-2">
                    <p className="text-sm text-gray-600"><span className="font-medium">Nombre:</span> {profile.full_name}</p>
                    <p className="text-sm text-gray-600"><span className="font-medium">Email:</span> {user.email}</p>
                    <p className="text-sm text-gray-600"><span className="font-medium">Rol:</span> {profile.role}</p>
                  </div>
                </div>

                {profile.organization && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Tu empresa</h3>
                    <div className="bg-blue-50 rounded-md p-4 space-y-2">
                      <p className="text-sm text-blue-900"><span className="font-medium">Nombre:</span> {profile.organization.name}</p>
                      <p className="text-sm text-blue-900"><span className="font-medium">Industria:</span> {profile.organization.industry}</p>
                      <p className="text-sm text-blue-900"><span className="font-medium">Plan:</span> {profile.organization.plan}</p>
                    </div>
                  </div>
                )}

                <div className="mt-6 p-4 bg-green-50 rounded-md">
                  <p className="text-sm text-green-800 font-medium mb-2">✅ Sistema configurado correctamente</p>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• Autenticación funcionando</li>
                    <li>• Organization creada automáticamente</li>
                    <li>• Profile linkeado a organization</li>
                    <li>• Multi-tenant setup listo</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
