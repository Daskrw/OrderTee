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
