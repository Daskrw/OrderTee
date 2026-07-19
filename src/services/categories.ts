import { supabase } from '@/lib/supabase'
import type { Category } from '@/types/database'

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_visible', true)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function fetchAdminCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function createCategory(category: Omit<Category, 'id' | 'created_at'>): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('categories').insert(category)
  if (error) throw error
}

export async function updateCategory(id: string, category: Partial<Omit<Category, 'id' | 'created_at'>>): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('categories').update(category).eq('id', id)
  if (error) throw error
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) throw error
}

