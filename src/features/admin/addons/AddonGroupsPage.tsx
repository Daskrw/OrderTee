import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Loader2, GripVertical, Settings2, X } from 'lucide-react'
import { fetchAddonGroups, createAddonGroup, updateAddonGroup, deleteAddonGroup } from '@/services/addons'
import { Sheet } from '@/components/common/Sheet'
import type { AddonGroupWithOptions } from '@/services/addons'

export default function AddonGroupsPage() {
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<AddonGroupWithOptions | null>(null)
  
  const [name, setName] = useState('')
  const [isRequired, setIsRequired] = useState(false)
  const [isMultiple, setIsMultiple] = useState(false)
  const [sortOrder, setSortOrder] = useState(0)
  
  const [options, setOptions] = useState<{ id: string, name: string, price: number, sort: number }[]>([])
  
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['admin-addons'],
    queryFn: fetchAddonGroups,
  })

  const openNew = () => {
    setEditingGroup(null)
    setName('')
    setIsRequired(false)
    setIsMultiple(false)
    setSortOrder(groups.length > 0 ? groups[groups.length - 1].sort_order + 10 : 0)
    setOptions([{ id: Date.now().toString(), name: '', price: 0, sort: 0 }])
    setFormOpen(true)
  }

  const openEdit = (group: AddonGroupWithOptions) => {
    setEditingGroup(group)
    setName(group.name)
    setIsRequired(group.is_required)
    setIsMultiple(group.is_multiple)
    setSortOrder(group.sort_order)
    setOptions(
      group.addon_options.map((opt) => ({
        id: opt.id, // For UI key tracking
        name: opt.name,
        price: opt.additional_price,
        sort: opt.sort_order
      }))
    )
    if (group.addon_options.length === 0) {
      setOptions([{ id: Date.now().toString(), name: '', price: 0, sort: 0 }])
    }
    setFormOpen(true)
  }

  const closeForm = () => setFormOpen(false)

  const mutation = useMutation({
    mutationFn: async () => {
      const validOptions = options
        .filter((o) => o.name.trim())
        .map((o, i) => ({ name: o.name, additional_price: o.price, sort_order: o.sort || i * 10 }))

      if (editingGroup) {
        await updateAddonGroup(editingGroup.id, { name, is_required: isRequired, is_multiple: isMultiple, sort_order: sortOrder }, validOptions)
      } else {
        await createAddonGroup({ name, is_required: isRequired, is_multiple: isMultiple, sort_order: sortOrder }, validOptions)
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-addons'] })
      closeForm()
    },
    onSettled: () => setIsSubmitting(false)
  })

  const deleteMut = useMutation({
    mutationFn: deleteAddonGroup,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin-addons'] }),
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
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">ตัวเลือกเสริม (Addons)</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">จัดการตัวเลือกพิเศษหรือท็อปปิ้งสำหรับสินค้า</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[hsl(var(--primary))]/90"
        >
          <Plus className="h-4 w-4" /> เพิ่มกลุ่มตัวเลือกเสริม
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/50">
            <tr>
              <th className="px-5 py-3 font-medium text-[hsl(var(--muted-foreground))] w-10"></th>
              <th className="px-5 py-3 font-medium text-[hsl(var(--muted-foreground))]">Group Name</th>
              <th className="px-5 py-3 font-medium text-[hsl(var(--muted-foreground))]">Settings</th>
              <th className="px-5 py-3 font-medium text-[hsl(var(--muted-foreground))]">Options</th>
              <th className="px-5 py-3 font-medium text-[hsl(var(--muted-foreground))] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[hsl(var(--border))]">
            {isLoading ? (
              <tr><td colSpan={5} className="px-5 py-8 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-[hsl(var(--muted-foreground))]" /></td></tr>
            ) : groups.map((group) => (
                <tr key={group.id} className="transition-colors hover:bg-[hsl(var(--accent))]/50">
                  <td className="px-5 py-4"><GripVertical className="h-4 w-4 text-[hsl(var(--muted-foreground))]" /></td>
                  <td className="px-5 py-4 font-medium text-[hsl(var(--foreground))]">{group.name}</td>
                  <td className="px-5 py-4">{group.is_required ? 'Required' : 'Optional'}</td>
                  <td className="px-5 py-4 text-[hsl(var(--muted-foreground))]">{group.addon_options.length} options</td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(group)} className="p-2 hover:bg-[hsl(var(--accent))] rounded-lg"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => deleteMut.mutate(group.id)} className="p-2 hover:bg-destructive/10 text-destructive rounded-lg"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <Sheet open={formOpen} onClose={closeForm} title={editingGroup ? 'แก้ไขกลุ่มตัวเลือก' : 'เพิ่มกลุ่มตัวเลือก'}>
        <form onSubmit={handleSubmit} className="flex h-full flex-col p-5">
          <div className="flex-1 space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]">ชื่อกลุ่มตัวเลือกเสริม</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                placeholder="เช่น ระดับความหวาน, เพิ่มท็อปปิ้ง"
              />
            </div>
            
            <label className="flex items-center gap-3 rounded-xl border border-[hsl(var(--border))] p-4">
              <input
                type="checkbox"
                checked={isRequired}
                onChange={(e) => setIsRequired(e.target.checked)}
                className="h-5 w-5 rounded border-gray-300 text-[hsl(var(--primary))] focus:ring-[hsl(var(--primary))]"
              />
              <div>
                <p className="font-medium text-[hsl(var(--foreground))]">บังคับเลือก</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">ลูกค้าต้องเลือกอย่างน้อย 1 ตัวเลือก</p>
              </div>
            </label>
            
            <label className="flex items-center gap-3 rounded-xl border border-[hsl(var(--border))] p-4">
              <input
                type="checkbox"
                checked={isMultiple}
                onChange={(e) => setIsMultiple(e.target.checked)}
                className="h-5 w-5 rounded border-gray-300 text-[hsl(var(--primary))] focus:ring-[hsl(var(--primary))]"
              />
              <div>
                <p className="font-medium text-[hsl(var(--foreground))]">เลือกได้หลายข้อ</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">ลูกค้าสามารถเลือกได้มากกว่า 1 ตัวเลือก</p>
              </div>
            </label>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <label className="text-sm font-medium text-[hsl(var(--foreground))]">ตัวเลือกย่อย</label>
                <button
                  type="button"
                  onClick={() => setOptions([...options, { id: Date.now().toString(), name: '', price: 0, sort: options.length * 10 }])}
                  className="flex items-center gap-1 text-xs font-medium text-[hsl(var(--primary))] hover:underline"
                >
                  <Plus className="h-3 w-3" /> เพิ่มตัวเลือก
                </button>
              </div>
              
              <div className="space-y-3">
                {options.map((opt, i) => (
                  <div key={opt.id} className="flex items-start gap-2">
                    <input
                      type="text"
                      required
                      placeholder="ชื่อตัวเลือก"
                      value={opt.name}
                      onChange={(e) => {
                        const newOpts = [...options]
                        newOpts[i].name = e.target.value
                        setOptions(newOpts)
                      }}
                      className="flex-1 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                    />
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      placeholder="ราคาบวกเพิ่ม"
                      value={opt.price}
                      onChange={(e) => {
                        const newOpts = [...options]
                        newOpts[i].price = Number(e.target.value)
                        setOptions(newOpts)
                      }}
                      className="w-24 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                    />
                    <button
                      type="button"
                      onClick={() => setOptions(options.filter((_, idx) => idx !== i))}
                      className="mt-1 rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--destructive))]/10 hover:text-[hsl(var(--destructive))]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3 border-t border-[hsl(var(--border))] pt-4">
            <button type="button" onClick={closeForm} className="rounded-xl px-4 py-2 text-sm font-medium hover:bg-[hsl(var(--accent))]">
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-6 py-2 text-sm font-medium text-white hover:bg-[hsl(var(--primary))]/90 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              บันทึก
            </button>
          </div>
        </form>
      </Sheet>
    </div>
  )
}
