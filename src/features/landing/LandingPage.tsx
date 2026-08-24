import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShoppingBag, Shield } from 'lucide-react'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { useStoreStatus } from '@/hooks/use-store-status'

export default function LandingPage() {
  const navigate = useNavigate()
  const { storeName, storeDescription } = useStoreStatus()

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[hsl(var(--background))] px-4">
      {/* Background gradient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-[hsl(var(--primary))]/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-[hsl(var(--primary))]/5 blur-3xl" />
      </div>

      {/* Theme toggle */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 flex flex-col items-center"
      >
        {/* Logo / Brand */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-2 flex h-16 w-16 items-center justify-center rounded-2xl bg-[hsl(var(--primary))] shadow-lg shadow-[hsl(var(--primary))]/25"
        >
          <ShoppingBag className="h-8 w-8 text-white" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-1 text-3xl font-bold tracking-tight text-[hsl(var(--foreground))] sm:text-4xl"
        >
          {storeName}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mb-10 text-center text-[hsl(var(--muted-foreground))]"
        >
          {storeDescription || 'สั่งอาหารออนไลน์ ทำได้ง่ายๆ'}
        </motion.p>

        {/* Action cards */}
        <div className="grid w-full max-w-lg gap-4 sm:grid-cols-2">
          {/* Browse Products */}
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/order')}
            className="group relative flex flex-col items-center gap-4 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-sm transition-shadow hover:shadow-lg hover:shadow-[hsl(var(--primary))]/10"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[hsl(var(--primary))]/10 transition-colors group-hover:bg-[hsl(var(--primary))]/20">
              <ShoppingBag className="h-6 w-6 text-[hsl(var(--primary))]" />
            </div>
            <div className="text-center">
              <h2 className="text-base font-bold text-[hsl(var(--foreground))]">
                สั่งซื้อสินค้าออนไลน์
              </h2>
              <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
                ดูเมนูและสั่งอาหาร
              </p>
            </div>
          </motion.button>

          {/* Activities / Campaigns */}
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/activities')}
            className="group relative flex flex-col items-center gap-4 rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-500/5 to-transparent p-6 shadow-sm transition-shadow hover:shadow-lg hover:shadow-amber-500/10"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 transition-colors group-hover:bg-amber-500/20">
              <span className="text-2xl">🎉</span>
            </div>
            <div className="text-center">
              <h2 className="text-base font-bold text-[hsl(var(--foreground))] flex items-center justify-center gap-1.5">
                กิจกรรมสะสมรางวัล <span className="rounded-full bg-amber-500 text-white text-[10px] px-1.5 py-0.2">HOT</span>
              </h2>
              <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
                ส่งรูปสะสมครบ 5 ไอเทม รับโปรพิเศษ
              </p>
            </div>
          </motion.button>
        </div>

        {/* Admin Link */}
        <div className="mt-6">
          <button
            onClick={() => navigate('/admin/login')}
            className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] flex items-center gap-1.5 transition-colors"
          >
            <Shield className="h-3.5 w-3.5" /> เข้าสู่ระบบผู้ดูแลร้านค้า
          </button>
        </div>
      </motion.div>

      {/* Footer */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.8 }}
        className="absolute bottom-6 text-xs text-[hsl(var(--muted-foreground))]"
      >
        Powered by OrderTee
      </motion.p>
    </div>
  )
}
