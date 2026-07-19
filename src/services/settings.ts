import { supabase } from '@/lib/supabase'
import type { Settings } from '@/types/database'

export async function fetchSettings(): Promise<Settings | null> {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw error
  }
  
  return data
}

export async function updateSettings(payload: Partial<Omit<Settings, 'id' | 'updated_at'>>): Promise<Settings> {
  const { data: existing } = await supabase.from('settings').select('id').limit(1).maybeSingle()
  
  if (existing) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('settings')
      .update({ ...payload, updated_at: new Date().toISOString() })
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
      .insert({ ...payload, is_open: payload.is_open ?? true, primary_color: payload.primary_color ?? '#f59e0b', store_name: payload.store_name ?? 'Store' })
      .select()
      .single()
      
    if (error) throw error
    return data
  }
}
