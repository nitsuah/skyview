import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Create a .env file or export the variable.')
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL)

// Split SQL into individual statements, respecting dollar-quoted blocks ($$ ... $$)
// so PL/pgSQL function bodies are never split at internal semicolons.
function splitStatements(sqlText) {
  const stmts = []
  let cur = ''
  let inDollar = false
  let dollarTag = ''
  let i = 0
  while (i < sqlText.length) {
    if (sqlText[i] === '$') {
      const m = sqlText.slice(i).match(/^\$[^$]*\$/)
      if (m) {
        if (!inDollar) {
          inDollar = true
          dollarTag = m[0]
        } else if (m[0] === dollarTag) {
          inDollar = false
          dollarTag = ''
        }
        cur += m[0]
        i += m[0].length
        continue
      }
    }
    if (!inDollar && sqlText[i] === ';') {
      const stmt = cur.trim()
      if (stmt && !stmt.startsWith('--')) stmts.push(stmt)
      cur = ''
      i++
      continue
    }
    cur += sqlText[i++]
  }
  const last = cur.trim()
  if (last && !last.startsWith('--')) stmts.push(last)
  return stmts
}

async function migrate() {
  console.log('Running migrations...')

  const migrationFile = resolve(__dirname, '../db/migrations/001_initial.sql')
  const migrationSQL = readFileSync(migrationFile, 'utf8')
  const statements = splitStatements(migrationSQL)
  console.log(`  ${statements.length} statements found`)

  let applied = 0
  let skipped = 0
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i]
    try {
      await sql(stmt)
      applied++
    } catch (err) {
      if (err.message.includes('already exists')) {
        skipped++
      } else {
        console.error(`\nMigration error on statement ${i + 1}:`, err.message)
        console.error('Statement preview:', stmt.slice(0, 200))
        process.exit(1)
      }
    }
  }

  console.log(`Migrations complete — ${applied} applied, ${skipped} skipped (already exist).`)
}

migrate().catch(err => {
  console.error('Migration failed:', err.message)
  process.exit(1)
})
