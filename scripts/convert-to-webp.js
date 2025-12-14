/**
 * Batch convert images to WebP format
 * 
 * Usage:
 * 1. Install sharp: npm install sharp
 * 2. Run: node scripts/convert-to-webp.js
 * 
 * This will convert all JPG/PNG images in assets/gallery/ to WebP format
 * Original files are preserved as fallbacks
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module equivalents of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if sharp is available
let sharp;
try {
    sharp = (await import('sharp')).default;
} catch (error) {
    console.error('❌ Error: sharp is not installed');
    console.error('📦 Install it with: npm install sharp');
    console.error('   or use online converter: https://cloudconvert.com/jpg-to-webp');
    process.exit(1);
}

const inputDir = path.join(__dirname, '..', 'assets', 'gallery');
const quality = 85; // Quality setting (0-100, recommended: 80-90)

// Ensure directory exists
if (!fs.existsSync(inputDir)) {
    console.error(`❌ Error: Directory not found: ${inputDir}`);
    process.exit(1);
}

console.log('🔄 Starting WebP conversion...\n');
console.log(`📁 Input directory: ${inputDir}`);
console.log(`⚙️  Quality setting: ${quality}\n`);

const files = fs.readdirSync(inputDir);
const imageFiles = files.filter(file => 
    file.match(/\.(jpg|jpeg|png)$/i) && !file.startsWith('.')
);

if (imageFiles.length === 0) {
    console.log('ℹ️  No images found to convert');
    process.exit(0);
}

console.log(`📸 Found ${imageFiles.length} image(s) to convert:\n`);

let converted = 0;
let skipped = 0;
let failed = 0;

const conversions = imageFiles.map(async (file) => {
    const inputPath = path.join(inputDir, file);
    const outputFile = file.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    const outputPath = path.join(inputDir, outputFile);
    
    // Skip if WebP already exists
    if (fs.existsSync(outputPath)) {
        console.log(`⏭️  Skipped: ${file} (WebP already exists)`);
        skipped++;
        return;
    }
    
    try {
        const stats = fs.statSync(inputPath);
        const originalSize = stats.size;
        
        await sharp(inputPath)
            .webp({ quality })
            .toFile(outputPath);
        
        const newStats = fs.statSync(outputPath);
        const newSize = newStats.size;
        const savings = ((originalSize - newSize) / originalSize * 100).toFixed(1);
        const savedKB = ((originalSize - newSize) / 1024).toFixed(1);
        
        console.log(`✅ Converted: ${file}`);
        console.log(`   → ${outputFile}`);
        console.log(`   📉 ${(originalSize / 1024).toFixed(1)} KB → ${(newSize / 1024).toFixed(1)} KB (${savings}% smaller, saved ${savedKB} KB)\n`);
        
        converted++;
    } catch (error) {
        console.error(`❌ Failed: ${file}`);
        console.error(`   Error: ${error.message}\n`);
        failed++;
    }
});

Promise.all(conversions).then(() => {
    console.log('\n' + '='.repeat(50));
    console.log('✨ Conversion complete!\n');
    console.log(`✅ Converted: ${converted}`);
    if (skipped > 0) console.log(`⏭️  Skipped: ${skipped}`);
    if (failed > 0) console.log(`❌ Failed: ${failed}`);
    console.log('\n📝 Next steps:');
    console.log('   1. Check the WebP files in assets/gallery/');
    console.log('   2. Gallery will automatically use WebP with JPG fallback');
    console.log('   3. Test in different browsers');
    console.log('   4. Run Lighthouse to see performance improvements');
    console.log('='.repeat(50));
}).catch(error => {
    console.error('\n❌ Conversion process failed:', error);
    process.exit(1);
});
