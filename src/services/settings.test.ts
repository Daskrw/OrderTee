import { describe, it, expect } from 'vitest'
import {
  validateSettingsPayload,
  DEFAULT_SETTINGS,
} from './settings'

describe('Store Settings Validation', () => {
  it('has sensible default settings', () => {
    expect(DEFAULT_SETTINGS.store_name).toBe('OrderTee')
    expect(DEFAULT_SETTINGS.is_open).toBe(true)
    expect(DEFAULT_SETTINGS.primary_color).toBe('#f48c2e')
    expect(DEFAULT_SETTINGS.promptpay_number).toBe('0616080720')
  })

  it('validates required store name', () => {
    expect(() => validateSettingsPayload({ store_name: '' })).toThrow('Store name is required')
    expect(() => validateSettingsPayload({ store_name: '   ' })).toThrow('Store name is required')
    expect(() => validateSettingsPayload({ store_name: 'My New Shop' })).not.toThrow()
  })

  it('validates hex color code format', () => {
    expect(() => validateSettingsPayload({ primary_color: '#f48c2e' })).not.toThrow()
    expect(() => validateSettingsPayload({ primary_color: '#fff' })).not.toThrow()
    expect(() => validateSettingsPayload({ primary_color: 'invalid-color' })).toThrow('Invalid hex color code')
    expect(() => validateSettingsPayload({ primary_color: '#12345' })).toThrow('Invalid hex color code')
  })

  it('validates promptpay phone or national id format', () => {
    expect(() => validateSettingsPayload({ promptpay_number: '0616080720' })).not.toThrow()
    expect(() => validateSettingsPayload({ promptpay_number: '061-608-0720' })).not.toThrow()
    expect(() => validateSettingsPayload({ promptpay_number: '1234567890123' })).not.toThrow() // 13-digit ID
    expect(() => validateSettingsPayload({ promptpay_number: '123' })).toThrow('10 หลัก')
    expect(() => validateSettingsPayload({ promptpay_number: '12345678901234' })).toThrow('10 หลัก')
  })
})
