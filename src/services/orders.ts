import { supabase } from '@/lib/supabase'
import { generateTrackingToken } from '@/lib/utils'
import {
  isPickupAllowed,
  isImmediateDeliveryAllowed,
  isStrictlyFutureDate,
  DELIVERY_ERROR_MESSAGES,
} from '@/lib/delivery-utils'
import type { Order, OrderType, PaymentMethod } from '@/types/database'
import type { CartItem } from '@/stores/cart-store'

export interface CreateOrderInput {
  customerName: string
  customerPhone: string
  orderType: OrderType
  paymentMethod?: PaymentMethod
  paymentSlipUrl?: string | null
  deliveryAddress?: string | null
  deliveryDate?: string | null
  deliveryFee: number
  scheduledDeliveryDate?: string | null
  scheduledDeliveryLocationId?: string | null
  scheduledDeliveryLocationName?: string | null
  scheduledDeliveryBuilding?: string | null
  scheduledDeliveryRoute?: string | null
  notes?: string | null
  cartItems: CartItem[]
  total: number
}

const ALLOWED_SLIP_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const ALLOWED_SLIP_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp']
const MAX_SLIP_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5MB

/**
 * Validates and uploads payment slip image to Supabase Storage
 */
export async function uploadPaymentSlip(file: File): Promise<string> {
  if (!file) {
    throw new Error('กรุณาเลือกไฟล์สลิปการโอนเงิน')
  }

  // 1. Validate MIME type
  if (!ALLOWED_SLIP_MIME_TYPES.includes(file.type.toLowerCase())) {
    throw new Error('อนุญาตเฉพาะไฟล์รูปภาพ (JPG, PNG, WEBP) เท่านั้น ไม่อนุญาตไฟล์ PDF หรือเอกสารอื่นๆ')
  }

  // 2. Validate file extension
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  if (!ALLOWED_SLIP_EXTENSIONS.includes(ext)) {
    throw new Error('นามสกุลไฟล์ไม่ถูกต้อง รองรับเฉพาะ .jpg, .jpeg, .png, .webp')
  }

  // 3. Validate file size
  if (file.size > MAX_SLIP_FILE_SIZE_BYTES) {
    throw new Error('ขนาดไฟล์สลิปต้องไม่เกิน 5 MB')
  }

  const fileName = `payment-slips/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('images')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    })

  if (uploadError) {
    console.error('Slip upload error:', uploadError)
    throw new Error('เกิดข้อผิดพลาดในการอัปโหลดสลิป กรุณาลองใหม่อีกครั้ง')
  }

  const { data } = supabase.storage.from('images').getPublicUrl(fileName)
  return data.publicUrl
}

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  // Client-side rule verification (Backend trigger also enforces this as final authority)
  if (input.orderType === 'pickup') {
    if (!isPickupAllowed()) {
      throw new Error(DELIVERY_ERROR_MESSAGES.PICKUP_UNAVAILABLE)
    }
  } else if (input.orderType === 'immediate_local') {
    if (!isImmediateDeliveryAllowed()) {
      throw new Error(DELIVERY_ERROR_MESSAGES.IMMEDIATE_UNAVAILABLE)
    }
    if (!input.deliveryAddress?.trim()) {
      throw new Error(DELIVERY_ERROR_MESSAGES.IMMEDIATE_ADDRESS_REQUIRED)
    }
  } else if (input.orderType === 'scheduled_route') {
    if (!input.scheduledDeliveryDate) {
      throw new Error(DELIVERY_ERROR_MESSAGES.SCHEDULED_DATE_REQUIRED)
    }
    if (!isStrictlyFutureDate(input.scheduledDeliveryDate)) {
      throw new Error(DELIVERY_ERROR_MESSAGES.SCHEDULED_DATE_NOT_FUTURE)
    }
    if (!input.scheduledDeliveryLocationName?.trim()) {
      throw new Error(DELIVERY_ERROR_MESSAGES.SCHEDULED_LOCATION_REQUIRED)
    }
  }

  // Payment Method Slip Validation
  if (input.paymentMethod === 'promptpay') {
    if (!input.paymentSlipUrl || !input.paymentSlipUrl.trim()) {
      throw new Error('กรุณาแนบสลิปการโอนเงินก่อนยืนยันคำสั่งซื้อ (Please upload your payment slip before confirming the order)')
    }
  }

  const trackingToken = generateTrackingToken()

  // 1. Insert order — triggers auto-generate order_number and queue_number
  const orderPayload = {
    order_number: 'pending',   // overridden by trigger
    queue_number: 0,           // overridden by trigger
    tracking_token: trackingToken,
    customer_name: input.customerName.trim(),
    customer_phone: input.customerPhone.trim(),
    order_type: input.orderType,
    payment_method: input.paymentMethod || 'cash',
    payment_slip_url: input.paymentMethod === 'promptpay' ? input.paymentSlipUrl : null,
    delivery_address: input.deliveryAddress ?? null,
    delivery_date: input.deliveryDate ?? input.scheduledDeliveryDate ?? null,
    delivery_fee: input.deliveryFee,
    scheduled_delivery_date: input.scheduledDeliveryDate ?? null,
    scheduled_delivery_location_id: input.scheduledDeliveryLocationId ?? null,
    scheduled_delivery_location_name: input.scheduledDeliveryLocationName ?? null,
    scheduled_delivery_building: input.scheduledDeliveryBuilding ?? null,
    scheduled_delivery_route: input.scheduledDeliveryRoute ?? null,
    notes: input.notes?.trim() ?? null,
    status: 'pending' as const,
    total: input.total,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: order, error: orderError } = await (supabase as any)
    .from('orders')
    .insert(orderPayload)
    .select()
    .single()

  if (orderError || !order) throw orderError ?? new Error('Failed to create order')

  // 2. Insert each order item + its addon selections
  for (const item of input.cartItems) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: orderItem, error: itemError } = await (supabase as any)
      .from('order_items')
      .insert({
        order_id: order.id,
        product_id: item.productId,
        product_name: item.productName,
        product_price: item.productPrice,
        quantity: item.quantity,
        notes: item.notes || null,
        subtotal: item.subtotal,
      })
      .select()
      .single()

    if (itemError || !orderItem) throw itemError ?? new Error('Failed to create order item')

    if (item.selectedAddons.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: addonsError } = await (supabase as any)
        .from('order_item_addons')
        .insert(
          item.selectedAddons.map(addon => ({
            order_item_id: (orderItem as any).id,
            addon_group_name: addon.groupName,
            addon_option_name: addon.optionName,
            additional_price: addon.additionalPrice,
          }))
        )
      if (addonsError) throw addonsError
    }
  }

  return order
}

export async function getOrderByToken(token: string): Promise<Order | null> {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items(
        *,
        order_item_addons(*)
      )
    `)
    .eq('tracking_token', token)
    .single()

  if (error || !data) return null
  return data as unknown as Order
}
