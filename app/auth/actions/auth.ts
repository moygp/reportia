'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string

  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  })

  if (authError) {
    return { error: authError.message }
  }

  if (!authData.user) {
    return { error: 'Failed to create user' }
  }

  // 2. Create organization
  const { data: orgData, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name: `${fullName}'s Company`,
      industry: 'services',
      plan: 'free',
    })
    .select()
    .single()

  if (orgError) {
    return { error: 'Failed to create organization' }
  }

  // 3. Create profile and link to organization
  const { error: profileError } = await supabase.from('profiles').insert({
    id: authData.user.id,
    full_name: fullName,
    role: 'owner',
    organization_id: orgData.id,
  })

  if (profileError) {
    return { error: 'Failed to create profile' }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
