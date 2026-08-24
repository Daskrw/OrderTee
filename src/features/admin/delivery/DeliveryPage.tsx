import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar as CalendarIcon,
  MapPin,
  Building,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Search,
  Check,
  X,
  Layers,
  CheckSquare,
  Square,
  Sparkles,
} from 'lucide-react'
import {
  fetchDeliveryLocations,
  createDeliveryLocation,
  updateDeliveryLocation,
  deleteDeliveryLocation,
  fetchDeliverySchedules,
  createDeliverySchedule,
  updateDeliverySchedule,
  deleteDeliverySchedule,
  bulkCreateOrUpdateMultiDateLocationMatrix,
  bulkUpdateSchedulesStatus,
  bulkDeleteSchedulesByDates,
} from '@/services/delivery'
import {
  getBangkokDateTime,
  isStrictlyFutureDate,
  formatDeliveryDateThai,
  getCalendarMonthDays,
  MONTH_NAMES_THAI,
} from '@/lib/delivery-utils'
import type { DeliveryLocation, DeliverySchedule } from '@/types/database'

export default function DeliveryPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'calendar' | 'locations'>('calendar')

  // Calendar month state (defaults to current Bangkok year/month)
  const currentBkk = getBangkokDateTime()
  const [calYear, setCalYear] = useState(currentBkk.year)
  const [calMonth, setCalMonth] = useState(currentBkk.month) // 1 - 12

  // Multi-date selection state (persist across month navigation!)
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set())

  // Single Date Modal State (to view/edit individual day)
  const [singleDateModal, setSingleDateModal] = useState<string | null>(null)
  const [isAddingLocationToSingleDate, setIsAddingLocationToSingleDate] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<DeliverySchedule | null>(null)

  // Single Date Quick Form
  const [singleScheduleForm, setSingleScheduleForm] = useState({
    location_id: '',
    location_name: '',
    building: '',
    route_name: '',
    description: '',
    is_active: true,
  })
  const [singleScheduleFormError, setSingleScheduleFormError] = useState('')

  // Bulk Configuration Modal State (Multi-Date × Multi-Location)
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)
  const [showBulkConfirmModal, setShowBulkConfirmModal] = useState(false)
  const [bulkSelectedLocationIds, setBulkSelectedLocationIds] = useState<Set<string>>(new Set())
  const [bulkLocationSearch, setBulkLocationSearch] = useState('')
  const [bulkDescription, setBulkDescription] = useState('')
  const [bulkIsActive, setBulkIsActive] = useState(true)
  const [bulkFormError, setBulkFormError] = useState('')
  const [bulkSuccessMessage, setBulkSuccessMessage] = useState('')

  // Location Management Tab State
  const [locationSearch, setLocationSearch] = useState('')
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false)
  const [editingLocation, setEditingLocation] = useState<DeliveryLocation | null>(null)
  const [locationForm, setLocationForm] = useState({
    name: '',
    building: '',
    route_name: '',
    description: '',
    is_active: true,
  })
  const [locationFormError, setLocationFormError] = useState('')

  // Queries
  const { data: locations = [], isLoading: isLoadingLocations } = useQuery({
    queryKey: ['admin-delivery-locations'],
    queryFn: fetchDeliveryLocations,
  })

  const { data: schedules = [] } = useQuery({
    queryKey: ['admin-delivery-schedules'],
    queryFn: fetchDeliverySchedules,
  })

  // Active locations only for new assignments
  const activeLocations = useMemo(() => {
    return locations.filter((loc) => loc.is_active)
  }, [locations])

  // Filtered active locations in bulk modal by search term
  const filteredBulkLocations = useMemo(() => {
    const q = bulkLocationSearch.toLowerCase().trim()
    if (!q) return activeLocations
    return activeLocations.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        (l.building && l.building.toLowerCase().includes(q)) ||
        (l.route_name && l.route_name.toLowerCase().includes(q)) ||
        (l.description && l.description.toLowerCase().includes(q))
    )
  }, [activeLocations, bulkLocationSearch])

  // Map schedules by date string
  const schedulesByDate = useMemo(() => {
    const map = new Map<string, DeliverySchedule[]>()
    schedules.forEach((sch) => {
      const list = map.get(sch.delivery_date) || []
      list.push(sch)
      map.set(sch.delivery_date, list)
    })
    return map
  }, [schedules])

  // Calendar days grid
  const calendarDays = useMemo(() => {
    return getCalendarMonthDays(calYear, calMonth)
  }, [calYear, calMonth])

  // Future selectable days in current visible month
  const visibleFutureDays = useMemo(() => {
    return calendarDays.filter((d) => d.isCurrentMonth && d.isFuture).map((d) => d.dateString)
  }, [calendarDays])

  // Single date schedules
  const singleDateSchedules = useMemo(() => {
    if (!singleDateModal) return []
    return schedulesByDate.get(singleDateModal) || []
  }, [singleDateModal, schedulesByDate])

  // Month navigation
  const prevMonth = () => {
    if (calMonth === 1) {
      setCalYear((y) => y - 1)
      setCalMonth(12)
    } else {
      setCalMonth((m) => m - 1)
    }
  }

  const nextMonth = () => {
    if (calMonth === 12) {
      setCalYear((y) => y + 1)
      setCalMonth(1)
    } else {
      setCalMonth((m) => m + 1)
    }
  }

  const jumpToToday = () => {
    setCalYear(currentBkk.year)
    setCalMonth(currentBkk.month)
  }

  // Multi-date selection helpers
  const toggleDateSelection = (dateStr: string, isFuture: boolean) => {
    if (!isFuture) return
    setSelectedDates((prev) => {
      const next = new Set(prev)
      if (next.has(dateStr)) {
        next.delete(dateStr)
      } else {
        next.add(dateStr)
      }
      return next
    })
  }

  const selectAllVisibleFutureDays = () => {
    setSelectedDates((prev) => {
      const next = new Set(prev)
      visibleFutureDays.forEach((d) => next.add(d))
      return next
    })
  }

  const clearSelection = () => {
    setSelectedDates(new Set())
  }

  // Sorted list of selected dates
  const selectedDatesList = useMemo(() => {
    return Array.from(selectedDates).sort()
  }, [selectedDates])

  // Selected locations list for bulk modal
  const bulkSelectedLocationsList = useMemo(() => {
    return activeLocations.filter((l) => bulkSelectedLocationIds.has(l.id))
  }, [activeLocations, bulkSelectedLocationIds])

  // Multi-location selection helpers for bulk modal
  const toggleLocationSelection = (locId: string) => {
    setBulkSelectedLocationIds((prev) => {
      const next = new Set(prev)
      if (next.has(locId)) {
        next.delete(locId)
      } else {
        next.add(locId)
      }
      return next
    })
  }

  const selectAllBulkLocations = () => {
    setBulkSelectedLocationIds(new Set(filteredBulkLocations.map((l) => l.id)))
  }

  const clearAllBulkLocations = () => {
    setBulkSelectedLocationIds(new Set())
  }

  // ==========================================
  // Single Schedule Mutations
  // ==========================================
  const singleScheduleMutation = useMutation({
    mutationFn: async () => {
      if (!singleDateModal) throw new Error('กรุณาเลือกวันที่')
      if (!isStrictlyFutureDate(singleDateModal)) {
        throw new Error('วันที่ต้องเป็นวันในอนาคตเท่านั้น')
      }
      if (!singleScheduleForm.location_name.trim()) {
        throw new Error('กรุณาระบุหรือเลือกสถานที่จัดส่ง')
      }

      if (editingSchedule) {
        return updateDeliverySchedule(editingSchedule.id, {
          ...singleScheduleForm,
          delivery_date: singleDateModal,
        })
      } else {
        return createDeliverySchedule({
          ...singleScheduleForm,
          delivery_date: singleDateModal,
        })
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-delivery-schedules'] })
      void queryClient.invalidateQueries({ queryKey: ['delivery-schedules'] })
      void queryClient.invalidateQueries({ queryKey: ['active-upcoming-schedules'] })
      setIsAddingLocationToSingleDate(false)
      setEditingSchedule(null)
      setSingleScheduleForm({
        location_id: '',
        location_name: '',
        building: '',
        route_name: '',
        description: '',
        is_active: true,
      })
      setSingleScheduleFormError('')
    },
    onError: (err: any) => {
      setSingleScheduleFormError(err.message || 'เกิดข้อผิดพลาดในการบันทึก')
    },
  })

  const deleteScheduleMutation = useMutation({
    mutationFn: (id: string) => deleteDeliverySchedule(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-delivery-schedules'] })
      void queryClient.invalidateQueries({ queryKey: ['delivery-schedules'] })
      void queryClient.invalidateQueries({ queryKey: ['active-upcoming-schedules'] })
    },
    onError: (err: any) => alert(err.message || 'เกิดข้อผิดพลาดในการลบ'),
  })

  const toggleScheduleActive = async (sch: DeliverySchedule) => {
    try {
      await updateDeliverySchedule(sch.id, { is_active: !sch.is_active })
      void queryClient.invalidateQueries({ queryKey: ['admin-delivery-schedules'] })
      void queryClient.invalidateQueries({ queryKey: ['active-upcoming-schedules'] })
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาด')
    }
  }

  // ==========================================
  // Bulk Multi-Date × Multi-Location Matrix Mutation
  // ==========================================
  const bulkMatrixMutation = useMutation({
    mutationFn: async () => {
      if (selectedDatesList.length === 0) throw new Error('กรุณาเลือกวันที่')
      if (bulkSelectedLocationIds.size === 0) throw new Error('กรุณาเลือกสถานที่จัดส่งอย่างน้อย 1 แห่ง')

      return bulkCreateOrUpdateMultiDateLocationMatrix(
        selectedDatesList,
        Array.from(bulkSelectedLocationIds),
        {
          description: bulkDescription,
          is_active: bulkIsActive,
        }
      )
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['admin-delivery-schedules'] })
      void queryClient.invalidateQueries({ queryKey: ['delivery-schedules'] })
      void queryClient.invalidateQueries({ queryKey: ['active-upcoming-schedules'] })

      setBulkSuccessMessage(
        `บันทึกสำเร็จทั้งหมด ${result.totalSchedules} รอบจัดส่ง (${result.totalDates} วัน × ${result.totalLocations} สถานที่)`
      )
      setIsBulkModalOpen(false)
      setShowBulkConfirmModal(false)
      clearSelection()
      setBulkSelectedLocationIds(new Set())

      setTimeout(() => setBulkSuccessMessage(''), 6000)
    },
    onError: (err: any) => {
      setBulkFormError(err.message || 'เกิดข้อผิดพลาดในการบันทึกแบบกลุ่ม')
    },
  })

  const bulkActivateMutation = useMutation({
    mutationFn: (isActive: boolean) => bulkUpdateSchedulesStatus(selectedDatesList, isActive),
    onSuccess: (count) => {
      void queryClient.invalidateQueries({ queryKey: ['admin-delivery-schedules'] })
      void queryClient.invalidateQueries({ queryKey: ['active-upcoming-schedules'] })
      setBulkSuccessMessage(`อัปเดตสถานะรอบจัดส่งแล้ว ${count} รายการ`)
      clearSelection()
      setTimeout(() => setBulkSuccessMessage(''), 4000)
    },
    onError: (err: any) => alert(err.message || 'เกิดข้อผิดพลาด'),
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: () => bulkDeleteSchedulesByDates(selectedDatesList),
    onSuccess: (count) => {
      void queryClient.invalidateQueries({ queryKey: ['admin-delivery-schedules'] })
      void queryClient.invalidateQueries({ queryKey: ['active-upcoming-schedules'] })
      setBulkSuccessMessage(`ลบรอบจัดส่งแล้ว ${count} รายการ`)
      clearSelection()
      setTimeout(() => setBulkSuccessMessage(''), 4000)
    },
    onError: (err: any) => alert(err.message || 'เกิดข้อผิดพลาด'),
  })

  const openBulkConfigureModal = () => {
    if (selectedDatesList.length === 0) return
    setBulkLocationSearch('')
    setBulkDescription('')
    setBulkIsActive(true)
    setBulkFormError('')
    // Default select all active locations or clear based on preference
    setIsBulkModalOpen(true)
  }

  // ==========================================
  // Location Preset Mutations
  // ==========================================
  const locationMutation = useMutation({
    mutationFn: async () => {
      if (!locationForm.name.trim()) throw new Error('กรุณากรอกชื่อสถานที่')
      if (editingLocation) {
        return updateDeliveryLocation(editingLocation.id, locationForm)
      } else {
        return createDeliveryLocation(locationForm)
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-delivery-locations'] })
      setIsLocationModalOpen(false)
      setEditingLocation(null)
      setLocationForm({ name: '', building: '', route_name: '', description: '', is_active: true })
      setLocationFormError('')
    },
    onError: (err: any) => {
      setLocationFormError(err.message || 'เกิดข้อผิดพลาด')
    },
  })

  const deleteLocationMutation = useMutation({
    mutationFn: (id: string) => deleteDeliveryLocation(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-delivery-locations'] })
    },
    onError: (err: any) => alert(err.message || 'เกิดข้อผิดพลาดในการลบ'),
  })

  const filteredLocations = locations.filter((l) => {
    const q = locationSearch.toLowerCase()
    return (
      l.name.toLowerCase().includes(q) ||
      (l.building && l.building.toLowerCase().includes(q)) ||
      (l.route_name && l.route_name.toLowerCase().includes(q))
    )
  })

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-32">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))] flex items-center gap-2.5">
            <CalendarIcon className="h-6 w-6 text-[hsl(var(--primary))]" />
            ปฏิทินรอบจัดส่ง (Multi-Date & Multi-Location Calendar)
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            เลือกหลายวัน + เลือกหลายสถานที่เพื่อสร้างรอบจัดส่งสินค้า (Scheduled Route Delivery) ในครั้งเดียว
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1 rounded-2xl bg-[hsl(var(--muted))]/50 p-1 border border-[hsl(var(--border))]">
          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
              activeTab === 'calendar'
                ? 'bg-[hsl(var(--card))] text-[hsl(var(--primary))] shadow-sm'
                : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
            }`}
          >
            <CalendarIcon className="h-4 w-4" />
            ปฏิทิน (Calendar View)
          </button>
          <button
            onClick={() => setActiveTab('locations')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
              activeTab === 'locations'
                ? 'bg-[hsl(var(--card))] text-[hsl(var(--primary))] shadow-sm'
                : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
            }`}
          >
            <Building className="h-4 w-4" />
            สถานที่ที่บันทึกไว้ ({locations.length})
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {bulkSuccessMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2.5 shadow-sm"
        >
          <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
          <span>{bulkSuccessMessage}</span>
        </motion.div>
      )}

      {/* ======================================================== */}
      {/* TAB 1: CALENDAR VIEW */}
      {/* ======================================================== */}
      {activeTab === 'calendar' && (
        <div className="space-y-4">
          {/* Calendar Navigation & Selection Toolbar */}
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-sm space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {/* Month Navigation */}
              <div className="flex items-center gap-2">
                <button
                  onClick={prevMonth}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))]"
                  title="เดือนก่อนหน้า"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <h2 className="min-w-[170px] text-center text-lg font-bold text-[hsl(var(--foreground))]">
                  {MONTH_NAMES_THAI[calMonth - 1]} {calYear + 543} ({calYear})
                </h2>
                <button
                  onClick={nextMonth}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))]"
                  title="เดือนถัดไป"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  onClick={jumpToToday}
                  className="ml-2 rounded-xl border border-[hsl(var(--border))] px-3 py-1.5 text-xs font-semibold text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))]"
                >
                  เดือนปัจจุบัน
                </button>
              </div>

              {/* Multi-select Quick Helpers */}
              <div className="flex items-center gap-2">
                <button
                  onClick={selectAllVisibleFutureDays}
                  className="flex items-center gap-1.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-1.5 text-xs font-semibold text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))]"
                >
                  <CheckSquare className="h-3.5 w-3.5 text-[hsl(var(--primary))]" />
                  เลือกทุกวันในเดือนนี้ ({visibleFutureDays.length} วัน)
                </button>
                {selectedDates.size > 0 && (
                  <button
                    onClick={clearSelection}
                    className="flex items-center gap-1.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-1.5 text-xs font-semibold text-[hsl(var(--muted-foreground))] hover:text-rose-500"
                  >
                    <X className="h-3.5 w-3.5" />
                    ล้างที่เลือก ({selectedDates.size})
                  </button>
                )}
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 border-t border-[hsl(var(--border))]/60 pt-3 text-xs text-[hsl(var(--muted-foreground))]">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-md bg-[hsl(var(--primary))]" />
                <span>มีรอบจัดส่ง (เปิดรับ)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-md bg-rose-500/80" />
                <span>ปิดรับชั่วคราว</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-md border-2 border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/20" />
                <span>วันที่เลือกไว้ (Selected)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-md bg-[hsl(var(--muted))]/50 opacity-60" />
                <span>วันนี้ / วันในอดีต (ปิด)</span>
              </div>
            </div>
          </div>

          {/* Calendar Month Grid */}
          <div className="overflow-hidden rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm">
            {/* Weekday Header */}
            <div className="grid grid-cols-7 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/40 text-center text-xs font-bold text-[hsl(var(--muted-foreground))]">
              {['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสฯ', 'ศุกร์', 'เสาร์'].map((day, idx) => (
                <div key={idx} className="py-3">
                  <span className="hidden sm:inline">{day}</span>
                  <span className="sm:hidden">{day.slice(0, 2)}</span>
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 divide-x divide-y divide-[hsl(var(--border))]">
              {calendarDays.map((day) => {
                const daySchedules = schedulesByDate.get(day.dateString) || []
                const hasSchedules = daySchedules.length > 0
                const activeCount = daySchedules.filter((s) => s.is_active).length

                const isSelected = selectedDates.has(day.dateString)
                const isClickable = day.isFuture

                return (
                  <div
                    key={day.dateString}
                    onClick={() => toggleDateSelection(day.dateString, day.isFuture)}
                    className={`group relative min-h-[95px] p-2 transition-all sm:min-h-[115px] select-none ${
                      !day.isCurrentMonth
                        ? 'bg-[hsl(var(--muted))]/20 opacity-40'
                        : day.isPast || day.isToday
                        ? 'bg-[hsl(var(--muted))]/30 cursor-not-allowed'
                        : isClickable
                        ? 'cursor-pointer hover:bg-[hsl(var(--accent))]/50'
                        : ''
                    } ${
                      isSelected
                        ? 'bg-[hsl(var(--primary))]/10 ring-2 ring-inset ring-[hsl(var(--primary))]'
                        : ''
                    }`}
                  >
                    {/* Top Row: Date Number + Checkbox/Badge */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {day.isFuture && (
                          <div
                            className={`flex h-4 w-4 items-center justify-center rounded transition-colors ${
                              isSelected
                                ? 'bg-[hsl(var(--primary))] text-white'
                                : 'border border-[hsl(var(--border))] group-hover:border-[hsl(var(--primary))]'
                            }`}
                          >
                            {isSelected ? (
                              <Check className="h-3 w-3 stroke-[3]" />
                            ) : (
                              <span className="opacity-0 group-hover:opacity-100 text-[9px] text-[hsl(var(--primary))]">+</span>
                            )}
                          </div>
                        )}
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                            day.isToday
                              ? 'bg-amber-500 text-white'
                              : hasSchedules && activeCount > 0
                              ? 'bg-[hsl(var(--primary))] text-white'
                              : day.isFuture
                              ? 'text-[hsl(var(--foreground))] font-extrabold'
                              : 'text-[hsl(var(--muted-foreground))]'
                          }`}
                        >
                          {day.dayNumber}
                        </span>
                      </div>

                      {day.isToday && (
                        <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-extrabold text-amber-600 dark:text-amber-400">
                          วันนี้
                        </span>
                      )}

                      {/* Manage Single Date Button */}
                      {day.isFuture && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSingleDateModal(day.dateString)
                            setIsAddingLocationToSingleDate(false)
                            setEditingSchedule(null)
                          }}
                          className="rounded-lg p-1 text-[10px] text-[hsl(var(--muted-foreground))] opacity-0 hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--primary))] group-hover:opacity-100 transition-opacity"
                          title="ดูรายละเอียด/จัดการเฉพาะวันนี้"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    {/* Schedule Badges */}
                    {hasSchedules && (
                      <div className="mt-2 space-y-1">
                        {daySchedules.slice(0, 2).map((sch) => (
                          <div
                            key={sch.id}
                            className={`truncate rounded-md px-1.5 py-0.5 text-[10px] font-semibold transition-colors ${
                              sch.is_active
                                ? 'bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] border border-[hsl(var(--primary))]/20'
                                : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                            }`}
                            title={`${sch.location_name} ${sch.building ? `(${sch.building})` : ''}`}
                          >
                            📍 {sch.location_name}
                          </div>
                        ))}
                        {daySchedules.length > 2 && (
                          <div className="text-[9px] font-bold text-[hsl(var(--muted-foreground))] pl-1">
                            +{daySchedules.length - 2} จุดส่ง
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* FLOATING BULK ACTIONS BAR (When 1 or more dates selected) */}
      {/* ======================================================== */}
      <AnimatePresence>
        {selectedDates.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 inset-x-4 max-w-4xl mx-auto z-40 rounded-3xl border border-[hsl(var(--primary))]/30 bg-[hsl(var(--card))]/95 p-4 shadow-2xl backdrop-blur-md"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[hsl(var(--primary))] text-white font-black text-base shadow-md shadow-[hsl(var(--primary))]/25">
                  {selectedDates.size}
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[hsl(var(--foreground))]">
                    เลือกไว้ทั้งหมด {selectedDates.size} วัน
                  </h3>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    {selectedDatesList.slice(0, 3).map((d) => formatDeliveryDateThai(d)).join(', ')}
                    {selectedDates.size > 3 ? ` และอีก ${selectedDates.size - 3} วัน` : ''}
                  </p>
                </div>
              </div>

              {/* Bulk Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={openBulkConfigureModal}
                  className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[hsl(var(--primary))]/90 transition-all active:scale-[0.98]"
                >
                  <Sparkles className="h-4 w-4" />
                  เลือกสถานที่และกำหนดรอบ ({selectedDates.size} วัน)
                </button>

                <button
                  onClick={() => bulkActivateMutation.mutate(true)}
                  disabled={bulkActivateMutation.isPending}
                  className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400"
                  title="เปิดรับออเดอร์ทุกจุดในวันที่เลือก"
                >
                  เปิดรับทั้งหมด
                </button>

                <button
                  onClick={() => bulkActivateMutation.mutate(false)}
                  disabled={bulkActivateMutation.isPending}
                  className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-500/20 dark:text-rose-400"
                  title="ปิดรับออเดอร์ชั่วคราวในวันที่เลือก"
                >
                  ปิดรับทั้งหมด
                </button>

                <button
                  onClick={() => {
                    if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบรอบจัดส่งทั้งหมดใน ${selectedDates.size} วันที่เลือกไว้?`)) {
                      bulkDeleteMutation.mutate()
                    }
                  }}
                  disabled={bulkDeleteMutation.isPending}
                  className="rounded-xl border border-[hsl(var(--border))] p-2 text-xs text-rose-500 hover:bg-rose-500/10"
                  title="ลบรอบจัดส่งในวันที่เลือก"
                >
                  <Trash2 className="h-4 w-4" />
                </button>

                <button
                  onClick={clearSelection}
                  className="rounded-xl border border-[hsl(var(--border))] px-3 py-2 text-xs font-semibold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))]"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* MODAL 1: BULK CONFIGURATION PANEL (Multi-Date × Multi-Location) */}
      {/* ======================================================== */}
      <AnimatePresence>
        {isBulkModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-2xl"
            >
              <div className="mb-4 flex items-center justify-between border-b border-[hsl(var(--border))] pb-3">
                <div>
                  <h2 className="text-lg font-bold text-[hsl(var(--foreground))]">
                    กำหนดรอบจัดส่งแบบกลุ่ม (Multi-Location Bulk Setup)
                  </h2>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    เลือกหลายสถานที่พร้อมกันเพื่อนำไปจัดรอบให้กับ {selectedDates.size} วันที่เลือก
                  </p>
                </div>
                <button
                  onClick={() => setIsBulkModalOpen(false)}
                  className="rounded-lg p-1 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Selected Dates Chips Preview */}
              <div className="mb-4 rounded-2xl bg-[hsl(var(--muted))]/40 p-3.5">
                <label className="text-[11px] font-bold text-[hsl(var(--muted-foreground))] uppercase block mb-1.5">
                  วันที่เลือก ({selectedDates.size} วัน):
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                  {selectedDatesList.map((d) => (
                    <span
                      key={d}
                      className="rounded-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] px-2 py-0.5 text-[11px] font-semibold text-[hsl(var(--foreground))]"
                    >
                      📅 {formatDeliveryDateThai(d)}
                    </span>
                  ))}
                </div>
              </div>

              {bulkFormError && (
                <div className="mb-4 rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                  {bulkFormError}
                </div>
              )}

              {/* Section 1: Multi-Select Existing Locations */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="text-sm font-bold text-[hsl(var(--foreground))] flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-[hsl(var(--primary))]" />
                      เลือกสถานที่จัดส่ง (Select Existing Locations) <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-xs font-semibold text-[hsl(var(--primary))]">
                      เลือกแล้ว {bulkSelectedLocationIds.size} แห่ง
                    </span>
                  </div>

                  {/* Multi-Select Helpers */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={selectAllBulkLocations}
                      className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2.5 py-1 text-xs font-semibold text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))]"
                    >
                      เลือกทั้งหมด ({filteredBulkLocations.length})
                    </button>
                    {bulkSelectedLocationIds.size > 0 && (
                      <button
                        type="button"
                        onClick={clearAllBulkLocations}
                        className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2.5 py-1 text-xs font-semibold text-[hsl(var(--muted-foreground))] hover:text-rose-500"
                      >
                        ล้างที่เลือก
                      </button>
                    )}
                  </div>
                </div>

                {/* Location Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
                  <input
                    type="text"
                    placeholder="ค้นหาชื่อสถานที่, อาคาร, เส้นทาง..."
                    value={bulkLocationSearch}
                    onChange={(e) => setBulkLocationSearch(e.target.value)}
                    className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] pl-8 pr-3 py-1.5 text-xs text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                  />
                </div>

                {/* Locations Checkbox Grid */}
                {activeLocations.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[hsl(var(--border))] p-6 text-center text-xs text-[hsl(var(--muted-foreground))]">
                    ยังไม่มีสถานที่ที่บันทึกไว้ในระบบ กรุณาเพิ่มสถานที่ในแท็บ "สถานที่ที่บันทึกไว้" ก่อน
                  </div>
                ) : filteredBulkLocations.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[hsl(var(--border))] p-6 text-center text-xs text-[hsl(var(--muted-foreground))]">
                    ไม่พบสถานที่ที่ตรงกับคำค้นหา
                  </div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2 max-h-56 overflow-y-auto p-1">
                    {filteredBulkLocations.map((loc) => {
                      const isChecked = bulkSelectedLocationIds.has(loc.id)
                      return (
                        <div
                          key={loc.id}
                          onClick={() => toggleLocationSelection(loc.id)}
                          className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-2.5 transition-all ${
                            isChecked
                              ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10 ring-1 ring-[hsl(var(--primary))]'
                              : 'border-[hsl(var(--border))] bg-[hsl(var(--background))] hover:border-[hsl(var(--primary))]/40 hover:bg-[hsl(var(--accent))]'
                          }`}
                        >
                          <div
                            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                              isChecked
                                ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-white'
                                : 'border-[hsl(var(--border))] bg-[hsl(var(--card))]'
                            }`}
                          >
                            {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                          </div>

                          <div className="min-w-0 flex-1">
                            <h4 className="truncate text-xs font-bold text-[hsl(var(--foreground))]">
                              {loc.name}
                            </h4>
                            {loc.building && (
                              <p className="truncate text-[11px] font-semibold text-[hsl(var(--primary))]">
                                🏢 {loc.building}
                              </p>
                            )}
                            {loc.route_name && (
                              <p className="truncate text-[10px] text-[hsl(var(--muted-foreground))]">
                                เส้นทาง: {loc.route_name}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Shared Options */}
              <div className="mt-4 space-y-3 border-t border-[hsl(var(--border))] pt-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[hsl(var(--foreground))]">
                    คำอธิบายเพิ่มเติม / จุดนัดรับ (Description - ใช้ร่วมกันทุกจุด)
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น จัดส่งที่เคาน์เตอร์ล็อบบี้ส่วนกลาง"
                    value={bulkDescription}
                    onChange={(e) => setBulkDescription(e.target.value)}
                    className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-xs text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="bulk_matrix_active"
                    checked={bulkIsActive}
                    onChange={(e) => setBulkIsActive(e.target.checked)}
                    className="h-4 w-4 rounded text-[hsl(var(--primary))]"
                  />
                  <label htmlFor="bulk_matrix_active" className="text-xs font-medium text-[hsl(var(--foreground))]">
                    เปิดรับออเดอร์สำหรับทุกรอบที่สร้าง (Active)
                  </label>
                </div>
              </div>

              {/* Calculation Banner (Section 7) */}
              <div className="mt-4 rounded-2xl bg-[hsl(var(--primary))]/10 border border-[hsl(var(--primary))]/20 p-3.5 flex items-center justify-between text-xs text-[hsl(var(--primary))]">
                <span className="font-semibold">
                  {selectedDates.size} วัน × {bulkSelectedLocationIds.size} สถานที่
                </span>
                <span className="font-extrabold text-sm">
                  = {selectedDates.size * bulkSelectedLocationIds.size} รอบจัดส่ง
                </span>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 border-t border-[hsl(var(--border))] pt-4">
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="rounded-xl border border-[hsl(var(--border))] px-4 py-2 text-xs font-semibold text-[hsl(var(--foreground))]"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={bulkSelectedLocationIds.size === 0}
                  onClick={() => {
                    if (bulkSelectedLocationIds.size === 0) {
                      setBulkFormError('กรุณาเลือกสถานที่อย่างน้อย 1 แห่ง')
                      return
                    }
                    setBulkFormError('')
                    setShowBulkConfirmModal(true)
                  }}
                  className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[hsl(var(--primary))]/90 disabled:opacity-50"
                >
                  ตรวจสอบและนำไปใช้ ({selectedDates.size * bulkSelectedLocationIds.size} รอบ)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* MODAL 2: BULK CONFIRMATION SUMMARY (Section 8) */}
      {/* ======================================================== */}
      <AnimatePresence>
        {showBulkConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-2xl text-center"
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]">
                <Sparkles className="h-7 w-7" />
              </div>

              <h2 className="text-lg font-bold text-[hsl(var(--foreground))]">ยืนยันการตั้งค่ารอบจัดส่ง</h2>
              <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                คุณกำลังจะบันทึกรอบจัดส่งทั้งหมด {selectedDates.size * bulkSelectedLocationIds.size} รอบ
              </p>

              {/* Summary Card */}
              <div className="my-4 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-4 text-left space-y-3 text-xs">
                <div>
                  <strong className="text-[hsl(var(--muted-foreground))] block mb-1">
                    วันที่จัดส่ง ({selectedDates.size} วัน):
                  </strong>
                  <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                    {selectedDatesList.map((d) => (
                      <span key={d} className="rounded bg-[hsl(var(--muted))] px-2 py-0.5 text-[11px] font-semibold">
                        {formatDeliveryDateThai(d)}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <strong className="text-[hsl(var(--muted-foreground))] block mb-1">
                    สถานที่จัดส่ง ({bulkSelectedLocationIds.size} แห่ง):
                  </strong>
                  <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                    {bulkSelectedLocationsList.map((loc) => (
                      <span key={loc.id} className="rounded bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] px-2 py-0.5 text-[11px] font-bold">
                        📍 {loc.name} {loc.building ? `(${loc.building})` : ''}
                      </span>
                    ))}
                  </div>
                </div>

                {bulkDescription && (
                  <div>
                    <strong className="text-[hsl(var(--muted-foreground))] block">คำอธิบาย:</strong>
                    <span className="text-[hsl(var(--foreground))]">{bulkDescription}</span>
                  </div>
                )}

                <div>
                  <strong className="text-[hsl(var(--muted-foreground))] block">สถานะ:</strong>
                  <span className={bulkIsActive ? 'font-bold text-emerald-600' : 'font-bold text-rose-500'}>
                    {bulkIsActive ? 'เปิดรับออเดอร์ (Active)' : 'ปิดชั่วคราว (Inactive)'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowBulkConfirmModal(false)}
                  className="rounded-xl border border-[hsl(var(--border))] px-4 py-2.5 text-xs font-semibold text-[hsl(var(--foreground))]"
                >
                  ย้อนกลับ
                </button>
                <button
                  type="button"
                  onClick={() => bulkMatrixMutation.mutate()}
                  disabled={bulkMatrixMutation.isPending}
                  className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[hsl(var(--primary))]/90"
                >
                  {bulkMatrixMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> กำลังบันทึก...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" /> ยืนยันและบันทึก ({selectedDates.size * bulkSelectedLocationIds.size} รอบ)
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* MODAL 3: SINGLE DATE MANAGER (Individual Day View & Edit) */}
      {/* ======================================================== */}
      <AnimatePresence>
        {singleDateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-2xl"
            >
              <div className="mb-5 flex items-center justify-between border-b border-[hsl(var(--border))] pb-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-[hsl(var(--primary))] uppercase">
                    <CalendarIcon className="h-4 w-4" /> รอบจัดส่งประจำวัน (Single Date)
                  </div>
                  <h2 className="text-xl font-black text-[hsl(var(--foreground))] mt-0.5">
                    {formatDeliveryDateThai(singleDateModal)}
                  </h2>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">วันที่: {singleDateModal}</p>
                </div>
                <button
                  onClick={() => setSingleDateModal(null)}
                  className="rounded-full p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* LIST OF CONFIGURED LOCATIONS ON THIS DATE */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
                    <Layers className="h-4 w-4 text-[hsl(var(--primary))]" />
                    สถานที่ที่จัดส่งในวันนี้ ({singleDateSchedules.length} แห่ง)
                  </h3>

                  {!isAddingLocationToSingleDate && (
                    <button
                      onClick={() => {
                        setEditingSchedule(null)
                        setSingleScheduleForm({
                          location_id: '',
                          location_name: '',
                          building: '',
                          route_name: '',
                          description: '',
                          is_active: true,
                        })
                        setSingleScheduleFormError('')
                        setIsAddingLocationToSingleDate(true)
                      }}
                      className="flex items-center gap-1.5 rounded-xl bg-[hsl(var(--primary))] px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-[hsl(var(--primary))]/90"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      เพิ่มจุดส่งในวันนี้
                    </button>
                  )}
                </div>

                {singleDateSchedules.length === 0 && !isAddingLocationToSingleDate ? (
                  <div className="rounded-2xl border border-dashed border-[hsl(var(--border))] p-6 text-center">
                    <MapPin className="mx-auto h-8 w-8 text-[hsl(var(--muted-foreground))]/40" />
                    <p className="mt-2 text-sm font-semibold text-[hsl(var(--foreground))]">
                      ยังไม่ได้กำหนดจุดจัดส่งในวันนี้
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {singleDateSchedules.map((sch) => (
                      <div
                        key={sch.id}
                        className={`flex items-start justify-between rounded-2xl border p-4 transition-all ${
                          sch.is_active
                            ? 'border-[hsl(var(--border))] bg-[hsl(var(--background))] shadow-sm'
                            : 'border-[hsl(var(--border))] bg-[hsl(var(--muted))]/40 opacity-70'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-[hsl(var(--foreground))]">
                              📍 {sch.location_name}
                            </span>
                            {sch.building && (
                              <span className="rounded-md bg-[hsl(var(--primary))]/10 px-2 py-0.5 text-[11px] font-semibold text-[hsl(var(--primary))]">
                                {sch.building}
                              </span>
                            )}
                          </div>
                          {sch.route_name && (
                            <p className="text-xs text-[hsl(var(--muted-foreground))]">
                              เส้นทาง: {sch.route_name}
                            </p>
                          )}
                          {sch.description && (
                            <p className="text-xs text-[hsl(var(--muted-foreground))] rounded bg-[hsl(var(--muted))]/50 px-2 py-1 mt-1">
                              {sch.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleScheduleActive(sch)}
                            className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors ${
                              sch.is_active
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                                : 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400'
                            }`}
                          >
                            {sch.is_active ? 'เปิดรับ' : 'ปิด'}
                          </button>
                          <button
                            onClick={() => {
                              setEditingSchedule(sch)
                              setSingleScheduleForm({
                                location_id: sch.location_id || '',
                                location_name: sch.location_name,
                                building: sch.building || '',
                                route_name: sch.route_name || '',
                                description: sch.description || '',
                                is_active: sch.is_active,
                              })
                              setSingleScheduleFormError('')
                              setIsAddingLocationToSingleDate(true)
                            }}
                            className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"
                            title="แก้ไข"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`ลบจุดส่ง "${sch.location_name}" ในวันที่ ${singleDateModal}?`)) {
                                deleteScheduleMutation.mutate(sch.id)
                              }
                            }}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                            title="ลบ"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Single Date Form */}
                <AnimatePresence>
                  {isAddingLocationToSingleDate && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden rounded-2xl border border-[hsl(var(--primary))]/30 bg-[hsl(var(--card))] p-4 shadow-sm"
                    >
                      <div className="mb-3 flex items-center justify-between border-b border-[hsl(var(--border))] pb-2">
                        <h4 className="text-sm font-bold text-[hsl(var(--foreground))]">
                          {editingSchedule ? 'แก้ไขจุดจัดส่ง' : 'เพิ่มจุดจัดส่งใหม่สำหรับวันนี้'}
                        </h4>
                        <button
                          onClick={() => {
                            setIsAddingLocationToSingleDate(false)
                            setEditingSchedule(null)
                          }}
                          className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      {singleScheduleFormError && (
                        <div className="mb-3 rounded-xl bg-rose-50 p-2.5 text-xs text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                          {singleScheduleFormError}
                        </div>
                      )}

                      <form
                        onSubmit={(e) => {
                          e.preventDefault()
                          singleScheduleMutation.mutate()
                        }}
                        className="space-y-3"
                      >
                        {locations.length > 0 && (
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-[hsl(var(--foreground))]">
                              เลือกจากสถานที่ที่บันทึกไว้ (Presets)
                            </label>
                            <select
                              value={singleScheduleForm.location_id}
                              onChange={(e) => {
                                const loc = locations.find((l) => l.id === e.target.value)
                                if (loc) {
                                  setSingleScheduleForm((prev) => ({
                                    ...prev,
                                    location_id: loc.id,
                                    location_name: loc.name,
                                    building: loc.building || '',
                                    route_name: loc.route_name || '',
                                    description: loc.description || prev.description,
                                  }))
                                } else {
                                  setSingleScheduleForm((prev) => ({ ...prev, location_id: '' }))
                                }
                              }}
                              className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-xs text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                            >
                              <option value="">-- พิมพ์เอง หรือ เลือกจากสถานที่ที่บันทึกไว้ --</option>
                              {locations.map((loc) => (
                                <option key={loc.id} value={loc.id}>
                                  {loc.name} {loc.building ? `(${loc.building})` : ''} {loc.route_name ? `• ${loc.route_name}` : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div className="grid gap-2 sm:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-[hsl(var(--foreground))]">
                              ชื่อสถานที่ / จุดส่ง <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              placeholder="เช่น ABC Tower"
                              value={singleScheduleForm.location_name}
                              onChange={(e) => setSingleScheduleForm({ ...singleScheduleForm, location_name: e.target.value })}
                              required
                              className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-xs text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-[hsl(var(--foreground))]">
                              ชื่ออาคาร / ตึก
                            </label>
                            <input
                              type="text"
                              placeholder="เช่น อาคาร A"
                              value={singleScheduleForm.building}
                              onChange={(e) => setSingleScheduleForm({ ...singleScheduleForm, building: e.target.value })}
                              className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-xs text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-semibold text-[hsl(var(--foreground))]">
                            ชื่อเส้นทาง (Route Name)
                          </label>
                          <input
                            type="text"
                            placeholder="เช่น Route 1"
                            value={singleScheduleForm.route_name}
                            onChange={(e) => setSingleScheduleForm({ ...singleScheduleForm, route_name: e.target.value })}
                            className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-xs text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-semibold text-[hsl(var(--foreground))]">
                            คำอธิบาย / จุดนัดรับ
                          </label>
                          <input
                            type="text"
                            placeholder="เช่น จัดส่งที่เคาน์เตอร์ล็อบบี้ชั้น 1"
                            value={singleScheduleForm.description}
                            onChange={(e) => setSingleScheduleForm({ ...singleScheduleForm, description: e.target.value })}
                            className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-xs text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                          />
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="checkbox"
                            id="single_is_active"
                            checked={singleScheduleForm.is_active}
                            onChange={(e) => setSingleScheduleForm({ ...singleScheduleForm, is_active: e.target.checked })}
                            className="h-4 w-4 rounded text-[hsl(var(--primary))]"
                          />
                          <label htmlFor="single_is_active" className="text-xs font-medium text-[hsl(var(--foreground))]">
                            เปิดรับออเดอร์ในจุดส่งนี้ (Active)
                          </label>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setIsAddingLocationToSingleDate(false)
                              setEditingSchedule(null)
                            }}
                            className="rounded-xl border border-[hsl(var(--border))] px-3 py-1.5 text-xs font-semibold text-[hsl(var(--foreground))]"
                          >
                            ยกเลิก
                          </button>
                          <button
                            type="submit"
                            disabled={singleScheduleMutation.isPending}
                            className="flex items-center gap-1.5 rounded-xl bg-[hsl(var(--primary))] px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-[hsl(var(--primary))]/90"
                          >
                            {singleScheduleMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                            บันทึกจุดส่ง
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="mt-6 border-t border-[hsl(var(--border))] pt-4 flex justify-end">
                <button
                  onClick={() => setSingleDateModal(null)}
                  className="rounded-xl bg-[hsl(var(--muted))] px-5 py-2 text-xs font-bold text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))]"
                >
                  เสร็จสิ้น / ปิดหน้าต่าง
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* TAB 2: LOCATIONS MANAGEMENT VIEW */}
      {/* ======================================================== */}
      {activeTab === 'locations' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
              <input
                type="text"
                placeholder="ค้นหาชื่อสถานที่, อาคาร, เส้นทาง..."
                value={locationSearch}
                onChange={(e) => setLocationSearch(e.target.value)}
                className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] pl-9 pr-3 py-2 text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              />
            </div>
            <button
              onClick={() => {
                setEditingLocation(null)
                setLocationForm({ name: '', building: '', route_name: '', description: '', is_active: true })
                setLocationFormError('')
                setIsLocationModalOpen(true)
              }}
              className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[hsl(var(--primary))]/90"
            >
              <Plus className="h-4 w-4" />
              เพิ่มสถานที่ใหม่ (Add Location Preset)
            </button>
          </div>

          {isLoadingLocations ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--primary))]" />
            </div>
          ) : filteredLocations.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-[hsl(var(--border))] py-12 text-center">
              <Building className="h-12 w-12 text-[hsl(var(--muted-foreground))]/40" />
              <h3 className="mt-3 text-base font-semibold text-[hsl(var(--foreground))]">ยังไม่มีสถานที่ที่บันทึกไว้</h3>
              <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                เพิ่มสถานที่ เช่น ตึกสำนักงาน มหาวิทยาลัย หรือโซนประจำเพื่อเลือกในปฏิทินได้เร็วขึ้น
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {filteredLocations.map((loc) => (
                <div
                  key={loc.id}
                  className="flex flex-col justify-between rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-sm"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]">
                          <MapPin className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="font-bold text-[hsl(var(--foreground))]">{loc.name}</h3>
                          {loc.building && (
                            <p className="text-xs text-[hsl(var(--muted-foreground))]">ตึก: {loc.building}</p>
                          )}
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          loc.is_active
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400'
                        }`}
                      >
                        {loc.is_active ? 'ใช้งาน' : 'ปิด'}
                      </span>
                    </div>

                    {loc.route_name && (
                      <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
                        เส้นทาง: <span className="font-medium text-[hsl(var(--foreground))]">{loc.route_name}</span>
                      </p>
                    )}

                    {loc.description && (
                      <p className="mt-2 rounded-lg bg-[hsl(var(--muted))]/40 p-2 text-xs text-[hsl(var(--muted-foreground))]">
                        {loc.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-end gap-2 border-t border-[hsl(var(--border))]/60 pt-3">
                    <button
                      onClick={() => {
                        setEditingLocation(loc)
                        setLocationForm({
                          name: loc.name,
                          building: loc.building || '',
                          route_name: loc.route_name || '',
                          description: loc.description || '',
                          is_active: loc.is_active,
                        })
                        setLocationFormError('')
                        setIsLocationModalOpen(true)
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                      title="แก้ไข"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`ต้องการลบสถานที่ "${loc.name}" หรือไม่? (ออเดอร์ในอดีตไม่ได้รับผลกระทบ)`)) {
                          deleteLocationMutation.mutate(loc.id)
                        }
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                      title="ลบ"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: LOCATION PRESET MANAGER (Add / Edit Preset) */}
      {/* ======================================================== */}
      <AnimatePresence>
        {isLocationModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-lg rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-2xl"
            >
              <div className="mb-4 flex items-center justify-between border-b border-[hsl(var(--border))] pb-3">
                <h2 className="text-lg font-bold text-[hsl(var(--foreground))]">
                  {editingLocation ? 'แก้ไขสถานที่' : 'เพิ่มสถานที่ / อาคารใหม่'}
                </h2>
                <button
                  onClick={() => setIsLocationModalOpen(false)}
                  className="rounded-lg p-1 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))]"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              {locationFormError && (
                <div className="mb-4 rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-600 dark:bg-rose-950/30 dark:text-rose-400">
                  {locationFormError}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  locationMutation.mutate()
                }}
                className="space-y-4"
              >
                <div>
                  <label className="mb-1 block text-sm font-medium text-[hsl(var(--foreground))]">
                    ชื่อสถานที่ / จุดส่ง <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น Central Business District หรือ โซนมหาวิทยาลัย"
                    value={locationForm.name}
                    onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
                    required
                    className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[hsl(var(--foreground))]">
                      ชื่ออาคาร / ตึก (Building)
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น XYZ Residence"
                      value={locationForm.building}
                      onChange={(e) => setLocationForm({ ...locationForm, building: e.target.value })}
                      className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[hsl(var(--foreground))]">
                      ชื่อเส้นทาง (Route Name)
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น Route North"
                      value={locationForm.route_name}
                      onChange={(e) => setLocationForm({ ...locationForm, route_name: e.target.value })}
                      className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[hsl(var(--foreground))]">
                    คำอธิบาย / รายละเอียดจุดส่ง
                  </label>
                  <textarea
                    rows={2}
                    placeholder="เช่น จัดส่งที่เคาน์เตอร์ต้อนรับส่วนหน้า (Main Reception)"
                    value={locationForm.description}
                    onChange={(e) => setLocationForm({ ...locationForm, description: e.target.value })}
                    className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] resize-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="location_active"
                    checked={locationForm.is_active}
                    onChange={(e) => setLocationForm({ ...locationForm, is_active: e.target.checked })}
                    className="h-4 w-4 rounded text-[hsl(var(--primary))] focus:ring-[hsl(var(--ring))]"
                  />
                  <label htmlFor="location_active" className="text-sm font-medium text-[hsl(var(--foreground))]">
                    เปิดใช้งานสถานที่นี้ (Active)
                  </label>
                </div>

                <div className="mt-6 flex items-center justify-end gap-3 border-t border-[hsl(var(--border))] pt-4">
                  <button
                    type="button"
                    onClick={() => setIsLocationModalOpen(false)}
                    className="rounded-xl border border-[hsl(var(--border))] px-4 py-2.5 text-sm font-semibold text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))]"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={locationMutation.isPending}
                    className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-[hsl(var(--primary))]/90 disabled:opacity-50"
                  >
                    {locationMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    บันทึกสถานที่
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
