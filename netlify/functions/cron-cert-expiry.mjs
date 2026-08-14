import { sql } from './utils/db.js'
import { sendCertExpiryWarning } from './utils/email.js'

// Runs daily at 9am UTC — configured in netlify.toml
export const config = { schedule: '0 9 * * *' }

export default async (req, context) => {
  console.log('[cron-cert-expiry] Daily cert expiry check starting...')

  // Operators with certs expiring in exactly 30 or 7 days
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

  let warned = 0
  for (const op of warnings) {
    try {
      if (process.env.RESEND_API_KEY) {
        await sendCertExpiryWarning(op.email, op.name, op.days_left, op.faa_cert_number)
        warned++
      }
    } catch (err) {
      console.error(`  Failed to warn ${op.email}:`, err.message)
    }
  }

  // Auto-suspend operators whose cert has been expired for 7+ days with no renewal
  const suspended = await sql`
    UPDATE operator_profiles
    SET verification_status = 'suspended'
    WHERE verification_status = 'verified'
      AND faa_cert_expires_at IS NOT NULL
      AND CURRENT_DATE - faa_cert_expires_at >= 7
    RETURNING user_id
  `

  const result = { warnings_sent: warned, auto_suspended: suspended.length }
  console.log('[cron-cert-expiry] Done:', result)

  return Response.json(result)
}
