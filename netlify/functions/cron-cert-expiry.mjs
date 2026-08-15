import { sql } from './utils/db.js'
import { sendCertExpiryWarning } from './utils/email.js'

// Runs daily at 9am UTC — configured in netlify.toml
export const config = { schedule: '0 9 * * *' }

export default async (req, context) => {
  console.log('[cron-cert-expiry] Daily cert expiry check starting...')
  let warned = 0
  let suspendedCount = 0
  let hadError = false

  // Stage 1: send warnings — isolated so a failure doesn't block suspensions
  try {
    const warnings = await sql`
      SELECT u.id, u.email, u.name,
             op.faa_cert_number,
             op.faa_cert_expires_at,
             (op.faa_cert_expires_at - CURRENT_DATE) AS days_left
      FROM operator_profiles op
      JOIN users u ON op.user_id = u.id
      WHERE op.verification_status = 'verified'
        AND op.faa_cert_expires_at IS NOT NULL
        AND (
          op.faa_cert_expires_at - CURRENT_DATE = 30
          OR op.faa_cert_expires_at - CURRENT_DATE = 7
          OR op.faa_cert_expires_at - CURRENT_DATE = 1
        )
    `
    for (const op of warnings) {
      if (!process.env.RESEND_API_KEY) break
      try {
        await sendCertExpiryWarning(op.email, op.name, op.days_left, op.faa_cert_number)
        warned++
      } catch (err) {
        console.error(`  [cron-cert-expiry] Failed to warn ${op.email}:`, err.message)
      }
    }
  } catch (err) {
    console.error('[cron-cert-expiry] Warning stage failed:', err)
    hadError = true
  }

  // Stage 2: auto-suspend expired operators — isolated from stage 1
  try {
    const suspended = await sql`
      UPDATE operator_profiles
      SET verification_status = 'suspended'
      WHERE verification_status = 'verified'
        AND faa_cert_expires_at IS NOT NULL
        AND CURRENT_DATE - faa_cert_expires_at::date >= 7
      RETURNING user_id
    `
    suspendedCount = suspended.length
  } catch (err) {
    console.error('[cron-cert-expiry] Suspend stage failed:', err)
    hadError = true
  }

  const result = { warnings_sent: warned, auto_suspended: suspendedCount, had_error: hadError }
  console.log('[cron-cert-expiry] Done:', result)

  return Response.json(result, { status: hadError ? 500 : 200 })
}
