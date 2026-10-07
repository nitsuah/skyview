// Stripe billing for bookings: fee split, PaymentIntent authorize/release/capture,
// and the operator payout + client invoice after capture. api-bookings.mjs owns
// the booking/job state transitions and calls in here for the money movement.
// Every function is a no-op when Stripe is not configured (STRIPE_SECRET_KEY unset).
import { sql } from './db.js'
import { stripe } from './stripe.js'

const PLATFORM_FEE = 0.15

// Stripe rejects USD charges under 50 cents
export const MIN_CHARGE_CENTS = 50

export const paymentsEnabled = () => Boolean(stripe)

export function splitTotal(totalCents) {
  const fee = Math.round(totalCents * PLATFORM_FEE)
  return { fee, payout: totalCents - fee }
}

// Places a manual-capture hold for the booking total and records the
// PaymentIntent on the booking. Returns the client secret for the browser to
// confirm the card, or null when payments are off. Throws on Stripe failure.
export async function authorizePayment(booking) {
  if (!stripe) return null
  const intent = await stripe.paymentIntents.create({
    amount: booking.total_cents,
    currency: 'usd',
    capture_method: 'manual',
    metadata: {
      booking_id: booking.id,
      job_id: booking.job_id,
      client_id: booking.client_id,
      operator_id: booking.operator_id,
    },
  })
  await sql`UPDATE bookings SET stripe_payment_intent_id = ${intent.id} WHERE id = ${booking.id}`
  return intent.client_secret
}

// Releases the hold on a declined booking. Never throws: uncaptured
// PaymentIntents auto-expire after 7 days, so a failure here is only logged.
export async function releasePayment(booking) {
  if (!stripe || !booking.stripe_payment_intent_id) return
  try {
    await stripe.paymentIntents.cancel(booking.stripe_payment_intent_id)
  } catch (err) {
    console.error('PI cancel failed for booking', booking.id, err.message)
  }
}

// Captures the held funds. Returns the captured PaymentIntent, or null when
// there is nothing to capture. Throws on Stripe failure.
export async function capturePayment(booking) {
  if (!stripe || !booking.stripe_payment_intent_id) return null
  return stripe.paymentIntents.capture(booking.stripe_payment_intent_id)
}

export async function payoutAndInvoice(booking, chargeId = null) {
  // Transfer to operator if they have Stripe Connect onboarded
  const [opProfile] = await sql`
    SELECT stripe_account_id, stripe_onboarded FROM operator_profiles WHERE user_id = ${booking.operator_id}
  `
  if (opProfile?.stripe_account_id && opProfile.stripe_onboarded) {
    const transfer = await stripe.transfers.create(
      {
        amount: booking.operator_payout_cents,
        currency: 'usd',
        destination: opProfile.stripe_account_id,
        // source_transaction links the transfer to the specific captured charge
        // so funds are drawn from that charge rather than platform available balance
        ...(chargeId ? { source_transaction: chargeId } : {}),
        metadata: { booking_id: booking.id },
      },
      { idempotencyKey: `transfer-${booking.id}` }
    )
    await sql`UPDATE bookings SET stripe_transfer_id = ${transfer.id} WHERE id = ${booking.id}`
  }

  // Let invoice errors propagate so payout_status reflects the true outcome
  await issueInvoice(booking)
}

async function issueInvoice(booking) {
  const [client] = await sql`SELECT id, email, name, stripe_customer_id FROM users WHERE id = ${booking.client_id}`
  const [job] = await sql`SELECT title FROM jobs WHERE id = ${booking.job_id}`
  if (!client) return

  let customerId = client.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create(
      { email: client.email, name: client.name, metadata: { skyview_user_id: client.id } },
      { idempotencyKey: `create-customer-${client.id}` }
    )
    customerId = customer.id
    // Persist only if not already set (safe under concurrent calls with the same idempotencyKey)
    await sql`
      UPDATE users SET stripe_customer_id = ${customerId}
      WHERE id = ${client.id} AND stripe_customer_id IS NULL
    `.catch(err => console.error('Failed to persist stripe_customer_id:', err.message))
  }

  const invoice = await stripe.invoices.create(
    { customer: customerId, auto_advance: false, metadata: { booking_id: booking.id } },
    { idempotencyKey: `invoice-${booking.id}` }
  )

  await stripe.invoiceItems.create(
    {
      customer: customerId,
      invoice: invoice.id,
      amount: booking.total_cents,
      currency: 'usd',
      description: `SkyView Drone Service${job ? ': ' + job.title : ''}`,
    },
    { idempotencyKey: `invoice-item-${booking.id}` }
  )

  const finalized = await stripe.invoices.finalizeInvoice(invoice.id)
  // Mark paid out-of-band since we captured via PaymentIntent
  await stripe.invoices.pay(finalized.id, { paid_out_of_band: true })
}
