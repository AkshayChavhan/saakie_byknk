import Razorpay from 'razorpay'

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set')
}

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
})

export const formatAmountForRazorpay = (amount: number): number => {
  // Razorpay expects amounts in the smallest currency unit (paise for INR)
  return Math.round(amount * 100)
}

export const formatAmountFromRazorpay = (amount: number): number => {
  // Convert from paise to rupees
  return amount / 100
}