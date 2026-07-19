import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Store } from 'lucide-react'
import { fetchSettings, updateSettings } from '@/services/settings'

export default function SettingsPage() {
  const queryClient = useQueryClient()
  
  const [storeName, setStoreName] = useState('')
  const [primaryColor, setPrimaryColor] = useState('')
  const [isOpen, setIsOpen] = useState(true)

  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: fetchSettings,
  })

  useEffect(() => {
    if (settings) {
      setStoreName(settings.store_name)
      setPrimaryColor(settings.primary_color)
      setIsOpen(settings.is_open)
    }
  }, [settings])

  const mutation = useMutation({
    mutationFn: async () => {
      await updateSettings({
        store_name: storeName,
        primary_color: primaryColor,
        is_open: isOpen,
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-settings'] })
      void queryClient.invalidateQueries({ queryKey: ['settings'] }) // update customer side too
      alert('Settings saved!')
    },
    onSettled: () => setIsSubmitting(false)
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    mutation.mutate()
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--primary))]" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">Store Settings</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Manage core platform settings.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Store Status toggle (most important) */}
        <div className={`rounded-2xl border p-6 shadow-sm transition-colors ${isOpen ? 'border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/10' : 'border-destructive/30 bg-destructive/5 dark:bg-destructive/10'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${isOpen ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400' : 'bg-destructive/10 text-destructive'}`}>
                <Store className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-[hsl(var(--foreground))]">Store Status</h2>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  {isOpen ? 'Store is open. Customers can place orders.' : 'Store is closed. Ordering is disabled.'}
                </p>
              </div>
            </div>
            
            <label className="relative inline-flex cursor-pointer items-center">
              <input type="checkbox" checked={isOpen} onChange={(e) => setIsOpen(e.target.checked)} className="peer sr-only" />
              <div className="peer h-6 w-11 rounded-full bg-[hsl(var(--muted))] after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 dark:border-gray-600 dark:bg-gray-700 dark:peer-focus:ring-emerald-800"></div>
            </label>
          </div>
        </div>

        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Store className="h-5 w-5 text-[hsl(var(--primary))]" />
            <h2 className="font-semibold text-[hsl(var(--foreground))]">ข้อมูลร้านค้า</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]">ชื่อร้านค้า</label>
              <input
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              />
              <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">ชื่อนี้จะแสดงบนแถบนำทางและใบเสร็จ</p>
            </div>
            
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]">สีหลัก (รหัสสี Hex)</label>
              <div className="flex gap-3">
                <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="h-10 w-16 cursor-pointer rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-1" />
                <input type="text" required value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="flex-1 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]" />
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
