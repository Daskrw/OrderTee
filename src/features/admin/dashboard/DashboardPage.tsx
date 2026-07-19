import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  BarChart3, 
  Clock, 
  ChefHat, 
  DollarSign, 
  Package, 
  BellRing,
  ArrowRight,
  ShoppingBag
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { fetchDashboardStats, fetchOrders } from '@/services/admin'
import { useNotificationSound } from '@/hooks/use-notification-sound'
import { formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/common/Badge'
import type { OrderStatus } from '@/types/database'

export default function DashboardPage() {
  const queryClient = useQueryClient()
  const { play } = useNotificationSound()
  const [newOrderAlert, setNewOrderAlert] = useState<string | null>(null)

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: fetchDashboardStats,
  })

  const { data: orders = [] } = useQuery({
    queryKey: ['admin-orders', 'recent'],
    queryFn: () => fetchOrders(5),
  })

  // Realtime subscription for orders
  useEffect(() => {
    const channel = supabase
      .channel('admin-dashboard')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          // Play sound
          play()
          
          // Show alert
          const queueNum = payload.new.queue_number
          setNewOrderAlert(`New Order #${queueNum}`)
          
          // Hide alert after 5s
          setTimeout(() => setNewOrderAlert(null), 5000)
          
          // Invalidate queries to refetch
          void queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
          void queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
          void queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
        }
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [play, queryClient])

  const getStatusBadge = (status: OrderStatus) => {
    const map: Record<OrderStatus, { variant: 'primary' | 'secondary' | 'warning' | 'success' | 'destructive', label: string }> = {
      pending: { variant: 'warning', label: 'Pending' },
      preparing: { variant: 'primary', label: 'Preparing' },
      ready: { variant: 'success', label: 'Ready' },
      completed: { variant: 'secondary', label: 'Completed' },
      cancelled: { variant: 'destructive', label: 'Cancelled' },
    }
    const cfg = map[status]
    return <Badge variant={cfg.variant}>{cfg.label}</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">Dashboard</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Overview of today's activity.</p>
      </div>

      {/* New Order Alert Popup */}
      <AnimatePresence>
        {newOrderAlert && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed left-1/2 top-20 z-50 flex items-center gap-3 rounded-full bg-emerald-500 px-6 py-3 text-white shadow-xl"
          >
            <BellRing className="h-5 w-5 animate-bounce" />
            <span className="font-bold">{newOrderAlert}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Grid */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="ยอดขายวันนี้" value={formatCurrency(stats?.totalRevenueToday || 0)} icon={DollarSign} />
        <StatCard title="จำนวนออเดอร์วันนี้" value={stats?.totalOrdersToday || 0} icon={ShoppingBag} />
        <StatCard title="กำลังรอยืนยัน" value={stats?.pendingOrders || 0} icon={Clock} alert={!!stats?.pendingOrders && stats.pendingOrders > 0} />
        <StatCard title="กำลังเตรียม" value={stats?.preparingOrders || 0} icon={ChefHat} />
      </div>

      {/* Recent Orders List */}
      <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm">
        <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-5 py-4">
          <h2 className="font-semibold text-[hsl(var(--foreground))]">คำสั่งซื้อล่าสุด</h2>
          <Link
            to="/admin/orders"
            className="flex items-center gap-1 text-sm font-medium text-[hsl(var(--primary))] hover:underline"
          >
            ดูทั้งหมด <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        
        <div className="divide-y divide-[hsl(var(--border))]">
          {orders.length === 0 ? (
            <div className="p-8 text-center text-[hsl(var(--muted-foreground))]">
              <Package className="mx-auto mb-2 h-8 w-8 opacity-20" />
              <p>ยังไม่มีคำสั่งซื้อในวันนี้</p>
            </div>
          ) : (
            orders.map((order) => (
              <div key={order.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[hsl(var(--foreground))]">
                      #{order.queue_number}
                    </span>
                    <span className="text-sm text-[hsl(var(--muted-foreground))]">
                      {order.customer_name}
                    </span>
                    <Badge variant="outline" className="ml-2 text-[10px] uppercase">
                      {order.order_type}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                    {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 
                    {' · '}
                    {formatCurrency(order.total)}
                  </p>
                </div>
                <div>
                  {getStatusBadge(order.status)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  alert = false 
}: { 
  title: string
  value: string | number
  icon: any
  alert?: boolean 
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${
          alert 
            ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400' 
            : 'bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]'
        }`}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-[hsl(var(--muted-foreground))]">{title}</p>
          <p className="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">{value}</p>
        </div>
      </div>
      {alert && (
        <div className="absolute right-0 top-0 h-full w-1 bg-amber-500" />
      )}
    </div>
  )
}
