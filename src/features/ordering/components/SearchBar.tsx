import { useState, useEffect } from 'react'
import { Search, X } from 'lucide-react'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function SearchBar({ value, onChange, placeholder = 'ค้นหาสินค้า...' }: SearchBarProps) {
  const [localValue, setLocalValue] = useState(value)

  // Debounce: update parent 350ms after typing stops
  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(localValue)
    }, 350)
    return () => clearTimeout(timer)
  }, [localValue, onChange])

  // Sync if parent clears value
  useEffect(() => {
    if (value === '' && localValue !== '') setLocalValue('')
  }, [value, localValue])

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] py-2.5 pl-9 pr-9 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
      />
      {localValue && (
        <button
          onClick={() => { setLocalValue(''); onChange('') }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
