import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingCart } from 'lucide-react'
import { useCartStore, selectCartTotal, selectCartItemCount } from '@/stores/cart-store'
import { formatCurrency } from '@/lib/utils'

interface CartButtonProps {
  onClick: () => void
}

export function CartButton({ onClick }: CartButtonProps) {
  const total = useCartStore(selectCartTotal)
  const count = useCartStore(selectCartItemCount)

  if (count === 0) return null

  return (
    <AnimatePresence>
      <motion.button
        key="cart-btn"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 20 }}
        onClick={onClick}
        className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full bg-[hsl(var(--foreground))] px-5 py-3.5 text-[hsl(var(--background))] shadow-2xl"
      >
        {/* Cart icon + count badge */}
        <div className="relative">
          <ShoppingCart className="h-5 w-5" />
          <motion.span
            key={count}
            initial={{ scale: 0.6 }}
            animate={{ scale: 1 }}
            className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-[10px] font-bold text-white"
          >
            {count}
          </motion.span>
        </div>

        <span className="text-sm font-semibold">View Cart</span>

        <span className="text-sm font-bold">{formatCurrency(total)}</span>
      </motion.button>
    </AnimatePresence>
  )
}
