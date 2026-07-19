import { Outlet, Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Receipt, Package, Tags, Layers, Settings, Globe, LogOut } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { ThemeToggle } from '@/components/common/ThemeToggle'

const NAVIGATION = [
  { name: 'แดชบอร์ด', href: '/admin', icon: LayoutDashboard },
  { name: 'คำสั่งซื้อ', href: '/admin/orders', icon: Receipt },
  { name: 'สินค้า', href: '/admin/products', icon: Package },
  { name: 'หมวดหมู่', href: '/admin/categories', icon: Tags },
  { name: 'ตัวเลือกเสริม', href: '/admin/addons', icon: Layers },
  { name: 'หน้าเว็บไซต์', href: '/admin/website', icon: Globe },
  { name: 'ตั้งค่าร้าน', href: '/admin/settings', icon: Settings },
]

export function AdminLayout() {
  const location = useLocation()

  // Simple auth check just in case, though AuthGuard handles the main routing
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/admin/login'
  }

  return (
    <div className="flex min-h-screen bg-[hsl(var(--background))]">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 border-r border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm hidden md:flex md:flex-col">
        <div className="flex h-16 shrink-0 items-center gap-2 border-b border-[hsl(var(--border))] px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--primary))] text-white font-bold">
            O
          </div>
          <span className="font-bold text-[hsl(var(--foreground))]">OrderTee Admin</span>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {NAVIGATION.map((item) => {
            const isActive = location.pathname === item.href || 
                            (item.href !== '/admin' && location.pathname.startsWith(item.href))
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]'
                    : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))]'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-[hsl(var(--border))] p-4">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col md:pl-64">
        {/* Mobile Header */}
        <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]/80 px-4 backdrop-blur-lg md:hidden">
          <span className="font-bold text-[hsl(var(--foreground))]">OrderTee</span>
          <ThemeToggle />
        </header>

        {/* Desktop Header Top Bar (just for theme toggle) */}
        <header className="hidden h-16 shrink-0 items-center justify-end border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]/80 px-8 backdrop-blur-lg md:flex">
          <ThemeToggle />
        </header>

        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
