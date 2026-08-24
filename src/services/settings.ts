import { supabase } from '@/lib/supabase'
import type { Settings } from '@/types/database'

export const DEFAULT_SETTINGS: Settings = {
  id: '',
  store_name: 'OrderTee',
  store_description: 'ร้านชาและเครื่องดื่ม สดชื่นทุกแก้ว',
  store_phone: '0616080720',
  store_address: 'อาคารหลัก ร้านค้า OrderTee',
  promptpay_number: '0616080720',
  primary_color: '#f48c2e',
  is_open: true,
  updated_at: new Date().toISOString(),
}

/**
 * Validates settings payload before submitting to database
 */
export function validateSettingsPayload(payload: Partial<Omit<Settings, 'id' | 'updated_at'>>) {
  if (payload.store_name !== undefined && !payload.store_name.trim()) {
    throw new Error('กรุณาระบุชื่อร้านค้า (Store name is required)')
  }

  if (payload.primary_color !== undefined) {
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
    if (!hexRegex.test(payload.primary_color)) {
      throw new Error('รหัสสีไม่ถูกต้อง (Invalid hex color code)')
    }
  }

  if (payload.promptpay_number !== undefined && payload.promptpay_number && payload.promptpay_number.trim()) {
    const cleanNumber = payload.promptpay_number.replace(/\D/g, '')
    if (cleanNumber.length !== 10 && cleanNumber.length !== 13) {
      throw new Error('เบอร์พร้อมเพย์ต้องเป็นเบอร์โทรศัพท์ 10 หลัก หรือเลขบัตรประชาชน 13 หลัก')
    }
  }
}

/**
 * Fetches store settings, falling back to defaults if not found
 */
export async function fetchSettings(): Promise<Settings> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('settings')
    .select('*')
    .limit(1)
    .maybeSingle()

  if (error && error.code !== 'PGRST116') {
    console.error('fetchSettings error:', error)
    return DEFAULT_SETTINGS
  }

  if (!data) {
    return DEFAULT_SETTINGS
  }

  return {
    id: data.id,
    store_name: data.store_name || DEFAULT_SETTINGS.store_name,
    store_description: data.store_description || DEFAULT_SETTINGS.store_description,
    store_phone: data.store_phone || DEFAULT_SETTINGS.store_phone,
    store_address: data.store_address || DEFAULT_SETTINGS.store_address,
    promptpay_number: data.promptpay_number || DEFAULT_SETTINGS.promptpay_number,
    primary_color: data.primary_color || DEFAULT_SETTINGS.primary_color,
    is_open: data.is_open ?? true,
    updated_at: data.updated_at || new Date().toISOString(),
  }
}

/**
 * Updates or creates settings with admin authorization verification
 */
export async function updateSettings(
  payload: Partial<Omit<Settings, 'id' | 'updated_at'>>
): Promise<Settings> {
  // 1. Client & Server validation
  validateSettingsPayload(payload)

  // 2. Admin authorization check
  const { data: userData, error: authError } = await supabase.auth.getUser()
  if (authError || !userData?.user) {
    throw new Error('ไม่ได้รับอนุญาต: กรุณาเข้าสู่ระบบในฐานะผู้ดูแลระบบ (Unauthorized: Admin login required)')
  }

  // 3. Find existing row
  const { data: existing } = await supabase
    .from('settings')
    .select('id')
    .limit(1)
    .maybeSingle()

  const cleanPayload = {
    ...payload,
    store_name: payload.store_name?.trim(),
    store_description: payload.store_description?.trim() || null,
    store_phone: payload.store_phone?.trim() || null,
    store_address: payload.store_address?.trim() || null,
    promptpay_number: payload.promptpay_number?.trim() || null,
    updated_at: new Date().toISOString(),
  }

  if (existing) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('settings')
      .update(cleanPayload)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .eq('id', (existing as any).id)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('settings')
      .insert({
        ...DEFAULT_SETTINGS,
        ...cleanPayload,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }
}
