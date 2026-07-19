import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Settings } from '@/types/database'

export function useStoreStatus() {
  const { data: settings, isLoading } = useQuery<Settings | null>({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .limit(1)
        .single()

      if (error) {
        // If no settings row exists yet, default to open
        return { id: '', store_name: 'OrderTee', primary_color: '#f48c2e', is_open: true, updated_at: '' }
      }
      return data
    },
  })

  return {
    isOpen: settings?.is_open ?? true,
    storeName: settings?.store_name ?? 'OrderTee',
    primaryColor: settings?.primary_color ?? '#f48c2e',
    isLoading,
    settings,
  }
}
