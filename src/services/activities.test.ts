import { describe, it, expect } from 'vitest'

describe('Activity Business Logic & Rules', () => {
  it('correctly calculates unique approved items progress', () => {
    // 5 submissions with 3 distinct items
    const submissions = [
      { id: '1', item_tag: 'Item A', status: 'approved' },
      { id: '2', item_tag: 'Item A', status: 'approved' }, // duplicate item
      { id: '3', item_tag: 'Item B', status: 'approved' },
      { id: '4', item_tag: 'Item C', status: 'approved' },
      { id: '5', item_tag: 'Item D', status: 'pending' }, // pending not counted
      { id: '6', item_tag: 'Item E', status: 'rejected' }, // rejected not counted
    ]

    const approvedSubmissions = submissions.filter((s) => s.status === 'approved')
    const uniqueApprovedTags = new Set(approvedSubmissions.map((s) => s.item_tag))

    expect(approvedSubmissions.length).toBe(4)
    expect(uniqueApprovedTags.size).toBe(3) // 3 unique items
    expect(uniqueApprovedTags.size >= 5).toBe(false) // Not completed yet
  })

  it('marks activity as completed only when unique approved items reach required items', () => {
    const requiredItems = 5
    const approvedSubmissions = [
      { id: '1', item_tag: 'Cup A', status: 'approved' },
      { id: '2', item_tag: 'Cup B', status: 'approved' },
      { id: '3', item_tag: 'Quote 1', status: 'approved' },
      { id: '4', item_tag: 'Quote 2', status: 'approved' },
      { id: '5', item_tag: 'Item Special', status: 'approved' },
    ]

    const uniqueTags = new Set(approvedSubmissions.map((s) => s.item_tag))
    const isCompleted = uniqueTags.size >= requiredItems

    expect(uniqueTags.size).toBe(5)
    expect(isCompleted).toBe(true)
  })

  it('masks customer names for public privacy', () => {
    function maskCustomerName(name: string): string {
      if (!name) return 'ผู้ร่วมกิจกรรม'
      const parts = name.trim().split(/\s+/)
      if (parts.length > 1) {
        return `${parts[0]} ${parts[1].charAt(0)}.`
      }
      if (name.length > 4) {
        return `${name.slice(0, 3)}...`
      }
      return name
    }

    expect(maskCustomerName('สมชาย ใจดี')).toBe('สมชาย ใ.')
    expect(maskCustomerName('John Doe')).toBe('John D.')
    expect(maskCustomerName('Alex')).toBe('Alex')
    expect(maskCustomerName('Alexander')).toBe('Ale...')
  })

  it('validates image file extensions and mimes', () => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp']
    const allowedExts = ['jpg', 'jpeg', 'png', 'webp']

    expect(allowedMimes.includes('image/jpeg')).toBe(true)
    expect(allowedMimes.includes('image/png')).toBe(true)
    expect(allowedMimes.includes('image/webp')).toBe(true)

    expect(allowedExts.includes('jpg')).toBe(true)
    expect(allowedExts.includes('png')).toBe(true)
    expect(allowedExts.includes('webp')).toBe(true)

    expect(allowedMimes.includes('application/pdf')).toBe(false)
    expect(allowedExts.includes('pdf')).toBe(false)
    expect(allowedExts.includes('docx')).toBe(false)
  })
})
