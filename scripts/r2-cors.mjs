import 'dotenv/config'
import {
  GetBucketCorsCommand,
  PutBucketCorsCommand,
  S3Client,
} from '@aws-sdk/client-s3'

const required = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'FRONTEND_ORIGIN']
const missing = required.filter((key) => !process.env[key]?.trim())
if (missing.length) {
  console.error(`Missing environment values: ${missing.join(', ')}`)
  process.exit(1)
}

const origins = [...new Set(process.env.FRONTEND_ORIGIN.split(',').map((value) => value.trim()).filter(Boolean))]
const client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
})

async function getCorsRules() {
  try {
    const result = await client.send(new GetBucketCorsCommand({ Bucket: process.env.R2_BUCKET_NAME }))
    return result.CORSRules ?? []
  } catch (error) {
    if (error?.name === 'NoSuchCORSConfiguration' || error?.Code === 'NoSuchCORSConfiguration') return []
    console.error(JSON.stringify({ error: error?.Code ?? error?.name ?? 'R2 request failed', status: error?.$metadata?.httpStatusCode ?? null }))
    process.exit(1)
  }
}

function unique(values) {
  const seen = new Set()
  return values.filter((value) => {
    const key = value.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function withUploadCors(existingRules) {
  const rules = existingRules.map((rule) => ({
    ...rule,
    AllowedOrigins: [...(rule.AllowedOrigins ?? [])],
    AllowedMethods: [...(rule.AllowedMethods ?? [])],
    AllowedHeaders: [...(rule.AllowedHeaders ?? [])],
    ExposeHeaders: [...(rule.ExposeHeaders ?? [])],
  }))
  let rule = rules.find((item) => origins.some((origin) => item.AllowedOrigins.includes(origin) || item.AllowedOrigins.includes('*')))
  if (!rule) {
    rule = { AllowedOrigins: origins, AllowedMethods: [], AllowedHeaders: [], ExposeHeaders: [] }
    rules.push(rule)
  }
  if (!rule.AllowedOrigins.includes('*')) rule.AllowedOrigins = unique([...rule.AllowedOrigins, ...origins])
  rule.AllowedMethods = unique([...rule.AllowedMethods, 'GET', 'HEAD', 'PUT'])
  rule.AllowedHeaders = unique([...rule.AllowedHeaders, 'Content-Type', 'Range'])
  rule.ExposeHeaders = unique([...rule.ExposeHeaders, 'ETag', 'Content-Length', 'Content-Range', 'Accept-Ranges'])
  rule.MaxAgeSeconds = Math.max(rule.MaxAgeSeconds ?? 0, 3600)
  return rules
}

const currentRules = await getCorsRules()
const mode = process.argv[2] ?? '--check'
if (mode === '--check') {
  console.log(JSON.stringify({ origins, rules: currentRules }, null, 2))
} else if (mode === '--apply') {
  const rules = withUploadCors(currentRules)
  await client.send(new PutBucketCorsCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    CORSConfiguration: { CORSRules: rules },
  }))
  console.log(JSON.stringify({ applied: true, origins, rules: await getCorsRules() }, null, 2))
} else {
  console.error('Usage: node scripts/r2-cors.mjs [--check|--apply]')
  process.exit(2)
}
