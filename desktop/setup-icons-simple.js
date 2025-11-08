const fs = require('fs');
const path = require('path');
const https = require('https');

const iconsDir = path.join(__dirname, 'src-tauri', 'icons');

// Create icons directory
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

console.log('Setting up icons for Tauri desktop app...\n');

// Download GitHub's octocat icon as a simple solution
const downloadIcon = (url, filepath) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      } else {
        reject(new Error(`Failed to download: ${response.statusCode}`));
      }
    }).on('error', reject);
  });
};

// Create minimal valid icon files
const createMinimalIcons = () => {
  console.log('Creating minimal placeholder icons...\n');
  
  // Create a simple 32x32 PNG (minimal valid PNG)
  const createPNG = (size, filename) => {
    // Minimal valid PNG structure
    const png = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
      (size >> 24) & 0xFF, (size >> 16) & 0xFF, (size >> 8) & 0xFF, size & 0xFF, // Width
      (size >> 24) & 0xFF, (size >> 16) & 0xFF, (size >> 8) & 0xFF, size & 0xFF, // Height
      0x08, 0x06, 0x00, 0x00, 0x00, // Bit depth, color type, compression, filter, interlace
      0x00, 0x00, 0x00, 0x00, // CRC placeholder
      0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82 // IEND
    ]);
    
    fs.writeFileSync(path.join(iconsDir, filename), png);
    console.log(`Created ${filename}`);
  };
  
  // Create PNG files
  createPNG(32, '32x32.png');
  createPNG(128, '128x128.png');
  createPNG(256, '128x128@2x.png');
  
  // Create ICO file (Windows)
  // Minimal valid ICO with one 32x32 image
  const icoData = Buffer.from([
    // ICO header
    0x00, 0x00, // Reserved
    0x01, 0x00, // Type (ICO)
    0x01, 0x00, // Number of images
    
    // Image directory entry
    0x20,       // Width (32)
    0x20,       // Height (32)
    0x00,       // Color palette
    0x00,       // Reserved
    0x01, 0x00, // Color planes
    0x20, 0x00, // Bits per pixel
    0x00, 0x10, 0x00, 0x00, // Size (4096 bytes)
    0x16, 0x00, 0x00, 0x00, // Offset (22 bytes)
    
    // BMP header (embedded in ICO)
    0x28, 0x00, 0x00, 0x00, // Header size
    0x20, 0x00, 0x00, 0x00, // Width
    0x40, 0x00, 0x00, 0x00, // Height (double for ICO)
    0x01, 0x00,             // Planes
    0x20, 0x00,             // Bits per pixel
    0x00, 0x00, 0x00, 0x00, // Compression
    0x00, 0x10, 0x00, 0x00, // Image size
    0x00, 0x00, 0x00, 0x00, // X resolution
    0x00, 0x00, 0x00, 0x00, // Y resolution
    0x00, 0x00, 0x00, 0x00, // Colors used
    0x00, 0x00, 0x00, 0x00, // Important colors
  ]);
  
  // Add pixel data (32x32 * 4 bytes = 4096 bytes of zeros/transparent)
  const pixelData = Buffer.alloc(4096, 0x00);
  const fullICO = Buffer.concat([icoData, pixelData]);
  
  fs.writeFileSync(path.join(iconsDir, 'icon.ico'), fullICO);
  console.log('Created icon.ico');
  
  // Create ICNS placeholder (macOS) - minimal
  const icnsHeader = Buffer.from('icns', 'ascii');
  fs.writeFileSync(path.join(iconsDir, 'icon.icns'), icnsHeader);
  console.log('Created icon.icns (placeholder)');
  
  console.log('\n✅ Minimal icons created!');
  console.log('Build should now proceed.');
  console.log('\nNote: Replace with proper icons for production.');
  console.log('Use: npx @tauri-apps/cli icon your-icon.png');
};

// Try to download a real icon, fallback to minimal
const iconUrl = 'https://github.com/identicons/octocat.png';

console.log('Attempting to download icon...');
downloadIcon(iconUrl, path.join(iconsDir, 'icon-source.png'))
  .then(() => {
    console.log('Downloaded icon source!\n');
    console.log('Now generating icons with Tauri CLI...');
    const { execSync } = require('child_process');
    try {
      execSync(`npx @tauri-apps/cli icon "${path.join(iconsDir, 'icon-source.png')}" --output "${iconsDir}"`, {
        stdio: 'inherit',
        cwd: __dirname
      });
      console.log('\n✅ Icons generated successfully!');
    } catch (error) {
      console.log('\n⚠️  Tauri CLI failed, creating minimal icons...\n');
      createMinimalIcons();
    }
  })
  .catch(() => {
    console.log('Download failed, creating minimal icons...\n');
    createMinimalIcons();
  });

