import Stripe from 'stripe'

// Make Stripe optional - only initialize if keys are provided
const stripeSecretKey = process.env.STRIPE_SECRET_KEY

export const stripe = stripeSecretKey 
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2025-07-30.basil',
      typescript: true,
    })
  : null

export const isStripeEnabled = () => {
  return !!stripeSecretKey && !!process.env.STRIPE_WEBHOOK_SECRET
}

export const formatAmountForStripe = (amount: number): number => {
  // Stripe expects amounts in the smallest currency unit (paise for INR)
  return Math.round(amount * 100)
}

export const formatAmountFromStripe = (amount: number): number => {
  // Convert from paise to rupees
  return amount / 100
}