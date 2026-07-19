/**
 * OrderTee — Database Setup Helper
 *
 * Combines all SQL migrations into one file, copies to clipboard,
 * and opens the Supabase SQL editor automatically.
 *
 * Usage: npm run db:setup
 */

import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { execSync, exec } from 'child_process'
import 'dotenv/config'

const __dirname = dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL = process.env.VITE_SUPABASE_URL?.trim()
const PROJECT_REF = SUPABASE_URL?.replace('https://', '').split('.')[0]

const migrationsDir = join(__dirname, '../supabase/migrations')

// Read all SQL files
const schema    = readFileSync(join(migrationsDir, '001_schema.sql'), 'utf-8')
const policies  = readFileSync(join(migrationsDir, '002_policies.sql'), 'utf-8')
const functions = readFileSync(join(migrationsDir, '003_functions.sql'), 'utf-8')
const seed      = readFileSync(join(__dirname, '../supabase/seed.sql'), 'utf-8')

const FULL_SQL = `-- ============================================================
-- OrderTee — Full Database Setup
-- Generated: ${new Date().toISOString()}
-- Run this in: https://supabase.com/dashboard/project/${PROJECT_REF}/sql
-- ============================================================

${schema}

${policies}

${functions}

${seed}
`

// Save combined SQL to a file
const outputPath = join(__dirname, '../supabase/setup_all.sql')
writeFileSync(outputPath, FULL_SQL, 'utf-8')

console.log('\n🚀 OrderTee — Database Setup\n')
console.log(`✅ Combined SQL saved to: supabase/setup_all.sql`)
console.log(`   (${FULL_SQL.split('\n').length} lines, ${Math.round(FULL_SQL.length / 1024)}KB)\n`)

// Copy to clipboard
try {
  // Windows: use clip
  const proc = execSync('clip', { input: FULL_SQL })
  console.log('✅ SQL copied to your clipboard!\n')
} catch {
  console.log('ℹ️  Could not copy to clipboard — use the file instead.\n')
}

const SQL_EDITOR_URL = `https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new`

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('📋 2 STEPS TO SET UP YOUR DATABASE:\n')
console.log('  1. Supabase SQL Editor will open in your browser')
console.log('     Press Ctrl+V to paste the SQL')
console.log('     Click "Run" (or press Ctrl+Enter)')
console.log('')
console.log('  2. Create your admin account:')
console.log(`     https://supabase.com/dashboard/project/${PROJECT_REF}/auth/users`)
console.log('     → "Add user" → "Create new user"')
console.log('     → Enter your email + password')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

// Open browser
try {
  exec(`start ${SQL_EDITOR_URL}`)
  console.log('\n✅ Opening Supabase SQL Editor...')
} catch {
  console.log(`\n🔗 Open manually: ${SQL_EDITOR_URL}`)
}

console.log('\nAfter running the SQL, start the app:')
console.log('  npm run dev  →  http://localhost:5173\n')
