'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

async function getOrgContext() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) {
    redirect('/dashboard')
  }

  return { supabase, organizationId: profile.organization_id as string }
}

function clientPayload(formData: FormData) {
  const optional = (key: string) => {
    const value = (formData.get(key) as string | null)?.trim()
    return value ? value : null
  }

  return {
    name: ((formData.get('name') as string | null) ?? '').trim(),
    contact_name: optional('contact_name'),
    email: optional('email'),
    phone: optional('phone'),
    address: optional('address'),
    notes: optional('notes'),
  }
}

export async function createClientRecord(formData: FormData) {
  const { supabase, organizationId } = await getOrgContext()
  const payload = clientPayload(formData)

  if (!payload.name) {
    redirect(
      `/dashboard/clients/new?error=${encodeURIComponent('El nombre del cliente es obligatorio')}`
    )
  }

  const { error } = await supabase
    .from('clients')
    .insert({ ...payload, organization_id: organizationId })

  if (error) {
    redirect(`/dashboard/clients/new?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath('/dashboard/clients')
  redirect('/dashboard/clients')
}

export async function updateClientRecord(formData: FormData) {
  const { supabase, organizationId } = await getOrgContext()
  const id = formData.get('id') as string | null
  const payload = clientPayload(formData)

  if (!id) {
    redirect('/dashboard/clients')
  }

  if (!payload.name) {
    redirect(
      `/dashboard/clients/${id}?error=${encodeURIComponent('El nombre del cliente es obligatorio')}`
    )
  }

  const { error } = await supabase
    .from('clients')
    .update(payload)
    .eq('id', id)
    .eq('organization_id', organizationId)

  if (error) {
    redirect(`/dashboard/clients/${id}?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath('/dashboard/clients')
  redirect('/dashboard/clients')
}

export async function deleteClientRecord(formData: FormData) {
  const { supabase, organizationId } = await getOrgContext()
  const id = formData.get('id') as string | null

  if (id) {
    await supabase
      .from('clients')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId)
  }

  revalidatePath('/dashboard/clients')
  redirect('/dashboard/clients')
}
