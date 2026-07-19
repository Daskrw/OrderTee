import { motion } from 'framer-motion'
import { ShoppingBag } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { formatCurrency } from '@/lib/utils'
import type { ProductListItem } from '@/services/products'

interface ProductCardProps {
  product: ProductListItem
  onClick: (product: ProductListItem) => void
  disabled?: boolean
}

export function ProductCard({ product, onClick, disabled = false }: ProductCardProps) {
  const isDisabled = disabled || product.is_sold_out

  return (
    <motion.button
      whileHover={isDisabled ? {} : { scale: 1.02, y: -2 }}
      whileTap={isDisabled ? {} : { scale: 0.98 }}
      onClick={() => !isDisabled && onClick(product)}
      disabled={isDisabled}
      className="group relative flex w-full flex-col overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-left shadow-sm transition-shadow hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
    >
      {/* Image */}
      <div className="relative h-40 w-full overflow-hidden bg-[hsl(var(--muted))]">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ShoppingBag className="h-10 w-10 text-[hsl(var(--muted-foreground))]/30" />
          </div>
        )}

        {/* Badges overlay */}
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {product.is_sold_out && (
            <Badge variant="destructive">สินค้าหมด</Badge>
          )}
          {product.is_recommended && !product.is_sold_out && (
            <Badge variant="primary">⭐ แนะนำ</Badge>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col p-3">
        <h3 className="line-clamp-2 text-sm font-semibold text-[hsl(var(--foreground))]">
          {product.name}
        </h3>
        {product.description && (
          <p className="mt-1 line-clamp-2 text-xs text-[hsl(var(--muted-foreground))]">
            {product.description}
          </p>
        )}
        <p className="mt-auto pt-2 text-base font-bold text-[hsl(var(--primary))]">
          {formatCurrency(product.price)}
        </p>
      </div>
    </motion.button>
  )
}
