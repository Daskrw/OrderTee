import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Truck,
  Calendar,
  MapPin,
  Building,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  Info,
  Clock,
  Route,
  Search,
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
import { getBangkokDateTime, isStrictlyFutureDate, formatDeliveryDateThai } from '@/lib/delivery-utils'
import type { DeliveryLocation, DeliverySchedule } from '@/types/database'

export default function DeliveryPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'schedules' | 'locations'>('schedules')

  // Search / filter states
  const [scheduleSearch, setScheduleSearch] = useState('')
  const [locationSearch, setLocationSearch] = useState('')

  // Schedule Modal State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<DeliverySchedule | null>(null)
  const [scheduleForm, setScheduleForm] = useState({
    delivery_date: '',
    location_id: '',
    location_name: '',
    building: '',
    route_name: '',
    description: '',
    is_active: true,
  })
  const [scheduleFormError, setScheduleFormError] = useState('')

  // Location Modal State
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

  // Get Bangkok today string for min date in picker
  const { dateString: todayString } = getBangkokDateTime()
  // Tomorrow's date string for input min attribute
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const { dateString: minScheduleDate } = getBangkokDateTime(tomorrow)

  // ==========================================
  // Location Handlers & Mutations
  // ==========================================
  const locationMutation = useMutation({
    mutationFn: async () => {
      if (!locationForm.name.trim()) throw new Error('กรุณากรอกชื่อสถานที่/จุดส่ง')
      if (editingLocation) {
        return updateDeliveryLocation(editingLocation.id, locationForm)
      } else {
        return createDeliveryLocation(locationForm)
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-delivery-locations'] })
      void queryClient.invalidateQueries({ queryKey: ['delivery-locations'] })
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
      void queryClient.invalidateQueries({ queryKey: ['delivery-locations'] })
    },
    onError: (err: any) => {
      alert(err.message || 'เกิดข้อผิดพลาดในการลบสถานที่')
    },
  })

  const openAddLocation = () => {
    setEditingLocation(null)
    setLocationForm({ name: '', building: '', route_name: '', description: '', is_active: true })
    setLocationFormError('')
    setIsLocationModalOpen(true)
  }

  const openEditLocation = (loc: DeliveryLocation) => {
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
  }

  const toggleLocationActive = async (loc: DeliveryLocation) => {
    try {
      await updateDeliveryLocation(loc.id, { is_active: !loc.is_active })
      void queryClient.invalidateQueries({ queryKey: ['admin-delivery-locations'] })
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาด')
    }
  }

  // ==========================================
  // Schedule Handlers & Mutations
  // ==========================================
  const scheduleMutation = useMutation({
    mutationFn: async () => {
      if (!scheduleForm.delivery_date) {
        throw new Error('กรุณาระบุวันที่จัดส่ง')
      }
      if (!isStrictlyFutureDate(scheduleForm.delivery_date)) {
        throw new Error('วันที่จัดส่งต้องเป็นวันในอนาคตเท่านั้น (ไม่สามารถเลือกวันนี้หรือวันที่ผ่านมาแล้วได้)')
      }
      if (!scheduleForm.location_name.trim()) {
        throw new Error('กรุณาระบุหรือเลือกสถานที่จัดส่ง')
      }

      if (editingSchedule) {
        return updateDeliverySchedule(editingSchedule.id, scheduleForm)
      } else {
        return createDeliverySchedule(scheduleForm)
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-delivery-schedules'] })
      void queryClient.invalidateQueries({ queryKey: ['delivery-schedules'] })
      void queryClient.invalidateQueries({ queryKey: ['active-upcoming-schedules'] })
      setIsScheduleModalOpen(false)
      setEditingSchedule(null)
      setScheduleForm({
        delivery_date: '',
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

  const openAddSchedule = () => {
    setEditingSchedule(null)
    setScheduleForm({
      delivery_date: '',
      location_id: '',
      location_name: '',
      building: '',
      route_name: '',
      description: '',
      is_active: true,
    })
    setScheduleFormError('')
    setIsScheduleModalOpen(true)
  }

  const openEditSchedule = (sch: DeliverySchedule) => {
    setEditingSchedule(sch)
    setScheduleForm({
      delivery_date: sch.delivery_date,
      location_id: sch.location_id || '',
      location_name: sch.location_name,
      building: sch.building || '',
      route_name: sch.route_name || '',
      description: sch.description || '',
      is_active: sch.is_active,
    })
    setScheduleFormError('')
    setIsScheduleModalOpen(true)
  }

  const handleSelectPredefinedLocation = (locId: string) => {
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

  const toggleScheduleActive = async (sch: DeliverySchedule) => {
    try {
      await updateDeliverySchedule(sch.id, { is_active: !sch.is_active })
      void queryClient.invalidateQueries({ queryKey: ['admin-delivery-schedules'] })
      void queryClient.invalidateQueries({ queryKey: ['active-upcoming-schedules'] })
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาด')
    }
  }

  // Filtered schedules
  const filteredSchedules = schedules.filter((s) => {
    const q = scheduleSearch.toLowerCase()
    return (
      s.delivery_date.includes(q) ||
      s.location_name.toLowerCase().includes(q) ||
      (s.building && s.building.toLowerCase().includes(q)) ||
      (s.route_name && s.route_name.toLowerCase().includes(q))
    )
  })

  // Filtered locations
  const filteredLocations = locations.filter((l) => {
    const q = locationSearch.toLowerCase()
    return (
      l.name.toLowerCase().includes(q) ||
      (l.building && l.building.toLowerCase().includes(q)) ||
      (l.route_name && l.route_name.toLowerCase().includes(q))
    )
  })

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">จัดการการจัดส่ง (Delivery Management)</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            จัดการรอบจัดส่งล่วงหน้า (Scheduled Route Delivery) และจุดส่ง/อาคารสำหรับลูกค้า
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'schedules' ? (
            <button
              onClick={openAddSchedule}
              className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[hsl(var(--primary))]/90"
            >
              <Plus className="h-4 w-4" />
              เพิ่มรอบจัดส่ง (Add Schedule)
            </button>
          ) : (
            <button
              onClick={openAddLocation}
              className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[hsl(var(--primary))]/90"
            >
              <Plus className="h-4 w-4" />
              เพิ่มสถานที่ (Add Location)
            </button>
          )}
        </div>
      </div>

      {/* Info Card Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-sm">
          <div className="flex items-center gap-3 text-[hsl(var(--primary))]">
            <Calendar className="h-5 w-5" />
            <span className="text-sm font-semibold text-[hsl(var(--foreground))]">รอบจัดส่งทั้งหมด</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-[hsl(var(--foreground))]">{schedules.length}</p>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            เปิดใช้งาน {schedules.filter((s) => s.is_active && s.delivery_date > todayString).length} รอบ (อนาคต)
          </p>
        </div>

        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-sm">
          <div className="flex items-center gap-3 text-emerald-500">
            <MapPin className="h-5 w-5" />
            <span className="text-sm font-semibold text-[hsl(var(--foreground))]">สถานที่/อาคารที่บันทึกไว้</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-[hsl(var(--foreground))]">{locations.length}</p>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            พร้อมใช้งาน {locations.filter((l) => l.is_active).length} แห่ง
          </p>
        </div>

        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-sm">
          <div className="flex items-center gap-3 text-blue-500">
            <Clock className="h-5 w-5" />
            <span className="text-sm font-semibold text-[hsl(var(--foreground))]">เวลาร้านค้าปัจจุบัน (Bangkok)</span>
          </div>
          <p className="mt-2 text-base font-bold text-[hsl(var(--foreground))]">
            {formatDeliveryDateThai(todayString)}
          </p>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            รับที่ร้าน & ส่งด่วน: 19:00 - 22:00 น.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[hsl(var(--border))]">
        <button
          onClick={() => setActiveTab('schedules')}
          className={`flex items-center gap-2 border-b-2 px-6 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'schedules'
              ? 'border-[hsl(var(--primary))] text-[hsl(var(--primary))]'
              : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
          }`}
        >
          <Calendar className="h-4 w-4" />
          รอบจัดส่งล่วงหน้า (Schedules)
          <span className="rounded-full bg-[hsl(var(--muted))] px-2 py-0.5 text-xs">
            {schedules.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('locations')}
          className={`flex items-center gap-2 border-b-2 px-6 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'locations'
              ? 'border-[hsl(var(--primary))] text-[hsl(var(--primary))]'
              : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
          }`}
        >
          <Building className="h-4 w-4" />
          สถานที่ & อาคาร (Locations)
          <span className="rounded-full bg-[hsl(var(--muted))] px-2 py-0.5 text-xs">
            {locations.length}
          </span>
        </button>
      </div>

      {/* TAB 1: Schedules Content */}
      {activeTab === 'schedules' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
              <input
                type="text"
                placeholder="ค้นหาวันที่, สถานที่, ตึก หรือเส้นทาง..."
                value={scheduleSearch}
                onChange={(e) => setScheduleSearch(e.target.value)}
                className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] pl-9 pr-3 py-2 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              />
            </div>
            <p className="text-xs text-[hsl(var(--muted-foreground))] hidden sm:block">
              * ลูกค้าจะสามารถสั่งได้เฉพาะรอบในอนาคตที่เปิดใช้งานเท่านั้น
            </p>
          </div>

          {isLoadingSchedules ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--primary))]" />
            </div>
          ) : filteredSchedules.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[hsl(var(--border))] py-12 text-center">
              <Calendar className="h-12 w-12 text-[hsl(var(--muted-foreground))]/40" />
              <h3 className="mt-3 text-base font-semibold text-[hsl(var(--foreground))]">ยังไม่มีรอบจัดส่ง</h3>
              <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                คลิกปุ่ม "เพิ่มรอบจัดส่ง" เพื่อกำหนดวันที่และสถานที่จัดส่งสินค้าให้ลูกค้า
              </p>
              <button
                onClick={openAddSchedule}
                className="mt-4 flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-sm font-semibold text-white hover:bg-[hsl(var(--primary))]/90"
              >
                <Plus className="h-4 w-4" />
                เพิ่มรอบจัดส่งตอนนี้
              </button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredSchedules.map((sch) => {
                const isPast = sch.delivery_date <= todayString
                return (
                  <div
                    key={sch.id}
                    className={`flex flex-col justify-between rounded-2xl border p-4 transition-all ${
                      isPast
                        ? 'border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30 opacity-75'
                        : sch.is_active
                        ? 'border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm hover:border-[hsl(var(--primary))]/40'
                        : 'border-[hsl(var(--border))] bg-[hsl(var(--card))] opacity-60'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] font-bold">
                            <Calendar className="h-5 w-5" />
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-[hsl(var(--primary))] uppercase">
                              {formatDeliveryDateThai(sch.delivery_date)}
                            </span>
                            <h3 className="text-base font-bold text-[hsl(var(--foreground))]">
                              {sch.location_name}
                            </h3>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          {isPast ? (
                            <span className="rounded-md bg-[hsl(var(--muted))] px-2 py-0.5 text-[11px] font-medium text-[hsl(var(--muted-foreground))]">
                              ผ่านไปแล้ว
                            </span>
                          ) : (
                            <button
                              onClick={() => toggleScheduleActive(sch)}
                              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors ${
                                sch.is_active
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                                  : 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400'
                              }`}
                            >
                              {sch.is_active ? 'เปิดรับออเดอร์' : 'ปิดชั่วคราว'}
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 space-y-1 text-xs text-[hsl(var(--muted-foreground))]">
                        {sch.building && (
                          <p className="flex items-center gap-1.5">
                            <Building className="h-3.5 w-3.5 shrink-0 text-[hsl(var(--muted-foreground))]" />
                            <span>อาคาร/ตึก: <strong className="text-[hsl(var(--foreground))]">{sch.building}</strong></span>
                          </p>
                        )}
                        {sch.route_name && (
                          <p className="flex items-center gap-1.5">
                            <Route className="h-3.5 w-3.5 shrink-0 text-[hsl(var(--muted-foreground))]" />
                            <span>เส้นทาง: {sch.route_name}</span>
                          </p>
                        )}
                        {sch.description && (
                          <p className="flex items-center gap-1.5 mt-1 rounded-lg bg-[hsl(var(--muted))]/50 p-2">
                            <Info className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                            <span>{sch.description}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-[hsl(var(--border))]/60 pt-3 text-xs">
                      <span className="text-[hsl(var(--muted-foreground))]">วันที่: {sch.delivery_date}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditSchedule(sch)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                          title="แก้ไขรอบจัดส่ง"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบรอบจัดส่งวันที่ ${sch.delivery_date} ที่ ${sch.location_name}?`)) {
                              deleteScheduleMutation.mutate(sch.id)
                            }
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                          title="ลบรอบจัดส่ง"
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

      {/* TAB 2: Locations Content */}
      {activeTab === 'locations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
              <input
                type="text"
                placeholder="ค้นหาชื่อสถานที่, อาคาร, เส้นทาง..."
                value={locationSearch}
                onChange={(e) => setLocationSearch(e.target.value)}
                className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] pl-9 pr-3 py-2 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              />
            </div>
            <p className="text-xs text-[hsl(var(--muted-foreground))] hidden sm:block">
              บันทึกจุดส่งที่ใช้บ่อย เพื่อเลือกสร้างรอบจัดส่งได้อย่างรวดเร็ว
            </p>
          </div>

          {isLoadingLocations ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--primary))]" />
            </div>
          ) : filteredLocations.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[hsl(var(--border))] py-12 text-center">
              <Building className="h-12 w-12 text-[hsl(var(--muted-foreground))]/40" />
              <h3 className="mt-3 text-base font-semibold text-[hsl(var(--foreground))]">ยังไม่มีสถานที่ที่บันทึกไว้</h3>
              <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                เพิ่มสถานที่ เช่น ตึกสำนักงาน มหาวิทยาลัย หรือโซนประจำของคุณ
              </p>
              <button
                onClick={openAddLocation}
                className="mt-4 flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-sm font-semibold text-white hover:bg-[hsl(var(--primary))]/90"
              >
                <Plus className="h-4 w-4" />
                เพิ่มสถานที่ตอนนี้
              </button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {filteredLocations.map((loc) => (
                <div
                  key={loc.id}
                  className={`flex flex-col justify-between rounded-2xl border p-4 transition-all ${
                    loc.is_active
                      ? 'border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm'
                      : 'border-[hsl(var(--border))] bg-[hsl(var(--card))] opacity-60'
                  }`}
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
                      <button
                        onClick={() => toggleLocationActive(loc)}
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          loc.is_active
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400'
                        }`}
                      >
                        {loc.is_active ? 'ใช้งาน' : 'ปิด'}
                      </button>
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
                      onClick={() => openEditLocation(loc)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                      title="แก้ไขสถานที่"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`คุณต้องการลบสถานที่ "${loc.name}" หรือไม่? (ออเดอร์ย้อนหลังจะไม่ได้รับผลกระทบ)`)) {
                          deleteLocationMutation.mutate(loc.id)
                        }
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      title="ลบสถานที่"
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

      {/* ========================================== */}
      {/* Schedule Modal (Add/Edit) */}
      {/* ========================================== */}
      <AnimatePresence>
        {isScheduleModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-lg rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-2xl"
            >
              <div className="mb-4 flex items-center justify-between border-b border-[hsl(var(--border))] pb-3">
                <h2 className="text-lg font-bold text-[hsl(var(--foreground))]">
                  {editingSchedule ? 'แก้ไขรอบจัดส่ง' : 'เพิ่มรอบจัดส่งสินค้า (New Schedule)'}
                </h2>
                <button
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="rounded-lg p-1 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))]"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              {scheduleFormError && (
                <div className="mb-4 rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-600 dark:bg-rose-950/30 dark:text-rose-400">
                  {scheduleFormError}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  scheduleMutation.mutate()
                }}
                className="space-y-4"
              >
                <div>
                  <label className="mb-1 block text-sm font-medium text-[hsl(var(--foreground))]">
                    วันที่จัดส่ง (Delivery Date) <span className="text-rose-500">* (เฉพาะวันในอนาคต)</span>
                  </label>
                  <input
                    type="date"
                    min={minScheduleDate}
                    value={scheduleForm.delivery_date}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, delivery_date: e.target.value })}
                    required
                    className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                  />
                  <p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">
                    ต้องเป็นวันที่หลังจากวันนี้ ({formatDeliveryDateThai(todayString)}) เป็นต้นไป
                  </p>
                </div>

                {locations.length > 0 && (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[hsl(var(--foreground))]">
                      เลือกจากสถานที่ที่บันทึกไว้ (Optional Preset)
                    </label>
                    <select
                      value={scheduleForm.location_id}
                      onChange={(e) => handleSelectPredefinedLocation(e.target.value)}
                      className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                    >
                      <option value="">-- กรอกเอง หรือ เลือกสถานที่ที่บันทึกไว้ --</option>
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name} {loc.building ? `(${loc.building})` : ''} {loc.route_name ? `• ${loc.route_name}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[hsl(var(--foreground))]">
                      ชื่อสถานที่ / จุดจัดส่ง <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น Central Business District"
                      value={scheduleForm.location_name}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, location_name: e.target.value })}
                      required
                      className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[hsl(var(--foreground))]">
                      ชื่ออาคาร / ตึก (Building)
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น ABC Tower"
                      value={scheduleForm.building}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, building: e.target.value })}
                      className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[hsl(var(--foreground))]">
                    ชื่อเส้นทาง (Route Name)
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น Route A - สีลม / สาทร"
                    value={scheduleForm.route_name}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, route_name: e.target.value })}
                    className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[hsl(var(--foreground))]">
                    คำอธิบาย / จุดนัดรับ (Description)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="เช่น จัดส่งที่เคาน์เตอร์ล็อบบี้ชั้น 1 อาคาร ABC Tower"
                    value={scheduleForm.description}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, description: e.target.value })}
                    className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] resize-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="schedule_active"
                    checked={scheduleForm.is_active}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, is_active: e.target.checked })}
                    className="h-4 w-4 rounded text-[hsl(var(--primary))] focus:ring-[hsl(var(--ring))]"
                  />
                  <label htmlFor="schedule_active" className="text-sm font-medium text-[hsl(var(--foreground))]">
                    เปิดรับออเดอร์รอบนี้ (Active for customer checkout)
                  </label>
                </div>

                <div className="mt-6 flex items-center justify-end gap-3 border-t border-[hsl(var(--border))] pt-4">
                  <button
                    type="button"
                    onClick={() => setIsScheduleModalOpen(false)}
                    className="rounded-xl border border-[hsl(var(--border))] px-4 py-2.5 text-sm font-semibold text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))]"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={scheduleMutation.isPending}
                    className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-[hsl(var(--primary))]/90 disabled:opacity-50"
                  >
                    {scheduleMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    บันทึกรอบจัดส่ง
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================== */}
      {/* Location Modal (Add/Edit) */}
      {/* ========================================== */}
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
