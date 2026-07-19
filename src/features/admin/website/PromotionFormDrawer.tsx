import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Sheet } from '@/components/common/Sheet'
import { fetchAdminProducts } from '@/services/products'
import type { Promotion, PromotionType } from '@/types/database'

interface PromotionFormDrawerProps {
  open: boolean
  onClose: () => void
  editingPromotion: Promotion | null
  onSave: (payload: Omit<Promotion, 'id' | 'created_at'>) => void
  isSubmitting: boolean
}

export function PromotionFormDrawer({ open, onClose, editingPromotion, onSave, isSubmitting }: PromotionFormDrawerProps) {
  const [name, setName] = useState('')
  const [type, setType] = useState<PromotionType>('discount_products')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isActive, setIsActive] = useState(true)

  // Config states
  const [discountAmount, setDiscountAmount] = useState<number>(0)
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [buyProductIds, setBuyProductIds] = useState<string[]>([])
  const [getFreeProductIds, setGetFreeProductIds] = useState<string[]>([])

  const { data: products = [] } = useQuery({
    queryKey: ['admin-products'],
    queryFn: fetchAdminProducts
  })

  useEffect(() => {
    if (editingPromotion) {
      setName(editingPromotion.name)
      setType(editingPromotion.type)
      setStartDate(editingPromotion.start_date ? new Date(editingPromotion.start_date).toISOString().slice(0, 16) : '')
      setEndDate(editingPromotion.end_date ? new Date(editingPromotion.end_date).toISOString().slice(0, 16) : '')
      setIsActive(editingPromotion.is_active)

      const config = editingPromotion.config || {}
      setDiscountAmount(config.discountAmount || 0)
      setSelectedProductIds(config.productIds || [])
      setBuyProductIds(config.buyProductIds || [])
      setGetFreeProductIds(config.getFreeProductIds || [])
    } else {
      setName('')
      setType('discount_products')
      setStartDate('')
      setEndDate('')
      setIsActive(true)
      setDiscountAmount(0)
      setSelectedProductIds([])
      setBuyProductIds([])
      setGetFreeProductIds([])
    }
  }, [editingPromotion, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const config: any = {}
    if (type === 'discount_products') {
      config.discountAmount = discountAmount
      config.productIds = selectedProductIds
    } else if (type === 'buy_x_get_y') {
      config.buyProductIds = buyProductIds
      config.getFreeProductIds = getFreeProductIds
    } else if (type === 'percentage_discount') {
      config.discountAmount = discountAmount
    }

    onSave({
      name,
      type,
      start_date: startDate ? new Date(startDate).toISOString() : null,
      end_date: endDate ? new Date(endDate).toISOString() : null,
      is_active: isActive,
      config
    })
  }

  const toggleSelection = (id: string, list: string[], setList: (l: string[]) => void) => {
    if (list.includes(id)) {
      setList(list.filter(item => item !== id))
    } else {
      setList([...list, id])
    }
  }

  const renderProductSelector = (label: string, list: string[], setList: (l: string[]) => void) => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-[hsl(var(--foreground))]">{label}</label>
      <div className="max-h-48 overflow-y-auto rounded-xl border border-[hsl(var(--border))] p-2 space-y-1">
        {products.map(p => (
          <label key={p.id} className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-[hsl(var(--muted))]">
            <input 
              type="checkbox" 
              checked={list.includes(p.id)}
              onChange={() => toggleSelection(p.id, list, setList)}
              className="h-4 w-4 rounded border-[hsl(var(--border))] text-[hsl(var(--primary))] focus:ring-[hsl(var(--primary))]"
            />
            <div className="flex-1">
              <p className="text-sm font-medium">{p.name}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">฿{p.price}</p>
            </div>
          </label>
        ))}
      </div>
    </div>
  )

  return (
    <Sheet open={open} onClose={onClose} title={editingPromotion ? 'Edit Promotion' : 'Add Promotion'}>
      <form onSubmit={handleSubmit} className="flex h-full flex-col">
        <div className="flex-1 space-y-6 p-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]">Promotion Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              placeholder="e.g. Summer Sale 20%"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]">Promotion Type</label>
            <select
              value={type}
              onChange={e => setType(e.target.value as PromotionType)}
              className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
            >
              <option value="discount_products">Discount on Selected Products</option>
              <option value="buy_x_get_y">Buy X Get Y Free</option>
              <option value="percentage_discount">Percentage Discount (%) on all items</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]">Start Date</label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]">End Date</label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              />
            </div>
          </div>

          <label className="flex items-center gap-3">
            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="h-4 w-4 rounded border-[hsl(var(--border))] text-[hsl(var(--primary))]" />
            <span className="text-sm font-medium text-[hsl(var(--foreground))]">Active</span>
          </label>

          <hr className="border-[hsl(var(--border))]" />

          {type === 'discount_products' && (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]">Discount Amount (฿)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={discountAmount}
                  onChange={e => setDiscountAmount(Number(e.target.value))}
                  className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                />
              </div>
              {renderProductSelector("Select Products to Discount", selectedProductIds, setSelectedProductIds)}
            </div>
          )}

          {type === 'percentage_discount' && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]">Discount Percentage (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                required
                value={discountAmount}
                onChange={e => setDiscountAmount(Number(e.target.value))}
                className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              />
            </div>
          )}

          {type === 'buy_x_get_y' && (
            <div className="space-y-4">
              {renderProductSelector("Buy Products (Required)", buyProductIds, setBuyProductIds)}
              {renderProductSelector("Get Products Free", getFreeProductIds, setGetFreeProductIds)}
            </div>
          )}
        </div>

        <div className="border-t border-[hsl(var(--border))] p-5">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] py-2.5 text-sm font-semibold text-primary-foreground hover:bg-[hsl(var(--primary))]/90 disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Promotion
          </button>
        </div>
      </form>
    </Sheet>
  )
}
