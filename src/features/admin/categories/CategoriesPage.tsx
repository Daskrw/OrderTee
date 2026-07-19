import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Loader2, GripVertical } from 'lucide-react'
import { fetchAdminCategories, createCategory, updateCategory, deleteCategory } from '@/services/categories'
import { Sheet } from '@/components/common/Sheet'
import type { Category } from '@/types/database'

export default function CategoriesPage() {
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editingCat, setEditingCat] = useState<Category | null>(null)
  
  const [name, setName] = useState('')
  const [sortOrder, setSortOrder] = useState(0)
  const [isVisible, setIsVisible] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: fetchAdminCategories,
  })

  const openNew = () => {
    setEditingCat(null)
    setName('')
    setSortOrder(categories.length > 0 ? categories[categories.length - 1].sort_order + 10 : 0)
    setIsVisible(true)
    setFormOpen(true)
  }

  const openEdit = (cat: Category) => {
    setEditingCat(cat)
    setName(cat.name)
    setSortOrder(cat.sort_order)
    setIsVisible(cat.is_visible)
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
  }

  const mutation = useMutation({
    mutationFn: async () => {
      if (editingCat) {
        await updateCategory(editingCat.id, { name, sort_order: sortOrder, is_visible: isVisible })
      } else {
        await createCategory({ name, sort_order: sortOrder, is_visible: isVisible })
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
      closeForm()
    },
    onSettled: () => setIsSubmitting(false)
  })

  const deleteMut = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin-categories'] }),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setIsSubmitting(true)
    mutation.mutate()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">จัดการหมวดหมู่</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">จัดการหมวดหมู่สินค้าและจัดเรียงลำดับการแสดงผล (ลากและวาง)</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[hsl(var(--primary))]/90"
        >
          <Plus className="h-4 w-4" /> เพิ่มหมวดหมู่
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/50">
            <tr>
              <th className="px-5 py-3 font-medium text-[hsl(var(--muted-foreground))] w-10"></th>
              <th className="px-5 py-3 font-medium text-[hsl(var(--muted-foreground))]">ชื่อหมวดหมู่</th>
              <th className="px-5 py-3 font-medium text-[hsl(var(--muted-foreground))]">สถานะ</th>
              <th className="px-5 py-3 font-medium text-[hsl(var(--muted-foreground))] text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[hsl(var(--border))]">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-[hsl(var(--muted-foreground))]" />
                </td>
              </tr>
            ) : categories.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-[hsl(var(--muted-foreground))]">
                  ไม่พบหมวดหมู่
                </td>
              </tr>
            ) : (
              categories.map((cat) => (
                <tr key={cat.id} className="transition-colors hover:bg-[hsl(var(--accent))]/50">
                  <td className="px-5 py-4 text-[hsl(var(--muted-foreground))] cursor-move">
                    <GripVertical className="h-4 w-4" />
                  </td>
                  <td className="px-5 py-4 font-medium text-[hsl(var(--foreground))]">
                    {cat.name}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cat.is_visible ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'}`}>
                      {cat.is_visible ? 'แสดง' : 'ซ่อน'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(cat)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))]"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('คุณแน่ใจหรือไม่? การดำเนินการนี้อาจส่งผลต่อการแสดงผลสินค้าในหมวดหมู่นี้')) {
                            deleteMut.mutate(cat.id)
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

      <Sheet open={formOpen} onClose={closeForm} title={editingCat ? 'แก้ไขหมวดหมู่' : 'สร้างหมวดหมู่ใหม่'}>
        <form onSubmit={handleSubmit} className="flex h-full flex-col p-5">
          <div className="flex-1 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]">ชื่อหมวดหมู่</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              />
            </div>
            
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]">ลำดับการแสดงผล</label>
              <input
                type="number"
                required
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              />
            </div>

            <label className="flex items-center gap-3 rounded-xl border border-[hsl(var(--border))] p-4">
              <input
                type="checkbox"
                checked={isVisible}
                onChange={(e) => setIsVisible(e.target.checked)}
                className="h-4 w-4 rounded border-[hsl(var(--border))] text-[hsl(var(--primary))] focus:ring-[hsl(var(--primary))]"
              />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-[hsl(var(--foreground))]">Visible on Menu</span>
                <span className="text-xs text-[hsl(var(--muted-foreground))]">Customers can see this category</span>
              </div>
            </label>
          </div>

          <div className="pt-4 border-t border-[hsl(var(--border))] mt-auto">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] py-3 text-sm font-semibold text-white hover:bg-[hsl(var(--primary))]/90 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Category
            </button>
          </div>
        </form>
      </Sheet>
    </div>
  )
}
