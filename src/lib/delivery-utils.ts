/**
 * Delivery validation and timezone utilities
 * Consistently uses Bangkok timezone (Asia/Bangkok, UTC+7) for all business rules.
 */

export const BANGKOK_TIMEZONE = 'Asia/Bangkok'

export const DELIVERY_TIME_WINDOWS = {
  PICKUP_START_HOUR: 19,
  PICKUP_END_HOUR: 22,
  IMMEDIATE_START_HOUR: 19,
  IMMEDIATE_END_HOUR: 22,
}

export const DELIVERY_ERROR_MESSAGES = {
  PICKUP_UNAVAILABLE: 'รับสินค้าที่ร้านเปิดให้บริการเฉพาะเวลา 19:00 - 22:00 น. เท่านั้น',
  IMMEDIATE_UNAVAILABLE: 'จัดส่งด่วนพื้นที่ใกล้เคียงเปิดให้บริการเฉพาะเวลา 19:00 - 22:00 น. เท่านั้น',
  SCHEDULED_DATE_REQUIRED: 'กรุณาเลือกวันที่และรอบจัดส่ง',
  SCHEDULED_DATE_NOT_FUTURE: 'การจัดส่งตามรอบเส้นทางต้องสั่งล่วงหน้า (ไม่สามารถเลือกวันปัจจุบันหรือวันที่ผ่านมาแล้วได้)',
  SCHEDULED_LOCATION_REQUIRED: 'กรุณาเลือกสถานที่/จุดจัดส่ง',
  IMMEDIATE_ADDRESS_REQUIRED: 'กรุณาระบุที่อยู่จัดส่ง',
  SCHEDULE_INACTIVE: 'รอบจัดส่งนี้ไม่พร้อมให้บริการแล้ว กรุณาเลือกรอบจัดส่งอื่น',
}

/**
 * Gets parts of the current date/time in Asia/Bangkok timezone
 */
export function getBangkokDateTime(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: BANGKOK_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  const parts = formatter.formatToParts(date)
  const partMap: Record<string, string> = {}
  parts.forEach((p) => {
    partMap[p.type] = p.value
  })

  // Handle midnight 24:00 edge case from some engines
  let hour = parseInt(partMap.hour || '0', 10)
  if (hour === 24) hour = 0

  const year = partMap.year || '2026'
  const month = partMap.month || '01'
  const day = partMap.day || '01'
  const minute = parseInt(partMap.minute || '0', 10)
  const second = parseInt(partMap.second || '0', 10)

  const dateString = `${year}-${month}-${day}` // YYYY-MM-DD
  const timeString = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`

  return {
    year: parseInt(year, 10),
    month: parseInt(month, 10),
    day: parseInt(day, 10),
    hour,
    minute,
    second,
    dateString,
    timeString,
  }
}

/**
 * Returns true if current time is within the allowed 19:00 - 22:00 window (19:00:00 <= t < 22:00:00)
 */
export function isPickupAllowed(date = new Date()): boolean {
  const { hour } = getBangkokDateTime(date)
  return hour >= DELIVERY_TIME_WINDOWS.PICKUP_START_HOUR && hour < DELIVERY_TIME_WINDOWS.PICKUP_END_HOUR
}

/**
 * Returns true if current time is within the allowed 19:00 - 22:00 window for immediate local delivery
 */
export function isImmediateDeliveryAllowed(date = new Date()): boolean {
  const { hour } = getBangkokDateTime(date)
  return hour >= DELIVERY_TIME_WINDOWS.IMMEDIATE_START_HOUR && hour < DELIVERY_TIME_WINDOWS.IMMEDIATE_END_HOUR
}

/**
 * Checks if a target date string (YYYY-MM-DD) is strictly in the future (strictly > today)
 */
export function isStrictlyFutureDate(dateStr: string, baseDate = new Date()): boolean {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false
  const { dateString: todayString } = getBangkokDateTime(baseDate)
  return dateStr > todayString
}

/**
 * Formats a YYYY-MM-DD date string to readable Thai format
 * e.g. "25 ส.ค. 2569 (วันอังคาร)" or "25 ส.ค. 2026"
 */
export function formatDeliveryDateThai(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const [yearStr, monthStr, dayStr] = dateStr.split('-')
    const date = new Date(Date.UTC(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, parseInt(dayStr, 10), 12, 0, 0))
    
    return new Intl.DateTimeFormat('th-TH', {
      timeZone: BANGKOK_TIMEZONE,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date)
  } catch {
    return dateStr
  }
}

/**
 * Formats date for display in the schedule selector
 */
export function formatScheduleCardDate(dateStr: string): { day: string; month: string; weekday: string; full: string } {
  if (!dateStr) return { day: '', month: '', weekday: '', full: '' }
  try {
    const [yearStr, monthStr, dayStr] = dateStr.split('-')
    const date = new Date(Date.UTC(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, parseInt(dayStr, 10), 12, 0, 0))
    
    const day = new Intl.DateTimeFormat('th-TH', { timeZone: BANGKOK_TIMEZONE, day: 'numeric' }).format(date)
    const month = new Intl.DateTimeFormat('th-TH', { timeZone: BANGKOK_TIMEZONE, month: 'short' }).format(date)
    const weekday = new Intl.DateTimeFormat('th-TH', { timeZone: BANGKOK_TIMEZONE, weekday: 'short' }).format(date)
    const full = new Intl.DateTimeFormat('th-TH', {
      timeZone: BANGKOK_TIMEZONE,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date)

    return { day, month, weekday, full }
  } catch {
    return { day: dateStr, month: '', weekday: '', full: dateStr }
  }
}
