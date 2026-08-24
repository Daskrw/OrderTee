import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { fetchOrders } from '@/services/admin'
import { Badge } from '@/components/common/Badge'
import { formatCurrency } from '@/lib/utils'
import type { OrderStatus, Order } from '@/types/database'
import { OrderDetailDrawer } from './OrderDetailDrawer'

const TABS = [
  { id: 'all', label: 'ทั้งหมด' },
  { id: 'pending', label: 'รอยืนยัน' },
  { id: 'preparing', label: 'กำลังเตรียม' },
  { id: 'ready', label: 'พร้อมรับ' },
  { id: 'completed', label: 'เสร็จสิ้น' },
  { id: 'cancelled', label: 'ยกเลิก' },
]

export default function OrdersPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['admin-orders', 'all'],
    queryFn: () => fetchOrders(200), // Fetch last 200 orders for the view
  })

  // Realtime subscription for orders
  useEffect(() => {
    const channel = supabase
      .channel('admin-orders-page')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
        }
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [queryClient])

  const filteredOrders = orders.filter((order) => {
    if (statusFilter !== 'all' && order.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        order.order_number.toLowerCase().includes(q) ||
        order.customer_name.toLowerCase().includes(q) ||
        order.queue_number.toString().includes(q)
      )
    }
    return true
  })

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
    <div className="space-y-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">จัดการคำสั่งซื้อ</h1>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="ค้นหาไอดี / เบอร์โทร / ชื่อ"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-2 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'all')}
            className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] py-2 pl-3 pr-8 text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
          >
            {TABS.map((tab) => (
              <option key={tab.id} value={tab.id}>{tab.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/50">
              <tr>
                <th className="px-5 py-3 font-medium text-[hsl(var(--muted-foreground))]">คิว</th>
                <th className="px-5 py-3 font-medium text-[hsl(var(--muted-foreground))]">ลูกค้า</th>
                <th className="px-5 py-3 font-medium text-[hsl(var(--muted-foreground))]">ประเภท</th>
                <th className="px-5 py-3 font-medium text-[hsl(var(--muted-foreground))]">ยอดรวม</th>
                <th className="px-5 py-3 font-medium text-[hsl(var(--muted-foreground))]">สถานะ</th>
                <th className="px-5 py-3 font-medium text-[hsl(var(--muted-foreground))]">เวลา</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-[hsl(var(--muted-foreground))]" />
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-[hsl(var(--muted-foreground))]">
                    ไม่พบคำสั่งซื้อ
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr 
                    key={order.id} 
                    onClick={() => setSelectedOrder(order)}
                    className="cursor-pointer transition-colors hover:bg-[hsl(var(--accent))]/50"
                  >
                    <td className="px-5 py-4 font-bold text-[hsl(var(--foreground))]">
                      #{order.queue_number}
                    </td>
                    <td className="px-5 py-4 text-[hsl(var(--foreground))]">
                      {order.customer_name}
                      <div className="text-xs text-[hsl(var(--muted-foreground))]">{order.customer_phone}</div>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant="outline" className="text-[10px]">
                        {order.order_type === 'pickup' && 'รับที่ร้าน'}
                        {order.order_type === 'scheduled_route' && 'จัดส่งตามรอบ'}
                        {order.order_type === 'immediate_local' && 'จัดส่งด่วน'}
                        {order.order_type === 'delivery' && 'จัดส่ง'}
                        {order.order_type === 'preorder_route' && 'จัดส่งตามรอบ'}
                        {order.order_type === 'preorder_nearby' && 'จัดส่งใกล้เคียง'}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 font-medium text-[hsl(var(--foreground))]">
                      {formatCurrency(order.total)}
                    </td>
                    <td className="px-5 py-4">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="px-5 py-4 text-[hsl(var(--muted-foreground))]">
                      {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <OrderDetailDrawer 
        order={selectedOrder} 
        onClose={() => setSelectedOrder(null)} 
      />
    </div>
  )
}
