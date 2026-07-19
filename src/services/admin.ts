import { supabase } from '@/lib/supabase'
import type { Order, OrderStatus } from '@/types/database'

export interface DashboardStats {
  totalOrdersToday: number
  totalRevenueToday: number
  pendingOrders: number
  preparingOrders: number
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  
  const { data, error } = await supabase
    .from('orders')
    .select('status, total, created_at')
    .gte('created_at', startOfDay.toISOString())
    
  if (error) throw error

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).reduce((acc, order) => {
    acc.totalOrdersToday++
    if (order.status !== 'cancelled') {
      acc.totalRevenueToday += Number(order.total)
    }
    if (order.status === 'pending') acc.pendingOrders++
    if (order.status === 'preparing') acc.preparingOrders++
    return acc
  }, {
    totalOrdersToday: 0,
    totalRevenueToday: 0,
    pendingOrders: 0,
    preparingOrders: 0
  })
}

export async function fetchOrders(limit = 50): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items(
        *,
        order_item_addons(*)
      )
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data as unknown as Order[]
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    
  if (error) throw error
}

export async function deleteOrder(orderId: string): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('id', orderId)
    
  if (error) throw error
}
