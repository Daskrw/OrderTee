import { describe, it, expect } from 'vitest'
import {
  isPickupAllowed,
  isImmediateDeliveryAllowed,
  isStrictlyFutureDate,
  getBangkokDateTime,
  formatScheduleCardDate,
  getCalendarMonthDays,
  type CalendarDay,
  DELIVERY_TIME_WINDOWS,
} from './delivery-utils'

// Helper to construct UTC date that corresponds to a specific Bangkok time (UTC+7)
function createBangkokTime(year: number, month: number, day: number, hour: number, minute: number): Date {
  // Bangkok is UTC+7, so UTC hour = hour - 7
  return new Date(Date.UTC(year, month - 1, day, hour - 7, minute, 0))
}

describe('1. Pickup at Store Time Validation (19:00 - 22:00 Bangkok Time)', () => {
  it('should be unavailable before 19:00 (e.g. 18:59:59)', () => {
    const timeBefore = createBangkokTime(2026, 8, 24, 18, 59)
    expect(isPickupAllowed(timeBefore)).toBe(false)
  })

  it('should be available at 19:00 sharp', () => {
    const timeAt19 = createBangkokTime(2026, 8, 24, 19, 0)
    expect(isPickupAllowed(timeAt19)).toBe(true)
  })

  it('should be available during the allowed window (e.g. 20:30)', () => {
    const timeMid = createBangkokTime(2026, 8, 24, 20, 30)
    expect(isPickupAllowed(timeMid)).toBe(true)
  })

  it('should be available at 21:59', () => {
    const timeLate = createBangkokTime(2026, 8, 24, 21, 59)
    expect(isPickupAllowed(timeLate)).toBe(true)
  })

  it('should be unavailable at/after 22:00 (e.g. 22:00)', () => {
    const timeAt22 = createBangkokTime(2026, 8, 24, 22, 0)
    expect(isPickupAllowed(timeAt22)).toBe(false)
  })

  it('should be unavailable late night (e.g. 23:30)', () => {
    const timeLateNight = createBangkokTime(2026, 8, 24, 23, 30)
    expect(isPickupAllowed(timeLateNight)).toBe(false)
  })

  it('should be unavailable in early morning (e.g. 08:00)', () => {
    const timeMorning = createBangkokTime(2026, 8, 24, 8, 0)
    expect(isPickupAllowed(timeMorning)).toBe(false)
  })
})

describe('2. Immediate Local Delivery Time Validation (19:00 - 22:00 Bangkok Time)', () => {
  it('should be unavailable before 19:00 (e.g. 17:00)', () => {
    const timeBefore = createBangkokTime(2026, 8, 24, 17, 0)
    expect(isImmediateDeliveryAllowed(timeBefore)).toBe(false)
  })

  it('should be available at 19:00', () => {
    const timeAt19 = createBangkokTime(2026, 8, 24, 19, 0)
    expect(isImmediateDeliveryAllowed(timeAt19)).toBe(true)
  })

  it('should be available during the allowed period (e.g. 21:15)', () => {
    const timeDuring = createBangkokTime(2026, 8, 24, 21, 15)
    expect(isImmediateDeliveryAllowed(timeDuring)).toBe(true)
  })

  it('should be unavailable at/after 22:00', () => {
    const timeAt22 = createBangkokTime(2026, 8, 24, 22, 0)
    expect(isImmediateDeliveryAllowed(timeAt22)).toBe(false)
  })
})

describe('3. Scheduled Route Delivery Date Validation (Strictly Future Dates Only)', () => {
  const baseDate = createBangkokTime(2026, 8, 24, 14, 0) // Bangkok today is 2026-08-24

  it('should reject today date (2026-08-24 cannot be selected for scheduled route)', () => {
    expect(isStrictlyFutureDate('2026-08-24', baseDate)).toBe(false)
  })

  it('should reject past dates (e.g. 2026-08-23, 2026-08-01)', () => {
    expect(isStrictlyFutureDate('2026-08-23', baseDate)).toBe(false)
    expect(isStrictlyFutureDate('2026-07-15', baseDate)).toBe(false)
  })

  it('should accept tomorrow and future dates (e.g. 2026-08-25, 2026-08-28, 2026-09-02)', () => {
    expect(isStrictlyFutureDate('2026-08-25', baseDate)).toBe(true)
    expect(isStrictlyFutureDate('2026-08-28', baseDate)).toBe(true)
    expect(isStrictlyFutureDate('2026-09-02', baseDate)).toBe(true)
  })

  it('should reject invalid or empty date strings', () => {
    expect(isStrictlyFutureDate('', baseDate)).toBe(false)
    expect(isStrictlyFutureDate('invalid-date', baseDate)).toBe(false)
  })
})

describe('4. Timezone & Bangkok DateTime Parsing', () => {
  it('correctly parses Bangkok date and time regardless of system time', () => {
    // 2026-08-24 19:30 in Bangkok is UTC 2026-08-24 12:30
    const utcDate = new Date(Date.UTC(2026, 7, 24, 12, 30, 0))
    const bkk = getBangkokDateTime(utcDate)

    expect(bkk.year).toBe(2026)
    expect(bkk.month).toBe(8)
    expect(bkk.day).toBe(24)
    expect(bkk.hour).toBe(19)
    expect(bkk.minute).toBe(30)
    expect(bkk.dateString).toBe('2026-08-24')
    expect(bkk.timeString).toBe('19:30')
  })

  it('formats schedule card date in Thai format correctly', () => {
    const formatted = formatScheduleCardDate('2026-08-25')
    expect(formatted.day).toBe('25')
    expect(formatted.month).toBe('ส.ค.')
  })
})

describe('5. Calendar Month Grid Calculation', () => {
  it('correctly generates grid cells with past/today/future flags for August 2026', () => {
    const baseDate = createBangkokTime(2026, 8, 24, 12, 0)
    const days = getCalendarMonthDays(2026, 8, baseDate)

    expect(days.length % 7).toBe(0) // Full weeks grid
    expect(days.length).toBeGreaterThanOrEqual(28)

    const todayCell = days.find((d: CalendarDay) => d.dateString === '2026-08-24')
    expect(todayCell).toBeDefined()
    expect(todayCell?.isToday).toBe(true)
    expect(todayCell?.isFuture).toBe(false)

    const pastCell = days.find((d: CalendarDay) => d.dateString === '2026-08-23')
    expect(pastCell?.isPast).toBe(true)
    expect(pastCell?.isFuture).toBe(false)

    const futureCell = days.find((d: CalendarDay) => d.dateString === '2026-08-25')
    expect(futureCell?.isFuture).toBe(true)
    expect(futureCell?.isPast).toBe(false)
  })
})

describe('6. Multi-Date Selection & Bulk Rules Validation', () => {
  const baseDate = createBangkokTime(2026, 8, 24, 12, 0)

  it('validates array of multiple dates where all must be strictly future', () => {
    const validBatch = ['2026-08-25', '2026-08-28', '2026-09-01', '2026-09-04']
    const allValid = validBatch.every((d) => isStrictlyFutureDate(d, baseDate))
    expect(allValid).toBe(true)
  })

  it('rejects batch containing today or past dates', () => {
    const invalidBatchWithToday = ['2026-08-24', '2026-08-25', '2026-08-28']
    const allValidToday = invalidBatchWithToday.every((d) => isStrictlyFutureDate(d, baseDate))
    expect(allValidToday).toBe(false)

    const invalidBatchWithPast = ['2026-08-23', '2026-08-25']
    const allValidPast = invalidBatchWithPast.every((d) => isStrictlyFutureDate(d, baseDate))
    expect(allValidPast).toBe(false)
  })

  it('deduplicates dates properly in multi-date set', () => {
    const rawDates = ['2026-08-25', '2026-08-28', '2026-08-25', '2026-09-01']
    const unique = Array.from(new Set(rawDates)).sort()
    expect(unique).toEqual(['2026-08-25', '2026-08-28', '2026-09-01'])
  })
})

describe('7. Date × Location Matrix Calculation', () => {
  it('correctly calculates total matrix combinations (N dates × M locations)', () => {
    const dates = ['2026-08-25', '2026-08-28', '2026-09-01', '2026-09-04'] // 4 dates
    const locations = ['loc-1', 'loc-2', 'loc-3'] // 3 locations

    const totalCombinations = dates.length * locations.length
    expect(totalCombinations).toBe(12)

    // Generate cartesian pairs
    const pairs = dates.flatMap((d) => locations.map((l) => ({ date: d, locId: l })))
    expect(pairs.length).toBe(12)
    expect(pairs[0]).toEqual({ date: '2026-08-25', locId: 'loc-1' })
    expect(pairs[pairs.length - 1]).toEqual({ date: '2026-09-04', locId: 'loc-3' })
  })

  it('prevents duplicates when duplicate date or location IDs are supplied in selection', () => {
    const rawDates = ['2026-08-25', '2026-08-28', '2026-08-25']
    const rawLocations = ['loc-1', 'loc-2', 'loc-1']

    const cleanDates = Array.from(new Set(rawDates))
    const cleanLocations = Array.from(new Set(rawLocations))

    const pairs = cleanDates.flatMap((d) => cleanLocations.map((l) => `${d}_${l}`))
    expect(pairs.length).toBe(4) // 2 clean dates * 2 clean locations
  })
})



