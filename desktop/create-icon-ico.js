const fs = require('fs');
const path = require('path');

// Create a minimal valid ICO file for Windows
// This is a basic ICO file structure

const createICO = (outputPath) => {
  // Minimal valid ICO file (16x16, 32x32, 48x48, 256x256)
  // ICO file format: Header + Directory + Image data
  
  const icoHeader = Buffer.from([
    0x00, 0x00, // Reserved (must be 0)
    0x01, 0x00, // Type (1 = ICO)
    0x04, 0x00, // Number of images (4)
  ]);
  
  // For simplicity, create a minimal ICO with one 32x32 image
  // This is a valid ICO structure
  const icoData = Buffer.concat([
    icoHeader,
    // Image directory entry (32x32, 32-bit, 1 image)
    Buffer.from([
      0x20, 0x00, // Width (32)
      0x20, 0x00, // Height (32)
      0x00,       // Color palette (0 = no palette)
      0x00,       // Reserved
      0x01, 0x00, // Color planes
      0x20, 0x00, // Bits per pixel (32)
      0x00, 0x00, 0x00, 0x00, // Size of image data (will be calculated)
      0x16, 0x00, 0x00, 0x00, // Offset to image data (22 bytes)
    ]),
    // Minimal valid BMP/PNG data for 32x32 icon
    // This is a minimal valid BMP embedded in ICO
    Buffer.from([
      0x28, 0x00, 0x00, 0x00, // BMP header size
      0x20, 0x00, 0x00, 0x00, // Width
      0x40, 0x00, 0x00, 0x00, // Height (double for ICO)
      0x01, 0x00,             // Planes
      0x20, 0x00,             // Bits per pixel
      0x00, 0x00, 0x00, 0x00, // Compression
      0x00, 0x00, 0x00, 0x00, // Image size
      0x00, 0x00, 0x00, 0x00, // X resolution
      0x00, 0x00, 0x00, 0x00, // Y resolution
      0x00, 0x00, 0x00, 0x00, // Colors used
      0x00, 0x00, 0x00, 0x00, // Important colors
      // Minimal pixel data (32x32 = 1024 pixels * 4 bytes = 4096 bytes)
      // Fill with a simple pattern
    ]),
  ]);
  
  // Add minimal pixel data (simplified - just enough to be valid)
  const pixelData = Buffer.alloc(4096, 0x00); // Fill with zeros (transparent)
  const fullICO = Buffer.concat([icoData, pixelData]);
  
  // Update size in directory entry
  const imageSize = pixelData.length + 40; // 40 = BMP header size
  fullICO.writeUInt32LE(imageSize, 18);
  
  fs.writeFileSync(outputPath, fullICO);
  console.log(`Created ${path.basename(outputPath)}`);
};

const iconsDir = path.join(__dirname, 'src-tauri', 'icons');
const icoPath = path.join(iconsDir, 'icon.ico');

console.log('Creating Windows ICO file...');
createICO(icoPath);
console.log('✅ icon.ico created!');
console.log('\nNote: This is a minimal placeholder icon.');
console.log('For production, replace with a proper icon file.');

