import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Store,
  Palette,
  Phone,
  MapPin,
  FileText,
  QrCode,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { fetchSettings, updateSettings } from '@/services/settings'

export default function SettingsPage() {
  const queryClient = useQueryClient()

  // Form State
  const [storeName, setStoreName] = useState('')
  const [storeDescription, setStoreDescription] = useState('')
  const [storePhone, setStorePhone] = useState('')
  const [storeAddress, setStoreAddress] = useState('')
  const [promptpayNumber, setPromptpayNumber] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#f48c2e')
  const [isOpen, setIsOpen] = useState(true)

  // Status & Feedback
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: fetchSettings,
  })

  // Populate form with loaded settings
  useEffect(() => {
    if (settings) {
      setStoreName(settings.store_name || '')
      setStoreDescription(settings.store_description || '')
      setStorePhone(settings.store_phone || '')
      setStoreAddress(settings.store_address || '')
      setPromptpayNumber(settings.promptpay_number || '')
      setPrimaryColor(settings.primary_color || '#f48c2e')
      setIsOpen(settings.is_open ?? true)
    }
  }, [settings])

  // Track if changes have been made
  const isDirty = useMemo(() => {
    if (!settings) return false
    return (
      storeName !== (settings.store_name || '') ||
      storeDescription !== (settings.store_description || '') ||
      storePhone !== (settings.store_phone || '') ||
      storeAddress !== (settings.store_address || '') ||
      promptpayNumber !== (settings.promptpay_number || '') ||
      primaryColor !== (settings.primary_color || '#f48c2e') ||
      isOpen !== (settings.is_open ?? true)
    )
  }, [settings, storeName, storeDescription, storePhone, storeAddress, promptpayNumber, primaryColor, isOpen])

  const handleReset = () => {
    if (settings) {
      setStoreName(settings.store_name || '')
      setStoreDescription(settings.store_description || '')
      setStorePhone(settings.store_phone || '')
      setStoreAddress(settings.store_address || '')
      setPromptpayNumber(settings.promptpay_number || '')
      setPrimaryColor(settings.primary_color || '#f48c2e')
      setIsOpen(settings.is_open ?? true)
      setErrorMessage('')
      setSuccessMessage('')
    }
  }

  const mutation = useMutation({
    mutationFn: async () => {
      setErrorMessage('')
      setSuccessMessage('')
      return await updateSettings({
        store_name: storeName,
        store_description: storeDescription,
        store_phone: storePhone,
        store_address: storeAddress,
        promptpay_number: promptpayNumber,
        primary_color: primaryColor,
        is_open: isOpen,
      })
    },
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: ['admin-settings'] })
      void queryClient.invalidateQueries({ queryKey: ['settings'] })
      void queryClient.invalidateQueries({ queryKey: ['website'] })
      setSuccessMessage('บันทึกการตั้งค่าเรียบร้อยแล้ว (Settings saved successfully!)')
      setTimeout(() => setSuccessMessage(''), 4000)
    },
    onError: (err: Error) => {
      setErrorMessage(err.message || 'เกิดข้อผิดพลาดในการบันทึกการตั้งค่า')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate()
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--primary))]" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">ตั้งค่าร้านค้า (Store Settings)</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            จัดการข้อมูลพื้นฐาน สถานะร้าน และการชำระเงินของระบบ
          </p>
        </div>
        {isDirty && (
          <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก
          </span>
        )}
      </div>

      {/* Notifications */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-2xl border border-emerald-500/30 bg-emerald-50/90 dark:bg-emerald-950/40 p-4 text-sm font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2.5 shadow-sm"
          >
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{successMessage}</span>
          </motion.div>
        )}

        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-2xl border border-rose-500/30 bg-rose-50/90 dark:bg-rose-950/40 p-4 text-sm font-semibold text-rose-800 dark:text-rose-300 flex items-center gap-2.5 shadow-sm"
          >
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{errorMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Store Status Toggle */}
        <div
          className={`rounded-3xl border p-6 shadow-sm transition-all ${
            isOpen
              ? 'border-emerald-500/30 bg-emerald-500/5'
              : 'border-rose-500/30 bg-rose-500/5'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                  isOpen
                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400'
                    : 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400'
                }`}
              >
                <Store className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-base text-[hsl(var(--foreground))]">สถานะการเปิดร้าน (Store Status)</h2>
                  <span
                    className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                      isOpen
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                    }`}
                  >
                    {isOpen ? 'เปิดให้บริการ (Open)' : 'ปิดร้านชั่วคราว (Closed)'}
                  </span>
                </div>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                  {isOpen
                    ? 'ลูกค้าสามารถเลือกดูเมนูและสั่งซื้อสินค้าได้ตามปกติ'
                    : 'ลูกค้าจะไม่สามารถสั่งซื้อสินค้าได้ และจะแสดงแถบแจ้งเตือนปิดร้าน'}
                </p>
              </div>
            </div>

            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={isOpen}
                onChange={(e) => setIsOpen(e.target.checked)}
                className="peer sr-only"
              />
              <div className="peer h-7 w-13 rounded-full bg-[hsl(var(--muted))] after:absolute after:left-[3px] after:top-[3px] after:h-5.5 after:w-5.5 after:rounded-full after:bg-white after:shadow-md after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-6 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800" />
            </label>
          </div>
        </div>

        {/* 2. Store Profile & Info */}
        <div className="rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-[hsl(var(--border))]">
            <FileText className="h-5 w-5 text-[hsl(var(--primary))]" />
            <h2 className="font-bold text-base text-[hsl(var(--foreground))]">ข้อมูลร้านค้าทั่วไป (Store Profile)</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-semibold text-[hsl(var(--foreground))]">
                ชื่อร้านค้า (Store Name) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="เช่น OrderTee"
                className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3.5 py-2.5 text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              />
              <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                แสดงบนแถบนำทาง แถบหัวข้อหน้าเว็บ และใบเสร็จ
              </p>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-semibold text-[hsl(var(--foreground))]">
                คำโปรย / คำอธิบายร้านค้า (Store Tagline / Description)
              </label>
              <textarea
                rows={2}
                value={storeDescription}
                onChange={(e) => setStoreDescription(e.target.value)}
                placeholder="เช่น ร้านชาและเครื่องดื่ม สดชื่นทุกแก้ว ทำสดใหม่ทุกวัน..."
                className="w-full resize-none rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3.5 py-2.5 text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[hsl(var(--foreground))] flex items-center gap-1.5">
                <Phone className="h-4 w-4 text-[hsl(var(--primary))]" /> เบอร์โทรติดต่อร้านค้า (Contact Phone)
              </label>
              <input
                type="tel"
                value={storePhone}
                onChange={(e) => setStorePhone(e.target.value)}
                placeholder="เช่น 0616080720"
                className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3.5 py-2.5 text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[hsl(var(--foreground))] flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-[hsl(var(--primary))]" /> ที่อยู่หน้าร้าน / จุดรับ (Store Address)
              </label>
              <input
                type="text"
                value={storeAddress}
                onChange={(e) => setStoreAddress(e.target.value)}
                placeholder="เช่น อาคารหลัก ร้านค้า OrderTee"
                className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3.5 py-2.5 text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              />
            </div>
          </div>
        </div>

        {/* 3. Payment & PromptPay Settings */}
        <div className="rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-[hsl(var(--border))]">
            <QrCode className="h-5 w-5 text-[hsl(var(--primary))]" />
            <h2 className="font-bold text-base text-[hsl(var(--foreground))]">การชำระเงิน (PromptPay Configuration)</h2>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-[hsl(var(--foreground))]">
              เบอร์พร้อมเพย์สำหรับรับเงิน (PromptPay Recipient Number) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={promptpayNumber}
              onChange={(e) => setPromptpayNumber(e.target.value)}
              placeholder="0616080720"
              className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3.5 py-2.5 text-sm font-mono text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
            />
            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
              เบอร์โทรศัพท์ 10 หลัก หรือเลขประจำตัวประชาชน 13 หลัก ที่ลงทะเบียนพร้อมเพย์ เพื่อใช้สร้าง QR Code ชำระเงินในหน้า Checkout
            </p>
          </div>
        </div>

        {/* 4. Branding & Theme */}
        <div className="rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-[hsl(var(--border))]">
            <Palette className="h-5 w-5 text-[hsl(var(--primary))]" />
            <h2 className="font-bold text-base text-[hsl(var(--foreground))]">ธีมและสีแบรนด์ (Branding Color)</h2>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-[hsl(var(--foreground))]">
              สีหลักของร้านค้า (Primary Brand Color)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-11 w-16 cursor-pointer rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-1"
              />
              <input
                type="text"
                required
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="#f48c2e"
                className="w-36 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              />
              <div
                className="h-11 flex-1 rounded-xl flex items-center justify-center text-xs font-bold text-white shadow-sm"
                style={{ backgroundColor: primaryColor }}
              >
                ตัวอย่างสีแบรนด์ (Preview)
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {isDirty && (
            <button
              type="button"
              onClick={handleReset}
              disabled={mutation.isPending}
              className="flex items-center gap-1.5 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-5 py-3 text-sm font-semibold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] transition-colors disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" /> คืนค่า
            </button>
          )}

          <button
            type="submit"
            disabled={mutation.isPending || !isDirty}
            className="flex items-center gap-2 rounded-2xl bg-[hsl(var(--primary))] px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-[hsl(var(--primary))]/20 hover:bg-[hsl(var(--primary))]/90 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> กำลังบันทึก...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> บันทึกการตั้งค่า (Save Settings)
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
