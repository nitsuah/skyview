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
const staticDirs = ['assets', 'pages', 'admin', 'styles']
const staticFiles = ['index.html', 'config.js', 'robots.txt', 'sitemap.xml']

for (const dir of staticDirs) {
  const src = resolve(root, dir)
  if (existsSync(src)) {
    process.stdout.write(`  [static] ${dir}/... `)
    cpSync(src, resolve(dist, dir), { recursive: true })
    console.log('ok')
  }
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
if (!existsSync(resolve(platformDir, 'node_modules'))) {
  console.log('\n  [platform] Installing dependencies...')
  execSync('npm install --prefer-offline', { cwd: platformDir, stdio: 'inherit' })
}

console.log('\n  [platform] Building React app...')
execSync('npm run build', { cwd: platformDir, stdio: 'inherit' })
cpSync(resolve(platformDir, 'dist'), resolve(dist, 'app'), { recursive: true })

console.log('\nBuild complete → dist/\n')
