import { supabase } from '@/lib/supabase'
import type { DeliveryLocation, DeliverySchedule } from '@/types/database'
import { getBangkokDateTime } from '@/lib/delivery-utils'

// ============================================================
// Delivery Locations
// ============================================================

export async function fetchDeliveryLocations(): Promise<DeliveryLocation[]> {
  const { data, error } = await supabase
    .from('delivery_locations')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as DeliveryLocation[]
}

export async function fetchActiveDeliveryLocations(): Promise<DeliveryLocation[]> {
  const { data, error } = await supabase
    .from('delivery_locations')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) throw error
  return data as DeliveryLocation[]
}

export async function createDeliveryLocation(payload: {
  name: string
  building?: string | null
  route_name?: string | null
  description?: string | null
  is_active?: boolean
}): Promise<DeliveryLocation> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('delivery_locations')
    .insert({
      name: payload.name.trim(),
      building: payload.building?.trim() || null,
      route_name: payload.route_name?.trim() || null,
      description: payload.description?.trim() || null,
      is_active: payload.is_active ?? true,
    })
    .select()
    .single()

  if (error) throw error
  return data as DeliveryLocation
}

export async function updateDeliveryLocation(
  id: string,
  payload: Partial<Omit<DeliveryLocation, 'id' | 'created_at' | 'updated_at'>>
): Promise<DeliveryLocation> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('delivery_locations')
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as DeliveryLocation
}

export async function deleteDeliveryLocation(id: string): Promise<void> {
  const { error } = await supabase
    .from('delivery_locations')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ============================================================
// Delivery Schedules
// ============================================================

export async function fetchDeliverySchedules(): Promise<DeliverySchedule[]> {
  const { data, error } = await supabase
    .from('delivery_schedules')
    .select('*')
    .order('delivery_date', { ascending: true })

  if (error) throw error
  return data as DeliverySchedule[]
}

/**
 * Fetches active upcoming delivery schedules strictly after today
 */
export async function fetchActiveUpcomingSchedules(): Promise<DeliverySchedule[]> {
  const { dateString: todayString } = getBangkokDateTime()

  const { data, error } = await supabase
    .from('delivery_schedules')
    .select('*')
    .eq('is_active', true)
    .gt('delivery_date', todayString)
    .order('delivery_date', { ascending: true })

  if (error) throw error
  return (data || []) as DeliverySchedule[]
}

export async function createDeliverySchedule(payload: {
  delivery_date: string
  location_id?: string | null
  location_name: string
  building?: string | null
  route_name?: string | null
  description?: string | null
  is_active?: boolean
}): Promise<DeliverySchedule> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('delivery_schedules')
    .insert({
      delivery_date: payload.delivery_date,
      location_id: payload.location_id || null,
      location_name: payload.location_name.trim(),
      building: payload.building?.trim() || null,
      route_name: payload.route_name?.trim() || null,
      description: payload.description?.trim() || null,
      is_active: payload.is_active ?? true,
    })
    .select()
    .single()

  if (error) throw error
  return data as DeliverySchedule
}

export async function updateDeliverySchedule(
  id: string,
  payload: Partial<Omit<DeliverySchedule, 'id' | 'created_at' | 'updated_at' | 'location'>>
): Promise<DeliverySchedule> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('delivery_schedules')
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as DeliverySchedule
}

export async function deleteDeliverySchedule(id: string): Promise<void> {
  const { error } = await supabase
    .from('delivery_schedules')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ============================================================
// Bulk Operations
// ============================================================

export interface BulkScheduleResult {
  totalSuccess: number
  createdCount: number
  updatedCount: number
  errors: { date: string; reason: string }[]
}

/**
 * Bulk create or update delivery schedules across multiple dates
 * Safe against duplicate records for same date + location.
 */
export async function bulkCreateOrUpdateDeliverySchedules(
  dates: string[],
  payload: {
    location_id?: string | null
    location_name: string
    building?: string | null
    route_name?: string | null
    description?: string | null
    is_active?: boolean
  }
): Promise<BulkScheduleResult> {
  const cleanDates = Array.from(new Set(dates)).sort()
  if (cleanDates.length === 0) {
    throw new Error('กรุณาเลือกวันที่อย่างน้อย 1 วัน')
  }

  if (!payload.location_name?.trim()) {
    throw new Error('กรุณาระบุชื่อสถานที่จัดส่ง')
  }

  // Validate all dates are strictly in future
  const { isStrictlyFutureDate } = await import('@/lib/delivery-utils')
  for (const d of cleanDates) {
    if (!isStrictlyFutureDate(d)) {
      throw new Error(`วันที่ ${d} ไม่ใช่วันในอนาคต (ต้องเป็นวันหลังจากวันนี้เป็นต้นไป)`)
    }
  }

  // Fetch existing schedules on these dates
  const { data: existingSchedules = [], error: fetchError } = await supabase
    .from('delivery_schedules')
    .select('*')
    .in('delivery_date', cleanDates)

  if (fetchError) throw fetchError

  let createdCount = 0
  let updatedCount = 0
  const errors: { date: string; reason: string }[] = []

  for (const dateStr of cleanDates) {
    try {
      const schedulesList = (existingSchedules || []) as DeliverySchedule[]
      const existing: DeliverySchedule | undefined = schedulesList.find((s) => {
        const sameDate = s.delivery_date === dateStr
        const sameLocId = payload.location_id && s.location_id === payload.location_id
        const sameLocName = s.location_name.toLowerCase().trim() === payload.location_name.toLowerCase().trim()
        return sameDate && (sameLocId || sameLocName)
      })

      if (existing) {
        // Update existing schedule
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: updErr } = await (supabase as any)
          .from('delivery_schedules')
          .update({
            location_id: payload.location_id || existing.location_id || null,
            location_name: payload.location_name.trim(),
            building: payload.building?.trim() || null,
            route_name: payload.route_name?.trim() || null,
            description: payload.description?.trim() || null,
            is_active: payload.is_active ?? true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)

        if (updErr) throw updErr
        updatedCount++
      } else {
        // Insert new schedule
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: insErr } = await (supabase as any)
          .from('delivery_schedules')
          .insert({
            delivery_date: dateStr,
            location_id: payload.location_id || null,
            location_name: payload.location_name.trim(),
            building: payload.building?.trim() || null,
            route_name: payload.route_name?.trim() || null,
            description: payload.description?.trim() || null,
            is_active: payload.is_active ?? true,
          })

        if (insErr) throw insErr
        createdCount++
      }
    } catch (err: any) {
      errors.push({ date: dateStr, reason: err.message || 'บันทึกไม่สำเร็จ' })
    }
  }

  return {
    totalSuccess: createdCount + updatedCount,
    createdCount,
    updatedCount,
    errors,
  }
}

/**
 * Bulk toggle active/inactive for all schedules on given dates
 */
export async function bulkUpdateSchedulesStatus(dates: string[], isActive: boolean): Promise<number> {
  if (dates.length === 0) return 0

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('delivery_schedules')
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .in('delivery_date', dates)
    .select('id')

  if (error) throw error
  return (data || []).length
}

/**
 * Bulk delete schedules for multiple dates
 */
export async function bulkDeleteSchedulesByDates(dates: string[]): Promise<number> {
  if (dates.length === 0) return 0

  const { data, error } = await supabase
    .from('delivery_schedules')
    .delete()
    .in('delivery_date', dates)
    .select('id')

  if (error) throw error
  return (data || []).length
}

