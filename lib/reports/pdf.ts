import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib'

const PAGE_W = 612
const PAGE_H = 792
const MARGIN = 54
const CONTENT_W = PAGE_W - MARGIN * 2

const INK = rgb(0.13, 0.15, 0.18)
const GRAY = rgb(0.45, 0.48, 0.52)
const LIGHT = rgb(0.88, 0.9, 0.92)
const BRAND = rgb(0.15, 0.39, 0.92)
const HEADER_BG = rgb(0.1, 0.12, 0.16)

export type ReportPdfData = {
  orgName: string
  clientName: string
  dateLabel: string
  serviceType: string
  technicianName: string
  summary?: string | null
  workItems?: string[] | null
  workRaw?: string | null
  recommendations?: string[] | null
  recommendationsRaw?: string | null
  photos: { bytes: Uint8Array }[]
}

function sanitize(text: string | null | undefined) {
  if (!text) return ''
  return String(text)
    .replace(/[\u2018\u2019\u201A]/g, "'")
    .replace(/[\u201C\u201D\u201E]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[\u25CF\u25AA]/g, '-')
    .replace(/[^\x20-\x7E\u00A1-\u00FF\n]/g, '')
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const lines: string[] = []
  for (const raw of sanitize(text).split('\n')) {
    const words = raw.split(/\s+/).filter(Boolean)
    if (words.length === 0) {
      lines.push('')
      continue
    }
    let line = ''
    for (const word of words) {
      const candidate = line ? line + ' ' + word : word
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        line = candidate
      } else {
        if (line) lines.push(line)
        line = word
      }
    }
    if (line) lines.push(line)
  }
  return lines
}

export async function buildVisitReportPdf(data: ReportPdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const helv = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)

  doc.setTitle(`Reporte de servicio - ${sanitize(data.clientName)}`)
  doc.setAuthor(sanitize(data.orgName))

  let page: PDFPage = doc.addPage([PAGE_W, PAGE_H])
  let y = PAGE_H
  const pages: PDFPage[] = [page]

  function footerAll() {
    pages.forEach((p, i) => {
      p.drawLine({
        start: { x: MARGIN, y: 40 },
        end: { x: PAGE_W - MARGIN, y: 40 },
        thickness: 0.5,
        color: LIGHT,
      })
      p.drawText(sanitize(`${data.orgName} - Reporte generado con Reportia`), {
        x: MARGIN,
        y: 28,
        size: 7.5,
        font: helv,
        color: GRAY,
      })
      const pn = `${i + 1} / ${pages.length}`
      p.drawText(pn, {
        x: PAGE_W - MARGIN - helv.widthOfTextAtSize(pn, 7.5),
        y: 28,
        size: 7.5,
        font: helv,
        color: GRAY,
      })
    })
  }

  function newPage() {
    page = doc.addPage([PAGE_W, PAGE_H])
    pages.push(page)
    y = PAGE_H - MARGIN
  }

  function ensure(h: number) {
    if (y - h < 60) newPage()
  }

  page.drawRectangle({ x: 0, y: PAGE_H - 64, width: PAGE_W, height: 64, color: HEADER_BG })
  page.drawText(sanitize(data.orgName).toUpperCase(), {
    x: MARGIN,
    y: PAGE_H - 40,
    size: 13,
    font: bold,
    color: rgb(1, 1, 1),
  })
  const tag = 'REPORTE DE SERVICIO'
  page.drawText(tag, {
    x: PAGE_W - MARGIN - helv.widthOfTextAtSize(tag, 8.5),
    y: PAGE_H - 39,
    size: 8.5,
    font: helv,
    color: rgb(0.75, 0.78, 0.82),
  })
  y = PAGE_H - 64 - 34

  page.drawText(sanitize(data.clientName), { x: MARGIN, y, size: 20, font: bold, color: INK })
  y -= 18
  page.drawText(sanitize(data.dateLabel), { x: MARGIN, y, size: 10.5, font: helv, color: GRAY })
  y -= 26

  const fields: Array<[string, string]> = [
    ['TIPO DE SERVICIO', data.serviceType],
    ['TECNICO RESPONSABLE', data.technicianName],
  ]
  const colW = CONTENT_W / 2
  fields.forEach(([label, value], i) => {
    const x = MARGIN + (i % 2) * colW
    page.drawText(sanitize(label), { x, y, size: 7.5, font: bold, color: GRAY })
    page.drawText(sanitize(value), { x, y: y - 13, size: 10.5, font: helv, color: INK })
  })
  y -= 38
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_W - MARGIN, y },
    thickness: 0.75,
    color: LIGHT,
  })
  y -= 24

  function sectionTitle(title: string) {
    ensure(40)
    page.drawRectangle({ x: MARGIN, y: y - 2, width: 18, height: 2.5, color: BRAND })
    y -= 14
    page.drawText(sanitize(title).toUpperCase(), { x: MARGIN, y, size: 10, font: bold, color: INK })
    y -= 16
  }

  function paragraph(text: string) {
    const lines = wrapText(text, helv, 10, CONTENT_W)
    for (const line of lines) {
      ensure(14)
      page.drawText(line, { x: MARGIN, y, size: 10, font: helv, color: INK })
      y -= 14
    }
    y -= 8
  }

  function bullets(items: string[]) {
    for (const item of items) {
      const lines = wrapText(item, helv, 10, CONTENT_W - 14)
      lines.forEach((line, idx) => {
        ensure(14)
        if (idx === 0) page.drawText('\u2022', { x: MARGIN, y, size: 10, font: bold, color: BRAND })
        page.drawText(line, { x: MARGIN + 14, y, size: 10, font: helv, color: INK })
        y -= 14
      })
      y -= 3
    }
    y -= 8
  }

  if (data.summary) {
    sectionTitle('Resumen del servicio')
    paragraph(data.summary)
  }

  sectionTitle('Trabajos realizados')
  if (Array.isArray(data.workItems) && data.workItems.length > 0) bullets(data.workItems)
  else paragraph(data.workRaw ?? '')

  const hasRecs =
    (Array.isArray(data.recommendations) && data.recommendations.length > 0) ||
    Boolean(data.recommendationsRaw)
  if (hasRecs) {
    sectionTitle('Recomendaciones')
    if (Array.isArray(data.recommendations) && data.recommendations.length > 0) {
      bullets(data.recommendations)
    } else {
      paragraph(data.recommendationsRaw ?? '')
    }
  }

  if (data.photos.length > 0) {
    sectionTitle(`Evidencia fotografica (${data.photos.length})`)
    const cellW = (CONTENT_W - 16) / 2
    const cellH = 150
    let col = 0
    for (const photo of data.photos) {
      let img = null
      try {
        const bytes = photo.bytes
        if (bytes[0] === 0xff && bytes[1] === 0xd8) img = await doc.embedJpg(bytes)
        else if (bytes[0] === 0x89 && bytes[1] === 0x50) img = await doc.embedPng(bytes)
      } catch {
        img = null
      }
      if (!img) continue

      if (col === 0) ensure(cellH + 10)
      const scale = Math.min(cellW / img.width, cellH / img.height)
      const w = img.width * scale
      const h = img.height * scale
      const x = MARGIN + col * (cellW + 16) + (cellW - w) / 2
      const yImg = y - cellH + (cellH - h) / 2
      page.drawRectangle({
        x: MARGIN + col * (cellW + 16),
        y: y - cellH,
        width: cellW,
        height: cellH,
        borderColor: LIGHT,
        borderWidth: 0.75,
      })
      page.drawImage(img, { x, y: yImg, width: w, height: h })
      col += 1
      if (col === 2) {
        col = 0
        y -= cellH + 12
      }
    }
    if (col === 1) y -= cellH + 12
  }

  footerAll()
  return doc.save()
}
