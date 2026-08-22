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

export async function sendPasswordResetEmail(to, token) {
  const link = `${APP_URL}/app/reset-password?token=${token}`
  return getResend().emails.send({
    from: FROM,
    to,
    subject: 'Reset your SkyView password',
    html: `<p>You requested a password reset for your SkyView Dynamics account.</p>
<p><a href="${link}">Click here to set a new password</a></p>
<p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email — your password won't change.</p>`
  })
}

export async function sendBookingConfirmedEmail(to, job, operatorName) {
  return getResend().emails.send({
    from: FROM,
    to,
    subject: `Booking confirmed: ${esc(job.title)}`,
    html: `<p>Great news! <strong>${esc(operatorName)}</strong> has accepted your booking for <strong>${esc(job.title)}</strong>.</p>
<p>They'll be in touch to confirm final logistics. Once the work is complete, mark the booking as done in your dashboard to release payment.</p>
<p><a href="${APP_URL}/app/bookings">View your bookings</a></p>`
  })
}

export async function sendBookingDeclinedEmail(to, job) {
  return getResend().emails.send({
    from: FROM,
    to,
    subject: `Booking update: ${esc(job.title)}`,
    html: `<p>The operator was unable to accept your booking for <strong>${esc(job.title)}</strong>.</p>
<p>No payment was taken. Your job is back on the marketplace and other operators can respond.</p>
<p><a href="${APP_URL}/app/operators">Browse operators</a></p>`
  })
}

export async function sendBookingCompletedEmail(to, operatorName, job, payoutCents) {
  return getResend().emails.send({
    from: FROM,
    to,
    subject: `Payout processing: ${esc(job.title)}`,
    html: `<p>Hi ${esc(operatorName)},</p>
<p>The client has marked the job <strong>${esc(job.title)}</strong> as complete. Your payout of <strong>$${(payoutCents / 100).toFixed(2)}</strong> is being processed to your connected bank account.</p>
<p>Payouts typically arrive within 2 business days.</p>
<p><a href="${APP_URL}/app/operator/dashboard">View your dashboard</a></p>`
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
