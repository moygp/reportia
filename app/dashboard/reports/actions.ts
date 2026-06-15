'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { redactVisitReport } from '@/lib/reports/ai'
import { buildVisitReportPdf } from '@/lib/reports/pdf'

const PHOTOS_BUCKET = 'visit-photos'
const REPORTS_BUCKET = 'visit-reports'
const MAX_PHOTOS_IN_PDF = 6

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

export type GenerateReportResult =
  | { ok: true; warning?: string }
  | { ok: false; error: string }

export async function generateVisitReport(visitId: string): Promise<GenerateReportResult> {
  if (!visitId) {
    return { ok: false, error: 'Visita no encontrada' }
  }

  const { supabase, organizationId } = await getOrgContext()

  const { data: visitData } = await supabase
    .from('visits')
    .select('*')
    .eq('id', visitId)
    .eq('organization_id', organizationId)
    .single()

  if (!visitData) {
    return { ok: false, error: 'Visita no encontrada' }
  }

  const visit = visitData as {
    id: string
    client_id: string
    visit_date: string
    service_type: string
    work_performed: string
    recommendations: string | null
    technician_name: string
  }

  const [{ data: clientData }, { data: orgData }, { data: photosData }] = await Promise.all([
    supabase.from('clients').select('name').eq('id', visit.client_id).single(),
    supabase.from('organizations').select('name').eq('id', organizationId).single(),
    supabase
      .from('photos')
      .select('storage_url')
      .eq('visit_id', visitId)
      .order('uploaded_at', { ascending: true }),
  ])

  const clientName = (clientData?.name as string | undefined) ?? 'Cliente'
  const orgName = (orgData?.name as string | undefined) ?? 'Reportia'
  const dateLabel = `Visita del ${new Date(`${visit.visit_date}T00:00:00`).toLocaleDateString(
    'es-MX',
    { day: 'numeric', month: 'long', year: 'numeric' }
  )}`

  const photoPaths = ((photosData ?? []) as { storage_url: string }[])
    .map((p) => p.storage_url)
    .slice(0, MAX_PHOTOS_IN_PDF)

  let photoBytes: { bytes: Uint8Array }[] = []
  if (photoPaths.length > 0) {
    const { data: signed } = await supabase.storage
      .from(PHOTOS_BUCKET)
      .createSignedUrls(photoPaths, 600)

    const urls = (signed ?? []).map((s) => s.signedUrl).filter((u): u is string => Boolean(u))
    const fetched = await Promise.all(
      urls.map(async (url) => {
        try {
          const res = await fetch(url)
          if (!res.ok) return null
          return new Uint8Array(await res.arrayBuffer())
        } catch {
          return null
        }
      })
    )
    photoBytes = fetched
      .filter((b) => b !== null)
      .map((bytes) => ({ bytes: bytes as Uint8Array }))
  }

  const redacted = await redactVisitReport({
    clientName,
    dateLabel,
    serviceType: visit.service_type,
    technicianName: visit.technician_name,
    workRaw: visit.work_performed,
    recommendationsRaw: visit.recommendations,
  })

  const pdfBytes = await buildVisitReportPdf({
    orgName,
    clientName,
    dateLabel,
    serviceType: visit.service_type,
    technicianName: visit.technician_name,
    summary: redacted?.summary ?? null,
    workItems: redacted?.workItems ?? null,
    workRaw: visit.work_performed,
    recommendations: redacted?.recommendations ?? null,
    recommendationsRaw: visit.recommendations,
    photos: photoBytes,
  })

  const path = `${organizationId}/${visitId}/reporte-${Date.now()}.pdf`
  const { error: uploadError } = await supabase.storage
    .from(REPORTS_BUCKET)
    .upload(path, pdfBytes, { contentType: 'application/pdf' })

  if (uploadError) {
    return { ok: false, error: `No se pudo guardar el PDF: ${uploadError.message}` }
  }

  const { error: insertError } = await supabase.from('reports').insert({
    visit_id: visitId,
    pdf_url: path,
    generated_at: new Date().toISOString(),
  })

  if (insertError) {
    return { ok: false, error: insertError.message }
  }

  await supabase
    .from('visits')
    .update({ status: 'completed' })
    .eq('id', visitId)
    .eq('organization_id', organizationId)

  revalidatePath(`/dashboard/visits/${visitId}`)
  revalidatePath('/dashboard/visits')

  if (!redacted) {
    return {
      ok: true,
      warning:
        'Reporte generado con las notas originales del tecnico. Configura ANTHROPIC_API_KEY en Vercel para activar la redaccion profesional con IA.',
    }
  }

  return { ok: true }
}
