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

async function migrate() {
  console.log('Running migrations...')

  const migrationFile = resolve(__dirname, '../db/migrations/001_initial.sql')
  const migrationSQL = readFileSync(migrationFile, 'utf8')

  // Split on semicolons but keep triggers/functions intact
  const statements = migrationSQL
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  for (const statement of statements) {
    try {
      await sql.unsafe(statement + ';')
    } catch (err) {
      // Skip "already exists" errors on re-runs
      if (!err.message.includes('already exists')) {
        console.error('Migration error:', err.message)
        console.error('Statement:', statement.slice(0, 100))
        process.exit(1)
      }
    }
  }

  console.log('Migrations complete.')
}

migrate()
