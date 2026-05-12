import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logout } from '../auth/actions/auth'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Reportia</h1>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-700 mr-4">{user.email}</span>
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
            <p className="text-gray-600">Tu cuenta está configurada correctamente.</p>
            <div className="mt-4 p-4 bg-green-50 rounded-md">
              <p className="text-sm text-green-800">
                ✅ Autenticación funcionando<br/>
                ✅ Usuario: {user.email}<br/>
                ✅ ID: {user.id}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
