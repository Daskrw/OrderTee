import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { getOrderByToken } from '@/services/orders'
import { formatCurrency } from '@/lib/utils'
import { Loader2, ArrowLeft, CheckCircle2, Clock, ChefHat, Package, XCircle } from 'lucide-react'
import type { Order, OrderStatus } from '@/types/database'

const STATUS_STEPS: { status: OrderStatus; label: string; icon: React.ElementType }[] = [
  { status: 'pending', label: 'Order Received', icon: Clock },
  { status: 'preparing', label: 'Preparing', icon: ChefHat },
  { status: 'ready', label: 'Ready for Pickup', icon: Package },
  { status: 'completed', label: 'Completed', icon: CheckCircle2 },
]

function getStatusIndex(status: OrderStatus): number {
  if (status === 'cancelled') return -1
  return STATUS_STEPS.findIndex((s) => s.status === status)
}

export default function TrackOrderPage() {
  const { token } = useParams<{ token: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!token) return

    const load = async () => {
      setIsLoading(true)
      const data = await getOrderByToken(token)
      if (!data) {
        setNotFound(true)
      } else {
        setOrder(data)
      }
      setIsLoading(false)
    }

    load()
  }, [token])

  // Realtime subscription for status updates
  useEffect(() => {
    if (!order?.id) return

    const channel = supabase
      .channel(`order-${order.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${order.id}`,
        },
        (payload) => {
          setOrder((prev) => prev ? { ...prev, ...(payload.new as Partial<Order>) } : prev)
        }
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [order?.id])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--primary))]" />
        <p className="mt-4 text-sm text-[hsl(var(--muted-foreground))]">กำลังโหลดสถานะคำสั่งซื้อ...</p>
      </div>
    )
  }

  if (notFound || !order) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <XCircle className="h-12 w-12 text-[hsl(var(--muted-foreground))]/40" />
        <div>
          <h1 className="font-semibold text-[hsl(var(--foreground))]">ไม่พบคำสั่งซื้อ</h1>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
            ลิงก์ติดตามคำสั่งซื้ออาจไม่ถูกต้องหรือหมดอายุแล้ว
          </p>
        </div>
        <Link to="/order" className="text-sm text-[hsl(var(--primary))] underline-offset-2 hover:underline">
          กลับไปที่เมนู
        </Link>
      </div>
    )
  }

  const currentIndex = getStatusIndex(order.status as OrderStatus)
  const isCancelled = order.status === 'cancelled'

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <div className="mb-6 flex items-center gap-4">
        <Link
          to="/order"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--accent))]"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">สถานะคำสั่งซื้อ</h1>
          <p className="text-sm font-medium text-[hsl(var(--muted-foreground))]">
            หมายเลขคำสั่งซื้อ: #{order.order_number}
          </p>
        </div>
      </div>

      {order.queue_number && (
        <div className="mb-8 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 text-center shadow-sm">
          <p className="mb-2 text-sm font-medium text-[hsl(var(--muted-foreground))]">หมายเลขคิวของคุณ</p>
          <p className="text-5xl font-black text-[hsl(var(--primary))] tracking-widest">{order.queue_number}</p>
        </div>
      )}

      {isCancelled ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-[hsl(var(--destructive))]/30 bg-[hsl(var(--destructive))]/10 p-5 text-center"
        >
          <XCircle className="mx-auto mb-2 h-8 w-8 text-[hsl(var(--destructive))]" />
          <p className="font-semibold text-[hsl(var(--destructive))]">คำสั่งซื้อถูกยกเลิก</p>
          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
            โปรดติดต่อเราหากคุณมีคำถามเพิ่มเติม
          </p>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-sm"
        >
          <h2 className="mb-6 text-lg font-bold text-[hsl(var(--foreground))]">ความคืบหน้า</h2>
          <div className="space-y-4">
            {STATUS_STEPS.map((step, i) => {
              const isDone = i < currentIndex
              const isCurrent = i === currentIndex
              const Icon = step.icon

              return (
                <div key={step.status} className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all ${
                      isCurrent
                        ? 'bg-[hsl(var(--primary))] text-white shadow-md shadow-[hsl(var(--primary))]/30'
                        : isDone
                        ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>

                  <div className="flex-1">
                    <p
                      className={`text-sm font-medium ${
                        isCurrent
                          ? 'text-[hsl(var(--primary))]'
                          : isDone
                          ? 'text-[hsl(var(--foreground))]'
                          : 'text-[hsl(var(--muted-foreground))]'
                      }`}
                    >
                      {step.label}
                      {isCurrent && (
                        <span className="ml-2 inline-flex h-2 w-2 animate-pulse rounded-full bg-[hsl(var(--primary))]" />
                      )}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* Delivery Information Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mb-8 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-sm"
      >
        <h2 className="mb-3 text-lg font-bold text-[hsl(var(--foreground))]">รูปแบบการจัดส่ง</h2>
        
        {order.order_type === 'pickup' && (
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4">
            <p className="font-semibold text-[hsl(var(--foreground))]">รับสินค้าที่ร้าน (Pickup at Store)</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
              เปิดรับสินค้าที่ร้านช่วงเวลา 19:00 - 22:00 น.
            </p>
          </div>
        )}

        {(order.order_type === 'scheduled_route' || order.scheduled_delivery_date) && (
          <div className="rounded-xl bg-[hsl(var(--primary))]/10 border border-[hsl(var(--primary))]/20 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[hsl(var(--primary))]">จัดส่งตามรอบเส้นทาง (Scheduled Route Delivery)</span>
              <span className="text-xs font-semibold rounded-full bg-[hsl(var(--primary))]/20 px-2.5 py-0.5 text-[hsl(var(--primary))]">
                {order.scheduled_delivery_date || order.delivery_date}
              </span>
            </div>
            {order.scheduled_delivery_location_name && (
              <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                📍 จุดส่ง: {order.scheduled_delivery_location_name}
                {order.scheduled_delivery_building && ` (อาคาร: ${order.scheduled_delivery_building})`}
              </p>
            )}
            {order.scheduled_delivery_route && (
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                เส้นทาง: {order.scheduled_delivery_route}
              </p>
            )}
            {order.delivery_address && (
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                รายละเอียดจุดนัดรับ: {order.delivery_address}
              </p>
            )}
            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 pt-1">
              * คำสั่งซื้อของคุณจะจัดส่งภายในวันที่เลือก
            </p>
          </div>
        )}

        {order.order_type === 'immediate_local' && (
          <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4 space-y-1.5">
            <p className="font-semibold text-[hsl(var(--foreground))]">จัดส่งด่วนพื้นที่ใกล้เคียง (Immediate Local Delivery)</p>
            {order.delivery_address && (
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                📍 ที่อยู่จัดส่ง: <span className="text-[hsl(var(--foreground))]">{order.delivery_address}</span>
              </p>
            )}
            <p className="text-xs text-blue-600 dark:text-blue-400">
              จัดส่งในวันเดียวกัน (รอบ 19:00 - 22:00 น.)
            </p>
          </div>
        )}

        {order.order_type !== 'pickup' && order.order_type !== 'scheduled_route' && order.order_type !== 'immediate_local' && order.delivery_address && (
          <div className="rounded-xl bg-[hsl(var(--muted))]/50 p-4">
            <p className="font-semibold text-[hsl(var(--foreground))]">ที่อยู่จัดส่ง</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">{order.delivery_address}</p>
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-sm"
      >
        <h2 className="mb-4 text-lg font-bold text-[hsl(var(--foreground))]">สรุปคำสั่งซื้อ</h2>
        
        <div className="space-y-3 mb-4">
          {((order as any).cart_items ?? []).map((item: any, idx: number) => (
            <div key={idx} className="flex justify-between text-sm">
              <div>
                <span className="font-medium text-[hsl(var(--foreground))]">{item.productName}</span>
                <span className="ml-1 text-[hsl(var(--muted-foreground))]">× {item.quantity}</span>
                {item.selectedAddons?.length > 0 && (
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    {item.selectedAddons.map((a: any) => a.optionName).join(', ')}
                  </p>
                )}
                {item.notes && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">หมายเหตุ: {item.notes}</p>
                )}
              </div>
              <span className="font-medium text-[hsl(var(--foreground))]">{formatCurrency(item.subtotal)}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-[hsl(var(--border))] pt-3 space-y-2">
          <div className="flex items-center justify-between text-xs text-[hsl(var(--muted-foreground))]">
            <span>วิธีชำระเงิน</span>
            <span className="font-semibold text-[hsl(var(--foreground))]">
              {order.payment_method === 'promptpay' ? '📱 สแกนจ่าย PromptPay (061-608-0720)' : '💵 ชำระเงินสด (Cash)'}
            </span>
          </div>
          {order.payment_slip_url && (
            <div className="flex items-center justify-between text-xs text-[hsl(var(--muted-foreground))] pt-1">
              <span>สลิปการโอนเงิน</span>
              <a
                href={order.payment_slip_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[hsl(var(--primary))] font-semibold hover:underline"
              >
                ดูรูปสลิป ↗
              </a>
            </div>
          )}
          <div className="flex items-center justify-between font-bold text-lg pt-1">
            <span className="text-[hsl(var(--foreground))]">ยอดรวมทั้งหมด</span>
            <span className="text-[hsl(var(--primary))]">{formatCurrency(order.total)}</span>
          </div>
        </div>
      </motion.div>

      <p className="mt-4 text-center text-xs text-[hsl(var(--muted-foreground))]">
        หน้านี้จะอัปเดตสถานะแบบเรียลไทม์อัตโนมัติ
      </p>
    </div>
  )
}
