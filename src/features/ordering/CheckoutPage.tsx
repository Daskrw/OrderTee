import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  Loader2,
  Store,
  Truck,
  MapPin,
  User,
  Phone,
  ShoppingCart,
  Tag,
  CheckCircle2,
  Calendar,
  Building,
  Clock,
  AlertCircle,
  Info,
  Banknote,
  QrCode,
  Copy,
  Check,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useCartStore, selectCartTotal } from '@/stores/cart-store'
import { useCartPromotions } from '@/hooks/useCartPromotions'
import { createOrder } from '@/services/orders'
import { fetchActiveUpcomingSchedules } from '@/services/delivery'
import { formatCurrency } from '@/lib/utils'
import {
  generatePromptPayPayload,
  formatPromptPayPhone,
  PROMPTPAY_PHONE,
} from '@/lib/promptpay'
import {
  isPickupAllowed,
  isImmediateDeliveryAllowed,
  formatScheduleCardDate,
  formatDeliveryDateThai,
  getBangkokDateTime,
  DELIVERY_ERROR_MESSAGES,
} from '@/lib/delivery-utils'
import type { Order, DeliverySchedule, PaymentMethod } from '@/types/database'

const IMMEDIATE_DELIVERY_FEE = 50

const schema = z
  .object({
    customerName: z.string().min(2, 'กรุณากรอกชื่ออย่างน้อย 2 ตัวอักษร'),
    customerPhone: z.string().min(9, 'กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง (อย่างน้อย 9 หลัก)'),
    orderType: z.enum(['pickup', 'scheduled_route', 'immediate_local'] as const),
    paymentMethod: z.enum(['cash', 'promptpay']),
    // Scheduled Route Delivery Fields
    scheduledDeliveryDate: z.string().optional(),
    scheduledDeliveryScheduleId: z.string().optional(),
    scheduledAddressDetails: z.string().optional(),
    // Immediate Local Delivery Fields
    deliveryAddress: z.string().optional(),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.orderType === 'scheduled_route') {
      if (!data.scheduledDeliveryDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'กรุณาเลือกวันที่จัดส่ง',
          path: ['scheduledDeliveryDate'],
        })
      }
      if (!data.scheduledDeliveryScheduleId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'กรุณาเลือกสถานที่/จุดนัดรับจัดส่ง',
          path: ['scheduledDeliveryScheduleId'],
        })
      }
    }

    if (data.orderType === 'immediate_local') {
      if (!data.deliveryAddress?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'กรุณากรอกที่อยู่จัดส่งสำหรับส่งด่วน',
          path: ['deliveryAddress'],
        })
      }
    }
  })

type CheckoutForm = z.infer<typeof schema>

export default function CheckoutPage() {
  const navigate = useNavigate()
  const items = useCartStore((s) => s.items)
  const clearCart = useCartStore((s) => s.clearCart)
  const cartSubtotal = useCartStore(selectCartTotal)
  const { discountAmount, finalTotal: cartFinalTotal, appliedPromotions } = useCartPromotions()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [, setSuccessOrder] = useState<Order | null>(null)
  const [copiedPhone, setCopiedPhone] = useState(false)

  // Real-time time window tracking (Updates every 10 seconds)
  const [currentTime, setCurrentTime] = useState(new Date())
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000)
    return () => clearInterval(timer)
  }, [])

  const pickupAvailable = isPickupAllowed(currentTime)
  const immediateAvailable = isImmediateDeliveryAllowed(currentTime)
  const { timeString: bangkokCurrentTimeStr } = getBangkokDateTime(currentTime)

  // Fetch active upcoming schedules (strictly > today)
  const { data: upcomingSchedules = [], isLoading: isLoadingSchedules } = useQuery({
    queryKey: ['active-upcoming-schedules'],
    queryFn: fetchActiveUpcomingSchedules,
  })

  // Group schedules by delivery_date
  const schedulesByDate = useMemo(() => {
    const map = new Map<string, DeliverySchedule[]>()
    upcomingSchedules.forEach((sch) => {
      const list = map.get(sch.delivery_date) || []
      list.push(sch)
      map.set(sch.delivery_date, list)
    })
    return map
  }, [upcomingSchedules])

  const availableDates = useMemo(() => {
    return Array.from(schedulesByDate.keys()).sort()
  }, [schedulesByDate])

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0 && !showSuccessModal) {
      navigate('/order', { replace: true })
    }
  }, [items.length, navigate, showSuccessModal])

  // React Hook Form
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CheckoutForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      orderType: pickupAvailable ? 'pickup' : upcomingSchedules.length > 0 ? 'scheduled_route' : 'pickup',
      paymentMethod: 'cash',
      scheduledDeliveryDate: availableDates[0] || '',
      scheduledDeliveryScheduleId: '',
      deliveryAddress: '',
      notes: '',
    },
  })

  const orderType = watch('orderType')
  const paymentMethod = watch('paymentMethod')
  const selectedDate = watch('scheduledDeliveryDate')
  const selectedScheduleId = watch('scheduledDeliveryScheduleId')

  // Available locations for the currently selected scheduled date
  const locationsForDate = useMemo(() => {
    if (!selectedDate) return []
    return schedulesByDate.get(selectedDate) || []
  }, [selectedDate, schedulesByDate])

  // When availableDates load or change, ensure a valid date is selected if empty
  useEffect(() => {
    if (availableDates.length > 0 && !selectedDate) {
      setValue('scheduledDeliveryDate', availableDates[0])
    }
  }, [availableDates, selectedDate, setValue])

  // When date changes, preselect the first available location if current selected is not in date
  useEffect(() => {
    if (locationsForDate.length > 0) {
      const exists = locationsForDate.some((loc) => loc.id === selectedScheduleId)
      if (!exists) {
        setValue('scheduledDeliveryScheduleId', locationsForDate[0].id)
      }
    } else {
      setValue('scheduledDeliveryScheduleId', '')
    }
  }, [locationsForDate, selectedScheduleId, setValue])

  // If currently selected orderType becomes disabled while user is on page, suggest fallback
  useEffect(() => {
    if (orderType === 'pickup' && !pickupAvailable && availableDates.length > 0) {
      setValue('orderType', 'scheduled_route')
    } else if (orderType === 'immediate_local' && !immediateAvailable && availableDates.length > 0) {
      setValue('orderType', 'scheduled_route')
    }
  }, [pickupAvailable, immediateAvailable, orderType, availableDates, setValue])

  const deliveryFee = orderType === 'immediate_local' ? IMMEDIATE_DELIVERY_FEE : 0
  const grandTotal = cartFinalTotal + deliveryFee

  // PromptPay QR payload (dynamically recalculated with grandTotal)
  const promptPayPayload = useMemo(() => {
    return generatePromptPayPayload(grandTotal, PROMPTPAY_PHONE)
  }, [grandTotal])

  const copyPhoneNumber = () => {
    navigator.clipboard.writeText(PROMPTPAY_PHONE)
    setCopiedPhone(true)
    setTimeout(() => setCopiedPhone(false), 2500)
  }

  // Submit Order
  const onSubmit = async (data: CheckoutForm) => {
    setIsSubmitting(true)
    setServerError('')

    try {
      let finalDeliveryAddress: string | null = null
      let scheduledDeliveryDate: string | null = null
      let scheduledDeliveryLocationId: string | null = null
      let scheduledDeliveryLocationName: string | null = null
      let scheduledDeliveryBuilding: string | null = null
      let scheduledDeliveryRoute: string | null = null

      if (data.orderType === 'pickup') {
        if (!isPickupAllowed()) {
          throw new Error(DELIVERY_ERROR_MESSAGES.PICKUP_UNAVAILABLE)
        }
      } else if (data.orderType === 'immediate_local') {
        if (!isImmediateDeliveryAllowed()) {
          throw new Error(DELIVERY_ERROR_MESSAGES.IMMEDIATE_UNAVAILABLE)
        }
        finalDeliveryAddress = data.deliveryAddress?.trim() || null
      } else if (data.orderType === 'scheduled_route') {
        const schedule = upcomingSchedules.find((s) => s.id === data.scheduledDeliveryScheduleId)
        if (!schedule) {
          throw new Error(DELIVERY_ERROR_MESSAGES.SCHEDULE_INACTIVE)
        }
        scheduledDeliveryDate = schedule.delivery_date
        scheduledDeliveryLocationId = schedule.location_id || schedule.id
        scheduledDeliveryLocationName = schedule.location_name
        scheduledDeliveryBuilding = schedule.building || null
        scheduledDeliveryRoute = schedule.route_name || null
        finalDeliveryAddress = data.scheduledAddressDetails?.trim() || schedule.description || null
      }

      const order: Order = await createOrder({
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        orderType: data.orderType,
        paymentMethod: data.paymentMethod,
        deliveryFee,
        deliveryAddress: finalDeliveryAddress,
        scheduledDeliveryDate,
        scheduledDeliveryLocationId,
        scheduledDeliveryLocationName,
        scheduledDeliveryBuilding,
        scheduledDeliveryRoute,
        notes: data.notes,
        cartItems: items,
        total: grandTotal,
      })

      setSuccessOrder(order)
      setShowSuccessModal(true)

      // Navigate to success after short delay
      setTimeout(() => {
        clearCart()
        navigate(`/order/success/${order.id}`)
      }, 2500)
    } catch (err) {
      console.error(err)
      setServerError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')
      setIsSubmitting(false)
    }
  }

  const inputClass = (hasError: boolean) =>
    `w-full rounded-xl border ${
      hasError ? 'border-[hsl(var(--destructive))]' : 'border-[hsl(var(--border))]'
    } bg-[hsl(var(--background))] px-3 py-2.5 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]`

  if (items.length === 0 && !showSuccessModal) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <ShoppingCart className="h-12 w-12 text-[hsl(var(--muted-foreground))]/40" />
        <p className="text-[hsl(var(--muted-foreground))]">ตะกร้าของคุณว่างเปล่า</p>
        <Link
          to="/order"
          className="rounded-xl bg-[hsl(var(--primary))] px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-[hsl(var(--primary))]/90"
        >
          กลับไปที่เมนู
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Link
          to="/order"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--accent))]"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">ชำระเงินและเลือกการจัดส่ง</h1>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            เวลาร้านค้าปัจจุบัน: {bangkokCurrentTimeStr} น.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Contact Info */}
        <div className="space-y-4 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-sm">
          <h2 className="font-semibold text-[hsl(var(--foreground))] flex items-center gap-2">
            <User className="h-4 w-4 text-[hsl(var(--primary))]" /> ข้อมูลผู้สั่งซื้อ
          </h2>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]">
              ชื่อ-นามสกุล <span className="text-rose-500">*</span>
            </label>
            <input
              {...register('customerName')}
              placeholder="กรุณากรอกชื่อของคุณ"
              className={inputClass(!!errors.customerName)}
            />
            {errors.customerName && (
              <p className="mt-1 text-xs text-[hsl(var(--destructive))]">{errors.customerName.message}</p>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]">
              เบอร์โทรศัพท์ <span className="text-rose-500">*</span>
            </label>
            <input
              {...register('customerPhone')}
              placeholder="08X-XXX-XXXX"
              type="tel"
              className={inputClass(!!errors.customerPhone)}
            />
            {errors.customerPhone && (
              <p className="mt-1 text-xs text-[hsl(var(--destructive))]">{errors.customerPhone.message}</p>
            )}
          </div>
        </div>

        {/* 3 Delivery Options Selection */}
        <div className="space-y-4 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-[hsl(var(--foreground))] flex items-center gap-2">
              <Truck className="h-4 w-4 text-[hsl(var(--primary))]" /> เลือกรูปแบบการจัดส่ง (Delivery Method)
            </h2>
          </div>

          <div className="space-y-3">
            {/* OPTION 1: Pickup at Store */}
            <div
              onClick={() => {
                if (pickupAvailable) setValue('orderType', 'pickup')
              }}
              className={`relative flex flex-col gap-2 rounded-2xl border p-4 transition-all ${
                !pickupAvailable
                  ? 'cursor-not-allowed border-[hsl(var(--border))] bg-[hsl(var(--muted))]/40 opacity-70'
                  : orderType === 'pickup'
                  ? 'cursor-pointer border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/5 shadow-sm ring-1 ring-[hsl(var(--primary))]'
                  : 'cursor-pointer border-[hsl(var(--border))] hover:border-[hsl(var(--primary))]/50 hover:bg-[hsl(var(--accent))]'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    value="pickup"
                    {...register('orderType')}
                    disabled={!pickupAvailable}
                    className="sr-only"
                  />
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                      orderType === 'pickup' && pickupAvailable
                        ? 'bg-[hsl(var(--primary))] text-white shadow-md shadow-[hsl(var(--primary))]/20'
                        : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
                    }`}
                  >
                    <Store className="h-5 w-5" />
                  </div>
                  <div>
                    <span
                      className={`text-sm font-bold ${
                        orderType === 'pickup' && pickupAvailable
                          ? 'text-[hsl(var(--primary))]'
                          : 'text-[hsl(var(--foreground))]'
                      }`}
                    >
                      1. รับสินค้าที่ร้าน (Pickup at Store)
                    </span>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                      รับสินค้าเองที่หน้าร้าน • เฉพาะวันเดียวกัน
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                  ฟรี
                </span>
              </div>

              {!pickupAvailable && (
                <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs text-amber-700 dark:text-amber-300">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  <span>เปิดให้บริการเฉพาะเวลา 19:00 - 22:00 น. เท่านั้น</span>
                </div>
              )}
            </div>

            {/* OPTION 2: Scheduled Route Delivery */}
            <div
              onClick={() => setValue('orderType', 'scheduled_route')}
              className={`relative flex cursor-pointer flex-col gap-2 rounded-2xl border p-4 transition-all ${
                orderType === 'scheduled_route'
                  ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/5 shadow-sm ring-1 ring-[hsl(var(--primary))]'
                  : 'border-[hsl(var(--border))] hover:border-[hsl(var(--primary))]/50 hover:bg-[hsl(var(--accent))]'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <input type="radio" value="scheduled_route" {...register('orderType')} className="sr-only" />
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                      orderType === 'scheduled_route'
                        ? 'bg-[hsl(var(--primary))] text-white shadow-md shadow-[hsl(var(--primary))]/20'
                        : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
                    }`}
                  >
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <span
                      className={`text-sm font-bold ${
                        orderType === 'scheduled_route'
                          ? 'text-[hsl(var(--primary))]'
                          : 'text-[hsl(var(--foreground))]'
                      }`}
                    >
                      2. จัดส่งตามรอบเส้นทาง (Scheduled Route Delivery)
                    </span>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                      สั่งล่วงหน้าตามวันที่และสถานที่ที่ร้านกำหนด • ส่งฟรี
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                  ฟรี
                </span>
              </div>
            </div>

            {/* OPTION 3: Immediate Local Delivery */}
            <div
              onClick={() => {
                if (immediateAvailable) setValue('orderType', 'immediate_local')
              }}
              className={`relative flex flex-col gap-2 rounded-2xl border p-4 transition-all ${
                !immediateAvailable
                  ? 'cursor-not-allowed border-[hsl(var(--border))] bg-[hsl(var(--muted))]/40 opacity-70'
                  : orderType === 'immediate_local'
                  ? 'cursor-pointer border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/5 shadow-sm ring-1 ring-[hsl(var(--primary))]'
                  : 'cursor-pointer border-[hsl(var(--border))] hover:border-[hsl(var(--primary))]/50 hover:bg-[hsl(var(--accent))]'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    value="immediate_local"
                    {...register('orderType')}
                    disabled={!immediateAvailable}
                    className="sr-only"
                  />
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                      orderType === 'immediate_local' && immediateAvailable
                        ? 'bg-[hsl(var(--primary))] text-white shadow-md shadow-[hsl(var(--primary))]/20'
                        : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
                    }`}
                  >
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <span
                      className={`text-sm font-bold ${
                        orderType === 'immediate_local' && immediateAvailable
                          ? 'text-[hsl(var(--primary))]'
                          : 'text-[hsl(var(--foreground))]'
                      }`}
                    >
                      3. จัดส่งด่วนพื้นที่ใกล้เคียง (Immediate Local Delivery)
                    </span>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                      จัดส่งภายในวันเดียวกันสำหรับพื้นที่ใกล้เคียงร้านค้า
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-[hsl(var(--muted))] px-2.5 py-0.5 text-xs font-bold text-[hsl(var(--foreground))]">
                  +฿{IMMEDIATE_DELIVERY_FEE}
                </span>
              </div>

              {!immediateAvailable && (
                <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs text-amber-700 dark:text-amber-300">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  <span>เปิดให้บริการเฉพาะเวลา 19:00 - 22:00 น. เท่านั้น</span>
                </div>
              )}
            </div>
          </div>

          {/* Conditional Delivery Fields */}
          <AnimatePresence mode="wait">
            {/* 1. PICKUP AT STORE CONDITIONAL */}
            {orderType === 'pickup' && (
              <motion.div
                key="pickup-fields"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden border-t border-[hsl(var(--border))] pt-4"
              >
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4">
                  <div className="flex items-start gap-3">
                    <Store className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-[hsl(var(--foreground))]">
                        รับสินค้าที่หน้าร้าน (เปิดบริการ 19:00 - 22:00 น.)
                      </h4>
                      <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                        เมื่อคุณยืนยันคำสั่งซื้อ คุณสามารถเดินทางมารับสินค้าและแจ้งหมายเลขคิวกับพนักงานได้ทันที
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 2. SCHEDULED ROUTE DELIVERY CONDITIONAL */}
            {orderType === 'scheduled_route' && (
              <motion.div
                key="scheduled-fields"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 overflow-hidden border-t border-[hsl(var(--border))] pt-4"
              >
                {isLoadingSchedules ? (
                  <div className="flex h-32 items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--primary))]" />
                  </div>
                ) : availableDates.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[hsl(var(--border))] p-6 text-center">
                    <Calendar className="mx-auto h-8 w-8 text-[hsl(var(--muted-foreground))]/40" />
                    <p className="mt-2 text-sm font-semibold text-[hsl(var(--foreground))]">
                      ขณะนี้ยังไม่มีรอบจัดส่งล่วงหน้าเปิดรับออเดอร์
                    </p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                      โปรดเลือกรูปแบบการจัดส่งอื่น หรือติดต่อร้านค้าเพื่อสอบถามรอบจัดส่ง
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Customer Calendar Date Picker */}
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <label className="block text-sm font-bold text-[hsl(var(--foreground))]">
                          1. เลือกวันที่จัดส่งจากปฏิทิน (Select Delivery Date) <span className="text-rose-500">*</span>
                        </label>
                      </div>

                      {/* Quick Cards for easy 1-tap selection on mobile */}
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 mb-3">
                        {availableDates.map((dateStr) => {
                          const { day, month, weekday } = formatScheduleCardDate(dateStr)
                          const isSelected = selectedDate === dateStr
                          const count = schedulesByDate.get(dateStr)?.length || 0

                          return (
                            <button
                              key={dateStr}
                              type="button"
                              onClick={() => setValue('scheduledDeliveryDate', dateStr)}
                              className={`flex flex-col items-center justify-center rounded-2xl border p-3 text-center transition-all ${
                                isSelected
                                  ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-white shadow-md shadow-[hsl(var(--primary))]/25'
                                  : 'border-[hsl(var(--border))] bg-[hsl(var(--background))] hover:border-[hsl(var(--primary))]/40 hover:bg-[hsl(var(--accent))]'
                              }`}
                            >
                              <span className={`text-[11px] font-semibold ${isSelected ? 'text-white/80' : 'text-[hsl(var(--primary))]'}`}>
                                {weekday}
                              </span>
                              <span className="text-xl font-black">{day}</span>
                              <span className={`text-[11px] font-medium ${isSelected ? 'text-white/90' : 'text-[hsl(var(--muted-foreground))]'}`}>
                                {month}
                              </span>
                              <span className={`mt-1 rounded-full px-2 py-0.5 text-[9px] font-bold ${
                                isSelected ? 'bg-white/20 text-white' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
                              }`}>
                                {count} จุดส่งพร้อมบริการ
                              </span>
                            </button>
                          )
                        })}
                      </div>

                      {errors.scheduledDeliveryDate && (
                        <p className="mt-1.5 text-xs text-[hsl(var(--destructive))]">
                          {errors.scheduledDeliveryDate.message}
                        </p>
                      )}
                    </div>

                    {/* Location Selector for selected date */}
                    <div>
                      <label className="mb-2 block text-sm font-bold text-[hsl(var(--foreground))]">
                        2. เลือกสถานที่ / จุดนัดรับ (Locations on {formatDeliveryDateThai(selectedDate || '')}) <span className="text-rose-500">*</span>
                      </label>
                      <div className="space-y-2">
                        {locationsForDate.map((sch) => {
                          const isSelected = selectedScheduleId === sch.id
                          return (
                            <div
                              key={sch.id}
                              onClick={() => setValue('scheduledDeliveryScheduleId', sch.id)}
                              className={`flex cursor-pointer items-start justify-between rounded-xl border p-3.5 transition-all ${
                                isSelected
                                  ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10 ring-1 ring-[hsl(var(--primary))]'
                                  : 'border-[hsl(var(--border))] bg-[hsl(var(--background))] hover:bg-[hsl(var(--accent))]'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div
                                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                                    isSelected
                                      ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-white'
                                      : 'border-[hsl(var(--border))] bg-[hsl(var(--card))]'
                                  }`}
                                >
                                  {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                                </div>
                                <div>
                                  <h4 className="text-sm font-bold text-[hsl(var(--foreground))]">
                                    {sch.location_name}
                                  </h4>
                                  {sch.building && (
                                    <p className="text-xs font-semibold text-[hsl(var(--primary))] flex items-center gap-1 mt-0.5">
                                      <Building className="h-3 w-3" /> {sch.building}
                                    </p>
                                  )}
                                  {sch.route_name && (
                                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                                      เส้นทาง: {sch.route_name}
                                    </p>
                                  )}
                                  {sch.description && (
                                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 rounded bg-[hsl(var(--muted))]/50 px-2 py-1">
                                      {sch.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      {errors.scheduledDeliveryScheduleId && (
                        <p className="mt-1.5 text-xs text-[hsl(var(--destructive))]">
                          {errors.scheduledDeliveryScheduleId.message}
                        </p>
                      )}
                    </div>

                    {/* Optional extra drop-off detail */}
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]">
                        รายละเอียดเพิ่มเติมสำหรับจุดนัดรับ <span className="text-[hsl(var(--muted-foreground))]">(ไม่บังคับ)</span>
                      </label>
                      <input
                        {...register('scheduledAddressDetails')}
                        placeholder="เช่น ชั้น 3 ฝ่ายการเงิน หรือ จุดนัดรับด้านหน้าตึก"
                        className={inputClass(false)}
                      />
                    </div>

                    {/* Notice Banner requirement from spec */}
                    <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3.5 flex items-center gap-2.5 text-xs text-blue-700 dark:text-blue-300">
                      <Info className="h-4 w-4 shrink-0 text-blue-500" />
                      <div>
                        <strong>คำสั่งซื้อของคุณจะจัดส่งภายในวันที่เลือก</strong>
                        <p className="text-[11px] opacity-90 mt-0.5">
                          (Your order will be delivered within the selected day)
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* 3. IMMEDIATE LOCAL DELIVERY CONDITIONAL */}
            {orderType === 'immediate_local' && (
              <motion.div
                key="immediate-fields"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 overflow-hidden border-t border-[hsl(var(--border))] pt-4"
              >
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]">
                    ที่อยู่จัดส่ง (Delivery Address) <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    {...register('deliveryAddress')}
                    placeholder="บ้านเลขที่, ซอย, หมู่บ้าน, อาคาร, จุดสังเกตชัดเจน..."
                    className={`${inputClass(!!errors.deliveryAddress)} resize-none`}
                  />
                  {errors.deliveryAddress && (
                    <p className="mt-1 text-xs text-[hsl(var(--destructive))]">
                      {errors.deliveryAddress.message}
                    </p>
                  )}
                </div>
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
                  <Clock className="h-4 w-4 shrink-0" />
                  <span>จัดส่งด่วนในวันเดียวกัน (รอบการจัดส่ง 19:00 - 22:00 น.)</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Notes */}
          <div className="mt-4 border-t border-[hsl(var(--border))] pt-4">
            <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]">
              หมายเหตุเพิ่มเติม <span className="text-[hsl(var(--muted-foreground))]">(ไม่บังคับ)</span>
            </label>
            <textarea
              {...register('notes')}
              placeholder="เช่น ขอช้อนส้อม, แยกน้ำแข็ง..."
              rows={2}
              className={`${inputClass(false)} resize-none`}
            />
          </div>
        </div>

        {/* Order Summary */}
        <div className="space-y-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-sm">
          <h2 className="font-semibold text-[hsl(var(--foreground))]">สรุปคำสั่งซื้อ</h2>
          {items.map((item) => (
            <div key={item.cartItemId} className="flex justify-between text-sm">
              <div>
                <span className="text-[hsl(var(--foreground))]">{item.productName}</span>
                <span className="ml-1 text-[hsl(var(--muted-foreground))]">× {item.quantity}</span>
                {item.selectedAddons.length > 0 && (
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    {item.selectedAddons.map((a) => a.optionName).join(', ')}
                  </p>
                )}
              </div>
              <span className="font-medium text-[hsl(var(--foreground))]">{formatCurrency(item.subtotal)}</span>
            </div>
          ))}

          <div className="border-t border-[hsl(var(--border))] pt-3 space-y-2">
            <div className="flex justify-between text-sm text-[hsl(var(--muted-foreground))]">
              <span>ยอดรวมสินค้า (Subtotal)</span>
              <span>{formatCurrency(cartSubtotal)}</span>
            </div>

            {appliedPromotions.length > 0 && (
              <div className="space-y-1">
                {appliedPromotions.map((promo) => (
                  <div key={promo.id} className="flex justify-between text-xs text-emerald-500">
                    <span className="flex items-center gap-1.5">
                      <Tag className="h-3 w-3" /> {promo.name}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between text-sm font-medium text-emerald-500">
                  <span>ส่วนลดโปรโมชั่น (Discount)</span>
                  <span>-{formatCurrency(discountAmount)}</span>
                </div>
              </div>
            )}

            {deliveryFee > 0 && (
              <div className="flex justify-between text-sm font-medium text-[hsl(var(--foreground))]">
                <span>ค่าจัดส่ง (Delivery Fee)</span>
                <span>{formatCurrency(deliveryFee)}</span>
              </div>
            )}

            <div className="flex justify-between pt-2 text-lg font-extrabold">
              <span className="text-[hsl(var(--foreground))]">ยอดสุทธิ (Total)</span>
              <span className="text-[hsl(var(--primary))]">{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Payment Method Selection */}
        <div className="space-y-4 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-[hsl(var(--foreground))] flex items-center gap-2">
              <Banknote className="h-4 w-4 text-[hsl(var(--primary))]" /> เลือกวิธีชำระเงิน (Payment Method) <span className="text-rose-500">*</span>
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {/* OPTION 1: Cash */}
            <div
              onClick={() => setValue('paymentMethod', 'cash')}
              className={`relative flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-all ${
                paymentMethod === 'cash'
                  ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/5 shadow-sm ring-1 ring-[hsl(var(--primary))]'
                  : 'border-[hsl(var(--border))] bg-[hsl(var(--background))] hover:border-[hsl(var(--primary))]/40 hover:bg-[hsl(var(--accent))]'
              }`}
            >
              <input type="radio" value="cash" {...register('paymentMethod')} className="sr-only" />
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                  paymentMethod === 'cash'
                    ? 'bg-[hsl(var(--primary))] text-white shadow-md shadow-[hsl(var(--primary))]/20'
                    : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
                }`}
              >
                <Banknote className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <span
                  className={`text-sm font-bold block ${
                    paymentMethod === 'cash' ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--foreground))]'
                  }`}
                >
                  เงินสด (Cash)
                </span>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                  ชำระเงินสดกับพนักงานเมื่อได้รับสินค้า
                </p>
              </div>
            </div>

            {/* OPTION 2: Scan to Pay / PromptPay */}
            <div
              onClick={() => setValue('paymentMethod', 'promptpay')}
              className={`relative flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-all ${
                paymentMethod === 'promptpay'
                  ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/5 shadow-sm ring-1 ring-[hsl(var(--primary))]'
                  : 'border-[hsl(var(--border))] bg-[hsl(var(--background))] hover:border-[hsl(var(--primary))]/40 hover:bg-[hsl(var(--accent))]'
              }`}
            >
              <input type="radio" value="promptpay" {...register('paymentMethod')} className="sr-only" />
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                  paymentMethod === 'promptpay'
                    ? 'bg-[hsl(var(--primary))] text-white shadow-md shadow-[hsl(var(--primary))]/20'
                    : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
                }`}
              >
                <QrCode className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <span
                  className={`text-sm font-bold block ${
                    paymentMethod === 'promptpay' ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--foreground))]'
                  }`}
                >
                  สแกนจ่าย (PromptPay QR)
                </span>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                  สแกนจ่ายผ่าน Mobile Banking ทุกธนาคาร
                </p>
              </div>
            </div>
          </div>

          {errors.paymentMethod && (
            <p className="text-xs text-[hsl(var(--destructive))]">{errors.paymentMethod.message}</p>
          )}

          {/* Conditional PromptPay QR Display */}
          <AnimatePresence>
            {paymentMethod === 'promptpay' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden border-t border-[hsl(var(--border))] pt-4"
              >
                <div className="mx-auto max-w-sm rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-5 shadow-sm text-center">
                  {/* PromptPay Brand Header */}
                  <div className="mb-4 rounded-2xl bg-gradient-to-r from-[#113566] to-[#005a9e] py-2.5 px-4 text-white shadow-sm">
                    <p className="text-xs tracking-wider opacity-80 uppercase font-medium">พร้อมเพย์</p>
                    <h3 className="text-lg font-black tracking-wide">PromptPay</h3>
                  </div>

                  {/* QR Code Container */}
                  <div className="mx-auto my-3 flex w-fit items-center justify-center rounded-2xl bg-white p-4 shadow-inner ring-1 ring-black/5">
                    <QRCodeSVG
                      value={promptPayPayload}
                      size={190}
                      level="M"
                      includeMargin={false}
                    />
                  </div>

                  {/* Account Details & Amount */}
                  <div className="mt-3 space-y-2">
                    <div className="rounded-xl bg-[hsl(var(--muted))]/50 p-2.5 flex items-center justify-between">
                      <div className="text-left">
                        <span className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))] block">
                          เบอร์พร้อมเพย์ (PromptPay No.)
                        </span>
                        <span className="text-sm font-extrabold text-[hsl(var(--foreground))]">
                          {formatPromptPayPhone(PROMPTPAY_PHONE)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={copyPhoneNumber}
                        className="flex items-center gap-1 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-2.5 py-1 text-xs font-semibold text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))] transition-colors"
                      >
                        {copiedPhone ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-500" />
                            <span className="text-emerald-500">คัดลอกแล้ว</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>คัดลอกเบอร์</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2.5 flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                        ยอดชำระที่ต้องโอน:
                      </span>
                      <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(grandTotal)}
                      </span>
                    </div>

                    <p className="text-[11px] text-[hsl(var(--muted-foreground))] pt-1">
                      💡 สแกน QR ด้วยแอปธนาคาร ยอดเงินจะถูกกรอกให้อัตโนมัติตรงตามออเดอร์
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Server error banner */}
        {serverError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm font-medium text-rose-600 dark:text-rose-400 flex items-start gap-2.5"
          >
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-500 mt-0.5" />
            <span>{serverError}</span>
          </motion.div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[hsl(var(--primary))] px-6 py-4 text-base font-extrabold text-white shadow-lg shadow-[hsl(var(--primary))]/25 transition-all hover:bg-[hsl(var(--primary))]/90 hover:shadow-xl active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" /> กำลังดำเนินการ...
            </>
          ) : (
            <>
              ยืนยันคำสั่งซื้อ <span>•</span> {formatCurrency(grandTotal)}
            </>
          )}
        </button>
      </form>

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccessModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="flex w-full max-w-sm flex-col items-center justify-center rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 text-center shadow-2xl"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 15, stiffness: 200, delay: 0.1 }}
                className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-500 dark:bg-emerald-900/30"
              >
                <CheckCircle2 className="h-10 w-10" />
              </motion.div>
              <h2 className="mb-2 text-2xl font-bold text-[hsl(var(--foreground))]">สั่งซื้อสำเร็จ!</h2>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                ระบบได้รับคำสั่งซื้อของคุณเรียบร้อยแล้ว<br />
                กำลังนำคุณไปยังหน้าติดตามสถานะ...
              </p>
              <div className="mt-6">
                <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--primary))]" />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
