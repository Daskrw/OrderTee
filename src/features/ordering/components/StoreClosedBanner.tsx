import { AlertCircle, Store } from 'lucide-react'
import { motion } from 'framer-motion'

export function StoreClosedBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 dark:border-amber-800/50 dark:bg-amber-900/20 dark:text-amber-300"
    >
      <div className="flex items-center gap-3">
        <Store className="h-5 w-5 text-destructive" />
        <h3 className="font-semibold text-destructive">ร้านปิดให้บริการชั่วคราว</h3>
      </div>
      <p className="mt-1 pl-8 text-sm text-destructive/80">
        ขออภัย ไม่สามารถสั่งอาหารได้ในขณะนี้ กรุณากลับมาใหม่ภายหลัง
      </p>
    </motion.div>
  )
}
