import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Minus, Plus, ShoppingBag, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { Sheet } from '@/components/common/Sheet'
import { formatCurrency } from '@/lib/utils'
import { fetchProductById } from '@/services/products'
import { useCartStore } from '@/stores/cart-store'
import type { SelectedAddon } from '@/stores/cart-store'
import type { ProductListItem } from '@/services/products'

interface ProductDetailDrawerProps {
  product: ProductListItem | null
  onClose: () => void
  isStoreClosed: boolean
}

export function ProductDetailDrawer({ product, onClose, isStoreClosed }: ProductDetailDrawerProps) {
  const addItem = useCartStore((s) => s.addItem)
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')
  const [singleSelections, setSingleSelections] = useState<Record<string, string>>({})
  const [multiSelections, setMultiSelections] = useState<Record<string, string[]>>({})
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [added, setAdded] = useState(false)

  // Fetch full product with addons
  const { data: fullProduct, isLoading } = useQuery({
    queryKey: ['product', product?.id],
    queryFn: () => fetchProductById(product!.id),
    enabled: !!product,
    staleTime: 1000 * 60 * 5,
  })

  // Reset state when product changes
  useEffect(() => {
    setQuantity(1)
    setNotes('')
    setSingleSelections({})
    setMultiSelections({})
    setValidationErrors([])
    setAdded(false)
  }, [product?.id])

  // Compute addon total
  const addonTotal = useMemo(() => {
    if (!fullProduct?.addon_groups) return 0
    return fullProduct.addon_groups.reduce((sum, group) => {
      if (!group.is_multiple) {
        const optionId = singleSelections[group.id]
        const option = (group.addon_options ?? []).find((o) => o.id === optionId)
        return sum + (option?.additional_price ?? 0)
      } else {
        const selectedIds = multiSelections[group.id] ?? []
        return (
          sum +
          (group.addon_options ?? [])
            .filter((o) => selectedIds.includes(o.id))
            .reduce((s, o) => s + o.additional_price, 0)
        )
      }
    }, 0)
  }, [fullProduct, singleSelections, multiSelections])

  const unitPrice = (product?.price ?? 0) + addonTotal
  const totalPrice = unitPrice * quantity

  const validate = (): boolean => {
    const errors: string[] = []
    for (const group of fullProduct?.addon_groups ?? []) {
      if (group.is_required) {
        if (!group.is_multiple && !singleSelections[group.id]) {
          errors.push(`Please select ${group.name}`)
        }
        if (group.is_multiple && (multiSelections[group.id] ?? []).length === 0) {
          errors.push(`Please select at least one option for ${group.name}`)
        }
      }
    }
    setValidationErrors(errors)
    return errors.length === 0
  }

  const buildSelectedAddons = (): SelectedAddon[] => {
    const addons: SelectedAddon[] = []
    for (const group of fullProduct?.addon_groups ?? []) {
      if (!group.is_multiple) {
        const optionId = singleSelections[group.id]
        if (optionId) {
          const option = group.addon_options.find((o) => o.id === optionId)
          if (option) {
            addons.push({
              groupId: group.id,
              groupName: group.name,
              optionId: option.id,
              optionName: option.name,
              additionalPrice: option.additional_price,
            })
          }
        }
      } else {
        for (const optionId of multiSelections[group.id] ?? []) {
          const option = group.addon_options.find((o) => o.id === optionId)
          if (option) {
            addons.push({
              groupId: group.id,
              groupName: group.name,
              optionId: option.id,
              optionName: option.name,
              additionalPrice: option.additional_price,
            })
          }
        }
      }
    }
    return addons
  }

  const handleAddToCart = () => {
    if (!product || !validate()) return
    const selectedAddons = buildSelectedAddons()
    addItem({
      productId: product.id,
      productName: product.name,
      productPrice: product.price,
      imageUrl: product.image_url,
      quantity,
      selectedAddons,
      notes,
      unitPrice,
      subtotal: unitPrice * quantity,
    })
    setAdded(true)
    setTimeout(() => {
      onClose()
    }, 600)
  }

  const toggleMultiOption = (groupId: string, optionId: string) => {
    setMultiSelections((prev) => {
      const current = prev[groupId] ?? []
      return {
        ...prev,
        [groupId]: current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId],
      }
    })
    setValidationErrors([])
  }

  return (
    <Sheet open={!!product} onClose={onClose}>
      {isLoading && (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--primary))]" />
        </div>
      )}

      {fullProduct && !isLoading && (
        <div className="flex flex-col">
          {/* Product Image */}
          <div className="relative h-56 w-full shrink-0 overflow-hidden bg-[hsl(var(--muted))]">
            {fullProduct.image_url ? (
              <img
                src={fullProduct.image_url}
                alt={fullProduct.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <ShoppingBag className="h-16 w-16 text-[hsl(var(--muted-foreground))]/25" />
              </div>
            )}
          </div>

          <div className="space-y-6 p-5">
            {/* Name + Price */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">
                  {fullProduct.name}
                </h2>
                {fullProduct.description && (
                  <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                    {fullProduct.description}
                  </p>
                )}
              </div>
              <span className="shrink-0 text-lg font-bold text-[hsl(var(--primary))]">
                {formatCurrency(fullProduct.price)}
              </span>
            </div>

            {/* Addon Groups */}
            {fullProduct.addon_groups.map((group) => (
              <div key={group.id}>
                <div className="mb-2 flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">
                    {group.name}
                  </h3>
                  {group.is_required ? (
                    <span className="rounded-full bg-[hsl(var(--primary))]/10 px-2 py-0.5 text-xs font-medium text-[hsl(var(--primary))]">
                      Required
                    </span>
                  ) : (
                    <span className="rounded-full bg-[hsl(var(--secondary))] px-2 py-0.5 text-xs text-[hsl(var(--muted-foreground))]">
                      เลือกได้ (ไม่บังคับ)
                    </span>
                  )}
                  <span className="text-[hsl(var(--muted-foreground))]">
                    (เลือกได้ {group.is_multiple ? 'หลายรายการ' : '1 รายการ'})
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {(group.addon_options ?? []).map((option) => {
                    const isSelected = group.is_multiple
                      ? (multiSelections[group.id] ?? []).includes(option.id)
                      : singleSelections[group.id] === option.id

                    return (
                      <button
                        key={option.id}
                        onClick={() => {
                          if (group.is_multiple) {
                            toggleMultiOption(group.id, option.id)
                          } else {
                            setSingleSelections((prev) => ({ ...prev, [group.id]: option.id }))
                            setValidationErrors([])
                          }
                        }}
                        className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition-all ${
                          isSelected
                            ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]'
                            : 'border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:border-[hsl(var(--primary))]/50'
                        }`}
                      >
                        <span className="font-medium">{option.name}</span>
                        {option.additional_price > 0 && (
                          <span className="ml-1 text-xs opacity-75">
                            +{formatCurrency(option.additional_price)}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-[hsl(var(--destructive))]/30 bg-[hsl(var(--destructive))]/10 p-3"
              >
                {validationErrors.map((err) => (
                  <p key={err} className="text-sm text-[hsl(var(--destructive))]">
                    • {err}
                  </p>
                ))}
              </motion.div>
            )}

            {/* Notes */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]">
                คำแนะนำเพิ่มเติม
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="เช่น หวานน้อย, ไม่ใส่น้ำแข็ง..."
                rows={2}
                className="w-full resize-none rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              />
            </div>

            {/* Quantity */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[hsl(var(--foreground))]">จำนวน</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[hsl(var(--border))] text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--accent))]"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-6 text-center text-lg font-semibold">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[hsl(var(--border))] text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--accent))]"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Add to Cart Footer */}
      {fullProduct && !isLoading && (
        <div className="sticky bottom-0 border-t border-[hsl(var(--border))] bg-[hsl(var(--background))] p-4">
          {isStoreClosed ? (
            <div className="rounded-xl bg-[hsl(var(--muted))] p-3 text-center text-sm text-[hsl(var(--muted-foreground))]">
              ร้านปิดให้บริการชั่วคราว ไม่สามารถสั่งอาหารได้
            </div>
          ) : (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleAddToCart}
              className={`flex w-full items-center justify-between rounded-xl px-5 py-3.5 font-semibold text-white transition-colors ${
                added
                  ? 'bg-emerald-500'
                  : 'bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90'
              }`}
            >
              <span>{added ? '✓ เพิ่มลงตะกร้าแล้ว' : 'เพิ่มลงตะกร้า'}</span>
              <span>{formatCurrency(totalPrice)}</span>
            </motion.button>
          )}
        </div>
      )}
    </Sheet>
  )
}
