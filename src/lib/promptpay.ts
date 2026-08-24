import generatePayload from 'promptpay-qr'

export const PROMPTPAY_PHONE = '0616080720'

/**
 * Generates EMVCo QR code payload for PromptPay
 * @param phone PromptPay phone number (default: 0616080720)
 * @param amount Exact order total amount
 */
export function generatePromptPayPayload(amount: number, phone = PROMPTPAY_PHONE): string {
  // Ensure amount is rounded to 2 decimal places and positive
  const roundedAmount = Math.max(0, Math.round(amount * 100) / 100)
  return generatePayload(phone, { amount: roundedAmount })
}

/**
 * Formats Thai phone number for display: 061-608-0720
 */
export function formatPromptPayPhone(phone = PROMPTPAY_PHONE): string {
  const clean = phone.replace(/\D/g, '')
  if (clean.length === 10) {
    return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6)}`
  }
  return phone
}
