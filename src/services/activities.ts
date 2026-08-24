import { supabase } from '@/lib/supabase'
import type { Activity, ActivitySubmission, SubmissionStatus } from '@/types/database'

export interface CreateActivityInput {
  title: string
  description?: string | null
  instructions?: string | null
  cover_image?: string | null
  required_items?: number
  reward_description?: string
  contact_info?: string | null
  start_date?: string | null
  end_date?: string | null
  max_photos_per_submission?: number
  is_active?: boolean
  show_gallery?: boolean
  show_leaderboard?: boolean
}

export interface SubmitActivityInput {
  activityId: string
  customerName: string
  customerPhone: string
  images: string[]
}

export interface ReviewSubmissionInput {
  status: 'approved' | 'rejected'
  itemTag?: string | null
  adminNote?: string | null
  rejectionReason?: string | null
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp']
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5MB

/**
 * Validates and uploads multiple images for activity submissions or banners
 */
export async function uploadActivityImage(file: File): Promise<string> {
  if (!file) throw new Error('กรุณาเลือกไฟล์รูปภาพ')

  if (!ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase())) {
    throw new Error('อนุญาตเฉพาะไฟล์รูปภาพ (JPG, PNG, WEBP) เท่านั้น')
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error('นามสกุลไฟล์ไม่ถูกต้อง รองรับเฉพาะ .jpg, .jpeg, .png, .webp')
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('ขนาดไฟล์รูปภาพต้องไม่เกิน 5 MB')
  }

  const fileName = `activities/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('images')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    })

  if (uploadError) {
    console.error('Activity image upload error:', uploadError)
    throw new Error('เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ')
  }

  const { data } = supabase.storage.from('images').getPublicUrl(fileName)
  return data.publicUrl
}

/**
 * Fetch all activities
 */
export async function fetchActivities(onlyActive = false): Promise<Activity[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('activities')
    .select('*')
    .order('created_at', { ascending: false })

  if (onlyActive) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query
  if (error) {
    console.error('fetchActivities error:', error)
    return []
  }
  return data || []
}

/**
 * Fetch a single activity by ID
 */
export async function fetchActivityById(id: string): Promise<Activity | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('activities')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('fetchActivityById error:', error)
    return null
  }
  return data
}

/**
 * Create a new activity (Admin only)
 */
export async function createActivity(input: CreateActivityInput): Promise<Activity> {
  const { data: userData, error: authError } = await supabase.auth.getUser()
  if (authError || !userData?.user) {
    throw new Error('Unauthorized: Admin login required')
  }

  if (!input.title.trim()) {
    throw new Error('กรุณาระบุชื่อกิจกรรม (Activity title is required)')
  }

  const payload = {
    title: input.title.trim(),
    description: input.description?.trim() || null,
    instructions: input.instructions?.trim() || null,
    cover_image: input.cover_image || null,
    required_items: input.required_items ?? 5,
    reward_description: input.reward_description?.trim() || 'รับส่วนลดพิเศษหรือของรางวัลจากทางร้าน',
    contact_info: input.contact_info?.trim() || '061-608-0720',
    start_date: input.start_date || null,
    end_date: input.end_date || null,
    max_photos_per_submission: input.max_photos_per_submission ?? 10,
    is_active: input.is_active ?? true,
    show_gallery: input.show_gallery ?? true,
    show_leaderboard: input.show_leaderboard ?? true,
    updated_at: new Date().toISOString(),
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('activities')
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update an existing activity (Admin only)
 */
export async function updateActivity(
  id: string,
  input: Partial<CreateActivityInput>
): Promise<Activity> {
  const { data: userData, error: authError } = await supabase.auth.getUser()
  if (authError || !userData?.user) {
    throw new Error('Unauthorized: Admin login required')
  }

  const payload: Record<string, any> = {
    ...input,
    updated_at: new Date().toISOString(),
  }

  if (input.title !== undefined) payload.title = input.title.trim()
  if (input.description !== undefined) payload.description = input.description?.trim() || null
  if (input.instructions !== undefined) payload.instructions = input.instructions?.trim() || null
  if (input.reward_description !== undefined) payload.reward_description = input.reward_description?.trim()
  if (input.contact_info !== undefined) payload.contact_info = input.contact_info?.trim() || null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('activities')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete an activity (Admin only)
 */
export async function deleteActivity(id: string): Promise<void> {
  const { data: userData, error: authError } = await supabase.auth.getUser()
  if (authError || !userData?.user) {
    throw new Error('Unauthorized: Admin login required')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('activities')
    .delete()
    .eq('id', id)

  if (error) throw error
}

/**
 * Customer submits an activity entry (Public)
 */
export async function submitActivityEntry(input: SubmitActivityInput): Promise<ActivitySubmission> {
  if (!input.customerName || input.customerName.trim().length < 2) {
    throw new Error('กรุณากรอกชื่ออย่างน้อย 2 ตัวอักษร')
  }

  const cleanPhone = input.customerPhone.replace(/\D/g, '')
  if (cleanPhone.length < 9) {
    throw new Error('กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง (อย่างน้อย 9 หลัก)')
  }

  if (!input.images || input.images.length === 0) {
    throw new Error('กรุณาอัปโหลดรูปภาพอย่างน้อย 1 รูป')
  }

  const payload = {
    activity_id: input.activityId,
    customer_name: input.customerName.trim(),
    customer_phone: cleanPhone,
    images: input.images,
    status: 'pending' as const,
    created_at: new Date().toISOString(),
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('activity_submissions')
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Fetch submissions for an activity with optional status filter (Admin only)
 */
export async function fetchActivitySubmissions(
  activityId?: string,
  status?: SubmissionStatus
): Promise<ActivitySubmission[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('activity_submissions')
    .select('*, activity:activities(*)')
    .order('created_at', { ascending: false })

  if (activityId) {
    query = query.eq('activity_id', activityId)
  }

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query
  if (error) {
    console.error('fetchActivitySubmissions error:', error)
    return []
  }
  return data || []
}

/**
 * Review/Approve/Reject submission (Admin only)
 */
export async function reviewSubmission(
  id: string,
  input: ReviewSubmissionInput
): Promise<ActivitySubmission> {
  const { data: userData, error: authError } = await supabase.auth.getUser()
  if (authError || !userData?.user) {
    throw new Error('Unauthorized: Admin login required')
  }

  const payload: Record<string, any> = {
    status: input.status,
    reviewed_at: new Date().toISOString(),
    admin_note: input.adminNote?.trim() || null,
    rejection_reason: input.rejectionReason?.trim() || null,
  }

  if (input.itemTag !== undefined) {
    payload.item_tag = input.itemTag?.trim() || null
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('activity_submissions')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete a submission (Admin only)
 */
export async function deleteSubmission(id: string): Promise<void> {
  const { data: userData, error: authError } = await supabase.auth.getUser()
  if (authError || !userData?.user) {
    throw new Error('Unauthorized: Admin login required')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('activity_submissions')
    .delete()
    .eq('id', id)

  if (error) throw error
}

/**
 * Fetch approved submissions for public gallery (Anonymized)
 */
export async function fetchPublicGallery(activityId: string): Promise<Array<{
  id: string
  customerName: string
  images: string[]
  itemTag: string | null
  createdAt: string
}>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('activity_submissions')
    .select('id, customer_name, images, item_tag, created_at')
    .eq('activity_id', activityId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('fetchPublicGallery error:', error)
    return []
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    customerName: maskCustomerName(row.customer_name),
    images: row.images || [],
    itemTag: row.item_tag,
    createdAt: row.created_at,
  }))
}

/**
 * Customer progress tracker by phone number
 */
export interface CustomerProgress {
  totalSubmissions: number
  approvedCount: number
  pendingCount: number
  rejectedCount: number
  uniqueApprovedItemsCount: number
  approvedItemTags: string[]
  requiredItems: number
  isCompleted: boolean
  submissions: Array<{
    id: string
    images: string[]
    status: SubmissionStatus
    itemTag: string | null
    adminNote: string | null
    rejectionReason: string | null
    createdAt: string
  }>
}

export async function fetchCustomerProgress(
  activityId: string,
  phone: string,
  requiredItems = 5
): Promise<CustomerProgress> {
  const cleanPhone = phone.replace(/\D/g, '')
  if (!cleanPhone) {
    return {
      totalSubmissions: 0,
      approvedCount: 0,
      pendingCount: 0,
      rejectedCount: 0,
      uniqueApprovedItemsCount: 0,
      approvedItemTags: [],
      requiredItems,
      isCompleted: false,
      submissions: [],
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('activity_submissions')
    .select('*')
    .eq('activity_id', activityId)
    .eq('customer_phone', cleanPhone)
    .order('created_at', { ascending: false })

  if (error || !data) {
    console.error('fetchCustomerProgress error:', error)
    return {
      totalSubmissions: 0,
      approvedCount: 0,
      pendingCount: 0,
      rejectedCount: 0,
      uniqueApprovedItemsCount: 0,
      approvedItemTags: [],
      requiredItems,
      isCompleted: false,
      submissions: [],
    }
  }

  const approvedSubmissions = data.filter((s: any) => s.status === 'approved')
  const pendingSubmissions = data.filter((s: any) => s.status === 'pending')
  const rejectedSubmissions = data.filter((s: any) => s.status === 'rejected')

  // Calculate unique approved items (using item_tag if assigned, or submission ID as fallback unique item)
  const uniqueItemTags = new Set<string>()
  approvedSubmissions.forEach((s: any, idx: number) => {
    const key = s.item_tag?.trim() || `Item #${idx + 1}`
    uniqueItemTags.add(key)
  })

  const uniqueApprovedItemsCount = uniqueItemTags.size
  const isCompleted = uniqueApprovedItemsCount >= requiredItems

  return {
    totalSubmissions: data.length,
    approvedCount: approvedSubmissions.length,
    pendingCount: pendingSubmissions.length,
    rejectedCount: rejectedSubmissions.length,
    uniqueApprovedItemsCount,
    approvedItemTags: Array.from(uniqueItemTags),
    requiredItems,
    isCompleted,
    submissions: data.map((s: any) => ({
      id: s.id,
      images: s.images || [],
      status: s.status,
      itemTag: s.item_tag,
      adminNote: s.admin_note,
      rejectionReason: s.rejection_reason,
      createdAt: s.created_at,
    })),
  }
}

/**
 * Fetch leaderboard of approved participants
 */
export interface LeaderboardEntry {
  rank: number
  displayName: string
  approvedItemsCount: number
  isCompleted: boolean
}

export async function fetchActivityLeaderboard(
  activityId: string,
  requiredItems = 5
): Promise<LeaderboardEntry[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('activity_submissions')
    .select('customer_name, customer_phone, item_tag, id')
    .eq('activity_id', activityId)
    .eq('status', 'approved')

  if (error || !data) {
    console.error('fetchActivityLeaderboard error:', error)
    return []
  }

  // Group by phone number to calculate unique approved items per participant
  const map = new Map<string, { name: string; items: Set<string> }>()

  data.forEach((row: any, idx: number) => {
    const phone = row.customer_phone || `anon_${idx}`
    const existing = map.get(phone) || {
      name: row.customer_name,
      items: new Set<string>(),
    }
    const itemKey = row.item_tag?.trim() || row.id
    existing.items.add(itemKey)
    map.set(phone, existing)
  })

  const entries: LeaderboardEntry[] = Array.from(map.values())
    .map((item) => ({
      rank: 0,
      displayName: maskCustomerName(item.name),
      approvedItemsCount: item.items.size,
      isCompleted: item.items.size >= requiredItems,
    }))
    .sort((a, b) => b.approvedItemsCount - a.approvedItemsCount)
    .slice(0, 10)
    .map((item, idx) => ({ ...item, rank: idx + 1 }))

  return entries
}

/**
 * Mask customer name for privacy in public leaderboard / gallery (e.g. "สมชาย เข็ม..." -> "สมชาย ข.")
 */
function maskCustomerName(name: string): string {
  if (!name) return 'ผู้ร่วมกิจกรรม'
  const parts = name.trim().split(/\s+/)
  if (parts.length > 1) {
    return `${parts[0]} ${parts[1].charAt(0)}.`
  }
  if (name.length > 4) {
    return `${name.slice(0, 3)}...`
  }
  return name
}
