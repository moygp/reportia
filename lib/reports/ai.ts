export type RedactedReport = {
  summary: string
  workItems: string[]
  recommendations: string[]
}

const SYSTEM_PROMPT = `Eres el redactor de reportes de servicio de campo de una empresa profesional. Recibes las notas crudas de un tecnico y las conviertes en redaccion profesional para el cliente, en espanol.

REGLAS ABSOLUTAS:
- NO inventes trabajos, cantidades, productos ni observaciones que no esten en las notas. Solo reformula, ordena y profesionaliza lo que el tecnico escribio.
- Si las notas son escuetas, la redaccion sera breve. Nunca rellenes con generalidades.
- Tono: profesional, directo, claro. Sin adjetivos grandilocuentes.
- Responde SOLO con JSON valido, sin markdown ni texto adicional, con esta forma exacta:
{"summary":"parrafo de 2 a 4 frases que resume el servicio","workItems":["trabajo 1","trabajo 2"],"recommendations":["recomendacion 1"]}
- workItems: cada trabajo como punto independiente, redactado completo y terminado en punto.
- recommendations: solo a partir de lo que el tecnico escribio en recomendaciones; si no escribio nada, devuelve [].`

export async function redactVisitReport(input: {
  clientName: string
  dateLabel: string
  serviceType: string
  technicianName: string
  workRaw: string
  recommendationsRaw: string | null
}): Promise<RedactedReport | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1200,
        temperature: 0.3,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Cliente: ${input.clientName}
Fecha: ${input.dateLabel}
Tipo de servicio: ${input.serviceType}
Tecnico: ${input.technicianName}

Notas del tecnico sobre trabajos realizados:
${input.workRaw}

Notas del tecnico sobre recomendaciones:
${input.recommendationsRaw ?? '(sin recomendaciones)'}`,
          },
        ],
      }),
    })

    if (!res.ok) return null

    const data = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>
    }
    const text = data.content?.find((c) => c.type === 'text')?.text ?? ''
    const cleaned = text.replace(/```json|```/g, '').trim()
    const match = cleaned.match(/\{[\s\S]*\}/)
    const parsed: unknown = JSON.parse(match ? match[0] : cleaned)

    if (!parsed || typeof parsed !== 'object') return null
    const obj = parsed as { summary?: unknown; workItems?: unknown; recommendations?: unknown }
    if (typeof obj.summary !== 'string' || !Array.isArray(obj.workItems)) return null

    return {
      summary: obj.summary,
      workItems: obj.workItems.map((w) => String(w)),
      recommendations: Array.isArray(obj.recommendations)
        ? obj.recommendations.map((r) => String(r))
        : [],
    }
  } catch {
    return null
  }
}
