import { neon } from '@neondatabase/serverless'
import { readFileSync, readdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Create a .env file or export the variable.')
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL)

// PostgreSQL error codes that mean the object already exists — safe to skip on re-run
const IDEMPOTENT_PG_CODES = new Set(['42P07', '42710', '42701', '42723', '42809'])

// Split SQL into individual statements, respecting:
//   - dollar-quoted blocks  ($$ ... $$) — internal semicolons are not separators
//   - single-quoted strings ('...')     — including '' escape sequences
//   - double-quoted identifiers ("...") — including "" escape sequences
//   - single-line comments  (-- ...)    — semicolons inside are not separators
function splitStatements(sqlText) {
  const stmts = []
  let cur = ''
  let inDollar      = false
  let dollarTag     = ''
  let inSingleQuote = false
  let inDoubleQuote = false
  let inLineComment = false
  let i = 0

  while (i < sqlText.length) {
    const ch   = sqlText[i]
    const next = sqlText[i + 1]

    // ── Line comment (-- ...) ────────────────────────────────────────────────
    // Only recognised outside all quoted contexts so that 'a--b' stays a string.
    if (!inDollar && !inSingleQuote && !inDoubleQuote && !inLineComment &&
        ch === '-' && next === '-') {
      inLineComment = true
    }
    if (inLineComment) {
      if (ch === '\n') inLineComment = false
      cur += ch; i++
      continue
    }

    // ── Single-quoted strings ('...', '' = escaped quote) ───────────────────
    if (!inDollar && !inDoubleQuote && ch === "'") {
      if (inSingleQuote && next === "'") { cur += ch + next; i += 2; continue }
      inSingleQuote = !inSingleQuote
      cur += ch; i++
      continue
    }

    // ── Double-quoted identifiers ("...", "" = escaped quote) ───────────────
    if (!inDollar && !inSingleQuote && ch === '"') {
      if (inDoubleQuote && next === '"') { cur += ch + next; i += 2; continue }
      inDoubleQuote = !inDoubleQuote
      cur += ch; i++
      continue
    }

    // ── Dollar-quoted blocks ($tag$ ... $tag$) ───────────────────────────────
    if (!inSingleQuote && !inDoubleQuote && ch === '$') {
      const m = sqlText.slice(i).match(/^\$[^$]*\$/)
      if (m) {
        if (!inDollar) {
          inDollar = true; dollarTag = m[0]
        } else if (m[0] === dollarTag) {
          inDollar = false; dollarTag = ''
        }
        cur += m[0]; i += m[0].length
        continue
      }
    }

    // ── Statement separator ──────────────────────────────────────────────────
    if (!inDollar && !inSingleQuote && !inDoubleQuote && ch === ';') {
      const stmt = cur.trim()
      // Strip line comments, then check if any real SQL remains
      if (stmt.replace(/--[^\n]*/g, '').trim()) stmts.push(stmt)
      cur = ''; i++
      continue
    }

    cur += ch; i++
  }

  // Trailing content after the last semicolon (or a file with no semicolons)
  const last = cur.trim()
  if (last.replace(/--[^\n]*/g, '').trim()) stmts.push(last)
  return stmts
}

async function migrate() {
  console.log('Running migrations...')

  const migrationsDir = resolve(__dirname, '../db/migrations')
  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort() // alphabetical = chronological for NNN_ naming

  let totalApplied = 0
  let totalSkipped = 0

  for (const file of files) {
    console.log(`\n  → ${file}`)
    const migrationSQL = readFileSync(resolve(migrationsDir, file), 'utf8')
    const statements = splitStatements(migrationSQL)
    console.log(`    ${statements.length} statements`)

    let applied = 0
    let skipped = 0
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i]
      try {
        await sql(stmt)
        applied++
      } catch (err) {
        // Skip only genuine "object already exists" errors using PG error codes
        const isIdempotent = IDEMPOTENT_PG_CODES.has(err.code) ||
          (err.message && err.message.includes('already exists'))
        if (isIdempotent) {
          skipped++
        } else {
          console.error(`\nMigration error in ${file}, statement ${i + 1}:`, err.message)
          console.error('Statement preview:', stmt.slice(0, 200))
          process.exit(1)
        }
      }
    }
    console.log(`    applied: ${applied}, skipped: ${skipped}`)
    totalApplied += applied
    totalSkipped += skipped
  }

  console.log(`\nMigrations complete — ${totalApplied} applied, ${totalSkipped} skipped across ${files.length} file(s).`)
}

migrate().catch(err => {
  console.error('Migration failed:', err.message)
  process.exit(1)
})
