import { Outlet, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { fetchSettings } from '@/services/settings'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { MapPin, Phone, Clock, Globe, MessageCircle } from 'lucide-react'
import type { Website } from '@/types/database'

async function fetchWebsite(): Promise<Website | null> {
  const { data } = await supabase.from('website').select('*').limit(1).single()
  return data
}

export function CustomerLayout() {
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: fetchSettings,
    staleTime: 1000 * 30, // 30 seconds fresh
  })

  const { data: website } = useQuery({
    queryKey: ['website-footer'],
    queryFn: fetchWebsite,
    refetchInterval: 10000, // Real-time fetch every 10 seconds for footer
  })

  const contactLocation = website?.location || settings?.store_address
  const contactPhone = website?.phone || settings?.store_phone
  const description = website?.business_description || settings?.store_description

  return (
    <div className="flex min-h-screen flex-col bg-[hsl(var(--background))]">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link to="/" className="text-xl font-extrabold text-[hsl(var(--foreground))]" title="กลับสู่หน้าหลัก">
            {settings?.store_name || 'OrderTee'}
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main content — no padding, each page manages its own */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Real-time Footer */}
      <footer className="mt-auto border-t border-[hsl(var(--border))] bg-[hsl(var(--card))] py-8 md:py-12">
        <div className="mx-auto max-w-5xl px-6 text-[hsl(var(--muted-foreground))]">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-[hsl(var(--foreground))]">{settings?.store_name || 'OrderTee'}</h3>
              {description && (
                <p className="text-sm leading-relaxed">{description}</p>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold text-[hsl(var(--foreground))]">ติดต่อเรา (Contact Us)</h3>
              <div className="space-y-3 text-sm">
                {contactLocation && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 shrink-0 text-[hsl(var(--primary))]" />
                    <span>{contactLocation}</span>
                  </div>
                )}
                {website?.opening_hours && (
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 shrink-0 text-[hsl(var(--primary))]" />
                    <span>{website.opening_hours}</span>
                  </div>
                )}
                {contactPhone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 shrink-0 text-[hsl(var(--primary))]" />
                    <a href={`tel:${contactPhone}`} className="hover:text-[hsl(var(--primary))] transition-colors">
                      {contactPhone}
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold text-[hsl(var(--foreground))]">ติดตามเรา (Follow Us)</h3>
              <div className="flex gap-4">
                {website?.facebook && (
                  <a href={website.facebook} target="_blank" rel="noopener noreferrer" className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] hover:bg-[#1877f2] hover:text-white transition-colors">
                    <Globe className="h-5 w-5" />
                  </a>
                )}
                {website?.instagram && (
                  <a href={website.instagram} target="_blank" rel="noopener noreferrer" className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] hover:bg-[#e4405f] hover:text-white transition-colors">
                    <Globe className="h-5 w-5" />
                  </a>
                )}
                {website?.line && (
                  <a href={website.line} target="_blank" rel="noopener noreferrer" className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] hover:bg-[#00c300] hover:text-white transition-colors">
                    <MessageCircle className="h-5 w-5" />
                  </a>
                )}
              </div>
            </div>

          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-[hsl(var(--border))] pt-8 text-sm md:flex-row">
            <p>© {new Date().getFullYear()} {settings?.store_name || 'OrderTee'}. All rights reserved.</p>
            <p>Powered by <span className="font-semibold text-[hsl(var(--foreground))]">UU Studio</span></p>
          </div>
        </div>
      </footer>
    </div>
  )
}
