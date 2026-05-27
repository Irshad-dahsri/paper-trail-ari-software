import { withUserContext } from '@/lib/db'
import { moduleSettings } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { decrypt, isEncrypted } from '@/lib/crypto'
import { INTEGRATIONS_MODULE_ID } from '@/lib/constants'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const DEFAULT_MODEL = 'claude-sonnet-4-5'
const ANTHROPIC_VERSION = '2023-06-01'

export class AnthropicConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AnthropicConfigError'
  }
}

export class AnthropicCallError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AnthropicCallError'
  }
}

interface AnthropicConfig {
  apiKey: string
  model: string
}

async function readAnthropicConfig(userId: string): Promise<AnthropicConfig> {
  const rows = await withUserContext(userId, async (db) =>
    db
      .select({ settings: moduleSettings.settings })
      .from(moduleSettings)
      .where(
        and(
          eq(moduleSettings.userId, userId),
          eq(moduleSettings.moduleId, INTEGRATIONS_MODULE_ID),
        ),
      )
      .limit(1),
  )

  const saved = (rows[0]?.settings ?? {}) as Record<string, unknown>

  const storedKey = saved.ANTHROPIC_API_KEY
  let apiKey: string | undefined
  if (typeof storedKey === 'string' && storedKey.length > 0) {
    apiKey = isEncrypted(storedKey) ? decrypt(storedKey) : storedKey
  } else if (process.env.ANTHROPIC_API_KEY) {
    apiKey = process.env.ANTHROPIC_API_KEY
  }

  if (!apiKey) {
    throw new AnthropicConfigError(
      'Anthropic API key not configured. Add one in Settings → Integrations.',
    )
  }

  const storedModel = saved.ANTHROPIC_MODEL
  const model =
    (typeof storedModel === 'string' && storedModel.trim().length > 0
      ? storedModel.trim()
      : process.env.ANTHROPIC_MODEL?.trim()) || DEFAULT_MODEL

  return { apiKey, model }
}

interface AnthropicMessage {
  role: 'user' | 'assistant'
  content: string
}

interface CallOptions {
  system?: string
  messages: AnthropicMessage[]
  maxTokens?: number
  temperature?: number
}

export async function callAnthropic(userId: string, options: CallOptions): Promise<string> {
  const { apiKey, model } = await readAnthropicConfig(userId)

  const body = {
    model,
    max_tokens: options.maxTokens ?? 2048,
    temperature: options.temperature ?? 0.2,
    system: options.system,
    messages: options.messages,
  }

  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    let detail = ''
    try {
      const parsed = JSON.parse(text)
      detail = parsed?.error?.message || ''
    } catch {
      detail = text.slice(0, 200)
    }
    throw new AnthropicCallError(
      `Anthropic API error (${res.status})${detail ? `: ${detail}` : ''}`,
    )
  }

  const json = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>
  }

  const text = json.content
    ?.filter((block) => block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text!)
    .join('\n')
    .trim()

  if (!text) {
    throw new AnthropicCallError('Anthropic returned an empty response.')
  }

  return text
}

export function extractJsonObject<T = unknown>(raw: string): T {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = (fenced ? fenced[1] : raw).trim()

  const firstBrace = candidate.indexOf('{')
  const lastBrace = candidate.lastIndexOf('}')
  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    throw new AnthropicCallError('AI response did not contain a JSON object.')
  }

  const slice = candidate.slice(firstBrace, lastBrace + 1)
  try {
    return JSON.parse(slice) as T
  } catch {
    throw new AnthropicCallError('AI response was not valid JSON.')
  }
}
