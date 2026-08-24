import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Save,
  Globe,
  Tag,
  Sparkles,
  Users,
  Eye,
  Calendar,
  Gift,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import { fetchWebsite, updateWebsite } from '@/services/website'
import {
  fetchPromotions,
  createPromotion,
  updatePromotion,
  deletePromotion,
} from '@/services/promotions'
import {
  fetchActivities,
  createActivity,
  updateActivity,
  deleteActivity,
  fetchActivitySubmissions,
} from '@/services/activities'
import { PromotionFormDrawer } from './PromotionFormDrawer'
import { ActivityFormDrawer } from '../activities/ActivityFormDrawer'
import { ActivitySubmissionsDrawer } from '../activities/ActivitySubmissionsDrawer'
import type { Promotion, Activity } from '@/types/database'

export default function WebsitePage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'content' | 'promotions' | 'activities'>('activities')

  // Website Content State
  const [businessDescription, setBusinessDescription] = useState('')
  const [openingHours, setOpeningHours] = useState('')
  const [location, setLocation] = useState('')
  const [phone, setPhone] = useState('')
  const [facebook, setFacebook] = useState('')
  const [instagram, setInstagram] = useState('')
  const [line, setLine] = useState('')
  const [googleMapUrl, setGoogleMapUrl] = useState('')
  const [carouselImages, setCarouselImages] = useState<string[]>([])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploadingBanner, setIsUploadingBanner] = useState(false)

  // Promotion State
  const [promoDrawerOpen, setPromoDrawerOpen] = useState(false)
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null)
  const [isSavingPromo, setIsSavingPromo] = useState(false)

  // Activity State
  const [activityDrawerOpen, setActivityDrawerOpen] = useState(false)
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null)
  const [isSavingActivity, setIsSavingActivity] = useState(false)
  const [submissionsActivity, setSubmissionsActivity] = useState<Activity | null>(null)

  const { data: website, isLoading: isWebsiteLoading } = useQuery({
    queryKey: ['admin-website'],
    queryFn: fetchWebsite,
  })

  const { data: promotions = [], isLoading: isPromosLoading } = useQuery({
    queryKey: ['admin-promotions'],
    queryFn: fetchPromotions,
  })

  const { data: activities = [], isLoading: isActivitiesLoading } = useQuery({
    queryKey: ['admin-activities'],
    queryFn: () => fetchActivities(false),
  })

  // All submissions to compute pending badges
  const { data: allSubmissions = [] } = useQuery({
    queryKey: ['admin-all-submissions'],
    queryFn: () => fetchActivitySubmissions(),
  })

  useEffect(() => {
    if (website) {
      setBusinessDescription(website.business_description ?? '')
      setOpeningHours(website.opening_hours ?? '')
      setLocation(website.location ?? '')
      setPhone(website.phone ?? '')
      setFacebook(website.facebook ?? '')
      setInstagram(website.instagram ?? '')
      setLine(website.line ?? '')
      setGoogleMapUrl(website.google_map_url ?? '')
      setCarouselImages(website.carousel_images ?? [])
    }
  }, [website])

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setIsUploadingBanner(true)
      const file = e.target.files?.[0]
      if (!file) return

      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `banners/${fileName}`

      const { supabase } = await import('@/lib/supabase')
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('images').getPublicUrl(filePath)
      setCarouselImages((prev) => [...prev, data.publicUrl])
    } catch (error) {
      alert('Error uploading banner image!')
      console.error(error)
    } finally {
      setIsUploadingBanner(false)
    }
  }

  const removeBannerImage = (index: number) => {
    setCarouselImages((prev) => prev.filter((_, i) => i !== index))
  }

  const websiteMutation = useMutation({
    mutationFn: async () => {
      await updateWebsite({
        business_description: businessDescription || null,
        opening_hours: openingHours || null,
        location: location || null,
        phone: phone || null,
        facebook: facebook || null,
        instagram: instagram || null,
        line: line || null,
        google_map_url: googleMapUrl || null,
        carousel_images: carouselImages,
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-website'] })
      void queryClient.invalidateQueries({ queryKey: ['website'] })
      alert('Website content saved!')
    },
    onError: (error: any) => {
      console.error(error)
      alert(`Failed to save! Error: ${error?.message || 'Unknown error'}`)
    },
    onSettled: () => setIsSubmitting(false),
  })

  const handleWebsiteSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    websiteMutation.mutate()
  }

  // Promotion Handlers
  const handleSavePromo = async (payload: Omit<Promotion, 'id' | 'created_at'>) => {
    try {
      setIsSavingPromo(true)
      if (editingPromo) {
        await updatePromotion(editingPromo.id, payload)
      } else {
        await createPromotion(payload)
      }
      void queryClient.invalidateQueries({ queryKey: ['admin-promotions'] })
      setPromoDrawerOpen(false)
    } catch (error) {
      console.error(error)
      alert('Failed to save promotion')
    } finally {
      setIsSavingPromo(false)
    }
  }

  const handleDeletePromo = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promotion?')) return
    try {
      await deletePromotion(id)
      void queryClient.invalidateQueries({ queryKey: ['admin-promotions'] })
    } catch (error) {
      console.error(error)
      alert('Failed to delete promotion')
    }
  }

  // Activity Handlers
  const handleSaveActivity = async (payload: any) => {
    try {
      setIsSavingActivity(true)
      if (editingActivity) {
        await updateActivity(editingActivity.id, payload)
      } else {
        await createActivity(payload)
      }
      void queryClient.invalidateQueries({ queryKey: ['admin-activities'] })
      void queryClient.invalidateQueries({ queryKey: ['public-activities'] })
      setActivityDrawerOpen(false)
    } catch (error: any) {
      console.error(error)
      alert(error.message || 'บันทึกกิจกรรมไม่สำเร็จ')
    } finally {
      setIsSavingActivity(false)
    }
  }

  const handleDeleteActivity = async (id: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบกิจกรรมนี้? ผลงานและข้อมูลการเข้าร่วมทั้งหมดจะถูกลบด้วย')) return
    try {
      await deleteActivity(id)
      void queryClient.invalidateQueries({ queryKey: ['admin-activities'] })
      void queryClient.invalidateQueries({ queryKey: ['public-activities'] })
    } catch (error: any) {
      console.error(error)
      alert(error.message || 'ลบกิจกรรมไม่สำเร็จ')
    }
  }

  const openActivityForm = (activity?: Activity) => {
    setEditingActivity(activity || null)
    setActivityDrawerOpen(true)
  }

  const pendingSubmissionsCount = allSubmissions.filter((s) => s.status === 'pending').length

  if (isWebsiteLoading || isPromosLoading || isActivitiesLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--primary))]" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">Website Content & Promotions</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          จัดการเนื้อหาหน้าเว็บ ป้ายแบนเนอร์ โปรโมชั่น และกิจกรรมสะสมรางวัล (Activities)
        </p>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex gap-2 border-b border-[hsl(var(--border))] pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('activities')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors ${
            activeTab === 'activities'
              ? 'bg-[hsl(var(--primary))] text-white shadow-sm shadow-[hsl(var(--primary))]/20'
              : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))]'
          }`}
        >
          <Sparkles className="h-4 w-4" />
          <span>กิจกรรมสะสมของรางวัล (Activities)</span>
          {pendingSubmissionsCount > 0 && (
            <span className="ml-1 rounded-full bg-amber-400 text-black px-2 py-0.5 text-[10px] font-black">
              {pendingSubmissionsCount} รอตรวจ
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('promotions')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors ${
            activeTab === 'promotions'
              ? 'bg-[hsl(var(--primary))] text-white shadow-sm shadow-[hsl(var(--primary))]/20'
              : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))]'
          }`}
        >
          <Tag className="h-4 w-4" />
          <span>โปรโมชั่น (Promotions)</span>
          <span className="text-xs opacity-75">({promotions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('content')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors ${
            activeTab === 'content'
              ? 'bg-[hsl(var(--primary))] text-white shadow-sm shadow-[hsl(var(--primary))]/20'
              : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))]'
          }`}
        >
          <Globe className="h-4 w-4" />
          <span>เนื้อหาเว็บ & แบนเนอร์ (Content & Banners)</span>
        </button>
      </div>

      {/* TAB 1: ACTIVITIES */}
      {activeTab === 'activities' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[hsl(var(--foreground))]">กิจกรรมสำหรับลูกค้า (Campaigns & Challenges)</h2>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                ให้ลูกค้าอัปโหลดรูปภาพสินค้า/คำคม สะสมครบตามเป้าหมายเพื่อติดต่อรับโปรโมชั่น
              </p>
            </div>
            <button
              type="button"
              onClick={() => openActivityForm()}
              className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-[hsl(var(--primary))]/20 hover:bg-[hsl(var(--primary))]/90 transition-all"
            >
              <Plus className="h-4 w-4" />
              สร้างกิจกรรมใหม่
            </button>
          </div>

          {activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center rounded-2xl border-2 border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8">
              <Sparkles className="h-10 w-10 text-[hsl(var(--muted-foreground))]/40 mb-2" />
              <h3 className="font-bold text-[hsl(var(--foreground))]">ยังไม่มีกิจกรรม</h3>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 mb-4">
                สร้างกิจกรรมแรกเพื่อให้ลูกค้าเริ่มส่งภาพถ่ายสะสมไอเทม
              </p>
              <button
                type="button"
                onClick={() => openActivityForm()}
                className="px-4 py-2 bg-[hsl(var(--primary))] text-white text-xs font-bold rounded-xl"
              >
                สร้างกิจกรรมแรก
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {activities.map((act) => {
                const actSubmissions = allSubmissions.filter((s) => s.activity_id === act.id)
                const pending = actSubmissions.filter((s) => s.status === 'pending').length
                const approved = actSubmissions.filter((s) => s.status === 'approved').length

                return (
                  <div
                    key={act.id}
                    className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-sm space-y-4 hover:border-[hsl(var(--primary))]/30 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex gap-4">
                        {act.cover_image && (
                          <img
                            src={act.cover_image}
                            alt={act.title}
                            className="h-20 w-28 rounded-xl object-cover border border-[hsl(var(--border))] shrink-0"
                          />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-base text-[hsl(var(--foreground))]">{act.title}</h3>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                act.is_active
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                              }`}
                            >
                              {act.is_active ? 'เปิดใช้งาน' : 'ปิดการใช้งาน'}
                            </span>
                          </div>
                          {act.description && (
                            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 line-clamp-2">
                              {act.description}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-3 text-xs text-[hsl(var(--muted-foreground))] mt-2">
                            <span className="flex items-center gap-1">
                              <Gift className="h-3.5 w-3.5 text-[hsl(var(--primary))]" />
                              เป้าหมาย: <strong>{act.required_items} ไอเทม</strong>
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3.5 w-3.5 text-blue-500" />
                              ส่งแล้ว: <strong>{actSubmissions.length} รายการ</strong>
                            </span>
                            {pending > 0 && (
                              <span className="rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 font-bold flex items-center gap-1">
                                <Clock className="h-3 w-3" /> {pending} รอตรวจ
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 self-end sm:self-start">
                        <button
                          type="button"
                          onClick={() => setSubmissionsActivity(act)}
                          className="flex items-center gap-1.5 rounded-xl bg-[hsl(var(--primary))]/10 px-3.5 py-2 text-xs font-bold text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/20 transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                          ตรวจผลงาน ({actSubmissions.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => openActivityForm(act)}
                          className="p-2 rounded-xl text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                          title="แก้ไขกิจกรรม"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteActivity(act.id)}
                          className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                          title="ลบกิจกรรม"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PROMOTIONS */}
      {activeTab === 'promotions' && (
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-[hsl(var(--foreground))]">Promotions (โปรโมชั่นระบบอัตโนมัติ)</h2>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">ส่วนลดอัตโนมัติในหน้าตะกร้าและสั่งซื้อ</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingPromo(null)
                setPromoDrawerOpen(true)
              }}
              className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-sm font-semibold text-white hover:bg-[hsl(var(--primary))]/90"
            >
              <Plus className="h-4 w-4" />
              Add Promotion
            </button>
          </div>

          {promotions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-[hsl(var(--muted-foreground))] border-2 border-dashed border-[hsl(var(--border))] rounded-xl">
              <p className="text-sm">No promotions active.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {promotions.map((promo) => (
                <div key={promo.id} className="flex items-center justify-between rounded-xl border border-[hsl(var(--border))] p-4">
                  <div>
                    <h3 className="font-semibold text-[hsl(var(--foreground))]">{promo.name}</h3>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">Type: {promo.type.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                      Status:{' '}
                      {promo.is_active ? (
                        <span className="text-emerald-500 font-medium">Active</span>
                      ) : (
                        <span className="text-rose-500 font-medium">Inactive</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingPromo(promo)
                        setPromoDrawerOpen(true)
                      }}
                      className="p-2 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeletePromo(promo.id)}
                      className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: WEBSITE CONTENT & BANNERS */}
      {activeTab === 'content' && (
        <form onSubmit={handleWebsiteSubmit} className="space-y-6">
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-sm">
            <h2 className="mb-2 text-base font-semibold text-[hsl(var(--foreground))]">ป้ายโฆษณา (Advertisement Banners)</h2>
            <p className="mb-4 text-sm text-[hsl(var(--muted-foreground))]">ป้ายโฆษณาจะแสดงผลสลับกันทุก 10 วินาทีในหน้าร้านค้าของลูกค้า</p>

            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {carouselImages.map((img, idx) => (
                <div key={idx} className="relative aspect-video overflow-hidden rounded-xl border border-[hsl(var(--border))]">
                  <img src={img} alt={`Banner ${idx + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeBannerImage(idx)}
                    className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}

              <label className="flex aspect-video cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[hsl(var(--border))] transition-colors hover:border-[hsl(var(--primary))]">
                {isUploadingBanner ? (
                  <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--primary))]" />
                ) : (
                  <>
                    <Plus className="h-8 w-8 text-[hsl(var(--muted-foreground))]" />
                    <span className="mt-2 text-xs font-semibold text-[hsl(var(--muted-foreground))]">อัปโหลดแบนเนอร์ใหม่</span>
                  </>
                )}
                <input type="file" accept="image/*" onChange={handleBannerUpload} className="sr-only" />
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-[hsl(var(--foreground))]">ข้อมูลติดต่อและสถานที่ (Contact & Location)</h2>

            <div>
              <label className="mb-1 block text-sm font-medium">คำอธิบายธุรกิจ</label>
              <textarea
                rows={2}
                value={businessDescription}
                onChange={(e) => setBusinessDescription(e.target.value)}
                className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">เวลาทำการ</label>
                <input
                  type="text"
                  value={openingHours}
                  onChange={(e) => setOpeningHours(e.target.value)}
                  className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">เบอร์โทรศัพท์</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium">ที่อยู่ / พิกัดร้าน</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[hsl(var(--primary))]/90 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              บันทึกเนื้อหาหน้าเว็บ
            </button>
          </div>
        </form>
      )}

      {/* Promotion Drawer */}
      <PromotionFormDrawer
        open={promoDrawerOpen}
        onClose={() => setPromoDrawerOpen(false)}
        onSave={handleSavePromo}
        editingPromotion={editingPromo}
        isSubmitting={isSavingPromo}
      />

      {/* Activity Form Drawer */}
      <ActivityFormDrawer
        open={activityDrawerOpen}
        onClose={() => setActivityDrawerOpen(false)}
        onSave={handleSaveActivity}
        activity={editingActivity}
        isLoading={isSavingActivity}
      />

      {/* Activity Submissions Drawer */}
      <ActivitySubmissionsDrawer
        open={!!submissionsActivity}
        onClose={() => setSubmissionsActivity(null)}
        activity={submissionsActivity}
      />
    </div>
  )
}
