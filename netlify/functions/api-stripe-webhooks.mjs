import { sql } from './utils/db.js'
import { stripe } from './utils/stripe.js'

export const config = { path: '/api/stripe-webhooks' }

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  if (!stripe) return new Response('Stripe not configured', { status: 503 })

  const sig = req.headers.get('stripe-signature')
  let event
  try {
    const body = await req.text()
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    return new Response(`Webhook signature invalid: ${err.message}`, { status: 400 })
  }

  try {
    await handleEvent(event)
  } catch (err) {
    console.error('Webhook handler error:', event.type, err.message)
    return new Response('Internal error', { status: 500 })
  }

  return new Response('ok', { status: 200 })
}

async function handleEvent(event) {
  switch (event.type) {
    case 'payment_intent.payment_failed': {
      const pi = event.data.object
      const booking_id = pi.metadata?.booking_id
      if (booking_id) {
        await sql`
          UPDATE bookings SET status = 'disputed'
          WHERE id = ${booking_id}
            AND stripe_payment_intent_id = ${pi.id}
            AND status = 'pending'
        `
        console.log('Booking flagged disputed due to payment failure:', booking_id)
      }
      break
    }

    case 'account.updated': {
      const account = event.data.object
      const transfersActive = account.capabilities?.transfers === 'active'
      await sql`
        UPDATE operator_profiles
        SET stripe_onboarded = ${transfersActive}
        WHERE stripe_account_id = ${account.id}
      `
      break
    }

    default:
      break
  }
}
