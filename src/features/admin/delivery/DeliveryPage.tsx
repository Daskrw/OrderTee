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
  Info,
  ChevronLeft,
  ChevronRight,
  Route,
  Search,
  Check,
  X,
  Layers,
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

  // Date Modal State (Opened when clicking a future date in calendar)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [isAddingLocationToDate, setIsAddingLocationToDate] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<DeliverySchedule | null>(null)

  // Schedule Quick Form
  const [scheduleForm, setScheduleForm] = useState({
    location_id: '',
    location_name: '',
    building: '',
    route_name: '',
    description: '',
    is_active: true,
  })
  const [scheduleFormError, setScheduleFormError] = useState('')

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

  const { data: schedules = [], isLoading: isLoadingSchedules } = useQuery({
    queryKey: ['admin-delivery-schedules'],
    queryFn: fetchDeliverySchedules,
  })

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

  // Schedules for currently clicked date
  const selectedDateSchedules = useMemo(() => {
    if (!selectedDate) return []
    return schedulesByDate.get(selectedDate) || []
  }, [selectedDate, schedulesByDate])

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

  // ==========================================
  // Schedule Mutations
  // ==========================================
  const scheduleMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDate) throw new Error('กรุณาเลือกวันที่')
      if (!isStrictlyFutureDate(selectedDate)) {
        throw new Error('วันที่ต้องเป็นวันในอนาคตเท่านั้น (ไม่สามารถเลือกวันนี้หรือวันที่ผ่านมาแล้วได้)')
      }
      if (!scheduleForm.location_name.trim()) {
        throw new Error('กรุณาระบุหรือเลือกสถานที่จัดส่ง')
      }

      if (editingSchedule) {
        return updateDeliverySchedule(editingSchedule.id, {
          ...scheduleForm,
          delivery_date: selectedDate,
        })
      } else {
        return createDeliverySchedule({
          ...scheduleForm,
          delivery_date: selectedDate,
        })
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-delivery-schedules'] })
      void queryClient.invalidateQueries({ queryKey: ['delivery-schedules'] })
      void queryClient.invalidateQueries({ queryKey: ['active-upcoming-schedules'] })
      setIsAddingLocationToDate(false)
      setEditingSchedule(null)
      setScheduleForm({
        location_id: '',
        location_name: '',
        building: '',
        route_name: '',
        description: '',
        is_active: true,
      })
      setScheduleFormError('')
    },
    onError: (err: any) => {
      setScheduleFormError(err.message || 'เกิดข้อผิดพลาดในการบันทึก')
    },
  })

  const deleteScheduleMutation = useMutation({
    mutationFn: (id: string) => deleteDeliverySchedule(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-delivery-schedules'] })
      void queryClient.invalidateQueries({ queryKey: ['delivery-schedules'] })
      void queryClient.invalidateQueries({ queryKey: ['active-upcoming-schedules'] })
    },
    onError: (err: any) => {
      alert(err.message || 'เกิดข้อผิดพลาดในการลบรอบจัดส่ง')
    },
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

  const handleDateClick = (dateStr: string, isFuture: boolean) => {
    if (!isFuture) return
    setSelectedDate(dateStr)
    setIsAddingLocationToDate(false)
    setEditingSchedule(null)
    setScheduleForm({
      location_id: '',
      location_name: '',
      building: '',
      route_name: '',
      description: '',
      is_active: true,
    })
    setScheduleFormError('')
  }

  const openAddLocationForDate = () => {
    setEditingSchedule(null)
    setScheduleForm({
      location_id: '',
      location_name: '',
      building: '',
      route_name: '',
      description: '',
      is_active: true,
    })
    setScheduleFormError('')
    setIsAddingLocationToDate(true)
  }

  const openEditSchedule = (sch: DeliverySchedule) => {
    setEditingSchedule(sch)
    setScheduleForm({
      location_id: sch.location_id || '',
      location_name: sch.location_name,
      building: sch.building || '',
      route_name: sch.route_name || '',
      description: sch.description || '',
      is_active: sch.is_active,
    })
    setScheduleFormError('')
    setIsAddingLocationToDate(true)
  }

  const handleSelectPresetLocation = (locId: string) => {
    const loc = locations.find((l) => l.id === locId)
    if (loc) {
      setScheduleForm((prev) => ({
        ...prev,
        location_id: loc.id,
        location_name: loc.name,
        building: loc.building || '',
        route_name: loc.route_name || '',
        description: loc.description || prev.description,
      }))
    } else {
      setScheduleForm((prev) => ({
        ...prev,
        location_id: '',
      }))
    }
  }

  // ==========================================
  // Location Management Mutations
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
      setLocationFormError(err.message || 'เกิดข้อผิดพลาดในการบันทึก')
    },
  })

  const deleteLocationMutation = useMutation({
    mutationFn: (id: string) => deleteDeliveryLocation(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-delivery-locations'] })
    },
    onError: (err: any) => {
      alert(err.message || 'เกิดข้อผิดพลาดในการลบสถานที่')
    },
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
    <div className="mx-auto max-w-6xl space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))] flex items-center gap-2.5">
            <CalendarIcon className="h-6 w-6 text-[hsl(var(--primary))]" />
            ปฏิทินรอบจัดส่ง (Delivery Schedule Calendar)
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            คลิกเลือกวันที่ในอนาคตเพื่อกำหนดสถานที่และรอบจัดส่งสินค้า (Scheduled Route Delivery)
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

      {/* ======================================================== */}
      {/* TAB 1: CALENDAR VIEW */}
      {/* ======================================================== */}
      {activeTab === 'calendar' && (
        <div className="space-y-4">
          {/* Calendar Controls & Legend */}
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-sm">
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
                <h2 className="min-w-[160px] text-center text-lg font-bold text-[hsl(var(--foreground))]">
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

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-[hsl(var(--muted-foreground))]">
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-md bg-[hsl(var(--primary))]" />
                  <span>มีรอบจัดส่ง (เปิดรับ)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-md bg-rose-500/80" />
                  <span>ปิดรับชั่วคราว</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))]" />
                  <span>วันที่ในอนาคต (คลิกเพื่อเพิ่มรอบ)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-md bg-[hsl(var(--muted))]/50 opacity-60" />
                  <span>วันนี้ / อดีต (ปิด)</span>
                </div>
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
                const inactiveCount = daySchedules.length - activeCount

                const isClickable = day.isFuture

                return (
                  <div
                    key={day.dateString}
                    onClick={() => handleDateClick(day.dateString, day.isFuture)}
                    className={`group relative min-h-[90px] p-2 transition-all sm:min-h-[110px] ${
                      !day.isCurrentMonth
                        ? 'bg-[hsl(var(--muted))]/20 opacity-40'
                        : day.isPast || day.isToday
                        ? 'bg-[hsl(var(--muted))]/30 cursor-not-allowed'
                        : isClickable
                        ? 'cursor-pointer bg-[hsl(var(--card))] hover:bg-[hsl(var(--accent))]/50'
                        : ''
                    } ${
                      selectedDate === day.dateString
                        ? 'ring-2 ring-inset ring-[hsl(var(--primary))] bg-[hsl(var(--primary))]/5'
                        : ''
                    }`}
                  >
                    {/* Date Number */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                          day.isToday
                            ? 'bg-amber-500 text-white'
                            : hasSchedules && activeCount > 0
                            ? 'bg-[hsl(var(--primary))] text-white'
                            : day.isFuture
                            ? 'text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--primary))]'
                            : 'text-[hsl(var(--muted-foreground))]'
                        }`}
                      >
                        {day.dayNumber}
                      </span>

                      {day.isToday && (
                        <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-extrabold text-amber-600 dark:text-amber-400">
                          วันนี้
                        </span>
                      )}

                      {day.isFuture && !hasSchedules && day.isCurrentMonth && (
                        <span className="hidden text-[10px] text-[hsl(var(--muted-foreground))] opacity-0 group-hover:opacity-100 sm:inline">
                          + เพิ่มรอบ
                        </span>
                      )}
                    </div>

                    {/* Schedule Badges inside Cell */}
                    {hasSchedules && (
                      <div className="mt-2 space-y-1">
                        {daySchedules.slice(0, 2).map((sch) => (
                          <div
                            key={sch.id}
                            className={`truncate rounded-lg px-2 py-0.5 text-[10px] font-medium transition-colors ${
                              sch.is_active
                                ? 'bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] border border-[hsl(var(--primary))]/30'
                                : 'bg-rose-500/10 text-rose-600 border border-rose-500/30'
                            }`}
                            title={`${sch.location_name} ${sch.building ? `(${sch.building})` : ''}`}
                          >
                            📍 {sch.location_name}
                          </div>
                        ))}
                        {daySchedules.length > 2 && (
                          <div className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] pl-1">
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
      {/* MODAL: DATE SCHEDULE MANAGER (When clicking a future date) */}
      {/* ======================================================== */}
      <AnimatePresence>
        {selectedDate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-2xl"
            >
              {/* Modal Header */}
              <div className="mb-5 flex items-center justify-between border-b border-[hsl(var(--border))] pb-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-[hsl(var(--primary))] uppercase">
                    <CalendarIcon className="h-4 w-4" /> รอบจัดส่งประจำวัน
                  </div>
                  <h2 className="text-xl font-black text-[hsl(var(--foreground))] mt-0.5">
                    {formatDeliveryDateThai(selectedDate)}
                  </h2>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">วันที่: {selectedDate}</p>
                </div>
                <button
                  onClick={() => setSelectedDate(null)}
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
                    สถานที่ที่จัดส่งในวันนี้ ({selectedDateSchedules.length} แห่ง)
                  </h3>

                  {!isAddingLocationToDate && (
                    <button
                      onClick={openAddLocationForDate}
                      className="flex items-center gap-1.5 rounded-xl bg-[hsl(var(--primary))] px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-[hsl(var(--primary))]/90"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      เพิ่มจุดส่งในวันนี้
                    </button>
                  )}
                </div>

                {/* Locations list */}
                {selectedDateSchedules.length === 0 && !isAddingLocationToDate ? (
                  <div className="rounded-2xl border border-dashed border-[hsl(var(--border))] p-6 text-center">
                    <MapPin className="mx-auto h-8 w-8 text-[hsl(var(--muted-foreground))]/40" />
                    <p className="mt-2 text-sm font-semibold text-[hsl(var(--foreground))]">
                      ยังไม่ได้กำหนดจุดจัดส่งในวันนี้
                    </p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                      ลูกค้าจะไม่เห็นวันที่นี้ในหน้า Checkout จนกว่าคุณจะเพิ่มจุดส่งอย่างน้อย 1 แห่ง
                    </p>
                    <button
                      onClick={openAddLocationForDate}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-xs font-bold text-white"
                    >
                      <Plus className="h-4 w-4" /> เพิ่มจุดส่งแรก
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {selectedDateSchedules.map((sch) => (
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
                            {sch.is_active ? 'เปิดรับออเดอร์' : 'ปิดชั่วคราว'}
                          </button>
                          <button
                            onClick={() => openEditSchedule(sch)}
                            className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"
                            title="แก้ไข"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`ลบจุดส่ง "${sch.location_name}" ในวันที่ ${selectedDate}?`)) {
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

                {/* FORM: ADD / EDIT LOCATION ON THIS DATE */}
                <AnimatePresence>
                  {isAddingLocationToDate && (
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
                            setIsAddingLocationToDate(false)
                            setEditingSchedule(null)
                          }}
                          className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      {scheduleFormError && (
                        <div className="mb-3 rounded-xl bg-rose-50 p-2.5 text-xs text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                          {scheduleFormError}
                        </div>
                      )}

                      <form
                        onSubmit={(e) => {
                          e.preventDefault()
                          scheduleMutation.mutate()
                        }}
                        className="space-y-3"
                      >
                        {locations.length > 0 && (
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-[hsl(var(--foreground))]">
                              เลือกจากสถานที่ที่บันทึกไว้ (Presets)
                            </label>
                            <select
                              value={scheduleForm.location_id}
                              onChange={(e) => handleSelectPresetLocation(e.target.value)}
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
                              placeholder="เช่น ABC Tower หรือ โซนสีลม"
                              value={scheduleForm.location_name}
                              onChange={(e) => setScheduleForm({ ...scheduleForm, location_name: e.target.value })}
                              required
                              className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-xs text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-[hsl(var(--foreground))]">
                              ชื่ออาคาร / ตึก (Building)
                            </label>
                            <input
                              type="text"
                              placeholder="เช่น อาคาร A"
                              value={scheduleForm.building}
                              onChange={(e) => setScheduleForm({ ...scheduleForm, building: e.target.value })}
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
                            value={scheduleForm.route_name}
                            onChange={(e) => setScheduleForm({ ...scheduleForm, route_name: e.target.value })}
                            className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-xs text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-semibold text-[hsl(var(--foreground))]">
                            คำอธิบาย / จุดนัดรับ (Description)
                          </label>
                          <input
                            type="text"
                            placeholder="เช่น จัดส่งที่เคาน์เตอร์ล็อบบี้ชั้น 1"
                            value={scheduleForm.description}
                            onChange={(e) => setScheduleForm({ ...scheduleForm, description: e.target.value })}
                            className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-xs text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                          />
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="checkbox"
                            id="modal_sch_active"
                            checked={scheduleForm.is_active}
                            onChange={(e) => setScheduleForm({ ...scheduleForm, is_active: e.target.checked })}
                            className="h-4 w-4 rounded text-[hsl(var(--primary))]"
                          />
                          <label htmlFor="modal_sch_active" className="text-xs font-medium text-[hsl(var(--foreground))]">
                            เปิดรับออเดอร์ในจุดส่งนี้ (Active)
                          </label>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setIsAddingLocationToDate(false)
                              setEditingSchedule(null)
                            }}
                            className="rounded-xl border border-[hsl(var(--border))] px-3 py-1.5 text-xs font-semibold text-[hsl(var(--foreground))]"
                          >
                            ยกเลิก
                          </button>
                          <button
                            type="submit"
                            disabled={scheduleMutation.isPending}
                            className="flex items-center gap-1.5 rounded-xl bg-[hsl(var(--primary))] px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-[hsl(var(--primary))]/90"
                          >
                            {scheduleMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                            บันทึกจุดส่ง
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Close footer button */}
              <div className="mt-6 border-t border-[hsl(var(--border))] pt-4 flex justify-end">
                <button
                  onClick={() => setSelectedDate(null)}
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
      {/* MODAL: LOCATION PRESET MANAGER (Add / Edit Location Preset) */}
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
