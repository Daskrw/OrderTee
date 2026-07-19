import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Loader2, UploadCloud, Save } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { fetchProductById, createProduct, updateProduct } from '@/services/products'
import { fetchAdminCategories } from '@/services/categories'
import { fetchAddonGroups } from '@/services/addons'

export default function ProductFormPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = !id
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Form State
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState(0)
  const [categoryId, setCategoryId] = useState<string>('')
  const [imageUrl, setImageUrl] = useState('')
  const [isVisible, setIsVisible] = useState(true)
  const [isSoldOut, setIsSoldOut] = useState(false)
  const [isRecommended, setIsRecommended] = useState(false)
  const [sortOrder, setSortOrder] = useState(0)
  const [selectedAddons, setSelectedAddons] = useState<string[]>([])

  const [uploading, setUploading] = useState(false)

  // Fetch product if editing
  const { data: product, isLoading: isProductLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => id ? fetchProductById(id) : null,
    enabled: !isNew,
  })

  // Fetch related data
  const { data: categories = [] } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: fetchAdminCategories,
  })

  const { data: addons = [] } = useQuery({
    queryKey: ['admin-addons'],
    queryFn: fetchAddonGroups,
  })

  // Populate form when editing
  useEffect(() => {
    if (product) {
      setName(product.name)
      setDescription(product.description ?? '')
      setPrice(product.price)
      setCategoryId(product.category_id ?? '')
      setImageUrl(product.image_url ?? '')
      setIsVisible(product.is_visible)
      setIsSoldOut(product.is_sold_out)
      setIsRecommended(product.is_recommended)
      setSortOrder(product.sort_order)
      setSelectedAddons(product.addon_groups.map(g => g.id))
    }
  }, [product])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)
      const file = e.target.files?.[0]
      if (!file) return

      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `products/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('images').getPublicUrl(filePath)
      setImageUrl(data.publicUrl)
    } catch (error) {
      alert('Error uploading image!')
      console.error(error)
    } finally {
      setUploading(false)
    }
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name,
        description: description || null,
        price,
        category_id: categoryId || null,
        image_url: imageUrl || null,
        is_visible: isVisible,
        is_sold_out: isSoldOut,
        is_recommended: isRecommended,
        sort_order: sortOrder
      }
      if (isNew) {
        await createProduct(payload, selectedAddons)
      } else {
        await updateProduct(id!, payload, selectedAddons)
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      navigate('/admin/products')
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate()
  }

  const toggleAddon = (groupId: string) => {
    setSelectedAddons(prev => 
      prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
    )
  }

  if (!isNew && isProductLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--primary))]" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to="/admin/products"
          className="flex items-center justify-center h-10 w-10 rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))] transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">
            {!isNew ? 'แก้ไขสินค้า' : 'เพิ่มสินค้า'}
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-[hsl(var(--foreground))]">รายละเอียดสินค้า</h2>
          
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]">ชื่อสินค้า</label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]" />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]">คำอธิบาย</label>
              <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]">ราคา</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]">฿</span>
                  <input type="number" required min="0" step="0.01" value={price} onChange={e => setPrice(Number(e.target.value))} className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] py-2.5 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]" />
                </div>
              </div>
              
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]">หมวดหมู่</label>
                <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]">
                  <option value="">ไม่มีหมวดหมู่</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-[hsl(var(--foreground))]">รูปภาพสินค้า</h2>
          <div className="flex items-center gap-6">
            <div className="h-32 w-32 shrink-0 overflow-hidden rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))]">
              {imageUrl ? (
                <img src={imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-2">
                  <UploadCloud className="h-8 w-8 text-[hsl(var(--muted-foreground))]" />
                  <span className="text-sm text-[hsl(var(--muted-foreground))] text-center px-2">อัพโหลดรูป</span>
                </div>
              )}
            </div>
            <div className="space-y-3">
              <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} className="block w-full text-sm file:mr-4 file:rounded-xl file:border-0 file:bg-[hsl(var(--primary))]/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[hsl(var(--primary))] hover:file:bg-[hsl(var(--primary))]/20" />
              {uploading && <p className="text-xs text-[hsl(var(--muted-foreground))] animate-pulse">กำลังอัพโหลด...</p>}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-[hsl(var(--foreground))]">สถานะสินค้า</h2>
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={isVisible} onChange={e => setIsVisible(e.target.checked)} className="h-4 w-4 rounded border-[hsl(var(--border))] text-[hsl(var(--primary))] focus:ring-[hsl(var(--primary))]" />
              <span className="text-sm font-medium text-[hsl(var(--foreground))]">แสดงบนเมนู</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={isSoldOut} onChange={e => setIsSoldOut(e.target.checked)} className="h-4 w-4 rounded border-[hsl(var(--border))] text-[hsl(var(--primary))] focus:ring-[hsl(var(--primary))]" />
              <span className="text-sm font-medium text-[hsl(var(--foreground))]">สินค้าหมด</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={isRecommended} onChange={e => setIsRecommended(e.target.checked)} className="h-4 w-4 rounded border-[hsl(var(--border))] text-[hsl(var(--primary))] focus:ring-[hsl(var(--primary))]" />
              <span className="text-sm font-medium text-[hsl(var(--foreground))]">แนะนำ</span>
            </label>
          </div>
        </div>

        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-[hsl(var(--foreground))]">ตัวเลือกเสริม (Addons)</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {addons.map(group => (
              <label key={group.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${selectedAddons.includes(group.id) ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/5' : 'border-[hsl(var(--border))]'}`}>
                <input type="checkbox" checked={selectedAddons.includes(group.id)} onChange={() => toggleAddon(group.id)} className="mt-0.5 h-4 w-4 rounded border-[hsl(var(--border))] text-[hsl(var(--primary))] focus:ring-[hsl(var(--primary))]" />
                <div>
                  <p className="text-sm font-semibold">{group.name}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="sticky bottom-0 z-10 flex items-center justify-end gap-3 border-t border-[hsl(var(--border))] bg-[hsl(var(--background))]/80 p-4 backdrop-blur-md">
          <Link
            to="/admin/products"
            className="rounded-xl border border-[hsl(var(--border))] px-5 py-2.5 text-sm font-medium text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))]"
          >
            ยกเลิก
          </Link>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-6 py-2.5 text-sm font-bold text-white hover:bg-[hsl(var(--primary))]/90 disabled:opacity-50"
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {!isNew ? 'บันทึกการแก้ไข' : 'สร้างสินค้า'}
          </button>
        </div>
      </form>
    </div>
  )
}
