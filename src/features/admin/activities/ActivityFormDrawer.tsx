import { useState, useEffect } from 'react'
import { X, Loader2, Upload, ImageIcon } from 'lucide-react'
import { uploadActivityImage } from '@/services/activities'
import type { Activity } from '@/types/database'

interface ActivityFormDrawerProps {
  open: boolean
  onClose: () => void
  onSave: (payload: any) => Promise<void>
  activity?: Activity | null
  isLoading?: boolean
}

export function ActivityFormDrawer({
  open,
  onClose,
  onSave,
  activity,
  isLoading = false,
}: ActivityFormDrawerProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [instructions, setInstructions] = useState('')
  const [coverImage, setCoverImage] = useState<string | null>(null)
  const [requiredItems, setRequiredItems] = useState(5)
  const [rewardDescription, setRewardDescription] = useState('รับส่วนลดพิเศษ 15% หรือของรางวัลจากทางร้าน')
  const [contactInfo, setContactInfo] = useState('ติดต่อร้านค้าได้ที่เบอร์ 061-608-0720 หรือ Line Official')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [showGallery, setShowGallery] = useState(true)
  const [showLeaderboard, setShowLeaderboard] = useState(true)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    if (activity) {
      setTitle(activity.title)
      setDescription(activity.description || '')
      setInstructions(activity.instructions || '')
      setCoverImage(activity.cover_image || null)
      setRequiredItems(activity.required_items ?? 5)
      setRewardDescription(activity.reward_description || 'รับส่วนลดพิเศษหรือของรางวัลจากทางร้าน')
      setContactInfo(activity.contact_info || '061-608-0720')
      setStartDate(activity.start_date || '')
      setEndDate(activity.end_date || '')
      setIsActive(activity.is_active ?? true)
      setShowGallery(activity.show_gallery ?? true)
      setShowLeaderboard(activity.show_leaderboard ?? true)
    } else {
      setTitle('')
      setDescription('ร่วมสนุกสะสมภาพถ่ายสินค้า คำคม หรือไอเทมพิเศษที่คุณได้รับจากทางร้าน ครบ 5 แบบเพื่อรับโปรโมชั่นพิเศษ!')
      setInstructions('1. ถ่ายภาพสินค้า แก้วเครื่องดื่ม หรือคำคมพิเศษที่คุณได้รับ\n2. อัปโหลดรูปภาพพร้อมระบุชื่อและเบอร์โทรศัพท์\n3. ทางร้านจะตรวจสอบความถูกต้องของแต่ละไอเทม\n4. เมื่อสะสมไอเทมที่ได้รับการอนุมัติครบ 5 แบบ ติดต่อรับส่วนลดพิเศษได้ทันที!')
      setCoverImage(null)
      setRequiredItems(5)
      setRewardDescription('รับส่วนลดพิเศษ 15% หรือของรางวัลจากทางร้าน')
      setContactInfo('ติดต่อร้านค้าได้ที่เบอร์ 061-608-0720 หรือ Line Official')
      setStartDate('')
      setEndDate('')
      setIsActive(true)
      setShowGallery(true)
      setShowLeaderboard(true)
    }
  }, [activity, open])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setIsUploading(true)
      const url = await uploadActivityImage(file)
      setCoverImage(url)
    } catch (err: any) {
      alert(err.message || 'อัปโหลดรูปภาพไม่สำเร็จ')
    } finally {
      setIsUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSave({
      title,
      description: description || null,
      instructions: instructions || null,
      cover_image: coverImage,
      required_items: Number(requiredItems) || 5,
      reward_description: rewardDescription,
      contact_info: contactInfo || null,
      start_date: startDate || null,
      end_date: endDate || null,
      is_active: isActive,
      show_gallery: showGallery,
      show_leaderboard: showLeaderboard,
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[hsl(var(--card))] shadow-xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))]">
            <h2 className="text-lg font-bold text-[hsl(var(--foreground))]">
              {activity ? 'แก้ไขกิจกรรม (Edit Activity)' : 'สร้างกิจกรรมใหม่ (Create Activity)'}
            </h2>
            <button onClick={onClose} className="p-2 rounded-xl text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-[hsl(var(--foreground))]">
                ชื่อกิจกรรม (Title) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="เช่น แคมเปญถ่ายภาพสะสมไอเทม 5 แบบ"
                className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3.5 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-[hsl(var(--foreground))]">
                คำอธิบายกิจกรรม (Description)
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="รายละเอียดเป้าหมายของกิจกรรม..."
                className="w-full resize-none rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3.5 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-[hsl(var(--foreground))]">
                กติกาและขั้นตอนการเข้าร่วม (Instructions)
              </label>
              <textarea
                rows={4}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="1. ถ่ายรูปสินค้า...\n2. อัปโหลด..."
                className="w-full resize-none rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3.5 py-2.5 text-sm font-mono"
              />
            </div>

            {/* Image Upload */}
            <div>
              <label className="mb-1 block text-sm font-semibold text-[hsl(var(--foreground))]">
                ภาพหน้าปกกิจกรรม (Cover Banner)
              </label>
              {coverImage ? (
                <div className="relative aspect-video rounded-xl overflow-hidden border border-[hsl(var(--border))]">
                  <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setCoverImage(null)}
                    className="absolute top-2 right-2 rounded-lg bg-black/60 p-1 text-white hover:bg-black/80"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[hsl(var(--border))] p-4 text-center hover:border-[hsl(var(--primary))]">
                  {isUploading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--primary))]" />
                  ) : (
                    <>
                      <ImageIcon className="h-6 w-6 text-[hsl(var(--muted-foreground))] mb-1" />
                      <span className="text-xs font-semibold text-[hsl(var(--foreground))]">คลิกเพื่ออัปโหลดรูปภาพ</span>
                      <span className="text-[10px] text-[hsl(var(--muted-foreground))]">JPG, PNG, WEBP ไม่เกิน 5MB</span>
                    </>
                  )}
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="sr-only" />
                </label>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-semibold text-[hsl(var(--foreground))]">
                  จำนวนไอเทมที่ต้องสะสม <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  required
                  value={requiredItems}
                  onChange={(e) => setRequiredItems(parseInt(e.target.value) || 1)}
                  className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3.5 py-2.5 text-sm font-bold"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-[hsl(var(--foreground))]">
                ของรางวัล / สิทธิพิเศษ (Reward) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={rewardDescription}
                onChange={(e) => setRewardDescription(e.target.value)}
                placeholder="เช่น รับส่วนลดพิเศษ 15% หรือสิทธิ์รับเครื่องดื่มฟรี"
                className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3.5 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-[hsl(var(--foreground))]">
                ช่องทางติดต่อรับสิทธิ์ (Contact Info)
              </label>
              <input
                type="text"
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
                placeholder="เช่น ติดต่อ Line @OrderTee หรือ 061-608-0720"
                className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3.5 py-2.5 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[hsl(var(--foreground))]">วันที่เริ่ม (Start Date)</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[hsl(var(--foreground))]">วันที่สิ้นสุด (End Date)</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-xs"
                />
              </div>
            </div>

            {/* Toggles */}
            <div className="rounded-2xl border border-[hsl(var(--border))] p-3.5 space-y-2.5 bg-[hsl(var(--muted))]/20">
              <label className="flex items-center justify-between cursor-pointer text-xs font-semibold">
                <span>เปิดใช้งานกิจกรรม (Active)</span>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded text-[hsl(var(--primary))]"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer text-xs font-semibold">
                <span>แสดงแกลเลอรี่ผลงานที่ผ่านอนุมัติ (Public Gallery)</span>
                <input
                  type="checkbox"
                  checked={showGallery}
                  onChange={(e) => setShowGallery(e.target.checked)}
                  className="h-4 w-4 rounded text-[hsl(var(--primary))]"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer text-xs font-semibold">
                <span>แสดงตารางอันดับสะสมไอเทม (Leaderboard)</span>
                <input
                  type="checkbox"
                  checked={showLeaderboard}
                  onChange={(e) => setShowLeaderboard(e.target.checked)}
                  className="h-4 w-4 rounded text-[hsl(var(--primary))]"
                />
              </label>
            </div>

            {/* Buttons */}
            <div className="pt-4 border-t border-[hsl(var(--border))] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-semibold rounded-xl text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isLoading || isUploading}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white rounded-xl bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 disabled:opacity-50"
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                บันทึกกิจกรรม
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
