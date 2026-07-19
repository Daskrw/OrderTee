import { useSearchParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle, Search, ArrowRight, Loader2, RefreshCw, Clock, CheckCircle2 } from 'lucide-react'

export default function OrderSuccessPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const orderNumber = params.get('order') ?? ''
  const queueNumber = params.get('queue') ?? ''

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-12">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 20 }}
        className="w-full max-w-sm"
      >
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
          <CheckCircle className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          <div>
            <h1 className="mb-2 text-3xl font-extrabold text-[hsl(var(--foreground))]">รับคำสั่งซื้อแล้ว!</h1>
            <p className="text-[hsl(var(--muted-foreground))]">
              ขอบคุณสำหรับการสั่งซื้อ เราได้ส่งคำสั่งซื้อของคุณไปยังร้านค้าแล้ว
            </p>
          </div>

          {orderNumber && (
            <div className="mb-6 rounded-2xl bg-[hsl(var(--muted))] p-6">
              <p className="mb-2 text-sm font-medium text-[hsl(var(--muted-foreground))]">
                หมายเลขคำสั่งซื้อ
              </p>
              <p className="text-3xl font-black text-[hsl(var(--foreground))] tracking-wider">
                #{orderNumber}
              </p>
            </div>
          )}

          {queueNumber && (
             <div className="flex items-center justify-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
               <Clock className="h-4 w-4" />
               <p>คิวลำดับที่: {queueNumber}</p>
             </div>
          )}

          <div className="mb-8 flex items-center justify-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
            <Clock className="h-4 w-4" />
            <p>คุณสามารถติดตามสถานะคำสั่งซื้อได้ผ่านลิงก์ด้านล่าง</p>
          </div>

          <div className="flex flex-col gap-3">
            {token && (
              <Link
                to={`/track/${token}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-8 py-3.5 font-bold text-white shadow-md transition-all hover:bg-[hsl(var(--primary))]/90 hover:shadow-lg"
              >
                ติดตามสถานะคำสั่งซื้อ
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}

            <Link
              to="/order"
              className="inline-flex items-center justify-center rounded-xl bg-[hsl(var(--secondary))] px-8 py-3.5 font-bold text-[hsl(var(--secondary-foreground))] transition-all hover:bg-[hsl(var(--accent))]"
            >
              กลับไปที่เมนู
            </Link>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
