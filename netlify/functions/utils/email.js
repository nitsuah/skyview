import { Resend } from 'resend'

let _resend
const getResend = () => _resend ?? (_resend = new Resend(process.env.RESEND_API_KEY))
const FROM = 'SkyView Dynamics <noreply@skyviewdynamics.com>'
const APP_URL = process.env.DEPLOY_PRIME_URL || process.env.URL || 'https://skyviewd.netlify.app'

const esc = (s) => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')

export async function sendVerificationEmail(to, token) {
  const link = `${APP_URL}/api/auth/verify?token=${token}`
  return getResend().emails.send({
    from: FROM,
    to,
    subject: 'Verify your SkyView account',
    html: `<p>Welcome to SkyView Dynamics.</p>
<p><a href="${link}">Click here to verify your email address</a></p>
<p>This link expires in 24 hours. If you didn't create this account, ignore this email.</p>`
  })
}

export async function sendOperatorApprovedEmail(to, name) {
  return getResend().emails.send({
    from: FROM,
    to,
    subject: 'Your SkyView operator account is verified',
    html: `<p>Hi ${esc(name)},</p>
<p>Your FAA Part 107 certificate has been verified. Your profile is now live on SkyView and clients in your area can find and book you.</p>
<p><a href="${APP_URL}/app/operator/dashboard">Go to your dashboard</a></p>`
  })
}

export async function sendJobAlertEmail(to, job) {
  return getResend().emails.send({
    from: FROM,
    to,
    subject: `New job near you: ${esc(job.title)}`,
    html: `<p>A new ${esc(job.service_type)} job was posted in your service area.</p>
<p><strong>${esc(job.title)}</strong><br>${esc(job.location_address)}</p>
${job.budget_cents ? `<p>Budget: $${(job.budget_cents / 100).toFixed(0)}</p>` : ''}
<p><a href="${APP_URL}/app/operator/dashboard">View and respond</a></p>`
  })
}

export async function sendCertExpiryWarning(to, name, daysLeft, certNumber) {
  return getResend().emails.send({
    from: FROM,
    to,
    subject: `Action required: FAA cert expires in ${daysLeft} days`,
    html: `<p>Hi ${esc(name)},</p>
<p>Your FAA Part 107 certificate <strong>${esc(certNumber)}</strong> expires in <strong>${daysLeft} days</strong>.</p>
<p>Upload your renewed certificate to keep your SkyView profile active. If it expires without renewal, your listing will be automatically suspended.</p>
<p><a href="${APP_URL}/app/operator/dashboard">Update your certificate</a></p>`
  })
}
