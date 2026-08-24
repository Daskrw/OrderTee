import { useState } from 'react'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { Loader2, Printer, MapPin, Phone, User, CheckCircle2, Trash2 } from 'lucide-react'
import { Sheet } from '@/components/common/Sheet'
import { updateOrderStatus } from '@/services/admin'
import { formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/common/Badge'
import type { Order, OrderStatus } from '@/types/database'

interface OrderDetailDrawerProps {
  order: Order | null
  onClose: () => void
}

const STATUS_STEPS: OrderStatus[] = ['pending', 'preparing', 'ready', 'completed']

export function OrderDetailDrawer({ order, onClose }: OrderDetailDrawerProps) {
  const queryClient = useQueryClient()
  const [isUpdating, setIsUpdating] = useState(false)

  const mutation = useMutation({
    mutationFn: (newStatus: OrderStatus) => updateOrderStatus(order!.id, newStatus),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
      void queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
    },
    onSettled: () => {
      setIsUpdating(false)
    }
  })

  if (!order) return <Sheet open={false} onClose={onClose}>{null}</Sheet>

  const handleStatusChange = (newStatus: OrderStatus) => {
    setIsUpdating(true)
    mutation.mutate(newStatus)
  }

  const handleNextStatus = () => {
    const currentIndex = STATUS_STEPS.indexOf(order.status)
    if (currentIndex >= 0 && currentIndex < STATUS_STEPS.length - 1) {
      handleStatusChange(STATUS_STEPS[currentIndex + 1])
    }
  }

  const getStatusBadge = (status: OrderStatus) => {
    const map: Record<OrderStatus, { variant: 'primary' | 'secondary' | 'warning' | 'success' | 'destructive', label: string }> = {
      pending: { variant: 'warning', label: 'รอยืนยัน' },
      preparing: { variant: 'primary', label: 'กำลังเตรียม' },
      ready: { variant: 'success', label: 'พร้อมรับ' },
      completed: { variant: 'secondary', label: 'เสร็จสิ้น' },
      cancelled: { variant: 'destructive', label: 'ยกเลิก' },
    }
    const cfg = map[status]
    return <Badge variant={cfg.variant}>{cfg.label}</Badge>
  }

  return (
    <Sheet open={!!order} onClose={onClose} title={`คำสั่งซื้อ #${order.order_number}`}>
      <div className="flex flex-col min-h-full bg-[hsl(var(--muted))]/10">
        
        {/* Actions Bar */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--background))] px-5 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold">คิว: {order.queue_number}</span>
            {getStatusBadge(order.status)}
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={async () => {
                if (confirm('คุณต้องการลบคำสั่งซื้อนี้ออกจากระบบใช่หรือไม่?')) {
                  try {
                    setIsUpdating(true)
                    const { deleteOrder } = await import('@/services/admin')
                    await deleteOrder(order.id)
                    void queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
                    void queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
                    onClose()
                  } catch (e) {
                    alert('เกิดข้อผิดพลาดในการลบ')
                  } finally {
                    setIsUpdating(false)
                  }
                }
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[hsl(var(--destructive))]/50 text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))]/10 transition-colors"
              title="ลบคำสั่งซื้อ"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))]">
              <Printer className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-4 p-5">
          {/* Customer Info */}
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">ข้อมูลลูกค้าและการจัดส่ง</h3>
              <Badge variant="outline" className="uppercase text-[10px]">
                {order.order_type === 'pickup' && 'รับสินค้าที่ร้าน (Pickup)'}
                {order.order_type === 'scheduled_route' && 'จัดส่งตามรอบ (Scheduled Route)'}
                {order.order_type === 'immediate_local' && 'จัดส่งด่วนใกล้เคียง (Immediate Local)'}
                {order.order_type === 'delivery' && 'จัดส่ง (Delivery)'}
                {order.order_type === 'preorder_route' && 'จัดส่งตามรอบ (เดิม)'}
                {order.order_type === 'preorder_nearby' && 'จัดส่งใกล้เคียง (เดิม)'}
              </Badge>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-[hsl(var(--foreground))]">
                <User className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                <span className="font-medium">{order.customer_name}</span>
              </div>
              <div className="flex items-center gap-2 text-[hsl(var(--foreground))]">
                <Phone className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                {order.customer_phone}
              </div>

              {/* Scheduled Route Delivery Details */}
              {(order.order_type === 'scheduled_route' || order.scheduled_delivery_date) && (
                <div className="mt-2 rounded-xl bg-[hsl(var(--primary))]/5 border border-[hsl(var(--primary))]/20 p-3 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[hsl(var(--primary))]">
                    <span>📅 วันที่จัดส่ง:</span>
                    <span>{order.scheduled_delivery_date || order.delivery_date}</span>
                  </div>
                  {order.scheduled_delivery_location_name && (
                    <div className="text-xs text-[hsl(var(--foreground))]">
                      <strong>สถานที่/จุดส่ง:</strong> {order.scheduled_delivery_location_name}
                      {order.scheduled_delivery_building && ` (ตึก/อาคาร: ${order.scheduled_delivery_building})`}
                    </div>
                  )}
                  {order.scheduled_delivery_route && (
                    <div className="text-xs text-[hsl(var(--muted-foreground))]">
                      <strong>เส้นทาง:</strong> {order.scheduled_delivery_route}
                    </div>
                  )}
                  {order.delivery_address && (
                    <div className="text-xs text-[hsl(var(--muted-foreground))]">
                      <strong>รายละเอียดเพิ่มเติม:</strong> {order.delivery_address}
                    </div>
                  )}
                </div>
              )}

              {/* Immediate Local Delivery Address */}
              {order.order_type === 'immediate_local' && order.delivery_address && (
                <div className="flex items-start gap-2 text-[hsl(var(--foreground))] mt-2">
                  <MapPin className="h-4 w-4 text-[hsl(var(--muted-foreground))] mt-0.5" />
                  <span className="flex-1"><strong>ที่อยู่จัดส่ง:</strong> {order.delivery_address}</span>
                </div>
              )}

              {/* Other delivery types with address/date */}
              {order.order_type !== 'scheduled_route' && order.order_type !== 'immediate_local' && order.order_type !== 'pickup' && (
                <>
                  {order.delivery_date && (
                    <div className="flex items-start gap-2 text-[hsl(var(--foreground))] mt-2">
                      <span className="text-[hsl(var(--muted-foreground))] h-4 w-4 flex items-center justify-center font-bold">📅</span>
                      <span className="flex-1 font-medium">{new Date(order.delivery_date).toLocaleString('th-TH')}</span>
                    </div>
                  )}
                  {order.delivery_address && (
                    <div className="flex items-start gap-2 text-[hsl(var(--foreground))] mt-2">
                      <MapPin className="h-4 w-4 text-[hsl(var(--muted-foreground))] mt-0.5" />
                      <span className="flex-1">{order.delivery_address}</span>
                    </div>
                  )}
                </>
              )}
            </div>
            {order.notes && (
              <div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                <span className="font-semibold">หมายเหตุ:</span> {order.notes}
              </div>
            )}
          </div>

          {/* Order Items */}
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-[hsl(var(--foreground))]">รายการอาหาร</h3>
            
            <div className="space-y-4">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {((order as any).order_items ?? []).map((item: any) => (
                <div key={item.id} className="flex justify-between border-b border-[hsl(var(--border))]/50 pb-4 last:border-0 last:pb-0">
                  <div className="flex gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[hsl(var(--muted))] text-xs font-bold text-[hsl(var(--foreground))]">
                      {item.quantity}x
                    </span>
                    <div>
                      <p className="font-medium text-[hsl(var(--foreground))]">{item.product_name}</p>
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {item.order_item_addons?.length > 0 && (
                        <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
                          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                          {item.order_item_addons.map((a: any) => a.addon_option_name).join(', ')}
                        </p>
                      )}
                      {item.notes && (
                        <p className="mt-0.5 text-xs italic text-amber-600 dark:text-amber-400">"{item.notes}"</p>
                      )}
                    </div>
                  </div>
                  <span className="font-medium text-[hsl(var(--foreground))]">
                    {formatCurrency(item.subtotal)}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-[hsl(var(--border))] space-y-2">
              <div className="flex justify-between text-sm text-[hsl(var(--muted-foreground))]">
                <span>ยอดรวมสินค้า</span>
                <span>{formatCurrency(order.total - (order.delivery_fee || 0))}</span>
              </div>
              {(order.delivery_fee || 0) > 0 && (
                <div className="flex justify-between text-sm font-medium text-[hsl(var(--foreground))]">
                  <span>ค่าจัดส่ง</span>
                  <span>{formatCurrency(order.delivery_fee)}</span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-[hsl(var(--border))]/50 pt-2">
                <span className="font-bold text-[hsl(var(--foreground))]">ยอดรวมทั้งหมด</span>
                <span className="text-lg font-bold text-[hsl(var(--primary))]">{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="sticky bottom-0 border-t border-[hsl(var(--border))] bg-[hsl(var(--background))] p-4">
          <div className="flex gap-3">
            {order.status !== 'cancelled' && order.status !== 'completed' && (
              <button
                onClick={() => handleStatusChange('cancelled')}
                disabled={isUpdating}
                className="rounded-xl border border-[hsl(var(--destructive))]/50 px-4 text-sm font-medium text-[hsl(var(--destructive))] transition-colors hover:bg-[hsl(var(--destructive))]/10 disabled:opacity-50"
              >
                ยกเลิก
              </button>
            )}
            
            <div className="flex-1">
              {order.status === 'completed' ? (
                <div className="flex w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--secondary))] py-3.5 text-sm font-semibold text-[hsl(var(--secondary-foreground))]">
                  <CheckCircle2 className="h-5 w-5" /> เสร็จสิ้น
                </div>
              ) : order.status === 'cancelled' ? (
                <div className="flex w-full items-center justify-center rounded-xl bg-destructive/10 py-3.5 text-sm font-semibold text-[hsl(var(--destructive))]">
                  ยกเลิกคำสั่งซื้อ
                </div>
              ) : (
                <button
                  onClick={handleNextStatus}
                  disabled={isUpdating}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
                  {order.status === 'pending' && 'เริ่มเตรียมอาหาร'}
                  {order.status === 'preparing' && 'เสร็จแล้ว (รอรับ)'}
                  {order.status === 'ready' && 'ลูกค้ารับแล้ว'}
                </button>
              )}
            </div>
          </div>
        </div>

      </div>
    </Sheet>
  )
}
