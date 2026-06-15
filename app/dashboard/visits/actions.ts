'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const PHOTOS_BUCKET = 'visit-photos'
const REPORTS_BUCKET = 'visit-reports'

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

function visitPayload(formData: FormData) {
  const required = (key: string) => ((formData.get(key) as string | null) ?? '').trim()
  const optional = (key: string) => {
    const value = (formData.get(key) as string | null)?.trim()
    return value ? value : null
  }

  return {
    client_id: required('client_id'),
    visit_date: required('visit_date'),
    service_type: required('service_type'),
    work_performed: required('work_performed'),
    technician_name: required('technician_name'),
    recommendations: optional('recommendations'),
  }
}

function missingRequired(payload: ReturnType<typeof visitPayload>) {
  return (
    !payload.client_id ||
    !payload.visit_date ||
    !payload.service_type ||
    !payload.work_performed ||
    !payload.technician_name
  )
}

export type VisitActionResult =
  | { ok: true; visitId: string; organizationId: string }
  | { ok: false; error: string }

export async function createVisitRecord(formData: FormData): Promise<VisitActionResult> {
  const { supabase, organizationId } = await getOrgContext()
  const payload = visitPayload(formData)

  if (missingRequired(payload)) {
    return { ok: false, error: 'Completa todos los campos obligatorios' }
  }

  const { data, error } = await supabase
    .from('visits')
    .insert({ ...payload, organization_id: organizationId })
    .select('id')
    .single()

  if (error || !data) {
    return { ok: false, error: error?.message ?? 'No se pudo guardar la visita' }
  }

  revalidatePath('/dashboard/visits')
  return { ok: true, visitId: data.id as string, organizationId }
}

export async function updateVisitRecord(formData: FormData): Promise<VisitActionResult> {
  const { supabase, organizationId } = await getOrgContext()
  const id = ((formData.get('id') as string | null) ?? '').trim()
  const payload = visitPayload(formData)

  if (!id) {
    return { ok: false, error: 'Visita no encontrada' }
  }

  if (missingRequired(payload)) {
    return { ok: false, error: 'Completa todos los campos obligatorios' }
  }

  const { error } = await supabase
    .from('visits')
    .update(payload)
    .eq('id', id)
    .eq('organization_id', organizationId)

  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath('/dashboard/visits')
  revalidatePath(`/dashboard/visits/${id}`)
  return { ok: true, visitId: id, organizationId }
}

export async function registerVisitPhotos(
  visitId: string,
  paths: string[]
): Promise<{ ok: boolean; error?: string }> {
  if (!visitId || paths.length === 0) {
    return { ok: true }
  }

  const { supabase, organizationId } = await getOrgContext()

  const safePaths = paths.filter((p) => p.startsWith(`${organizationId}/${visitId}/`))

  if (safePaths.length === 0) {
    return { ok: true }
  }

  const { error } = await supabase
    .from('photos')
    .insert(safePaths.map((p) => ({ visit_id: visitId, storage_url: p })))

  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath(`/dashboard/visits/${visitId}`)
  return { ok: true }
}

export async function deleteVisitPhoto(formData: FormData) {
  const { supabase, organizationId } = await getOrgContext()
  const id = formData.get('id') as string | null
  const visitId = formData.get('visit_id') as string | null

  if (!id || !visitId) {
    redirect('/dashboard/visits')
  }

  const { data: photo } = await supabase
    .from('photos')
    .select('storage_url')
    .eq('id', id)
    .single()

  const path = photo?.storage_url as string | undefined

  if (path && path.startsWith(`${organizationId}/`)) {
    await supabase.storage.from(PHOTOS_BUCKET).remove([path])
  }

  await supabase.from('photos').delete().eq('id', id)

  revalidatePath(`/dashboard/visits/${visitId}`)
  redirect(`/dashboard/visits/${visitId}`)
}

export async function deleteVisitRecord(formData: FormData) {
  const { supabase, organizationId } = await getOrgContext()
  const id = formData.get('id') as string | null

  if (!id) {
    redirect('/dashboard/visits')
  }

  const [{ data: photos }, { data: reports }] = await Promise.all([
    supabase.from('photos').select('storage_url').eq('visit_id', id),
    supabase.from('reports').select('pdf_url').eq('visit_id', id),
  ])

  const photoPaths = ((photos ?? []) as { storage_url: string }[])
    .map((p) => p.storage_url)
    .filter((p) => p.startsWith(`${organizationId}/`))

  if (photoPaths.length > 0) {
    await supabase.storage.from(PHOTOS_BUCKET).remove(photoPaths)
  }

  const reportPaths = ((reports ?? []) as { pdf_url: string }[])
    .map((r) => r.pdf_url)
    .filter((p) => p.startsWith(`${organizationId}/`))

  if (reportPaths.length > 0) {
    await supabase.storage.from(REPORTS_BUCKET).remove(reportPaths)
  }

  await supabase
    .from('visits')
    .delete()
    .eq('id', id)
    .eq('organization_id', organizationId)

  revalidatePath('/dashboard/visits')
  redirect('/dashboard/visits')
}
