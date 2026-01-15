import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function optimizeImages() {
  console.log('🖼️  Starting image optimization...\n');

  // Optimize album-1.jpg (1.4MB → <100KB)
  console.log('Processing album-1.jpg...');
  await sharp(join(__dirname, 'src/assets/album-1.jpg'))
    .resize(800, 800, { fit: 'cover', position: 'center' })
    .webp({ quality: 85 })
    .toFile(join(__dirname, 'src/assets/album-1.webp'));
  
  // Also create optimized JPG version as fallback
  await sharp(join(__dirname, 'src/assets/album-1.jpg'))
    .resize(800, 800, { fit: 'cover', position: 'center' })
    .jpeg({ quality: 85, progressive: true })
    .toFile(join(__dirname, 'src/assets/album-1-optimized.jpg'));

  const albumWebpSize = fs.statSync(join(__dirname, 'src/assets/album-1.webp')).size;
  const albumJpgSize = fs.statSync(join(__dirname, 'src/assets/album-1-optimized.jpg')).size;
  console.log(`✅ album-1.webp: ${(albumWebpSize / 1024).toFixed(2)} KB`);
  console.log(`✅ album-1-optimized.jpg: ${(albumJpgSize / 1024).toFixed(2)} KB\n`);

  // Optimize qris-gopay.png (487KB → <50KB)
  console.log('Processing qris-gopay.png...');
  await sharp(join(__dirname, 'public/qris-gopay.png'))
    .resize(600, null, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 90 })
    .toFile(join(__dirname, 'public/qris-gopay.webp'));
  
  // Also create optimized PNG version
  await sharp(join(__dirname, 'public/qris-gopay.png'))
    .resize(600, null, { fit: 'inside', withoutEnlargement: true })
    .png({ quality: 90, compressionLevel: 9 })
    .toFile(join(__dirname, 'public/qris-gopay-optimized.png'));

  const qrisWebpSize = fs.statSync(join(__dirname, 'public/qris-gopay.webp')).size;
  const qrisPngSize = fs.statSync(join(__dirname, 'public/qris-gopay-optimized.png')).size;
  console.log(`✅ qris-gopay.webp: ${(qrisWebpSize / 1024).toFixed(2)} KB`);
  console.log(`✅ qris-gopay-optimized.png: ${(qrisPngSize / 1024).toFixed(2)} KB\n`);

  // Optimize logo-lm.png (33KB - already small, but let's optimize anyway)
  console.log('Processing logo-lm.png...');
  await sharp(join(__dirname, 'src/assets/logo-lm.png'))
    .webp({ quality: 95 })
    .toFile(join(__dirname, 'src/assets/logo-lm.webp'));
  
  const logoWebpSize = fs.statSync(join(__dirname, 'src/assets/logo-lm.webp')).size;
  console.log(`✅ logo-lm.webp: ${(logoWebpSize / 1024).toFixed(2)} KB\n`);

  console.log('🎉 Image optimization complete!');
  
  // Calculate total savings
  const originalAlbum = 1400;
  const originalQris = 487;
  const totalOriginal = originalAlbum + originalQris;
  const totalOptimized = (albumWebpSize + qrisWebpSize) / 1024;
  const savings = totalOriginal - totalOptimized;
  
  console.log(`\n📊 Total savings: ${savings.toFixed(2)} KB (${((savings / totalOriginal) * 100).toFixed(1)}% reduction)`);
}

optimizeImages().catch(console.error);
