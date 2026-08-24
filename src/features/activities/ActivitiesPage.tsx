import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Trophy,
  Upload,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Gift,
  Phone,
  User,
  Search,
  Loader2,
  ImageIcon,
  MessageCircle,
  AlertCircle,
  ExternalLink,
  Flame,
} from 'lucide-react'
import {
  fetchActivities,
  uploadActivityImage,
  submitActivityEntry,
  fetchCustomerProgress,
  fetchPublicGallery,
  fetchActivityLeaderboard,
} from '@/services/activities'
import type { Activity } from '@/types/database'

export default function ActivitiesPage() {
  const queryClient = useQueryClient()

  const { data: activities = [], isLoading: isActivitiesLoading } = useQuery({
    queryKey: ['public-activities'],
    queryFn: () => fetchActivities(true),
  })

  const [selectedActivityId, setSelectedActivityId] = useState<string>('')
  const activeActivity: Activity | undefined =
    activities.find((a) => a.id === selectedActivityId) || activities[0]

  // Submission Form State
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState(false)

  // Progress Tracker State
  const [lookupPhone, setLookupPhone] = useState('')
  const [activeTrackingPhone, setActiveTrackingPhone] = useState('')

  // Query Customer Progress
  const { data: customerProgress, isLoading: isProgressLoading } = useQuery({
    queryKey: ['customer-activity-progress', activeActivity?.id, activeTrackingPhone],
    queryFn: () =>
      activeActivity && activeTrackingPhone
        ? fetchCustomerProgress(activeActivity.id, activeTrackingPhone, activeActivity.required_items)
        : Promise.resolve(null),
    enabled: !!activeActivity && !!activeTrackingPhone,
  })

  // Query Public Gallery
  const { data: gallery = [] } = useQuery({
    queryKey: ['activity-gallery', activeActivity?.id],
    queryFn: () => (activeActivity ? fetchPublicGallery(activeActivity.id) : Promise.resolve([])),
    enabled: !!activeActivity && activeActivity.show_gallery,
  })

  // Query Leaderboard
  const { data: leaderboard = [] } = useQuery({
    queryKey: ['activity-leaderboard', activeActivity?.id],
    queryFn: () =>
      activeActivity ? fetchActivityLeaderboard(activeActivity.id, activeActivity.required_items) : Promise.resolve([]),
    enabled: !!activeActivity && activeActivity.show_leaderboard,
  })

  // Handle Photo Selection
  const handleFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSubmitError('')
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp']
    const validFiles: File[] = []
    const newPreviews: string[] = []

    for (const f of files) {
      if (!allowedMimes.includes(f.type.toLowerCase())) {
        setSubmitError('อนุญาตเฉพาะไฟล์รูปภาพ JPG, PNG, WEBP เท่านั้น')
        continue
      }
      if (f.size > 5 * 1024 * 1024) {
        setSubmitError('ไฟล์รูปภาพต้องมีขนาดไม่เกิน 5 MB ต่อรูป')
        continue
      }
      validFiles.push(f)
      newPreviews.push(URL.createObjectURL(f))
    }

    setSelectedFiles((prev) => [...prev, ...validFiles])
    setPreviewUrls((prev) => [...prev, ...newPreviews])
  }

  const removeSelectedPhoto = (index: number) => {
    URL.revokeObjectURL(previewUrls[index])
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index))
  }

  // Handle Form Submission
  const handleSubmitEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError('')
    setSubmitSuccess(false)

    if (!activeActivity) return

    if (!customerName.trim() || customerName.trim().length < 2) {
      setSubmitError('กรุณากรอกชื่ออย่างน้อย 2 ตัวอักษร')
      return
    }

    const cleanPhone = customerPhone.replace(/\D/g, '')
    if (cleanPhone.length < 9) {
      setSubmitError('กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง (อย่างน้อย 9 หลัก)')
      return
    }

    if (selectedFiles.length === 0) {
      setSubmitError('กรุณาเลือกรูปภาพอย่างน้อย 1 รูป')
      return
    }

    try {
      setIsUploading(true)

      // Upload all files
      const uploadedUrls: string[] = []
      for (const file of selectedFiles) {
        const url = await uploadActivityImage(file)
        uploadedUrls.push(url)
      }

      // Submit entry
      await submitActivityEntry({
        activityId: activeActivity.id,
        customerName: customerName.trim(),
        customerPhone: cleanPhone,
        images: uploadedUrls,
      })

      setSubmitSuccess(true)
      setSelectedFiles([])
      setPreviewUrls([])

      // Automatically set tracking phone to show updated progress!
      setActiveTrackingPhone(cleanPhone)
      setLookupPhone(cleanPhone)

      void queryClient.invalidateQueries({ queryKey: ['customer-activity-progress'] })
    } catch (err: any) {
      setSubmitError(err.message || 'ส่งผลงานไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
    } finally {
      setIsUploading(false)
    }
  }

  const handleLookupProgress = (e: React.FormEvent) => {
    e.preventDefault()
    const clean = lookupPhone.replace(/\D/g, '')
    if (clean.length >= 9) {
      setActiveTrackingPhone(clean)
    }
  }

  if (isActivitiesLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--primary))]" />
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]">
          <Sparkles className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">เร็วๆ นี้ พบกับกิจกรรมสะสมรางวัล</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          ทางร้านกำลังเตรียมแคมเปญสุดพิเศษให้ลูกค้าได้ร่วมสนุกและรับส่วนลด ติดตามได้เร็วๆ นี้!
        </p>
      </div>
    )
  }

  const requiredCount = activeActivity?.required_items ?? 5
  const approvedCount = customerProgress?.uniqueApprovedItemsCount ?? 0
  const progressPercent = Math.min(100, Math.round((approvedCount / requiredCount) * 100))

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">
      {/* Activity Selector if multiple activities */}
      {activities.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {activities.map((act) => (
            <button
              key={act.id}
              onClick={() => {
                setSelectedActivityId(act.id)
                setSubmitSuccess(false)
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                (activeActivity?.id === act.id)
                  ? 'bg-[hsl(var(--primary))] text-white shadow-md'
                  : 'bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--primary))]'
              }`}
            >
              {act.title}
            </button>
          ))}
        </div>
      )}

      {/* Hero / Campaign Header */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm"
      >
        {activeActivity?.cover_image && (
          <div className="aspect-[21/9] w-full overflow-hidden bg-black/5">
            <img
              src={activeActivity.cover_image}
              alt={activeActivity.title}
              className="h-full w-full object-cover"
            />
          </div>
        )}

        <div className="p-6 sm:p-8 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--primary))]/10 px-3 py-1 text-xs font-bold text-[hsl(var(--primary))]">
              <Sparkles className="h-3.5 w-3.5" /> แคมเปญสะสมไอเทม
            </span>
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              เป้าหมาย: สะสมครบ {activeActivity?.required_items} แบบ
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-[hsl(var(--foreground))]">
            {activeActivity?.title}
          </h1>

          {activeActivity?.description && (
            <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
              {activeActivity.description}
            </p>
          )}

          {/* Reward Box */}
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 sm:p-5 flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-md shadow-amber-500/20">
              <Gift className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider block">
                ของรางวัลเมื่อสะสมครบ {activeActivity?.required_items} ไอเทม:
              </span>
              <p className="text-sm sm:text-base font-extrabold text-[hsl(var(--foreground))] mt-0.5">
                {activeActivity?.reward_description}
              </p>
              {activeActivity?.contact_info && (
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                  ช่องทางรับสิทธิ์: {activeActivity.contact_info}
                </p>
              )}
            </div>
          </div>

          {/* Rules & Instructions */}
          {activeActivity?.instructions && (
            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/20 p-4 space-y-2">
              <span className="text-xs font-bold text-[hsl(var(--foreground))] block">
                กติกาและขั้นตอนการร่วมสนุก:
              </span>
              <div className="text-xs text-[hsl(var(--muted-foreground))] whitespace-pre-line leading-relaxed">
                {activeActivity.instructions}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Main Grid: Upload Form + Progress Tracker */}
      <div className="grid gap-8 lg:grid-cols-2 items-start">
        {/* SECTION 1: Submission Form */}
        <div className="rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-sm space-y-5">
          <div className="border-b border-[hsl(var(--border))] pb-3">
            <h2 className="text-lg font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
              <Upload className="h-5 w-5 text-[hsl(var(--primary))]" /> ส่งภาพถ่ายร่วมกิจกรรม
            </h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
              อัปโหลดภาพถ่ายสินค้าหรือคำคมที่ได้รับ (สามารถอัปโหลดได้หลายภาพ)
            </p>
          </div>

          {/* Success Banner */}
          <AnimatePresence>
            {submitSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="rounded-2xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40 p-4 text-xs font-medium text-emerald-800 dark:text-emerald-300 space-y-1"
              >
                <div className="flex items-center gap-2 font-bold text-sm text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                  <span>ส่งผลงานเข้าร่วมกิจกรรมสำเร็จ!</span>
                </div>
                <p>
                  ระบบได้รับรูปภาพของคุณเรียบร้อยแล้ว แอดมินจะทำการตรวจสอบความถูกต้องและอนุมัติไอเทมให้คุณ
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmitEntry} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-[hsl(var(--foreground))] flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-[hsl(var(--primary))]" /> ชื่อของคุณ (Customer Name) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="เช่น สมชาย ใจดี"
                className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-[hsl(var(--foreground))] flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-[hsl(var(--primary))]" /> เบอร์โทรศัพท์ (Phone Number) <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                required
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="เช่น 0812345678"
                className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              />
              <p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">
                * ใช้สำหรับบันทึกและตรวจสอบการสะสมไอเทม (เบอร์โทรจะไม่ถูกแสดงต่อสาธารณะ)
              </p>
            </div>

            {/* Photos Upload Dropzone */}
            <div>
              <label className="mb-1.5 block text-xs font-bold text-[hsl(var(--foreground))] flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5 text-[hsl(var(--primary))]" /> รูปภาพที่ต้องการส่ง (Upload Photos) <span className="text-rose-500">*</span>
              </label>

              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[hsl(var(--border))] bg-[hsl(var(--background))] p-5 text-center transition-all hover:border-[hsl(var(--primary))] hover:bg-[hsl(var(--accent))]/30">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] mb-2">
                  <Plus className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-[hsl(var(--foreground))]">
                  คลิกเพื่อเลือกภาพ หรือ ถ่ายรูปส่งเข้าร่วม
                </span>
                <span className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">
                  สามารถเลือกได้หลายรูปพร้อมกัน (JPG, PNG, WEBP ไม่เกิน 5MB)
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                  onChange={handleFilesSelect}
                  className="sr-only"
                />
              </label>

              {/* Photo Previews */}
              {previewUrls.length > 0 && (
                <div className="mt-3 space-y-2">
                  <span className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))]">
                    รูปภาพที่เลือก ({previewUrls.length} รูป):
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {previewUrls.map((url, idx) => (
                      <div
                        key={idx}
                        className="group relative aspect-square rounded-xl overflow-hidden border border-[hsl(var(--border))] bg-black/5"
                      >
                        <img src={url} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeSelectedPhoto(idx)}
                          className="absolute top-1 right-1 rounded-full bg-black/70 p-1 text-white hover:bg-rose-600 transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {submitError && (
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isUploading || selectedFiles.length === 0}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[hsl(var(--primary))] px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-[hsl(var(--primary))]/20 hover:bg-[hsl(var(--primary))]/90 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> กำลังอัปโหลดผลงาน...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" /> ส่งภาพถ่ายร่วมกิจกรรม
                </>
              )}
            </button>
          </form>
        </div>

        {/* SECTION 2: Progress Tracker */}
        <div className="rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-sm space-y-5">
          <div className="border-b border-[hsl(var(--border))] pb-3">
            <h2 className="text-lg font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" /> ตรวจสอบความคืบหน้าการสะสม
            </h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
              กรอกเบอร์โทรศัพท์ของคุณเพื่อดูจำนวนไอเทมที่สะสมได้
            </p>
          </div>

          {/* Lookup Form */}
          <form onSubmit={handleLookupProgress} className="flex gap-2">
            <input
              type="tel"
              value={lookupPhone}
              onChange={(e) => setLookupPhone(e.target.value)}
              placeholder="กรอกเบอร์โทร เช่น 0812345678"
              className="flex-1 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
            />
            <button
              type="submit"
              className="rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[hsl(var(--primary))]/90 transition-colors flex items-center gap-1.5"
            >
              <Search className="h-3.5 w-3.5" /> ตรวจสอบ
            </button>
          </form>

          {/* Progress Display */}
          {isProgressLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--primary))]" />
            </div>
          ) : activeTrackingPhone && customerProgress ? (
            <div className="space-y-4 pt-1">
              {/* Grand Completion Banner */}
              {customerProgress.isCompleted ? (
                <div className="rounded-2xl border-2 border-emerald-500 bg-emerald-500/10 p-5 text-center space-y-2 shadow-sm animate-bounce-short">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md">
                    <CheckCircle2 className="h-7 w-7" />
                  </div>
                  <h3 className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                    🎉 ยินดีด้วย! คุณสะสมครบ {requiredCount} ไอเทมแล้ว
                  </h3>
                  <p className="text-xs text-[hsl(var(--foreground))] font-semibold">
                    คุณได้รับสิทธิ์โปรโมชั่นพิเศษ: {activeActivity?.reward_description}
                  </p>
                  <div className="pt-2">
                    <span className="inline-block rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm">
                      {activeActivity?.contact_info || 'ติดต่อร้านเพื่อรับสิทธิ์ได้ทันที'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30 p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span>ความคืบหน้าของคุณ:</span>
                    <span className="text-[hsl(var(--primary))]">
                      {approvedCount} / {requiredCount} ไอเทมที่อนุมัติแล้ว
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="h-3 w-full rounded-full bg-[hsl(var(--muted))] overflow-hidden p-0.5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-500 to-[hsl(var(--primary))] transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                    {approvedCount === 0
                      ? 'ยังไม่มีไอเทมที่ได้รับการอนุมัติ ส่งผลงานและรอแอดมินตรวจเพื่อเริ่มสะสม!'
                      : `สะสมอีกเพียง ${requiredCount - approvedCount} แบบ จะได้รับรางวัลทันที!`}
                  </p>
                </div>
              )}

              {/* Badges / Items Checklist */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-[hsl(var(--foreground))] block">
                  รายการไอเทมสะสม:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {Array.from({ length: requiredCount }).map((_, idx) => {
                    const approvedTag = customerProgress.approvedItemTags[idx]
                    const isCollected = !!approvedTag

                    return (
                      <div
                        key={idx}
                        className={`rounded-xl border p-2.5 flex items-center gap-2 text-xs transition-all ${
                          isCollected
                            ? 'border-emerald-500/40 bg-emerald-500/10 font-bold text-emerald-700 dark:text-emerald-300'
                            : 'border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--muted-foreground))]'
                        }`}
                      >
                        {isCollected ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                        ) : (
                          <div className="h-4 w-4 shrink-0 rounded-full border-2 border-dashed border-[hsl(var(--muted-foreground))]/40" />
                        )}
                        <span className="truncate">
                          {isCollected ? approvedTag : `ไอเทมแบบที่ ${idx + 1}`}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Pending Count Indicator */}
              {customerProgress.pendingCount > 0 && (
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-2.5 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
                  <Clock className="h-4 w-4 shrink-0" />
                  <span>มี {customerProgress.pendingCount} ภาพที่กำลังอยู่ระหว่างการตรวจสอบ</span>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-[hsl(var(--muted-foreground))]">
              กรอกเบอร์โทรศัพท์เพื่อตรวจสอบจำนวนไอเทมสะสมของคุณ
            </div>
          )}
        </div>
      </div>

      {/* SECTION 3: Leaderboard (if enabled) */}
      {activeActivity?.show_leaderboard && leaderboard.length > 0 && (
        <div className="rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-3">
            <h2 className="text-lg font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
              <Flame className="h-5 w-5 text-amber-500" /> อันดับผู้สะสมไอเทมสูงสุด (Top Participants)
            </h2>
            <span className="text-xs text-[hsl(var(--muted-foreground))]">อัปเดตแบบเรียลไทม์</span>
          </div>

          <div className="grid sm:grid-cols-2 gap-2.5">
            {leaderboard.map((item) => (
              <div
                key={item.rank}
                className="flex items-center justify-between rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-3.5"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black ${
                      item.rank === 1
                        ? 'bg-amber-400 text-black shadow-sm'
                        : item.rank === 2
                        ? 'bg-slate-300 text-black'
                        : item.rank === 3
                        ? 'bg-amber-700/60 text-white'
                        : 'bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]'
                    }`}
                  >
                    #{item.rank}
                  </div>
                  <div>
                    <span className="text-sm font-bold text-[hsl(var(--foreground))] block">
                      {item.displayName}
                    </span>
                    {item.isCompleted && (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        ✓ สะสมครบ {requiredCount} ไอเทมแล้ว
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-sm font-black text-[hsl(var(--primary))]">
                    {item.approvedItemsCount} / {requiredCount}
                  </span>
                  <span className="text-[10px] text-[hsl(var(--muted-foreground))] block">ไอเทมที่ผ่านอนุมัติ</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 4: Public Submissions Gallery (if enabled) */}
      {activeActivity?.show_gallery && gallery.length > 0 && (
        <div className="rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-sm space-y-4">
          <div className="border-b border-[hsl(var(--border))] pb-3">
            <h2 className="text-lg font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[hsl(var(--primary))]" /> แกลเลอรี่ผลงานจากลูกค้า (Customer Gallery)
            </h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
              ภาพถ่ายสินค้าและคำคมที่ผ่านการอนุมัติแล้วจากเพื่อนๆ ลูกค้า
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {gallery.map((item) => (
              <div
                key={item.id}
                className="group relative overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] shadow-sm"
              >
                <div className="aspect-square overflow-hidden bg-black/5">
                  <img
                    src={item.images[0]}
                    alt={item.customerName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-2.5">
                  <span className="text-xs font-bold text-[hsl(var(--foreground))] truncate block">
                    {item.customerName}
                  </span>
                  {item.itemTag && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block truncate">
                      ✓ {item.itemTag}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
