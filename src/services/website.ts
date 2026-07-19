import { supabase } from '@/lib/supabase'
import type { Website } from '@/types/database'

export async function fetchWebsite(): Promise<Website | null> {
  const { data, error } = await supabase
    .from('website')
    .select('*')
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw error
  }
  
  return data
}

export async function updateWebsite(payload: Partial<Omit<Website, 'id' | 'updated_at'>>): Promise<Website> {
  // Try to get the existing record
  const { data: existing } = await supabase.from('website').select('id').limit(1).maybeSingle()
  
  if (existing) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('website')
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
      .from('website')
      .insert({ ...payload })
      .select()
      .single()
      
    if (error) throw error
    return data
  }
}
