import { supabase } from '@/lib/supabase'
import type { Promotion, PromotionType } from '@/types/database'

export async function fetchPromotions(): Promise<Promotion[]> {
  const { data, error } = await (supabase as any)
    .from('promotions')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function fetchActivePromotions(): Promise<Promotion[]> {
  const { data, error } = await (supabase as any)
    .from('promotions')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) throw error
  
  const now = new Date()
  return (data as Promotion[]).filter(promo => {
    if (promo.start_date && new Date(promo.start_date) > now) return false
    if (promo.end_date && new Date(promo.end_date) < now) return false
    return true
  })
}

export async function createPromotion(payload: Omit<Promotion, 'id' | 'created_at'>): Promise<Promotion> {
  const { data, error } = await (supabase as any)
    .from('promotions')
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updatePromotion(id: string, payload: Partial<Omit<Promotion, 'id' | 'created_at'>>): Promise<Promotion> {
  const { data, error } = await (supabase as any)
    .from('promotions')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deletePromotion(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('promotions')
    .delete()
    .eq('id', id)

  if (error) throw error
}
