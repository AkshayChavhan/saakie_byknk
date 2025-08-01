import Razorpay from 'razorpay'

// Make Razorpay optional - only initialize if keys are provided
const razorpayKeyId = process.env.RAZORPAY_KEY_ID
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET

export const razorpay = razorpayKeyId && razorpayKeySecret
  ? new Razorpay({
      key_id: razorpayKeyId,
      key_secret: razorpayKeySecret,
    })
  : null

export const isRazorpayEnabled = () => {
  return !!razorpayKeyId && !!razorpayKeySecret && !!process.env.RAZORPAY_WEBHOOK_SECRET
}

export const formatAmountForRazorpay = (amount: number): number => {
  // Razorpay expects amounts in the smallest currency unit (paise for INR)
  return Math.round(amount * 100)
}

export const formatAmountFromRazorpay = (amount: number): number => {
  // Convert from paise to rupees
  return amount / 100
}