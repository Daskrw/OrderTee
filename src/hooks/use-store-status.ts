import { useQuery } from '@tanstack/react-query'
import { fetchSettings, DEFAULT_SETTINGS } from '@/services/settings'
import type { Settings } from '@/types/database'

export function useStoreStatus() {
  const { data: settings = DEFAULT_SETTINGS, isLoading } = useQuery<Settings>({
    queryKey: ['settings'],
    queryFn: fetchSettings,
    staleTime: 1000 * 30, // 30 seconds fresh cache
  })

  return {
    isOpen: settings?.is_open ?? true,
    storeName: settings?.store_name ?? 'OrderTee',
    storeDescription: settings?.store_description ?? 'ร้านชาและเครื่องดื่ม สดชื่นทุกแก้ว',
    storePhone: settings?.store_phone ?? '0616080720',
    storeAddress: settings?.store_address ?? 'อาคารหลัก ร้านค้า OrderTee',
    promptpayNumber: settings?.promptpay_number ?? '0616080720',
    primaryColor: settings?.primary_color ?? '#f48c2e',
    isLoading,
    settings,
  }
}
