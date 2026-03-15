import { supabase } from '@/utils/supabaseClient'
import { getSignedImageUrl } from '@/utils/storage/getSignedUrl'

interface ResolveStorageImageUrlOptions {
  bucket: 'bank-images' | 'personal-images' | 'demo-images' | string
  expiresIn?: number
}

const ABSOLUTE_URL_RE = /^https?:\/\//i
const PUBLIC_BUCKETS = new Set(['bank-images', 'demo-images'])

export async function resolveStorageImageUrl(
  value: string | null | undefined,
  { bucket, expiresIn = 3600 }: ResolveStorageImageUrlOptions
): Promise<string | null> {
  if (!value) return null
  if (ABSOLUTE_URL_RE.test(value)) return value

  const withoutBucketPrefix = value.startsWith(`${bucket}/`)
    ? value.slice(bucket.length + 1)
    : value
  const normalizedPath = withoutBucketPrefix.replace(/^\/+/, '')

  if (!normalizedPath) return null

  if (PUBLIC_BUCKETS.has(bucket)) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(normalizedPath)
    return data?.publicUrl ?? null
  }

  const { url } = await getSignedImageUrl(normalizedPath, {
    bucket,
    expiresIn,
  })

  return url
}
