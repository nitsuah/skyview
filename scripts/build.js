import { execSync } from 'child_process'
import { cpSync, mkdirSync, rmSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const dist = resolve(root, 'dist')

console.log('Building SkyView...\n')

if (existsSync(dist)) rmSync(dist, { recursive: true, force: true })
mkdirSync(dist, { recursive: true })

// Copy static marketing site
const staticDirs = ['assets', 'pages', 'admin', 'styles', 'scripts']
const staticFiles = ['index.html', 'config.js', 'robots.txt', 'sitemap.xml']

for (const dir of staticDirs) {
  const src = resolve(root, dir)
  if (existsSync(src)) {
    process.stdout.write(`  [static] ${dir}/... `)
    cpSync(src, resolve(dist, dir), { recursive: true })
    console.log('ok')
  }
}

// Remove Node.js-only tooling scripts that must not be publicly served
const toolingScripts = ['build.js', 'migrate.js', 'convert-to-webp.js', 'portal-token.js']
for (const f of toolingScripts) {
  const p = resolve(dist, 'scripts', f)
  if (existsSync(p)) rmSync(p)
}

for (const file of staticFiles) {
  const src = resolve(root, file)
  if (existsSync(src)) {
    process.stdout.write(`  [static] ${file}... `)
    cpSync(src, resolve(dist, file))
    console.log('ok')
  }
}

// Build Vite platform SPA → dist/app/
const platformDir = resolve(root, 'platform')
const installCmd  = existsSync(resolve(platformDir, 'package-lock.json')) ? 'npm ci' : 'npm install'
console.log('\n  [platform] Installing dependencies...')
execSync(installCmd, { cwd: platformDir, stdio: 'inherit' })

console.log('\n  [platform] Building React app...')
execSync('npm run build', { cwd: platformDir, stdio: 'inherit' })
cpSync(resolve(platformDir, 'dist'), resolve(dist, 'app'), { recursive: true })

console.log('\nBuild complete → dist/\n')
