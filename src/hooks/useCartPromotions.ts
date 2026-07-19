import { useQuery } from '@tanstack/react-query'
import { fetchActivePromotions } from '@/services/promotions'
import { useCartStore } from '@/stores/cart-store'
import type { CartItem } from '@/stores/cart-store'
import type { Promotion } from '@/types/database'

export interface PromotionResult {
  discountAmount: number
  appliedPromotions: Promotion[]
  freeItems: CartItem[] // (If you want to append free items directly to the UI)
}

export function useCartPromotions() {
  const cartItems = useCartStore(state => state.items)
  
  const { data: promotions = [], isLoading } = useQuery({
    queryKey: ['active-promotions'],
    queryFn: fetchActivePromotions,
  })

  let totalDiscount = 0
  const appliedPromotions: Promotion[] = []

  // Create a copy of cart items to evaluate rules
  const evaluateCart = [...cartItems]

  promotions.forEach(promo => {
    if (!promo.is_active) return

    const config = promo.config || {}
    let promoApplied = false
    let currentPromoDiscount = 0

    if (promo.type === 'discount_products') {
      const targetProductIds: string[] = config.productIds || []
      const discount = Number(config.discountAmount || 0)
      
      evaluateCart.forEach(item => {
        if (targetProductIds.includes(item.productId)) {
          currentPromoDiscount += discount * item.quantity
          promoApplied = true
        }
      })
    } 
    else if (promo.type === 'percentage_discount') {
      const percentage = Number(config.discountAmount || 0)
      let subtotal = 0
      evaluateCart.forEach(item => {
        subtotal += item.subtotal
      })
      if (subtotal > 0 && percentage > 0) {
        currentPromoDiscount = subtotal * (percentage / 100)
        promoApplied = true
      }
    }
    // Simple Buy X Get Y Free logic (simplified: if they have X in cart, just apply a discount equal to Y's price if Y is in cart, or we just rely on discount amounts for now)
    // To fully implement buy X get Y, you'd usually auto-add the free item to the cart or discount an existing one. 
    // For simplicity, we can do: if buy_x is in cart, and get_y is in cart, make get_y free.
    else if (promo.type === 'buy_x_get_y') {
      const buyIds: string[] = config.buyProductIds || []
      const freeIds: string[] = config.getFreeProductIds || []

      const buyItemCount = evaluateCart.reduce((sum, item) => buyIds.includes(item.productId) ? sum + item.quantity : sum, 0)
      const freeItemCount = evaluateCart.reduce((sum, item) => freeIds.includes(item.productId) ? sum + item.quantity : sum, 0)

      if (buyItemCount > 0 && freeItemCount > 0) {
        // Find the free item in cart and discount its price
        let remainingFreeToDiscount = Math.min(buyItemCount, freeItemCount) // 1 to 1 mapping
        
        for (const item of evaluateCart) {
          if (freeIds.includes(item.productId) && remainingFreeToDiscount > 0) {
            const discountCount = Math.min(item.quantity, remainingFreeToDiscount)
            currentPromoDiscount += item.unitPrice * discountCount
            remainingFreeToDiscount -= discountCount
            promoApplied = true
          }
        }
      }
    }

    if (promoApplied && currentPromoDiscount > 0) {
      totalDiscount += currentPromoDiscount
      appliedPromotions.push(promo)
    }
  })

  const cartTotal = cartItems.reduce((sum, item) => sum + item.subtotal, 0)
  
  // Ensure we don't discount more than the cart total
  totalDiscount = Math.min(totalDiscount, cartTotal)

  return {
    discountAmount: totalDiscount,
    finalTotal: cartTotal - totalDiscount,
    appliedPromotions,
    isLoading
  }
}
