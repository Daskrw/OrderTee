import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Loader2, Store, Truck, MapPin, User, Phone, ShoppingCart, Tag, CheckCircle2 } from 'lucide-react'
import { useCartStore, selectCartTotal } from '@/stores/cart-store'
import { useCartPromotions } from '@/hooks/useCartPromotions'
import { createOrder } from '@/services/orders'
import { formatCurrency } from '@/lib/utils'
import type { Order, OrderType } from '@/types/database'

const DELIVERY_FEE_NEARBY = 50

const schema = z
  .object({
    customerName: z.string().min(2, 'กรุณากรอกชื่ออย่างน้อย 2 ตัวอักษร'),
    customerPhone: z.string().min(9, 'กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง'),
    orderType: z.enum(['pickup', 'preorder_route', 'preorder_nearby'] as const),
    deliveryDate: z.string().optional(),
    deliveryAddress: z.string().optional(),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.orderType !== 'pickup' && !data.deliveryDate?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'กรุณาระบุวันที่และเวลาจัดส่ง',
        path: ['deliveryDate'],
      })
    }
    if (data.orderType !== 'pickup' && !data.deliveryAddress?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'กรุณาระบุที่อยู่จัดส่ง',
        path: ['deliveryAddress'],
      })
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
  const [successOrder, setSuccessOrder] = useState<Order | null>(null)

  useEffect(() => {
    if (items.length === 0 && !showSuccessModal) navigate('/order', { replace: true })
  }, [items.length, navigate, showSuccessModal])

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CheckoutForm>({
    resolver: zodResolver(schema),
    defaultValues: { orderType: 'pickup' },
  })

  const orderType = watch('orderType')
  const deliveryFee = orderType === 'preorder_nearby' ? DELIVERY_FEE_NEARBY : 0
  const grandTotal = cartFinalTotal + deliveryFee

  const onSubmit = async (data: CheckoutForm) => {
    setIsSubmitting(true)
    setServerError('')
    try {
      const order: Order = await createOrder({
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        orderType: data.orderType,
        deliveryDate: data.orderType !== 'pickup' ? data.deliveryDate : null,
        deliveryAddress: data.orderType !== 'pickup' ? data.deliveryAddress : null,
        deliveryFee: deliveryFee,
        notes: data.notes,
        cartItems: items,
        total: grandTotal,
      } as any)
      setSuccessOrder(order)
      setShowSuccessModal(true)
      
      // Navigate after a short delay so the user sees the popup
      setTimeout(() => {
        clearCart()
        navigate(`/order/success/${order.id}`)
      }, 2500)
    } catch (err) {
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
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-6 flex items-center gap-4">
        <Link
          to="/order"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--accent))]"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">ชำระเงิน</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Contact Info */}
        <div className="space-y-4 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-sm">
          <h2 className="font-semibold text-[hsl(var(--foreground))]">ข้อมูลติดต่อ</h2>
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-[hsl(var(--foreground))]">
              <User className="h-3.5 w-3.5" /> ชื่อ-นามสกุล
            </label>
            <input {...register('customerName')} placeholder="ชื่อของคุณ" className={inputClass(!!errors.customerName)} />
            {errors.customerName && <p className="mt-1 text-xs text-[hsl(var(--destructive))]">{errors.customerName.message}</p>}
          </div>
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-[hsl(var(--foreground))]">
              <Phone className="h-3.5 w-3.5" /> เบอร์โทรศัพท์
            </label>
            <input {...register('customerPhone')} placeholder="0812345678" type="tel" className={inputClass(!!errors.customerPhone)} />
            {errors.customerPhone && <p className="mt-1 text-xs text-[hsl(var(--destructive))]">{errors.customerPhone.message}</p>}
          </div>
        </div>

        {/* Delivery Options */}
        <div className="space-y-4 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-sm">
          <h2 className="font-semibold text-[hsl(var(--foreground))]">ตัวเลือกการจัดส่ง</h2>
          <div className="space-y-3">
            <label className={`relative flex cursor-pointer flex-col gap-1 rounded-xl border p-4 transition-all ${orderType === 'pickup' ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/5' : 'border-[hsl(var(--border))] hover:border-[hsl(var(--primary))]/50 hover:bg-[hsl(var(--accent))]'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <input type="radio" value="pickup" {...register('orderType')} className="sr-only" />
                  <Store className={`h-5 w-5 ${orderType === 'pickup' ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))]'}`} />
                  <span className={`text-sm font-semibold ${orderType === 'pickup' ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--foreground))]'}`}>รับสินค้าที่ร้าน (Pick up at store)</span>
                </div>
                <span className="text-xs font-semibold text-emerald-500">ฟรี</span>
              </div>
              <p className="pl-8 text-xs text-[hsl(var(--muted-foreground))]">รับสินค้าได้ในช่วงเวลาทำการของร้านค้า</p>
            </label>
            
            <label className={`relative flex cursor-pointer flex-col gap-1 rounded-xl border p-4 transition-all ${orderType === 'preorder_route' ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/5' : 'border-[hsl(var(--border))] hover:border-[hsl(var(--primary))]/50 hover:bg-[hsl(var(--accent))]'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <input type="radio" value="preorder_route" {...register('orderType')} className="sr-only" />
                  <Truck className={`h-5 w-5 ${orderType === 'preorder_route' ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))]'}`} />
                  <span className={`text-sm font-semibold ${orderType === 'preorder_route' ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--foreground))]'}`}>จัดส่งตามเส้นทางปกติ (Pre-order)</span>
                </div>
                <span className="text-xs font-semibold text-emerald-500">ฟรี</span>
              </div>
              <p className="pl-8 text-xs text-[hsl(var(--muted-foreground))]">ระบุวันที่ต้องการรับสินค้า ส่งฟรีในเส้นทางประจำ</p>
            </label>

            <label className={`relative flex cursor-pointer flex-col gap-1 rounded-xl border p-4 transition-all ${orderType === 'preorder_nearby' ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/5' : 'border-[hsl(var(--border))] hover:border-[hsl(var(--primary))]/50 hover:bg-[hsl(var(--accent))]'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <input type="radio" value="preorder_nearby" {...register('orderType')} className="sr-only" />
                  <MapPin className={`h-5 w-5 ${orderType === 'preorder_nearby' ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))]'}`} />
                  <span className={`text-sm font-semibold ${orderType === 'preorder_nearby' ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--foreground))]'}`}>จัดส่งพื้นที่ใกล้เคียง (Pre-order)</span>
                </div>
                <span className="text-xs font-semibold text-[hsl(var(--foreground))]">+฿{DELIVERY_FEE_NEARBY}</span>
              </div>
              <p className="pl-8 text-xs text-[hsl(var(--muted-foreground))]">ระบุวันที่ต้องการรับสินค้า มีค่าบริการจัดส่งเพิ่มเติม</p>
            </label>
          </div>

          <AnimatePresence>
            {orderType !== 'pickup' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 pt-4 overflow-hidden"
              >
                <div className="border-t border-[hsl(var(--border))] pt-4">
                  <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]">วันที่จัดส่ง (Delivery Date)</label>
                  <input type="datetime-local" {...register('deliveryDate')} className={inputClass(!!errors.deliveryDate)} />
                  {errors.deliveryDate && <p className="mt-1 text-xs text-[hsl(var(--destructive))]">{errors.deliveryDate.message}</p>}
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]">ที่อยู่จัดส่ง (Delivery Address)</label>
                  <textarea rows={2} {...register('deliveryAddress')} placeholder="บ้านเลขที่, ซอย, หมู่บ้าน, จุดสังเกต..." className={`${inputClass(!!errors.deliveryAddress)} resize-none`} />
                  {errors.deliveryAddress && <p className="mt-1 text-xs text-[hsl(var(--destructive))]">{errors.deliveryAddress.message}</p>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-4 border-t border-[hsl(var(--border))] pt-4">
            <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]">หมายเหตุเพิ่มเติม <span className="text-[hsl(var(--muted-foreground))]">(ไม่บังคับ)</span></label>
            <textarea
              {...register('notes')}
              placeholder="เช่น ขอช้อนส้อม, ไม่รับใบเสร็จ..."
              rows={2}
              className={`${inputClass(false)} resize-none`}
            />
          </div>
        </div>

        {/* Order Summary */}
        <div className="space-y-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-sm">
          <h2 className="font-semibold text-[hsl(var(--foreground))]">สรุปคำสั่งซื้อ</h2>
          {items.map((item) => (
            <div key={item.cartItemId} className="flex justify-between text-sm">
              <div><span className="text-[hsl(var(--foreground))]">{item.productName}</span><span className="ml-1 text-[hsl(var(--muted-foreground))]">× {item.quantity}</span></div>
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
                {appliedPromotions.map(promo => (
                  <div key={promo.id} className="flex justify-between text-xs text-emerald-500">
                    <span className="flex items-center gap-1.5"><Tag className="h-3 w-3" /> {promo.name}</span>
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
            
            <div className="flex justify-between pt-2 text-lg font-bold">
              <span className="text-[hsl(var(--foreground))]">ยอดสุทธิ (Total)</span>
              <span className="text-[hsl(var(--primary))]">{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        </div>

        {serverError && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-[hsl(var(--destructive))]">{serverError}</motion.p>}

        <button type="submit" disabled={isSubmitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-4 text-base font-bold text-white shadow-md transition-all hover:bg-[hsl(var(--primary))]/90 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50">
          {isSubmitting ? <><Loader2 className="h-5 w-5 animate-spin" /> กำลังดำเนินการ...</> : <>ยืนยันคำสั่งซื้อ <span>•</span> {formatCurrency(grandTotal)}</>}
        </button>
      </form>

      <AnimatePresence>
        {showSuccessModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="flex w-full max-w-sm flex-col items-center justify-center rounded-3xl bg-[hsl(var(--background))] p-8 text-center shadow-2xl"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 15, stiffness: 200, delay: 0.1 }}
                className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500"
              >
                <CheckCircle2 className="h-12 w-12" />
              </motion.div>
              <h2 className="mb-2 text-2xl font-bold text-[hsl(var(--foreground))]">สั่งซื้อสำเร็จ!</h2>
              <p className="text-[hsl(var(--muted-foreground))]">ระบบได้รับคำสั่งซื้อของคุณแล้ว<br/>กำลังพาท่านไปยังหน้าติดตามสถานะ...</p>
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
