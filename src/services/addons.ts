import { supabase } from '@/lib/supabase'
import type { AddonGroup, AddonOption } from '@/types/database'

export type AddonGroupWithOptions = AddonGroup & {
  addon_options: AddonOption[]
}

export async function fetchAddonGroups(): Promise<AddonGroupWithOptions[]> {
  const { data, error } = await supabase
    .from('addon_groups')
    .select(`
      *,
      addon_options(*)
    `)
    .order('sort_order', { ascending: true })

  if (error) throw error

  // Sort options inside each group
  return (data as unknown as AddonGroupWithOptions[]).map((group) => ({
    ...group,
    addon_options: [...(group.addon_options ?? [])].sort((a, b) => a.sort_order - b.sort_order),
  }))
}

export async function createAddonGroup(
  group: Omit<AddonGroup, 'id' | 'created_at'>,
  options: Omit<AddonOption, 'id' | 'group_id' | 'created_at'>[]
): Promise<void> {
  // Insert group
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: newGroup, error: groupError } = await (supabase as any)
    .from('addon_groups')
    .insert(group)
    .select()
    .single()

  if (groupError || !newGroup) throw groupError

  // Insert options if any
  if (options.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: optionsError } = await (supabase as any)
      .from('addon_options')
      .insert(
        options.map((opt) => ({
          ...opt,
          group_id: newGroup.id,
        }))
      )
    if (optionsError) throw optionsError
  }
}

export async function updateAddonGroup(
  groupId: string,
  group: Partial<Omit<AddonGroup, 'id' | 'created_at'>>,
  options: Omit<AddonOption, 'id' | 'group_id' | 'created_at'>[]
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: groupError } = await (supabase as any)
    .from('addon_groups')
    .update(group)
    .eq('id', groupId)

  if (groupError) throw groupError

  // For simplicity, delete all old options and insert new ones
  // In a real prod app, you might want to diff them to preserve IDs, 
  // but since these are just config, recreating is fine and simpler.
  const { error: deleteError } = await supabase
    .from('addon_options')
    .delete()
    .eq('group_id', groupId)

  if (deleteError) throw deleteError

  if (options.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: optionsError } = await (supabase as any)
      .from('addon_options')
      .insert(
        options.map((opt) => ({
          ...opt,
          group_id: groupId,
        }))
      )
    if (optionsError) throw optionsError
  }
}

export async function deleteAddonGroup(groupId: string): Promise<void> {
  // Options delete cascade is handled by DB if configured, but let's be safe
  await supabase.from('addon_options').delete().eq('group_id', groupId)
  
  const { error } = await supabase
    .from('addon_groups')
    .delete()
    .eq('id', groupId)

  if (error) throw error
}
