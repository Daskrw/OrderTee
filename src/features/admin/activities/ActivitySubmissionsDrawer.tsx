import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  X,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Phone,
  User,
  Tag,
  ExternalLink,
  MessageSquare,
} from 'lucide-react'
import {
  fetchActivitySubmissions,
  reviewSubmission,
  deleteSubmission,
} from '@/services/activities'
import type { Activity, ActivitySubmission, SubmissionStatus } from '@/types/database'

interface ActivitySubmissionsDrawerProps {
  open: boolean
  onClose: () => void
  activity: Activity | null
}

export function ActivitySubmissionsDrawer({
  open,
  onClose,
  activity,
}: ActivitySubmissionsDrawerProps) {
  const queryClient = useQueryClient()
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  // Edit / Review state per submission
  const [itemTags, setItemTags] = useState<Record<string, string>>({})
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({})

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ['admin-activity-submissions', activity?.id],
    queryFn: () => (activity ? fetchActivitySubmissions(activity.id) : Promise.resolve([])),
    enabled: !!activity && open,
  })

  // Group stats
  const stats = useMemo(() => {
    const total = submissions.length
    const pending = submissions.filter((s) => s.status === 'pending').length
    const approved = submissions.filter((s) => s.status === 'approved').length
    const rejected = submissions.filter((s) => s.status === 'rejected').length

    // Distinct phone participants who reached required items
    const participantItems = new Map<string, Set<string>>()
    submissions
      .filter((s) => s.status === 'approved')
      .forEach((s, idx) => {
        const set = participantItems.get(s.customer_phone) || new Set()
        set.add(s.item_tag?.trim() || `Item_${idx}`)
        participantItems.set(s.customer_phone, set)
      })

    const required = activity?.required_items ?? 5
    let completedParticipants = 0
    participantItems.forEach((items) => {
      if (items.size >= required) completedParticipants++
    })

    return {
      total,
      pending,
      approved,
      rejected,
      totalParticipants: new Set(submissions.map((s) => s.customer_phone)).size,
      completedParticipants,
    }
  }, [submissions, activity])

  const filteredSubmissions = useMemo(() => {
    if (selectedStatus === 'all') return submissions
    return submissions.filter((s) => s.status === selectedStatus)
  }, [submissions, selectedStatus])

  const reviewMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      itemTag,
      adminNote,
    }: {
      id: string
      status: 'approved' | 'rejected'
      itemTag?: string
      adminNote?: string
    }) => {
      await reviewSubmission(id, {
        status,
        itemTag,
        adminNote,
        rejectionReason: status === 'rejected' ? adminNote : undefined,
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-activity-submissions'] })
      void queryClient.invalidateQueries({ queryKey: ['activity-gallery'] })
      void queryClient.invalidateQueries({ queryKey: ['customer-activity-progress'] })
    },
    onError: (err: any) => {
      alert(err.message || 'บันทึกสถานะไม่สำเร็จ')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบผลงานนี้?')) return
      await deleteSubmission(id)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-activity-submissions'] })
    },
  })

  const handleApprove = (submission: ActivitySubmission) => {
    const tag = itemTags[submission.id] !== undefined ? itemTags[submission.id] : (submission.item_tag || '')
    const note = adminNotes[submission.id] !== undefined ? adminNotes[submission.id] : (submission.admin_note || '')
    reviewMutation.mutate({
      id: submission.id,
      status: 'approved',
      itemTag: tag || 'Item #1',
      adminNote: note,
    })
  }

  const handleReject = (submission: ActivitySubmission) => {
    const note = adminNotes[submission.id] !== undefined ? adminNotes[submission.id] : (submission.rejection_reason || 'รูปภาพไม่ตรงตามเงื่อนไข')
    reviewMutation.mutate({
      id: submission.id,
      status: 'rejected',
      adminNote: note,
    })
  }

  if (!open || !activity) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-6 sm:pl-16">
        <div className="w-screen max-w-2xl bg-[hsl(var(--card))] shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))]">
            <div>
              <h2 className="text-lg font-bold text-[hsl(var(--foreground))]">
                ผลงานที่ส่งเข้าร่วม: {activity.title}
              </h2>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                ตรวจสอบ อนุมัติ หรือปฏิเสธผลงานที่ลูกค้าส่งเข้าร่วมกิจกรรม
              </p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 p-4 bg-[hsl(var(--muted))]/30 border-b border-[hsl(var(--border))] text-center">
            <div className="bg-[hsl(var(--card))] p-2.5 rounded-xl border border-[hsl(var(--border))]">
              <span className="text-[10px] text-[hsl(var(--muted-foreground))] block">ทั้งหมด</span>
              <span className="text-base font-extrabold text-[hsl(var(--foreground))]">{stats.total}</span>
            </div>
            <div className="bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
              <span className="text-[10px] text-amber-600 dark:text-amber-400 block font-semibold">รอตรวจ</span>
              <span className="text-base font-extrabold text-amber-600 dark:text-amber-400">{stats.pending}</span>
            </div>
            <div className="bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-semibold">อนุมัติแล้ว</span>
              <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">{stats.approved}</span>
            </div>
            <div className="bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
              <span className="text-[10px] text-rose-600 dark:text-rose-400 block font-semibold">ปฏิเสธ</span>
              <span className="text-base font-extrabold text-rose-600 dark:text-rose-400">{stats.rejected}</span>
            </div>
            <div className="col-span-3 sm:col-span-1 bg-[hsl(var(--primary))]/10 p-2.5 rounded-xl border border-[hsl(var(--primary))]/20">
              <span className="text-[10px] text-[hsl(var(--primary))] block font-semibold">สะสมครบ 5</span>
              <span className="text-base font-extrabold text-[hsl(var(--primary))]">{stats.completedParticipants} คน</span>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 px-6 py-3 border-b border-[hsl(var(--border))] overflow-x-auto text-xs">
            {[
              { id: 'all', label: `ทั้งหมด (${stats.total})` },
              { id: 'pending', label: `รอตรวจ (${stats.pending})` },
              { id: 'approved', label: `อนุมัติแล้ว (${stats.approved})` },
              { id: 'rejected', label: `ปฏิเสธ (${stats.rejected})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedStatus(tab.id)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors shrink-0 ${
                  selectedStatus === tab.id
                    ? 'bg-[hsl(var(--primary))] text-white'
                    : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Submissions List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {isLoading ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--primary))]" />
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="text-center py-12 text-sm text-[hsl(var(--muted-foreground))]">
                ไม่พบรายการผลงานในสถานะนี้
              </div>
            ) : (
              filteredSubmissions.map((sub) => (
                <div
                  key={sub.id}
                  className={`rounded-2xl border p-4 space-y-3.5 transition-all ${
                    sub.status === 'approved'
                      ? 'border-emerald-500/30 bg-emerald-500/5'
                      : sub.status === 'rejected'
                      ? 'border-rose-500/30 bg-rose-500/5'
                      : 'border-amber-500/30 bg-amber-500/5'
                  }`}
                >
                  {/* Top Bar with Name, Phone & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-[hsl(var(--primary))]" />
                        <span className="font-bold text-sm text-[hsl(var(--foreground))]">{sub.customer_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                        <Phone className="h-3.5 w-3.5" />
                        <a href={`tel:${sub.customer_phone}`} className="font-mono hover:text-[hsl(var(--primary))] font-semibold">
                          {sub.customer_phone}
                        </a>
                        <span>•</span>
                        <span>{new Date(sub.created_at).toLocaleString('th-TH')}</span>
                      </div>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        sub.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : sub.status === 'rejected'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {sub.status === 'approved' && '✓ อนุมัติแล้ว'}
                      {sub.status === 'rejected' && '✕ ปฏิเสธ'}
                      {sub.status === 'pending' && '⏳ รอการตรวจสอบ'}
                    </span>
                  </div>

                  {/* Submitted Photos Grid */}
                  <div>
                    <span className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))] block mb-1.5">
                      รูปภาพที่ส่ง ({sub.images?.length || 0} รูป):
                    </span>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {(sub.images || []).map((img, idx) => (
                        <div
                          key={idx}
                          onClick={() => setSelectedImage(img)}
                          className="group relative aspect-square rounded-xl overflow-hidden border border-[hsl(var(--border))] cursor-pointer bg-black/5"
                        >
                          <img src={img} alt={`Submission ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                            <ExternalLink className="h-4 w-4" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Item Classification Tag Input */}
                  <div className="grid sm:grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="text-[11px] font-semibold text-[hsl(var(--foreground))] flex items-center gap-1 mb-1">
                        <Tag className="h-3.5 w-3.5 text-[hsl(var(--primary))]" /> ป้ายระบุไอเทม (Item Tag):
                      </label>
                      <input
                        type="text"
                        placeholder="เช่น แก้วชาไทย, โควทคำคม 1"
                        value={itemTags[sub.id] !== undefined ? itemTags[sub.id] : (sub.item_tag || '')}
                        onChange={(e) => setItemTags((prev) => ({ ...prev, [sub.id]: e.target.value }))}
                        className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2.5 py-1.5 text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-[hsl(var(--foreground))] flex items-center gap-1 mb-1">
                        <MessageSquare className="h-3.5 w-3.5 text-[hsl(var(--primary))]" /> บันทึกแอดมิน / เหตุผล:
                      </label>
                      <input
                        type="text"
                        placeholder="เหตุผลการอนุมัติหรือปฏิเสธ..."
                        value={adminNotes[sub.id] !== undefined ? adminNotes[sub.id] : (sub.admin_note || sub.rejection_reason || '')}
                        onChange={(e) => setAdminNotes((prev) => ({ ...prev, [sub.id]: e.target.value }))}
                        className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2.5 py-1.5 text-xs"
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-[hsl(var(--border))]/50">
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(sub.id)}
                      className="p-1.5 text-xs text-rose-500 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> ลบผลงาน
                    </button>

                    <div className="flex items-center gap-2">
                      {sub.status !== 'rejected' && (
                        <button
                          type="button"
                          onClick={() => handleReject(sub)}
                          disabled={reviewMutation.isPending}
                          className="flex items-center gap-1 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-500/20 transition-colors"
                        >
                          <XCircle className="h-3.5 w-3.5" /> ปฏิเสธ (Reject)
                        </button>
                      )}
                      {sub.status !== 'approved' && (
                        <button
                          type="button"
                          onClick={() => handleApprove(sub)}
                          disabled={reviewMutation.isPending}
                          className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 shadow-sm transition-colors"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> อนุมัติไอเทม (Approve)
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Image Modal Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <img src={selectedImage} alt="Full view" className="max-w-full max-h-[90vh] object-contain rounded-xl" />
        </div>
      )}
    </div>
  )
}
