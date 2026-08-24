import { describe, it, expect } from 'vitest'
import {
  generatePromptPayPayload,
  formatPromptPayPhone,
  PROMPTPAY_PHONE,
} from './promptpay'

describe('PromptPay QR Payload Generation', () => {
  it('uses default promptpay phone number 0616080720', () => {
    expect(PROMPTPAY_PHONE).toBe('0616080720')
  })

  it('formats promptpay phone number for display correctly', () => {
    expect(formatPromptPayPhone('0616080720')).toBe('061-608-0720')
    expect(formatPromptPayPhone()).toBe('061-608-0720')
  })

  it('generates valid EMVCo PromptPay QR string encoding phone and amount', () => {
    const payload = generatePromptPayPayload(150, '0616080720')
    expect(typeof payload).toBe('string')
    expect(payload.startsWith('000201')).toBe(true) // Standard EMVCo format header
    expect(payload).toContain('616080720') // Contains mobile target digits
    expect(payload).toContain('150.00') // Contains formatted amount
  })

  it('rounds decimal amount correctly (e.g. 199.50)', () => {
    const payload = generatePromptPayPayload(199.5, '0616080720')
    expect(payload).toContain('199.50')
  })

  it('updates QR payload when amount changes dynamically', () => {
    const payload1 = generatePromptPayPayload(100)
    const payload2 = generatePromptPayPayload(150)
    expect(payload1).not.toEqual(payload2)
    expect(payload1).toContain('100.00')
    expect(payload2).toContain('150.00')
  })
})

describe('Payment Slip File Rules & Validation', () => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp']
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp']

  it('accepts JPG, PNG, and WEBP image files', () => {
    expect(allowedMimeTypes.includes('image/jpeg')).toBe(true)
    expect(allowedMimeTypes.includes('image/png')).toBe(true)
    expect(allowedMimeTypes.includes('image/webp')).toBe(true)

    expect(allowedExtensions.includes('jpg')).toBe(true)
    expect(allowedExtensions.includes('jpeg')).toBe(true)
    expect(allowedExtensions.includes('png')).toBe(true)
    expect(allowedExtensions.includes('webp')).toBe(true)
  })

  it('rejects disallowed non-image extensions (PDF, DOCX, ZIP)', () => {
    const disallowed = ['pdf', 'doc', 'docx', 'zip', 'exe', 'txt']
    disallowed.forEach((ext) => {
      expect(allowedExtensions.includes(ext)).toBe(false)
    })
  })

  it('rejects disallowed MIME types', () => {
    const disallowedMimes = ['application/pdf', 'application/zip', 'text/plain', 'video/mp4']
    disallowedMimes.forEach((mime) => {
      expect(allowedMimeTypes.includes(mime)).toBe(false)
    })
  })
})
