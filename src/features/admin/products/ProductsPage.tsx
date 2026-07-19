import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Loader2, GripVertical, Image as ImageIcon, Search } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchAdminProducts, deleteProduct } from '@/services/products'
import { formatCurrency } from '@/lib/utils'

export default function ProductsPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: fetchAdminProducts,
  })

  const deleteMut = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
  })

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || p.category_id === categoryFilter
    return matchesSearch && matchesCategory
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">จัดการสินค้า</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">จัดการเมนูอาหารและสินค้าทั้งหมดของคุณ</p>
        </div>
        <Link
          to="/admin/products/new"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2 font-medium text-white transition-all hover:bg-[hsl(var(--primary))]/90"
        >
          <Plus className="h-4 w-4" />
          เพิ่มสินค้า
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
          <input
            type="text"
            placeholder="ค้นหาสินค้า..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] py-2 pl-9 pr-3 text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/50">
            <tr>
              <th className="px-5 py-3 font-medium text-[hsl(var(--muted-foreground))] w-10"></th>
              <th className="px-5 py-3 font-medium text-[hsl(var(--muted-foreground))] w-16">รูปภาพ</th>
              <th className="px-5 py-3 font-medium text-[hsl(var(--muted-foreground))]">ชื่อสินค้า</th>
              <th className="px-5 py-3 font-medium text-[hsl(var(--muted-foreground))]">หมวดหมู่</th>
              <th className="px-5 py-3 font-medium text-[hsl(var(--muted-foreground))]">ราคา</th>
              <th className="px-5 py-3 font-medium text-[hsl(var(--muted-foreground))]">สถานะ</th>
              <th className="px-5 py-3 font-medium text-[hsl(var(--muted-foreground))] text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[hsl(var(--border))]">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-[hsl(var(--muted-foreground))]" />
                </td>
              </tr>
            ) : filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-[hsl(var(--muted-foreground))]">
                  ไม่พบสินค้า
                </td>
              </tr>
            ) : (
              filteredProducts.map((product) => (
                <tr key={product.id} className="transition-colors hover:bg-[hsl(var(--accent))]/50">
                  <td className="px-5 py-4 text-[hsl(var(--muted-foreground))] cursor-move">
                    <GripVertical className="h-4 w-4" />
                  </td>
                  <td className="px-5 py-4">
                    <div className="h-10 w-10 overflow-hidden rounded-lg bg-[hsl(var(--muted))] border border-[hsl(var(--border))]">
                      {product.image_url ? (
                        <img src={product.image_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <ImageIcon className="h-4 w-4 text-[hsl(var(--muted-foreground))]/40" />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-medium text-[hsl(var(--foreground))]">{product.name}</p>
                  </td>
                  <td className="px-5 py-4 text-[hsl(var(--muted-foreground))]">
                    {product.category?.name ?? '—'}
                  </td>
                  <td className="px-5 py-4 font-medium text-[hsl(var(--foreground))]">
                    {formatCurrency(product.price)}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${product.is_visible ? 'bg-emerald-100 text-emerald-700' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'}`}>
                        {product.is_visible ? 'เปิดขาย' : 'ปิดการขาย'}
                      </span>
                      {product.is_sold_out && (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700">
                          หมด
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => navigate(`/admin/products/${product.id}`)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))]"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Delete this product?')) {
                            deleteMut.mutate(product.id)
                          }
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-[hsl(var(--muted-foreground))] hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
