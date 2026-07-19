import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { PackageSearch, Tag, ChevronDown, ChevronUp } from 'lucide-react'
import { fetchProducts } from '@/services/products'
import { fetchCategories } from '@/services/categories'
import { fetchActivePromotions } from '@/services/promotions'
import { SearchBar } from './components/SearchBar'
import { CategoryFilter } from './components/CategoryFilter'
import { ProductCard } from './components/ProductCard'
import { StoreClosedBanner } from './components/StoreClosedBanner'
import { ProductDetailDrawer } from './ProductDetailDrawer'
import { CartButton } from './CartButton'
import { CartDrawer } from './CartDrawer'
import { ProductGridSkeleton } from '@/components/common/Skeleton'
import { useStoreStatus } from '@/hooks/use-store-status'
import type { ProductListItem } from '@/services/products'
import { formatCurrency } from '@/lib/utils'

function PromotionsBanner() {
  const [expanded, setExpanded] = useState(false)
  
  const { data: promotions = [] } = useQuery({
    queryKey: ['active-promotions'],
    queryFn: fetchActivePromotions,
  })

  const { data: allProducts = [] } = useQuery({
    queryKey: ['all-products'],
    queryFn: () => fetchProducts(),
    staleTime: 1000 * 60 * 5,
  })

  if (promotions.length === 0) return null

  const getProductNames = (ids: string[]) => {
    if (!ids || ids.length === 0) return []
    return ids
      .map(id => allProducts.find(p => p.id === id)?.name)
      .filter(Boolean)
  }

  const renderPromoDetails = (promo: any) => {
    if (promo.type === 'discount_products') {
      const names = getProductNames(promo.config?.productIds || [])
      return (
        <div className="space-y-1">
          <p>ลด {formatCurrency(promo.config?.discountAmount || 0)} เมื่อซื้อสินค้าที่ร่วมรายการ</p>
          {names.length > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
              สินค้าที่ร่วมรายการ: {names.join(', ')}
            </p>
          )}
        </div>
      )
    }
    if (promo.type === 'percentage_discount') {
      return <p>รับส่วนลด {promo.config?.discountAmount || 0}% สำหรับทุกออเดอร์!</p>
    }
    if (promo.type === 'buy_x_get_y') {
      const buyNames = getProductNames(promo.config?.buyProductIds || [])
      const getNames = getProductNames(promo.config?.getFreeProductIds || [])
      return (
        <div className="space-y-1">
          <p>โปรโมชั่น ซื้อ X แถม Y ฟรี!</p>
          {buyNames.length > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
              เงื่อนไข: ซื้อ {buyNames.join(', ')}
            </p>
          )}
          {getNames.length > 0 && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              แถมฟรี: {getNames.join(', ')}
            </p>
          )}
        </div>
      )
    }
    return null
  }

  return (
    <div className="mb-6 overflow-hidden rounded-xl bg-[hsl(var(--primary))]/10 border border-[hsl(var(--primary))]/20">
      <button 
        onClick={() => setExpanded(!expanded)} 
        className="w-full flex items-center justify-between p-4 text-sm font-semibold text-[hsl(var(--primary))] transition-colors hover:bg-[hsl(var(--primary))]/5"
      >
        <span className="flex items-center gap-2">
          <Tag className="h-4 w-4" /> โปรโมชั่นพิเศษ! ({promotions.length})
        </span>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <div className="px-4 pb-4 space-y-3 border-t border-[hsl(var(--primary))]/10 pt-3">
              {promotions.map((promo) => (
                <div key={promo.id} className="rounded-lg bg-[hsl(var(--background))]/50 p-3 shadow-sm border border-[hsl(var(--border))]">
                  <h4 className="font-bold text-[hsl(var(--foreground))]">{promo.name}</h4>
                  <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                    {renderPromoDetails(promo)}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function OrderPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<ProductListItem | null>(null)
  const [cartOpen, setCartOpen] = useState(false)

  const { isOpen: isStoreOpen } = useStoreStatus()

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: 1000 * 60 * 10,
  })

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', selectedCategory, search],
    queryFn: () => fetchProducts({ categoryId: selectedCategory, search }),
    staleTime: 1000 * 60 * 5,
  })

  return (
    <>
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-6">
        <PromotionsBanner />

        {/* Store closed banner */}
        {isStoreOpen === false && <StoreClosedBanner />}

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[hsl(var(--foreground))]">เมนูของเรา</h1>
          <p className="mt-2 text-[hsl(var(--muted-foreground))]">
            {isStoreOpen === false
              ? 'ดูเมนูของเรา (ปิดรับออเดอร์ชั่วคราว)'
              : 'เลือกรายการอาหารที่คุณต้องการสั่ง'}
          </p>
        </div>

        {/* Search */}
        <SearchBar value={search} onChange={setSearch} />

        {/* Category Filter */}
        <CategoryFilter
          categories={categories}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
        />

        {/* Product Grid */}
        {isLoading ? (
          <ProductGridSkeleton count={8} />
        ) : products.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center gap-3 py-20 text-center"
          >
            <PackageSearch className="h-12 w-12 text-[hsl(var(--muted-foreground))]/40" />
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              {search ? `ไม่พบสินค้า "${search}"` : 'ไม่มีสินค้า'}
            </p>
            {search && (
              <button
                onClick={() => setSearch('')}
                className="text-sm text-[hsl(var(--primary))] underline-offset-2 hover:underline"
              >
                ล้างการค้นหา
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div
            key={`${selectedCategory}-${search}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-2 gap-3 pb-28 sm:grid-cols-3 md:grid-cols-4"
          >
            {products.map((product, i) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <ProductCard
                  product={product}
                  onClick={setSelectedProduct}
                  disabled={isStoreOpen === false}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Product Detail Drawer */}
      <ProductDetailDrawer
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        isStoreClosed={isStoreOpen === false}
      />

      {/* Cart */}
      <CartButton onClick={() => setCartOpen(true)} />
      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        isStoreClosed={isStoreOpen === false}
      />
    </>
  )
}
