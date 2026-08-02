import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Plus, Pencil, Trash2, Save } from 'lucide-react'
import { fetchWebsite, updateWebsite } from '@/services/website'
import { fetchPromotions, createPromotion, updatePromotion, deletePromotion } from '@/services/promotions'
import { PromotionFormDrawer } from './PromotionFormDrawer'
import type { Promotion } from '@/types/database'

export default function WebsitePage() {
  const queryClient = useQueryClient()
  
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
  const [promoDrawerOpen, setPromoDrawerOpen] = useState(false)
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null)
  const [isSavingPromo, setIsSavingPromo] = useState(false)
  const [isUploadingBanner, setIsUploadingBanner] = useState(false)

  const { data: website, isLoading: isWebsiteLoading } = useQuery({
    queryKey: ['admin-website'],
    queryFn: fetchWebsite,
  })

  const { data: promotions = [], isLoading: isPromosLoading } = useQuery({
    queryKey: ['admin-promotions'],
    queryFn: fetchPromotions,
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
      setCarouselImages(prev => [...prev, data.publicUrl])
    } catch (error) {
      alert('Error uploading banner image!')
      console.error(error)
    } finally {
      setIsUploadingBanner(false)
    }
  }

  const removeBannerImage = (index: number) => {
    setCarouselImages(prev => prev.filter((_, i) => i !== index))
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
      alert('Website content saved!')
    },
    onSettled: () => setIsSubmitting(false)
  })

  const handleWebsiteSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    websiteMutation.mutate()
  }

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

  const openPromoForm = (promo?: Promotion) => {
    setEditingPromo(promo || null)
    setPromoDrawerOpen(true)
  }

  if (isWebsiteLoading || isPromosLoading) {
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
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Manage promotions and contact information for your landing page.</p>
      </div>

      {/* Promotions Section */}
      <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[hsl(var(--foreground))]">Promotions (โปรโมชั่น)</h2>
          <button
            type="button"
            onClick={() => openPromoForm()}
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
            {promotions.map(promo => (
              <div key={promo.id} className="flex items-center justify-between rounded-xl border border-[hsl(var(--border))] p-4">
                <div>
                  <h3 className="font-semibold text-[hsl(var(--foreground))]">{promo.name}</h3>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">Type: {promo.type.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                    Status: {promo.is_active ? <span className="text-emerald-500 font-medium">Active</span> : <span className="text-rose-500 font-medium">Inactive</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => openPromoForm(promo)} className="p-2 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDeletePromo(promo.id)} className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Website Info Form */}
      <form onSubmit={handleWebsiteSubmit} className="space-y-6">
        
        {/* Advertisement Banners */}
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-[hsl(var(--foreground))]">ป้ายโฆษณา (Advertisement Banners)</h2>
          <p className="mb-4 text-sm text-[hsl(var(--muted-foreground))]">ป้ายโฆษณาจะแสดงผลสลับกันทุก 10 วินาทีในหน้าร้านค้าของลูกค้า</p>
          
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {carouselImages.map((img, idx) => (
              <div key={idx} className="relative aspect-video overflow-hidden rounded-xl border border-[hsl(var(--border))]">
                <img src={img} alt={`Banner ${idx + 1}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeBannerImage(idx)}
                  className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-500/80 text-white backdrop-blur-md hover:bg-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            
            <label className="flex aspect-video cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[hsl(var(--border))] bg-[hsl(var(--background))]/50 transition-colors hover:bg-[hsl(var(--background))] hover:border-[hsl(var(--primary))]/50">
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleBannerUpload} 
                disabled={isUploadingBanner}
                className="hidden" 
              />
              {isUploadingBanner ? (
                <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--primary))]" />
              ) : (
                <>
                  <Plus className="h-6 w-6 text-[hsl(var(--muted-foreground))]" />
                  <span className="mt-2 text-sm font-medium text-[hsl(var(--muted-foreground))]">เพิ่มรูปภาพ</span>
                </>
              )}
            </label>
          </div>
        </div>

        {/* Text Content */}
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-[hsl(var(--foreground))]">Business Details</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]">รายละเอียดธุรกิจ (เกี่ยวกับเรา)</label>
              <textarea rows={4} value={businessDescription} onChange={e => setBusinessDescription(e.target.value)} placeholder="เล่าเรื่องราวเกี่ยวกับร้านของคุณ..." className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]" />
            </div>
          </div>
        </div>

        {/* Contact & Info */}
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-[hsl(var(--foreground))]">ข้อมูลติดต่อ (Contact Info)</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]">เวลาทำการ (Opening Hours)</label>
              <input type="text" value={openingHours} onChange={e => setOpeningHours(e.target.value)} placeholder="เช่น จันทร์-อาทิตย์: 8.00 - 20.00" className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]">เบอร์โทรศัพท์ (Phone)</label>
              <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]">ที่อยู่ร้าน (Location)</label>
              <input type="text" value={location} onChange={e => setLocation(e.target.value)} className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]">Google Maps Embed URL</label>
              <input type="text" value={googleMapUrl} onChange={e => setGoogleMapUrl(e.target.value)} className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]" />
            </div>
          </div>
        </div>

        {/* Socials */}
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-[hsl(var(--foreground))]">ช่องทางติดต่อโซเชียล (Social Links)</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]">Facebook URL</label>
              <input type="text" value={facebook} onChange={e => setFacebook(e.target.value)} className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]">Instagram URL</label>
              <input type="text" value={instagram} onChange={e => setInstagram(e.target.value)} className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]">LINE ID หรือ URL</label>
              <input type="text" value={line} onChange={e => setLine(e.target.value)} className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]" />
            </div>
          </div>
        </div>

        {/* Sticky Save Button */}
        <div className="fixed bottom-0 left-0 lg:left-64 right-0 z-10 flex items-center justify-end gap-3 border-t border-[hsl(var(--border))] bg-[hsl(var(--background))]/80 p-4 backdrop-blur-md">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-6 py-2.5 text-sm font-bold text-white hover:bg-[hsl(var(--primary))]/90 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            บันทึกการเปลี่ยนแปลง (Save Changes)
          </button>
        </div>
      </form>

      <PromotionFormDrawer 
        open={promoDrawerOpen}
        onClose={() => setPromoDrawerOpen(false)}
        editingPromotion={editingPromo}
        onSave={handleSavePromo}
        isSubmitting={isSavingPromo}
      />
    </div>
  )
}
