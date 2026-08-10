import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Minus, Plus, Trash2, ShoppingBag, X, Tag } from 'lucide-react'
import { Sheet } from '@/components/common/Sheet'
import { useCartStore, selectCartTotal, selectCartItemCount } from '@/stores/cart-store'
import { useCartPromotions } from '@/hooks/useCartPromotions'
import { formatCurrency } from '@/lib/utils'

interface CartDrawerProps {
  open: boolean
  onClose: () => void
  isStoreClosed?: boolean
}

export function CartDrawer({ open, onClose, isStoreClosed }: CartDrawerProps) {
  const navigate = useNavigate()
  const items = useCartStore((state) => state.items)
  const updateQuantity = useCartStore((state) => state.updateQuantity)
  const removeItem = useCartStore((state) => state.removeItem)
  const clearCart = useCartStore((state) => state.clearCart)
  const itemCount = useCartStore(selectCartItemCount)
  const subtotal = useCartStore(selectCartTotal)

  const { discountAmount, finalTotal, appliedPromotions } = useCartPromotions()

  const handleCheckout = () => {
    // Replace the current history entry (which is the drawer state)
    // with the checkout page, so that when the user presses back,
    // they go back to the order page directly.
    navigate('/order/checkout', { replace: true })
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`ตะกร้าสินค้า (${itemCount})`}
      side="right"
    >
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center space-y-4 text-[hsl(var(--muted-foreground))]">
              <ShoppingBag className="h-16 w-16 opacity-20" />
              <p>ไม่มีสินค้าในตะกร้า</p>
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {items.map((item) => (
                  <motion.div
                    key={item.cartItemId}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex gap-4 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 shadow-sm"
                  >
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))]">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.productName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
                          <ShoppingBag className="h-6 w-6 opacity-20" />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col justify-between min-w-0">
                      <div>
                        <div className="flex items-start justify-between">
                          <h4 className="line-clamp-2 text-sm font-semibold text-[hsl(var(--foreground))]">
                            {item.productName}
                          </h4>
                          <button
                            onClick={() => removeItem(item.cartItemId)}
                            className="text-[hsl(var(--muted-foreground))] hover:text-red-500 transition-colors shrink-0 ml-2"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        
                        {item.selectedAddons.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {item.selectedAddons.map((addon) => (
                              <span
                                key={`${addon.groupId}-${addon.optionId}`}
                                className="inline-block rounded-md bg-[hsl(var(--muted))] px-1.5 py-0.5 text-[10px] text-[hsl(var(--muted-foreground))]"
                              >
                                {addon.optionName} {addon.additionalPrice > 0 && `(+฿${addon.additionalPrice})`}
                              </span>
                            ))}
                          </div>
                        )}
                        
                        {item.notes && (
                          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                            หมายเหตุ: {item.notes}
                          </p>
                        )}
                      </div>

                      <div className="mt-2 flex items-center justify-between">
                        <div className="font-bold text-[hsl(var(--primary))] text-sm">
                          {formatCurrency(item.subtotal)}
                        </div>
                        <div className="flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-1 py-1 shadow-sm">
                          <button
                            onClick={() => updateQuantity(item.cartItemId, Math.max(0, item.quantity - 1))}
                            className="flex h-6 w-6 items-center justify-center rounded-full text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))] transition-colors"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-4 text-center text-sm font-semibold text-[hsl(var(--foreground))]">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                            className="flex h-6 w-6 items-center justify-center rounded-full text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))] transition-colors"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)] z-10">
            <div className="mb-2 text-right">
              <button
                onClick={clearCart}
                className="text-xs text-[hsl(var(--muted-foreground))] underline-offset-2 hover:underline"
              >
                ล้างตะกร้า (Clear Cart)
              </button>
            </div>

            <div className="mb-4 space-y-2">
              <div className="flex justify-between text-sm text-[hsl(var(--muted-foreground))]">
                <span>ยอดรวม (Subtotal)</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              
              {appliedPromotions.length > 0 && (
                <div className="space-y-1 py-1">
                  {appliedPromotions.map(promo => (
                    <div key={promo.id} className="flex justify-between text-xs text-emerald-500">
                      <span className="flex items-center gap-1.5"><Tag className="h-3 w-3" /> {promo.name}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-medium text-emerald-500">
                    <span>ส่วนลด (Discount)</span>
                    <span>-{formatCurrency(discountAmount)}</span>
                  </div>
                </div>
              )}
              
              <div className="flex justify-between border-t border-[hsl(var(--border))] pt-3 text-lg font-extrabold text-[hsl(var(--foreground))]">
                <span>ยอดสุทธิ (Total)</span>
                <span className="text-[hsl(var(--primary))]">{formatCurrency(finalTotal)}</span>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={isStoreClosed}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[hsl(var(--primary))] py-3.5 font-bold text-white shadow-lg shadow-[hsl(var(--primary))]/20 transition-all hover:bg-[hsl(var(--primary))]/90 hover:shadow-xl hover:shadow-[hsl(var(--primary))]/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <ShoppingBag className="h-5 w-5" />
              {isStoreClosed ? 'ร้านปิดให้บริการ' : 'ดำเนินการสั่งซื้อ (Checkout)'}
            </button>
          </div>
        )}
      </div>
    </Sheet>
  )
}
