import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-helpers'
import { createErrorResponse } from '@/lib/api-helpers'
import { getStorageProvider, sanitizeFilename, readStorageConfig } from '@/lib/storage'

const BUCKET = 'paper-trail'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

export async function POST(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser()
    if (!user) {
      return createErrorResponse('Unauthorized - Valid authentication required', 401)
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return createErrorResponse('No file provided', 400)
    }

    if (file.size > MAX_FILE_SIZE) {
      return createErrorResponse(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`, 400)
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return createErrorResponse(
        `File type "${file.type}" is not allowed. Accepted: JPEG, PNG, WebP, PDF`,
        400,
      )
    }

    const storage = getStorageProvider(readStorageConfig())
    const buffer = Buffer.from(await file.arrayBuffer())
    const sanitizedName = sanitizeFilename(file.name)

    const result = await storage.upload(user.id, BUCKET, sanitizedName, buffer, file.type)

    return NextResponse.json({ path: result.path, name: result.name }, { status: 201 })
  } catch (error) {
    console.error('POST /api/modules/paper-trail/upload error:', error instanceof Error ? error.message : error)
    return createErrorResponse('Internal server error', 500)
  }
}
