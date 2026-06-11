export type Visit = {
  id: string
  organization_id: string
  client_id: string
  visit_date: string
  service_type: string
  work_performed: string
  recommendations: string | null
  technician_name: string
  status: string
  created_at: string
  updated_at: string
}

export type Photo = {
  id: string
  visit_id: string
  storage_url: string
  description: string | null
  uploaded_at: string
}

export type PhotoWithUrl = Photo & {
  signedUrl: string | null
}

export type ClientOption = {
  id: string
  name: string
}
