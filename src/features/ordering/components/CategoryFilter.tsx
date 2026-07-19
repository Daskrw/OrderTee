import { cn } from '@/lib/utils'
import type { Category } from '@/types/database'

interface CategoryFilterProps {
  categories: Category[]
  selected: string | null
  onSelect: (id: string | null) => void
}

export function CategoryFilter({ categories, selected, onSelect }: CategoryFilterProps) {
  if (categories.length === 0) return null

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      {/* "All" pill */}
      <button
        onClick={() => onSelect(null)}
        className={cn(
          'shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all',
          selected === null
            ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-sm'
            : 'bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] hover:bg-[hsl(var(--accent))]'
        )}
      >
        ทั้งหมด
      </button>

      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          className={cn(
            'shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all',
            selected === cat.id
              ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-sm'
              : 'bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] hover:bg-[hsl(var(--accent))]'
          )}
        >
          {cat.name}
        </button>
      ))}
    </div>
  )
}
